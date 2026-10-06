import { NextResponse } from "next/server";
import type Stripe from "stripe";

import {
  classifyWebhookEvent,
  evaluateSettlement,
  METADATA_INVOICE_ID,
  readSessionReference,
  type SettlementInvoice,
} from "@/lib/invoices/stripe-payment";
import { verifyStripeWebhook } from "@/lib/invoices/webhook-verification";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/*
 * Stripe webhook: the ONLY place an invoice becomes PAID.
 *
 * Response policy:
 *   2xx  handled, already handled, not ours, or a permanent problem recorded as an
 *        INVOICE_PAYMENT_ANOMALY audit row for a human (retrying cannot fix it).
 *   400  bad or missing signature.
 *   5xx  transient failure (database unreachable etc.): Stripe retries with backoff.
 *
 * Idempotency: duplicate deliveries, retries and concurrent deliveries all converge,
 * because every write is conditional on the status we read (`.eq("status", expected)`) and
 * PAID is terminal. Decision logic lives in lib/invoices/stripe-payment.ts (unit tested).
 * Never log secrets, raw payloads or payment method details: ids and codes only.
 */

type AdminClient = ReturnType<typeof createAdminSupabaseClient>;

class TransientWebhookError extends Error {}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  // Signature verification needs the exact raw body: never request.json() first.
  const body = await request.text();
  const verification = verifyStripeWebhook(
    body,
    request.headers.get("stripe-signature"),
    process.env.STRIPE_WEBHOOK_SECRET
  );

  if (!verification.ok) {
    // Log the reason only; never the body or the signature header.
    if (verification.status === 500) {
      console.error("Missing STRIPE_WEBHOOK_SECRET");
    } else {
      console.error("Stripe webhook refused:", verification.error);
    }

    return json({ error: verification.error }, verification.status);
  }

  const event: Stripe.Event = verification.event;

  try {
    await handleEvent(event);
    return json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed:", {
      eventId: event.id,
      type: event.type,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    // Non-2xx makes Stripe retry the event.
    return json({ error: "Webhook processing failed" }, 500);
  }
}

async function handleEvent(event: Stripe.Event) {
  if (event.type === "payment_intent.payment_failed") {
    // A declined attempt inside Checkout: the session stays open and the client can retry.
    // Never changes invoice state (and so can never move PAID backwards).
    const intent = event.data.object;
    console.warn("Stripe payment attempt failed:", {
      eventId: event.id,
      paymentIntentId: intent.id,
      invoiceId: intent.metadata?.[METADATA_INVOICE_ID] ?? null,
      declineCode: intent.last_payment_error?.decline_code ?? intent.last_payment_error?.code ?? null,
    });
    return;
  }

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded" &&
    event.type !== "checkout.session.async_payment_failed" &&
    event.type !== "checkout.session.expired"
  ) {
    console.log("Ignoring unsupported Stripe event", { eventId: event.id, type: event.type });
    return;
  }

  const session = event.data.object;
  const action = classifyWebhookEvent(event.type, session.payment_status);
  const reference = readSessionReference(session);

  if (reference.kind === "NOT_DRYLAKE") {
    console.log("Ignoring Checkout Session without Drylake metadata", {
      eventId: event.id,
      sessionId: session.id,
    });
    return;
  }

  if (reference.kind === "MALFORMED") {
    // We created every Drylake session, so this is not retryable. Flag loudly.
    console.error("Checkout Session has malformed Drylake metadata:", {
      eventId: event.id,
      sessionId: session.id,
      reason: reference.reason,
      paymentStatus: session.payment_status,
    });
    return;
  }

  const supabase = createAdminSupabaseClient();

  switch (action) {
    case "SETTLE":
      await settle(supabase, event, session, reference.invoiceId, reference.organizationId);
      return;

    case "AWAIT_ASYNC":
      console.log("Checkout completed, delayed payment still settling", {
        eventId: event.id,
        sessionId: session.id,
        invoiceId: reference.invoiceId,
      });
      return;

    case "ASYNC_FAILED":
    case "EXPIRED":
      await releaseSession(supabase, event, session, reference.invoiceId, reference.organizationId);
      return;

    default:
      console.log("No action for Checkout event", {
        eventId: event.id,
        type: event.type,
        paymentStatus: session.payment_status,
      });
  }
}

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }

  return session.payment_intent?.id ?? null;
}

const SETTLEMENT_SELECT =
  "id, organization_id, invoice_number, status, currency, total_cents, paid_at, stripe_checkout_session_id, stripe_payment_intent_id";

type SettlementRow = SettlementInvoice & {
  invoice_number: string;
  paid_at: string | null;
  stripe_payment_intent_id: string | null;
};

async function loadInvoice(supabase: AdminClient, invoiceId: string, organizationId: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select(SETTLEMENT_SELECT)
    .eq("id", invoiceId)
    .eq("organization_id", organizationId)
    .maybeSingle<SettlementRow>();

  if (error) {
    throw new TransientWebhookError(`Invoice lookup failed (${error.code})`);
  }

  return data;
}

