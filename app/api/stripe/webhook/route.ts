import { NextResponse } from "next/server";
import Stripe from "stripe";

import { getStripe } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(
  request: Request
) {
  // ---------------------------------------------------------
  // Webhook configuration
  // ---------------------------------------------------------

  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error(
      "Missing STRIPE_WEBHOOK_SECRET"
    );

    return NextResponse.json(
      {
        error:
          "Webhook is not configured",
      },
      {
        status: 500,
      }
    );
  }

  // ---------------------------------------------------------
  // Stripe signature
  // ---------------------------------------------------------

  const signature =
    request.headers.get(
      "stripe-signature"
    );

  if (!signature) {
    return NextResponse.json(
      {
        error:
          "Missing Stripe signature",
      },
      {
        status: 400,
      }
    );
  }

  // ---------------------------------------------------------
  // IMPORTANT:
  //
  // Stripe signature verification requires the raw body.
  // Do NOT call request.json() before constructEvent().
  // ---------------------------------------------------------

  const body =
    await request.text();

  let event: Stripe.Event;

  try {
    const stripe =
      getStripe();

    event =
      stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
  } catch (error) {
    console.error(
      "Stripe webhook signature verification failed:",
      error instanceof Error
        ? error.message
        : error
    );

    return NextResponse.json(
      {
        error:
          "Invalid webhook signature",
      },
      {
        status: 400,
      }
    );
  }

  // ---------------------------------------------------------
  // Process supported events
  // ---------------------------------------------------------

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session =
          event.data.object;

        // Checkout completion alone is not proof that funds
        // succeeded for every payment method.

        if (
          session.payment_status !==
          "paid"
        ) {
          console.log(
            "Checkout completed but payment is not yet paid:",
            {
              eventId:
                event.id,

              sessionId:
                session.id,

              paymentStatus:
                session.payment_status,
            }
          );

          break;
        }

        await markInvoicePaid(
          session,
          event.id
        );

        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session =
          event.data.object;

        await markInvoicePaid(
          session,
          event.id
        );

        break;
      }

      case "checkout.session.async_payment_failed": {
        const session =
          event.data.object;

        console.warn(
          "Stripe asynchronous payment failed:",
          {
            eventId:
              event.id,

            sessionId:
              session.id,
          }
        );

        // Invoice remains OPEN/OVERDUE.
        // The client can attempt payment again.

        break;
      }

      default: {
        console.log(
          `Ignoring unsupported Stripe event: ${event.type}`,
          {
            eventId:
              event.id,
          }
        );
      }
    }

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Stripe webhook processing failed:",
      error instanceof Error
        ? error.message
        : error
    );

    // Non-2xx causes Stripe to retry the event.

    return NextResponse.json(
      {
        error:
          "Webhook processing failed",
      },
      {
        status: 500,
      }
    );
  }
}

