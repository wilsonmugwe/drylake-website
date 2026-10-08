import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { formatEmailMoney } from "@/lib/email/invoice-email";
import { clientInvoiceUrl } from "@/lib/invoices/invoice-url";
import { evaluateCheckout } from "@/lib/invoices/lifecycle";
import {
  checkoutIdempotencyKey,
  decideSessionReuse,
  METADATA_INVOICE_ID,
  METADATA_INVOICE_NUMBER,
  METADATA_ORGANIZATION_ID,
} from "@/lib/invoices/stripe-payment";
import { getStripe } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation/uuid";

export const runtime = "nodejs";

/*
 * Start (or resume) a Stripe Checkout payment for one invoice.
 *
 * Trust model: the browser sends ONLY an invoice id. Organisation comes from the Clerk
 * session, ownership/visibility/status/amount/currency come from the database
 * (evaluateCheckout in lib/invoices/lifecycle.ts). This route never marks anything PAID:
 * only the signed webhook (app/api/stripe/webhook) does.
 *
 * Duplicate-payment protection: the last session id is stored on the invoice. An open,
 * matching session is re-used; a completed one (paid, or a delayed method settling) refuses
 * a new payment; a stale one is expired before a new one is made. Creation uses a Stripe
 * idempotency key so two concurrent clicks get the same session.
 */

const PROCESSING_MESSAGE =
  "A payment for this invoice is already being processed. Refresh this page in a moment to see the result.";

