import { NextResponse } from "next/server";
import Stripe from "stripe";

import { stripe } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");

    return NextResponse.json(
      { error: "Webhook is not configured" },
      { status: 500 }
    );
  }

  // -------------------------------------------------------
  // Stripe signature
  // -------------------------------------------------------

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  // IMPORTANT:
  // Stripe webhook verification requires the untouched,
  // raw request body.
  const body = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error(
      "Stripe webhook signature verification failed:",
      error
    );

    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  // -------------------------------------------------------
  // Process supported Stripe events
  // -------------------------------------------------------

  try {
    switch (event.type) {
      // ---------------------------------------------------
      // Immediate payment methods such as cards
      // ---------------------------------------------------

      case "checkout.session.completed": {
        const session = event.data.object;

        // Checkout completion alone is not sufficient for
        // every payment method.
        //
        // Only mark the Drylake invoice PAID when Stripe
        // explicitly says the session has been paid.
        if (session.payment_status !== "paid") {
          console.log(
            "Checkout completed but payment is not yet paid:",
            session.id,
            session.payment_status
          );

          break;
        }

        await markInvoicePaid(session);

        break;
      }

      // ---------------------------------------------------
      // Delayed/asynchronous payment succeeded
      // ---------------------------------------------------

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;

        await markInvoicePaid(session);

        break;
      }

      // ---------------------------------------------------
      // Delayed/asynchronous payment failed
      // ---------------------------------------------------

      case "checkout.session.async_payment_failed": {
        const session = event.data.object;

        console.warn(
          "Stripe asynchronous payment failed:",
          session.id
        );

        // The Drylake invoice intentionally remains
        // OPEN/OVERDUE so the client can try again.
        break;
      }

      // ---------------------------------------------------
      // Ignore unrelated Stripe events
      // ---------------------------------------------------

      default: {
        console.log(
          `Ignoring unsupported Stripe event: ${event.type}`
        );

        break;
      }
    }

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Stripe webhook processing failed:",
      error
    );

    // Returning non-2xx allows Stripe to retry the webhook.
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// =========================================================
// MARK DRYLAKE INVOICE AS PAID
// =========================================================

