import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getStripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// =========================================================
// CREATE STRIPE CHECKOUT SESSION
// =========================================================

export async function POST(request: Request) {
  try {
    // -------------------------------------------------------
    // 1. Authenticate Clerk user
    // -------------------------------------------------------

    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: "No active organisation" },
        { status: 403 }
      );
    }

    // -------------------------------------------------------
    // 2. Parse request body
    //
    // The browser is ONLY allowed to provide the invoice ID.
    //
    // The browser must never determine:
    // - invoice amount
    // - currency
    // - invoice number
    // - payment status
    // - organisation
    // -------------------------------------------------------

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const invoiceId =
      typeof body === "object" &&
      body !== null &&
      "invoiceId" in body &&
      typeof body.invoiceId === "string"
        ? body.invoiceId.trim()
        : null;

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // 3. Validate invoice identifier
    //
    // Return the same general "unavailable" response that
    // would be returned for an invoice the user cannot see.
    // -------------------------------------------------------

    if (!UUID_REGEX.test(invoiceId)) {
      return NextResponse.json(
        { error: "Invoice unavailable" },
        { status: 404 }
      );
    }

    // -------------------------------------------------------
    // 4. Create authenticated Supabase client
    //
    // This uses the current Clerk session.
    //
    // RLS therefore remains part of the tenant security
    // boundary.
    // -------------------------------------------------------

    const supabase = createServerSupabaseClient();

    // -------------------------------------------------------
    // 5. Resolve active Drylake organisation
    // -------------------------------------------------------

    const {
      data: organization,
      error: organizationError,
    } = await supabase
      .from("organizations")
      .select(`
        id,
        clerk_org_id,
        name,
        status
      `)
      .eq("clerk_org_id", orgId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (organizationError) {
      console.error(
        "Stripe Checkout organisation lookup failed:",
        {
          code: organizationError.code,
          message: organizationError.message,
        }
      );

      return NextResponse.json(
        { error: "Unable to start payment" },
        { status: 500 }
      );
    }

    if (!organization) {
      return NextResponse.json(
        { error: "Organisation unavailable" },
        { status: 403 }
      );
    }

    // -------------------------------------------------------
    // 6. Retrieve invoice
    //
    // Security is intentionally layered:
    //
    // 1. Clerk user authentication
    // 2. Active Clerk organisation
    // 3. Authenticated Supabase client
    // 4. Supabase RLS
    // 5. Explicit organization_id constraint
    //
    // The client cannot pay another organisation's invoice
    // simply by changing the invoice ID.
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
        due_date,
        paid_at,
        stripe_checkout_session_id,
        stripe_payment_intent_id
      `)
      .eq("id", invoiceId)
      .eq("organization_id", organization.id)
      .maybeSingle();

    if (invoiceError) {
      console.error(
        "Stripe Checkout invoice lookup failed:",
        {
          code: invoiceError.code,
          message: invoiceError.message,
        }
      );

      return NextResponse.json(
        { error: "Unable to start payment" },
        { status: 500 }
      );
    }

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice unavailable" },
        { status: 404 }
      );
    }

    // -------------------------------------------------------
    // 7. Prevent already-paid invoices being paid again
    // -------------------------------------------------------

    if (invoice.status === "PAID") {
      return NextResponse.json(
        {
          error: "Invoice has already been paid",
          code: "INVOICE_ALREADY_PAID",
        },
        { status: 409 }
      );
    }

    // -------------------------------------------------------
    // 8. Only OPEN / OVERDUE invoices are payable
    //
    // Explicitly prevents payment of:
    // - DRAFT
    // - VOID
    // - PAID
    // - future unsupported statuses
    // -------------------------------------------------------

    if (
      invoice.status !== "OPEN" &&
      invoice.status !== "OVERDUE"
    ) {
      return NextResponse.json(
        {
          error: "Invoice is not payable",
          code: "INVOICE_NOT_PAYABLE",
        },
        { status: 409 }
      );
    }

    // -------------------------------------------------------
    // 9. Validate stored invoice amount
    //
    // Amount comes exclusively from Drylake's database.
    // -------------------------------------------------------

    const totalCents = Number(
      invoice.total_cents
    );

    if (
      !Number.isSafeInteger(totalCents) ||
      totalCents <= 0
    ) {
      console.error(
        `Invoice ${invoice.invoice_number} has invalid total_cents`
      );

      return NextResponse.json(
        { error: "Invoice has an invalid total" },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // 10. Validate stored currency
    // -------------------------------------------------------

    const currency =
      typeof invoice.currency === "string"
        ? invoice.currency
            .trim()
            .toLowerCase()
        : "";

    if (!/^[a-z]{3}$/.test(currency)) {
      console.error(
        `Invoice ${invoice.invoice_number} has invalid currency`
      );

      return NextResponse.json(
        { error: "Invoice has an invalid currency" },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // 11. Determine Drylake application origin
    //
    // This allows:
    // - localhost
    // - Vercel preview
    // - production
    //
    // to redirect back to their own deployment.
    // -------------------------------------------------------

    const origin = new URL(
      request.url
    ).origin;

    // -------------------------------------------------------
    // 12. Initialise Stripe
    //
    // Stripe is intentionally initialised here instead of
    // when the module is imported.
    //
    // This prevents a missing STRIPE_SECRET_KEY from
    // crashing Next.js during build-time route discovery.
    // -------------------------------------------------------

    const stripe = getStripe();

    // -------------------------------------------------------
    // 13. Create Stripe Checkout Session
    //
    // IMPORTANT:
    //
    // totalCents and currency came from the authenticated,
    // organisation-scoped Drylake invoice.
    //
    // They did NOT come from browser input.
    // -------------------------------------------------------

    const session =
      await stripe.checkout.sessions.create(
        {
          mode: "payment",

          line_items: [
            {
              price_data: {
                currency,

                product_data: {
                  name:
                    `Drylake Invoice ${invoice.invoice_number}`,

                  description:
                    `Payment for ${invoice.invoice_number}`,
                },

                unit_amount: totalCents,
              },

              quantity: 1,
            },
          ],

          // Useful reference in Stripe.
          //
          // This is NOT used as an authorization mechanism.
          client_reference_id:
            invoice.id,

          // -------------------------------------------------
          // Checkout Session metadata
          //
          // The webhook uses these identifiers to locate the
          // Drylake invoice after Stripe confirms payment.
          // -------------------------------------------------

          metadata: {
            drylake_invoice_id:
              invoice.id,

            drylake_invoice_number:
              invoice.invoice_number,

            drylake_organization_id:
              organization.id,
          },

          // -------------------------------------------------
          // PaymentIntent metadata
          //
          // Also attach Drylake identifiers directly to the
          // resulting PaymentIntent for reconciliation.
          // -------------------------------------------------

          payment_intent_data: {
            metadata: {
              drylake_invoice_id:
                invoice.id,

              drylake_invoice_number:
                invoice.invoice_number,

              drylake_organization_id:
                organization.id,
            },
          },

          // -------------------------------------------------
          // Return URLs
          // -------------------------------------------------

          success_url:
            `${origin}/client/billing/${invoice.id}?payment=success`,

          cancel_url:
            `${origin}/client/billing/${invoice.id}?payment=cancelled`,
        },

        // ---------------------------------------------------
        // Stripe idempotency
        //
        // Repeated requests for the same invoice should not
        // immediately create multiple Checkout Sessions.
        //
        // After successful payment, the webhook changes the
        // invoice to PAID and this route rejects subsequent
        // payment attempts.
        // ---------------------------------------------------

        {
          idempotencyKey:
            `drylake-checkout-${invoice.id}`,
        }
      );

    // -------------------------------------------------------
    // 14. Verify Stripe returned a Checkout URL
    // -------------------------------------------------------

    if (!session.url) {
      console.error(
        `Stripe Checkout Session ${session.id} has no URL`
      );

      throw new Error(
        "Stripe did not return a Checkout URL"
      );
    }

    // -------------------------------------------------------
    // 15. Log successful Checkout creation
    //
    // Do NOT log payment credentials or secrets.
    // -------------------------------------------------------

    console.log(
      `Stripe Checkout ready for ${invoice.invoice_number}`,
      {
        invoiceId:
          invoice.id,

        checkoutSessionId:
          session.id,
      }
    );

    // -------------------------------------------------------
    // 16. Return Stripe-hosted Checkout URL
    // -------------------------------------------------------

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    // -------------------------------------------------------
    // Never return raw Stripe/database errors to the client.
    // -------------------------------------------------------

    console.error(
      "Stripe Checkout creation failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to start payment",
      },
      {
        status: 500,
      }
    );
  }
}