/*
 * A payment we cannot apply (wrong amount, voided invoice, second payment of a paid
 * invoice...). Money may have moved, so a human must look: record it durably. If even the
 * audit write fails, throw so Stripe retries and the anomaly is not lost.
 */
async function recordAnomaly(
  supabase: AdminClient,
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
  invoiceId: string,
  organizationId: string,
  reason: string
) {
  console.error("Stripe payment could not be applied to invoice:", {
    reason,
    eventId: event.id,
    sessionId: session.id,
    invoiceId,
  });

  const { error } = await supabase.from("audit_logs").insert({
    actor_clerk_user_id: null,
    action: "INVOICE_PAYMENT_ANOMALY",
    entity_type: "invoice",
    entity_id: invoiceId,
    metadata: {
      reason,
      organization_id: organizationId,
      stripe_event_id: event.id,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId(session),
      amount_total: session.amount_total,
      currency: session.currency,
      livemode: event.livemode,
    },
  });

  if (error) {
    throw new TransientWebhookError(`Anomaly audit failed (${error.code})`);
  }
}

async function settle(
  supabase: AdminClient,
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
  invoiceId: string,
  organizationId: string
) {
  const invoice = await loadInvoice(supabase, invoiceId, organizationId);
  const decision = evaluateSettlement(invoice, organizationId, session);
  const intentId = paymentIntentId(session);

  if (decision.action === "REJECT") {
    await recordAnomaly(supabase, event, session, invoiceId, organizationId, decision.reason);
    return;
  }

  if (!invoice) {
    return; // evaluateSettlement rejects a missing invoice; narrows the type.
  }

  if (decision.action === "ALREADY_PAID") {
    // Same session delivered again. Nothing to write: paid_at and the ids are already set.
    console.log("Invoice already PAID, duplicate event ignored", {
      eventId: event.id,
      invoiceId: invoice.id,
    });
    return;
  }

  const paidAt = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("invoices")
    .update({
      status: "PAID",
      paid_at: paidAt,
      stripe_checkout_session_id: session.id,
      ...(intentId ? { stripe_payment_intent_id: intentId } : {}),
    })
    .eq("id", invoice.id)
    .eq("organization_id", organizationId)
    .eq("status", decision.expectedStatus)
    .select("id")
    .maybeSingle();

  if (updateError) {
    throw new TransientWebhookError(`Mark paid failed (${updateError.code})`);
  }

  if (!updated) {
    // Lost a race. Re-evaluate against the current row: a concurrent delivery of the same
    // session converges to ALREADY_PAID; anything else is retried or recorded.
    const current = await loadInvoice(supabase, invoiceId, organizationId);
    const retry = evaluateSettlement(current, organizationId, session);

    if (retry.action === "ALREADY_PAID") {
      return;
    }

    if (retry.action === "REJECT") {
      await recordAnomaly(supabase, event, session, invoiceId, organizationId, retry.reason);
      return;
    }

    throw new TransientWebhookError("Invoice changed while recording payment");
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_clerk_user_id: null,
    action: "INVOICE_PAYMENT_RECEIVED",
    entity_type: "invoice",
    entity_id: invoice.id,
    metadata: {
      organization_id: organizationId,
      invoice_number: invoice.invoice_number,
      stripe_event_id: event.id,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: intentId,
      total_cents: decision.amountCents,
      currency: decision.currency,
      previous_status: decision.expectedStatus,
    },
  });

  if (auditError) {
    // The payment itself is recorded; do not make Stripe retry over a secondary write.
    console.error("Stripe payment audit failed:", { code: auditError.code, invoiceId: invoice.id });
  }

  console.log("Invoice marked PAID", {
    eventId: event.id,
    invoiceId: invoice.id,
    checkoutSessionId: session.id,
    paymentIntentId: intentId,
  });
}

/*
 * A session expired, or a delayed payment failed. The invoice stays OPEN/OVERDUE (never
 * touched if PAID); we only forget the stored session so the client can start a new one.
 */
async function releaseSession(
  supabase: AdminClient,
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
  invoiceId: string,
  organizationId: string
) {
  const { error } = await supabase
    .from("invoices")
    .update({ stripe_checkout_session_id: null })
    .eq("id", invoiceId)
    .eq("organization_id", organizationId)
    .eq("stripe_checkout_session_id", session.id)
    .in("status", ["OPEN", "OVERDUE"]);

  if (error) {
    throw new TransientWebhookError(`Session release failed (${error.code})`);
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_clerk_user_id: null,
      action: "INVOICE_PAYMENT_FAILED",
      entity_type: "invoice",
      entity_id: invoiceId,
      metadata: {
        organization_id: organizationId,
        stripe_event_id: event.id,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId(session),
      },
    });

    if (auditError) {
      console.error("Stripe payment failure audit failed:", { code: auditError.code });
    }

    console.warn("Delayed payment failed; invoice remains outstanding", {
      eventId: event.id,
      invoiceId,
    });
    return;
  }

  console.log("Checkout Session expired; invoice remains outstanding", {
    eventId: event.id,
    invoiceId,
  });
}