async function markInvoicePaid(
  session: Stripe.Checkout.Session
) {
  // -------------------------------------------------------
  // 1. Retrieve Drylake identifiers from trusted metadata
  // -------------------------------------------------------

  const invoiceId =
    session.metadata?.drylake_invoice_id;

  const organizationId =
    session.metadata?.drylake_organization_id;

  if (!invoiceId || !organizationId) {
    throw new Error(
      `Stripe session ${session.id} is missing Drylake metadata`
    );
  }

  // -------------------------------------------------------
  // 2. Verify Checkout type and payment state
  // -------------------------------------------------------

  if (session.mode !== "payment") {
    throw new Error(
      `Unexpected Stripe Checkout mode for ${session.id}: ${session.mode}`
    );
  }

  if (session.payment_status !== "paid") {
    throw new Error(
      `Stripe session ${session.id} has not been paid`
    );
  }

  // -------------------------------------------------------
  // 3. Extract Stripe transaction identifiers
  // -------------------------------------------------------

  const checkoutSessionId = session.id;

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  if (!paymentIntentId) {
    console.warn(
      `Stripe session ${session.id} does not contain a PaymentIntent ID`
    );
  }

  // -------------------------------------------------------
  // 4. Trusted server-side Supabase client
  //
  // Stripe has no Clerk session, so webhook processing uses
  // the server-only admin client.
  //
  // Because this client bypasses normal client RLS, every
  // query below is explicitly constrained.
  // -------------------------------------------------------

  const supabase = createAdminSupabaseClient();

  // -------------------------------------------------------
  // 5. Retrieve the Drylake invoice
  //
  // Match BOTH:
  // - invoice ID
  // - organisation ID
  // -------------------------------------------------------

  const { data: invoice, error: invoiceError } =
    await supabase
      .from("invoices")
      .select(`
        id,
        organization_id,
        invoice_number,
        status,
        currency,
        total_cents,
        paid_at,
        stripe_checkout_session_id,
        stripe_payment_intent_id
      `)
      .eq("id", invoiceId)
      .eq("organization_id", organizationId)
      .maybeSingle();

  if (invoiceError) {
    throw new Error(
      `Unable to retrieve Drylake invoice: ${invoiceError.message}`
    );
  }

  if (!invoice) {
    throw new Error(
      `Drylake invoice ${invoiceId} was not found`
    );
  }

  // -------------------------------------------------------
  // 6. Verify amount
  //
  // Never trust metadata alone to determine that the right
  // amount was paid.
  // -------------------------------------------------------

  const expectedAmount = Number(invoice.total_cents);
  const stripeAmount = session.amount_total;

  if (
    !Number.isSafeInteger(expectedAmount) ||
    expectedAmount <= 0
  ) {
    throw new Error(
      `Invoice ${invoice.invoice_number} has an invalid stored total`
    );
  }

  if (
    stripeAmount === null ||
    stripeAmount !== expectedAmount
  ) {
    throw new Error(
      `Payment amount mismatch for invoice ${invoice.invoice_number}. Expected ${expectedAmount}, received ${stripeAmount}`
    );
  }

  // -------------------------------------------------------
  // 7. Verify currency
  // -------------------------------------------------------

  const expectedCurrency =
    invoice.currency.toLowerCase();

  const stripeCurrency =
    session.currency?.toLowerCase();

  if (
    !stripeCurrency ||
    stripeCurrency !== expectedCurrency
  ) {
    throw new Error(
      `Payment currency mismatch for invoice ${invoice.invoice_number}. Expected ${expectedCurrency}, received ${stripeCurrency ?? "null"}`
    );
  }

  // -------------------------------------------------------
  // 8. Idempotency
  //
  // Stripe may deliver the same webhook multiple times.
  //
  // If this invoice is already PAID, don't modify paid_at
  // again. We can still repair missing Stripe IDs if needed.
  // -------------------------------------------------------

  if (invoice.status === "PAID") {
    console.log(
      `Invoice ${invoice.invoice_number} is already PAID`
    );

    const needsStripeIdRepair =
      invoice.stripe_checkout_session_id !==
        checkoutSessionId ||
      (
        paymentIntentId !== null &&
        invoice.stripe_payment_intent_id !==
          paymentIntentId
      );

    if (needsStripeIdRepair) {
      const { error: repairError } =
        await supabase
          .from("invoices")
          .update({
            stripe_checkout_session_id:
              checkoutSessionId,

            ...(paymentIntentId
              ? {
                  stripe_payment_intent_id:
                    paymentIntentId,
                }
              : {}),
          })
          .eq("id", invoice.id)
          .eq(
            "organization_id",
            organizationId
          );

      if (repairError) {
        throw new Error(
          `Unable to repair Stripe identifiers: ${repairError.message}`
        );
      }

      console.log(
        `Stripe identifiers updated for already-paid invoice ${invoice.invoice_number}`
      );
    }

    return;
  }

  // -------------------------------------------------------
  // 9. Verify invoice is currently payable
  // -------------------------------------------------------

  if (
    invoice.status !== "OPEN" &&
    invoice.status !== "OVERDUE"
  ) {
    throw new Error(
      `Invoice ${invoice.invoice_number} cannot be paid from status ${invoice.status}`
    );
  }

  // -------------------------------------------------------
  // 10. Mark invoice PAID
  //
  // Also persist the Stripe Checkout Session and
  // PaymentIntent IDs for reconciliation/auditing.
  //
  // We additionally constrain the update to the status we
  // just validated. This reduces the chance of overwriting
  // a concurrent state change.
  // -------------------------------------------------------

  const paidAt = new Date().toISOString();

  const updatePayload = {
    status: "PAID",
    paid_at: paidAt,
    stripe_checkout_session_id:
      checkoutSessionId,

    ...(paymentIntentId
      ? {
          stripe_payment_intent_id:
            paymentIntentId,
        }
      : {}),
  };

  const { data: updatedInvoice, error: updateError } =
    await supabase
      .from("invoices")
      .update(updatePayload)
      .eq("id", invoice.id)
      .eq("organization_id", organizationId)
      .eq("status", invoice.status)
      .select(`
        id,
        invoice_number,
        status,
        paid_at,
        stripe_checkout_session_id,
        stripe_payment_intent_id
      `)
      .maybeSingle();

  if (updateError) {
    throw new Error(
      `Unable to mark invoice paid: ${updateError.message}`
    );
  }

  // If another process changed the invoice between our
  // SELECT and UPDATE, the conditional update may affect
  // zero rows.
  if (!updatedInvoice) {
    throw new Error(
      `Invoice ${invoice.invoice_number} changed before payment could be recorded`
    );
  }

  console.log(
    `Invoice ${invoice.invoice_number} marked PAID`,
    {
      checkoutSessionId,
      paymentIntentId,
      paidAt,
    }
  );
}