function jsonError(error: string, status: number, code: string) {
  return NextResponse.json(
    { error, code },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function checkoutUrl(url: string) {
  return NextResponse.json(
    { url },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

function stripeErrorCode(error: unknown) {
  if (error && typeof error === "object") {
    const record = error as { type?: unknown; code?: unknown };
    return {
      type: typeof record.type === "string" ? record.type : undefined,
      code: typeof record.code === "string" ? record.code : undefined,
    };
  }

  return { type: undefined, code: undefined };
}

async function retrieveSession(stripe: Stripe, sessionId: string) {
  try {
    return await stripe.checkout.sessions.retrieve(sessionId);
  } catch (error) {
    // A session from another Stripe mode/account, or deleted test data: treat as absent.
    if (stripeErrorCode(error).code === "resource_missing") {
      return null;
    }

    throw error;
  }
}

export async function POST(request: Request) {
  // Uses the session's active org plus RLS rather than the shared client-workspace resolver:
  // the same boundary (Clerk-signed org id, the organisations RLS policy, ACTIVE filter)
  // without a Clerk Backend API call on the payment path.
  const { userId, orgId } = await auth();

  if (!userId) {
    return jsonError("You must be signed in to make a payment.", 401, "UNAUTHENTICATED");
  }

  if (!orgId) {
    return jsonError(
      "An organisation must be selected before making a payment.",
      403,
      "ORGANISATION_REQUIRED"
    );
  }

  // JSON only: a cross-site HTML form cannot send application/json without a CORS preflight.
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return jsonError("Invalid payment request.", 415, "INVALID_REQUEST");
  }

  let body: { invoiceId?: unknown };

  try {
    body = (await request.json()) as { invoiceId?: unknown };
  } catch {
    return jsonError("Invalid payment request.", 400, "INVALID_REQUEST");
  }

  const invoiceId = typeof body?.invoiceId === "string" ? body.invoiceId.trim() : "";

  if (!isUuid(invoiceId)) {
    return jsonError("Invoice not found.", 404, "INVOICE_NOT_FOUND");
  }

  try {
    // Reads go through the caller's RLS-scoped client, with explicit filters on top.
    const supabase = createServerSupabaseClient();

    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("id, clerk_org_id, name, status")
      .eq("clerk_org_id", orgId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (organizationError) {
      console.error("Stripe Checkout organisation lookup failed:", {
        code: organizationError.code,
      });
      return jsonError("Unable to start payment. Please try again.", 500, "ORGANISATION_LOOKUP_FAILED");
    }

    if (!organization) {
      return jsonError(
        "Your organisation is not available for payments.",
        403,
        "ORGANISATION_UNAVAILABLE"
      );
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(
        "id, organization_id, invoice_number, status, currency, subtotal_cents, tax_cents, total_cents, visible_to_client"
      )
      .eq("id", invoiceId)
      .eq("organization_id", organization.id)
      .eq("visible_to_client", true)
      .neq("status", "DRAFT")
      .maybeSingle();

    if (invoiceError) {
      console.error("Stripe Checkout invoice lookup failed:", { code: invoiceError.code });
      return jsonError("Unable to start payment. Please try again.", 500, "INVOICE_LOOKUP_FAILED");
    }

    const eligibility = evaluateCheckout(invoice, organization.id);

    if (!eligibility.ok) {
      if (eligibility.code === "INVALID_INVOICE_TOTAL" || eligibility.code === "UNSUPPORTED_CURRENCY") {
        console.error("Stripe Checkout refused a stored invoice:", {
          invoiceId,
          code: eligibility.code,
        });
      }

      return jsonError(eligibility.message, eligibility.httpStatus, eligibility.code);
    }

    if (!invoice) {
      // Unreachable: evaluateCheckout refuses a missing invoice. Narrows the type.
      return jsonError("Invoice not found.", 404, "INVOICE_NOT_FOUND");
    }

    const payable = invoice;
    const { amountCents, currency } = eligibility;

    // The stored session id is server-side bookkeeping: read and write it with the service
    // client, still scoped to this invoice AND this organisation.
    const admin = createAdminSupabaseClient();

    const { data: stored, error: storedError } = await admin
      .from("invoices")
      .select("stripe_checkout_session_id")
      .eq("id", payable.id)
      .eq("organization_id", organization.id)
      .maybeSingle();

    if (storedError) {
      console.error("Stripe Checkout session lookup failed:", { code: storedError.code });
      return jsonError("Unable to start payment. Please try again.", 500, "SESSION_LOOKUP_FAILED");
    }

    const stripe = getStripe();
    const previousSessionId: string | null = stored?.stripe_checkout_session_id ?? null;
    const expected = { invoiceId: payable.id, amountCents, currency };

    if (previousSessionId) {
      const previous = await retrieveSession(stripe, previousSessionId);
      const decision = decideSessionReuse(previous, expected, Math.floor(Date.now() / 1000));

      if (decision.action === "PROCESSING") {
        return jsonError(PROCESSING_MESSAGE, 409, "PAYMENT_PROCESSING");
      }

      if (decision.action === "REUSE" && previous?.url) {
        return checkoutUrl(previous.url);
      }

      if (decision.action === "CREATE_NEW" && decision.expirePrevious && previous) {
        try {
          await stripe.checkout.sessions.expire(previous.id);
        } catch {
          // It may have completed in the meantime. Never open a second session over it.
          const recheck = await retrieveSession(stripe, previous.id);

          if (recheck?.status !== "expired") {
            return jsonError(PROCESSING_MESSAGE, 409, "PAYMENT_PROCESSING");
          }
        }
      }
    }

    // Return to the origin the client is signed in on (their session cookie lives there),
    // through the same path builder the invoice email uses.
    const origin = new URL(request.url).origin;
    const invoiceUrl = clientInvoiceUrl(payable.id, origin);
    const taxCents = Number(payable.tax_cents);
    // Stripe charges the stored GST-inclusive total_cents as one line; the description
    // states the GST it contains so the Checkout page matches the invoice.
    const description =
      taxCents > 0
        ? `Payment for ${payable.invoice_number}. Includes GST of ${formatEmailMoney(taxCents, currency)}.`
        : `Payment for ${payable.invoice_number}`;
    const metadata = {
      [METADATA_INVOICE_ID]: payable.id,
      [METADATA_INVOICE_NUMBER]: payable.invoice_number,
      [METADATA_ORGANIZATION_ID]: organization.id,
    };

    const createSession = (previous: string | null) =>
      stripe.checkout.sessions.create(
        {
          mode: "payment",
          line_items: [
            {
              price_data: {
                currency,
                product_data: {
                  name: `Drylake Invoice ${payable.invoice_number}`,
                  description,
                },
                unit_amount: amountCents,
              },
              quantity: 1,
            },
          ],
          client_reference_id: payable.id,
          metadata,
          payment_intent_data: { metadata },
          success_url: `${invoiceUrl}?payment=success`,
          cancel_url: `${invoiceUrl}?payment=cancelled`,
        },
        {
          idempotencyKey: checkoutIdempotencyKey(payable.id, amountCents, currency, previous),
        }
      );

    let session = await createSession(previousSessionId);

    // An idempotent replay can hand back a session created earlier with the same key.
    if (session.status === "complete") {
      return jsonError(PROCESSING_MESSAGE, 409, "PAYMENT_PROCESSING");
    }

    if (session.status !== "open") {
      session = await createSession(session.id);
    }

    if (!session.url || session.status !== "open") {
      console.error("Stripe Checkout Session not usable:", { sessionId: session.id });
      return jsonError("Unable to open secure checkout. Please try again.", 502, "CHECKOUT_URL_MISSING");
    }

    // Record the session so the next click re-uses it. Conditional on the invoice still being
    // payable and on nobody having stored a DIFFERENT session meanwhile.
    const ownership = [
      "stripe_checkout_session_id.is.null",
      `stripe_checkout_session_id.eq.${session.id}`,
      ...(previousSessionId ? [`stripe_checkout_session_id.eq.${previousSessionId}`] : []),
    ].join(",");

    const { data: recorded, error: recordError } = await admin
      .from("invoices")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", payable.id)
      .eq("organization_id", organization.id)
      .in("status", ["OPEN", "OVERDUE"])
      .or(ownership)
      .select("id")
      .maybeSingle();

    if (recordError) {
      // Payment still settles through the webhook; only re-use is lost. Do not block payment.
      console.error("Stripe Checkout session id not recorded:", { code: recordError.code });
    } else if (!recorded) {
      // Paid, voided, or a different session was started concurrently: never offer a second.
      try {
        await stripe.checkout.sessions.expire(session.id);
      } catch {
        // Best effort. The webhook still refuses to double-apply a payment.
      }

      return jsonError(PROCESSING_MESSAGE, 409, "PAYMENT_PROCESSING");
    }

    console.log("Stripe Checkout ready", { invoiceId: payable.id, checkoutSessionId: session.id });

    return checkoutUrl(session.url);
  } catch (error) {
    const { type, code } = stripeErrorCode(error);

    console.error("Stripe Checkout creation failed:", {
      type,
      code,
      name: error instanceof Error ? error.name : undefined,
    });

    return jsonError("Unable to start payment. Please try again.", 500, "CHECKOUT_FAILED");
  }
}
