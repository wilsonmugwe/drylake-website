import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    // -------------------------------------------------------
    // 1. Authenticate user and active Clerk organisation
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
    // 2. Read ONLY the invoice ID from the browser
    //
    // The browser must never decide:
    // - amount
    // - currency
    // - invoice number
    // - payment status
    //
    // Those values come from Drylake's database.
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

    if (!UUID_REGEX.test(invoiceId)) {
      return NextResponse.json(
        { error: "Invoice unavailable" },
        { status: 404 }
      );
    }

    // -------------------------------------------------------
    // 3. Authenticated Supabase client
    //
    // This uses the current Clerk session.
    // RLS remains the actual tenant security boundary.
    // -------------------------------------------------------

    const supabase = createServerSupabaseClient();

    // -------------------------------------------------------
    // 4. Resolve active Drylake organisation
    // -------------------------------------------------------

    const {
      data: organization,
      error: organizationError,
    } = await supabase
      .from("organizations")
      .select("id, clerk_org_id, name, status")
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
    // 5. Retrieve invoice
    //
    // Security is intentionally layered:
    //
    // 1. Clerk user authentication
    // 2. Active Clerk organisation
    // 3. Authenticated Supabase client
    // 4. Supabase invoice RLS
    // 5. Explicit organization_id query narrowing
    //
    // Cross-tenant/hidden/DRAFT invoices therefore behave
    // as unavailable.
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
    // 6. Prevent payment of invoices that are already PAID
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
    // 7. Only OPEN / OVERDUE invoices are payable
    //
    // This explicitly blocks:
    // - DRAFT
    // - VOID
    // - PAID
    // - any future unsupported status
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
    // 8. Validate stored invoice total
    // -------------------------------------------------------

    const totalCents = Number(invoice.total_cents);

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
    // 9. Validate stored currency
    // -------------------------------------------------------

    const currency =
      typeof invoice.currency === "string"
        ? invoice.currency.trim().toLowerCase()
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
    // 10. Determine Drylake application origin
    // -------------------------------------------------------

    const origin = new URL(request.url).origin;

    // -------------------------------------------------------
    // 11. Create Stripe Checkout Session
    //
    // SECURITY:
    //
    // totalCents and currency came from the authenticated,
    // RLS-protected Drylake invoice.
    //
    // They did NOT come from browser input.
    // -------------------------------------------------------

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",

        line_items: [
          {
            price_data: {
              currency,

              product_data: {
                name: `Drylake Invoice ${invoice.invoice_number}`,
                description:
                  `Payment for ${invoice.invoice_number}`,
              },

              unit_amount: totalCents,
            },

            quantity: 1,
          },
        ],

        // This provides another useful reference inside
        // Stripe without using it as an authorization check.
        client_reference_id: invoice.id,

        metadata: {
          drylake_invoice_id: invoice.id,
          drylake_invoice_number:
            invoice.invoice_number,
          drylake_organization_id:
            organization.id,
        },

        payment_intent_data: {
          metadata: {
            drylake_invoice_id: invoice.id,
            drylake_invoice_number:
              invoice.invoice_number,
            drylake_organization_id:
              organization.id,
          },
        },

        success_url:
          `${origin}/client/billing/${invoice.id}?payment=success`,

        cancel_url:
          `${origin}/client/billing/${invoice.id}?payment=cancelled`,
      },

      // -----------------------------------------------------
      // Stripe idempotency key
      //
      // Rapid/retried identical requests for the same
      // invoice will reuse the Stripe API operation instead
      // of immediately creating multiple Checkout Sessions.
      //
      // Once the successful payment webhook changes the
      // invoice to PAID, step 6 prevents future Checkout.
      // -----------------------------------------------------

      {
        idempotencyKey:
          `drylake-checkout-${invoice.id}`,
      }
    );

    // -------------------------------------------------------
    // 12. Stripe must return a hosted Checkout URL
    // -------------------------------------------------------

    if (!session.url) {
      console.error(
        `Stripe Checkout Session ${session.id} has no URL`
      );

      throw new Error(
        "Stripe did not return a Checkout URL"
      );
    }

    console.log(
      `Stripe Checkout ready for ${invoice.invoice_number}`,
      {
        invoiceId: invoice.id,
        checkoutSessionId: session.id,
      }
    );

    // -------------------------------------------------------
    // 13. Return Stripe-hosted Checkout URL
    // -------------------------------------------------------

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error(
      "Stripe Checkout creation failed:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to start payment",
      },
      {
        status: 500,
      }
    );
  }
}