async function markInvoicePaid(
  session: Stripe.Checkout.Session,
  stripeEventId: string
) {
  // ---------------------------------------------------------
  // Drylake identifiers
  // ---------------------------------------------------------

  const invoiceId =
    session.metadata
      ?.drylake_invoice_id;

  const organizationId =
    session.metadata
      ?.drylake_organization_id;

  if (
    !invoiceId ||
    !organizationId
  ) {
    throw new Error(
      `Stripe session ${session.id} is missing Drylake metadata`
    );
  }

  // ---------------------------------------------------------
  // Checkout verification
  // ---------------------------------------------------------

  if (
    session.mode !== "payment"
  ) {
    throw new Error(
      `Unexpected Stripe Checkout mode for ${session.id}: ${session.mode}`
    );
  }

  if (
    session.payment_status !==
    "paid"
  ) {
    throw new Error(
      `Stripe session ${session.id} has not been paid`
    );
  }

  // ---------------------------------------------------------
  // Stripe transaction identifiers
  // ---------------------------------------------------------

  const checkoutSessionId =
    session.id;

  const paymentIntentId =
    typeof session.payment_intent ===
    "string"
      ? session.payment_intent
      : session.payment_intent
          ?.id ?? null;

  if (!paymentIntentId) {
    console.warn(
      `Stripe session ${session.id} does not contain a PaymentIntent ID`
    );
  }

  // ---------------------------------------------------------
  // Trusted server-side database client
  // ---------------------------------------------------------

  const supabase =
    createAdminSupabaseClient();

  // ---------------------------------------------------------
  // Load exact Drylake invoice
  //
  // Match BOTH invoice and organisation.
  // ---------------------------------------------------------

  const {
    data: invoice,
    error: invoiceError,
  } = await supabase
    .from("invoices")
    .select(
      `
        id,
        organization_id,
        invoice_number,
        status,
        currency,
        total_cents,
        paid_at,
        stripe_checkout_session_id,
        stripe_payment_intent_id
      `
    )
    .eq("id", invoiceId)
    .eq(
      "organization_id",
      organizationId
    )
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

  // ---------------------------------------------------------
  // Verify stored amount
  // ---------------------------------------------------------

  const expectedAmount =
    Number(invoice.total_cents);

  if (
    !Number.isSafeInteger(
      expectedAmount
    ) ||
    expectedAmount <= 0
  ) {
    throw new Error(
      `Invoice ${invoice.invoice_number} has an invalid stored total`
    );
  }

  // ---------------------------------------------------------
  // Verify Stripe amount
  //
  // Metadata identifies the invoice but is NOT proof that
  // the correct amount was paid.
  // ---------------------------------------------------------

  const stripeAmount =
    session.amount_total;

  if (
    stripeAmount === null ||
    stripeAmount !==
      expectedAmount
  ) {
    throw new Error(
      `Payment amount mismatch for invoice ${invoice.invoice_number}. ` +
        `Expected ${expectedAmount}, received ${stripeAmount}`
    );
  }

  // ---------------------------------------------------------
  // Verify currency
  // ---------------------------------------------------------

  if (
    typeof invoice.currency !==
      "string" ||
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
    stripeCurrency !==
      expectedCurrency
  ) {
    throw new Error(
      `Payment currency mismatch for invoice ${invoice.invoice_number}. ` +
        `Expected ${expectedCurrency}, received ${stripeCurrency ?? "null"}`
    );
  }

  // ---------------------------------------------------------
  // Idempotency
  //
  // Stripe may send the same event more than once.
  // Never rewrite paid_at on an already-paid invoice.
  // ---------------------------------------------------------

  if (
    invoice.status === "PAID"
  ) {
    console.log(
      `Invoice ${invoice.invoice_number} is already PAID`,
      {
        stripeEventId,
      }
    );

    // Repair missing/different Stripe identifiers without
    // modifying paid_at.

    const sessionNeedsRepair =
      invoice
        .stripe_checkout_session_id !==
      checkoutSessionId;

    const intentNeedsRepair =
      paymentIntentId !== null &&
      invoice
        .stripe_payment_intent_id !==
        paymentIntentId;

    if (
      sessionNeedsRepair ||
      intentNeedsRepair
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

      const {
        error: repairError,
      } = await supabase
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
    }

    return;
  }

  // ---------------------------------------------------------
  // Invoice must still be payable
  // ---------------------------------------------------------

  if (
    invoice.status !== "OPEN" &&
    invoice.status !== "OVERDUE"
  ) {
    throw new Error(
      `Invoice ${invoice.invoice_number} cannot be paid from status ${invoice.status}`
    );
  }

  // ---------------------------------------------------------
  // Mark PAID
  // ---------------------------------------------------------

  const paidAt =
    new Date().toISOString();

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
    .eq(
      "status",
      invoice.status
    )
    .select(
      `
        id,
        invoice_number,
        status,
        paid_at,
        stripe_checkout_session_id,
        stripe_payment_intent_id
      `
    )
    .maybeSingle();

  if (updateError) {
    throw new Error(
      `Unable to mark invoice paid: ${updateError.message}`
    );
  }

  if (!updatedInvoice) {
    // A concurrent webhook/process may have completed first.
    //
    // Re-read before treating this as an actual failure.

    const {
      data: currentInvoice,
      error: currentError,
    } = await supabase
      .from("invoices")
      .select(
        `
          id,
          status,
          stripe_checkout_session_id,
          stripe_payment_intent_id
        `
      )
      .eq("id", invoice.id)
      .eq(
        "organization_id",
        organizationId
      )
      .maybeSingle();

    if (currentError) {
      throw new Error(
        `Unable to verify concurrent payment update: ${currentError.message}`
      );
    }

    if (
      currentInvoice?.status ===
      "PAID"
    ) {
      console.log(
        `Invoice ${invoice.invoice_number} was marked PAID concurrently`,
        {
          stripeEventId,
        }
      );

      return;
    }

    throw new Error(
      `Invoice ${invoice.invoice_number} changed before payment could be recorded`
    );
  }

  // ---------------------------------------------------------
  // Audit successful payment
  //
  // Do not fail payment reconciliation merely because the
  // secondary audit insert fails.
  // ---------------------------------------------------------

  const {
    error: auditError,
  } = await supabase
    .from("audit_logs")
    .insert({
      actor_clerk_user_id:
        null,

      action:
        "INVOICE_PAYMENT_RECEIVED",

      entity_type:
        "invoice",

      entity_id:
        invoice.id,

      metadata: {
        organization_id:
          organizationId,

        invoice_number:
          invoice.invoice_number,

        stripe_event_id:
          stripeEventId,

        stripe_checkout_session_id:
          checkoutSessionId,

        stripe_payment_intent_id:
          paymentIntentId,

        total_cents:
          expectedAmount,

        currency:
          expectedCurrency,
      },
    });

  if (auditError) {
    console.error(
      "Stripe payment audit failed:",
      {
        code:
          auditError.code,

        message:
          auditError.message,

        invoiceId:
          invoice.id,
      }
    );
  }

  console.log(
    `Invoice ${invoice.invoice_number} marked PAID`,
    {
      stripeEventId,
      checkoutSessionId,
      paymentIntentId,
      paidAt,
    }
  );
}