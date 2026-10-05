import { NextResponse } from "next/server";
import Stripe from "stripe";

import { getStripe } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// =========================================================
// STRIPE WEBHOOK
// =========================================================

export async function POST(request: Request) {
  // -------------------------------------------------------
  // 1. Verify webhook configuration
  // -------------------------------------------------------

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");

    return NextResponse.json(
      { error: "Webhook is not configured" },
      { status: 500 }
    );
  }

  // -------------------------------------------------------
  // 2. Retrieve Stripe signature
  // -------------------------------------------------------

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  // -------------------------------------------------------
  // 3. Read untouched raw request body
  //
  // Stripe webhook signature verification MUST use the raw
  // request body. Do not call request.json() here.
  // -------------------------------------------------------

  const body = await request.text();

  // -------------------------------------------------------
  // 4. Verify Stripe webhook signature
  // -------------------------------------------------------

  let event: Stripe.Event;

  try {
    const stripe = getStripe();

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
  // 5. Process supported Stripe events
  // -------------------------------------------------------

  try {
    switch (event.type) {
      // ---------------------------------------------------
      // Checkout completed
      //
      // For immediate payment methods such as cards,
      // payment_status will normally be "paid".
      //
      // For delayed payment methods, Checkout can complete
      // before the money has actually succeeded.
      // ---------------------------------------------------

      case "checkout.session.completed": {
        const session = event.data.object;

        if (session.payment_status !== "paid") {
          console.log(
            "Checkout completed but payment is not yet paid:",
            {
              sessionId: session.id,
              paymentStatus: session.payment_status,
            }
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
      //
      // Leave the Drylake invoice OPEN/OVERDUE so the
      // client can attempt payment again.
      // ---------------------------------------------------

      case "checkout.session.async_payment_failed": {
        const session = event.data.object;

        console.warn(
          "Stripe asynchronous payment failed:",
          {
            sessionId: session.id,
          }
        );

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

    // Stripe expects a 2xx response once the event has been
    // successfully processed.
    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Stripe webhook processing failed:",
      error
    );

    // Returning a non-2xx response tells Stripe that
    // processing failed and allows Stripe to retry.
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
  // 1. Retrieve Drylake identifiers from Stripe metadata
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
  // 2. Verify Checkout mode
  // -------------------------------------------------------

  if (session.mode !== "payment") {
    throw new Error(
      `Unexpected Stripe Checkout mode for ${session.id}: ${session.mode}`
    );
  }

  // -------------------------------------------------------
  // 3. Verify payment state
  //
  // Never mark an invoice as paid merely because Checkout
  // completed.
  // -------------------------------------------------------

  if (session.payment_status !== "paid") {
    throw new Error(
      `Stripe session ${session.id} has not been paid`
    );
  }

  // -------------------------------------------------------
  // 4. Extract Stripe transaction identifiers
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
  // 5. Create trusted server-side Supabase client
  //
  // Stripe webhooks have no Clerk session.
  //
  // The service-role client can bypass normal RLS, so every
  // invoice query MUST be explicitly constrained.
  // -------------------------------------------------------

  const supabase = createAdminSupabaseClient();

  // -------------------------------------------------------
  // 6. Retrieve invoice
  //
  // Match BOTH invoice ID and organisation ID.
  // -------------------------------------------------------

  const {
    data: invoice,
    error: invoiceError,
  } = await supabase
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
  // 7. Verify stored invoice amount
  // -------------------------------------------------------

  const expectedAmount = Number(
    invoice.total_cents
  );

  if (
    !Number.isSafeInteger(expectedAmount) ||
    expectedAmount <= 0
  ) {
    throw new Error(
      `Invoice ${invoice.invoice_number} has an invalid stored total`
    );
  }

  // -------------------------------------------------------
  // 8. Verify Stripe amount
  //
  // Metadata identifies the invoice but must NOT be trusted
  // as proof that the correct amount was paid.
  // -------------------------------------------------------

  const stripeAmount = session.amount_total;

  if (
    stripeAmount === null ||
    stripeAmount !== expectedAmount
  ) {
    throw new Error(
      `Payment amount mismatch for invoice ${invoice.invoice_number}. ` +
        `Expected ${expectedAmount}, received ${stripeAmount}`
    );
  }

  // -------------------------------------------------------
  // 9. Verify currency
  // -------------------------------------------------------

  if (
    typeof invoice.currency !== "string" ||
    !invoice.currency
  ) {
    throw new Error(
      `Invoice ${invoice.invoice_number} has an invalid currency`
    );
  }

  const expectedCurrency =
    invoice.currency.toLowerCase();

  const stripeCurrency =
    session.currency?.toLowerCase();

  if (
    !stripeCurrency ||
    stripeCurrency !== expectedCurrency
  ) {
    throw new Error(
      `Payment currency mismatch for invoice ${invoice.invoice_number}. ` +
        `Expected ${expectedCurrency}, received ${stripeCurrency ?? "null"}`
    );
  }

  // -------------------------------------------------------
  // 10. Idempotency
  //
  // Stripe may deliver the same event more than once.
  //
  // Never rewrite paid_at for an already-paid invoice.
  // We may, however, repair missing Stripe identifiers.
  // -------------------------------------------------------

  if (invoice.status === "PAID") {
    console.log(
      `Invoice ${invoice.invoice_number} is already PAID`
    );

    const checkoutSessionNeedsRepair =
      invoice.stripe_checkout_session_id !==
      checkoutSessionId;

    const paymentIntentNeedsRepair =
      paymentIntentId !== null &&
      invoice.stripe_payment_intent_id !==
        paymentIntentId;

    if (
      checkoutSessionNeedsRepair ||
      paymentIntentNeedsRepair
    ) {
      const repairPayload = {
        stripe_checkout_session_id:
          checkoutSessionId,

        ...(paymentIntentId
          ? {
              stripe_payment_intent_id:
                paymentIntentId,
            }
          : {}),
      };

      const { error: repairError } =
        await supabase
          .from("invoices")
          .update(repairPayload)
          .eq("id", invoice.id)
          .eq(
            "organization_id",
            organizationId
          )
          .eq("status", "PAID");

      if (repairError) {
        throw new Error(
          `Unable to repair Stripe identifiers: ${repairError.message}`
        );
      }

      console.log(
        `Stripe identifiers repaired for invoice ${invoice.invoice_number}`
      );
    }

    return;
  }

  // -------------------------------------------------------
  // 11. Verify invoice is payable
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
  // 12. Mark invoice PAID
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

  // -------------------------------------------------------
  // 13. Conditional update
  //
  // Include:
  // - invoice ID
  // - organisation ID
  // - previously observed status
  //
  // This reduces the chance that a concurrent state change
  // is accidentally overwritten.
  // -------------------------------------------------------

  const {
    data: updatedInvoice,
    error: updateError,
  } = await supabase
    .from("invoices")
    .update(updatePayload)
    .eq("id", invoice.id)
    .eq(
      "organization_id",
      organizationId
    )
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

  // Another process may have changed the invoice between
  // our SELECT and UPDATE.
  if (!updatedInvoice) {
    throw new Error(
      `Invoice ${invoice.invoice_number} changed before payment could be recorded`
    );
  }

  // -------------------------------------------------------
  // 14. Success
  // -------------------------------------------------------

  console.log(
    `Invoice ${invoice.invoice_number} marked PAID`,
    {
      checkoutSessionId,
      paymentIntentId,
      paidAt,
    }
  );
}