import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getStripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation/uuid";

export const runtime = "nodejs";

type CheckoutRequestBody = {
  invoiceId?: unknown;
};

function jsonError(
  error: string,
  status: number,
  code?: string
) {
  return NextResponse.json(
    {
      error,
      ...(code ? { code } : {}),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(
  request: Request
) {
  // ---------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------

  const { userId, orgId } =
    await auth();

  if (!userId) {
    return jsonError(
      "You must be signed in to make a payment.",
      401,
      "UNAUTHENTICATED"
    );
  }

  if (!orgId) {
    return jsonError(
      "An organisation must be selected before making a payment.",
      403,
      "ORGANISATION_REQUIRED"
    );
  }

  // ---------------------------------------------------------
  // Parse request
  //
  // The browser is allowed to send ONLY the invoice ID.
  //
  // Amount and currency are loaded from Drylake's database.
  // ---------------------------------------------------------

  let body: CheckoutRequestBody;

  try {
    body =
      (await request.json()) as CheckoutRequestBody;
  } catch {
    return jsonError(
      "Invalid payment request.",
      400,
      "INVALID_REQUEST"
    );
  }

  const invoiceId =
    typeof body.invoiceId === "string"
      ? body.invoiceId.trim()
      : "";

  if (!isUuid(invoiceId)) {
    return jsonError(
      "Invoice not found.",
      404,
      "INVOICE_NOT_FOUND"
    );
  }

  try {
    const supabase =
      createServerSupabaseClient();

    // -------------------------------------------------------
    // Resolve authenticated organisation
    // -------------------------------------------------------

    const {
      data: organization,
      error: organizationError,
    } = await supabase
      .from("organizations")
      .select(
        `
          id,
          clerk_org_id,
          name,
          status
        `
      )
      .eq("clerk_org_id", orgId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (organizationError) {
      console.error(
        "Stripe Checkout organisation lookup failed:",
        {
          code:
            organizationError.code,
          message:
            organizationError.message,
        }
      );

      return jsonError(
        "Unable to start payment.",
        500,
        "ORGANISATION_LOOKUP_FAILED"
      );
    }

    if (!organization) {
      return jsonError(
        "Your organisation is not available for payments.",
        403,
        "ORGANISATION_UNAVAILABLE"
      );
    }

    // -------------------------------------------------------
    // Load payable invoice
    //
    // Explicit organisation filter is used in addition to RLS.
    // -------------------------------------------------------

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
          visible_to_client
        `
      )
      .eq("id", invoiceId)
      .eq(
        "organization_id",
        organization.id
      )
      .eq("visible_to_client", true)
      .maybeSingle();

    if (invoiceError) {
      console.error(
        "Stripe Checkout invoice lookup failed:",
        {
          code: invoiceError.code,
          message:
            invoiceError.message,
        }
      );

      return jsonError(
        "Unable to start payment.",
        500,
        "INVOICE_LOOKUP_FAILED"
      );
    }

    if (!invoice) {
      return jsonError(
        "Invoice not found.",
        404,
        "INVOICE_NOT_FOUND"
      );
    }

    // -------------------------------------------------------
    // Lifecycle validation
    // -------------------------------------------------------

    if (invoice.status === "PAID") {
      return jsonError(
        "This invoice has already been paid.",
        409,
        "INVOICE_ALREADY_PAID"
      );
    }

    if (
      invoice.status !== "OPEN" &&
      invoice.status !== "OVERDUE"
    ) {
      return jsonError(
        "This invoice is not currently available for payment.",
        409,
        "INVOICE_NOT_PAYABLE"
      );
    }

    // -------------------------------------------------------
    // Validate trusted amount
    // -------------------------------------------------------

    const totalCents = Number(
      invoice.total_cents
    );

    if (
      !Number.isSafeInteger(
        totalCents
      ) ||
      totalCents <= 0
    ) {
      console.error(
        "Stripe Checkout invalid invoice total:",
        {
          invoiceId: invoice.id,
          invoiceNumber:
            invoice.invoice_number,
          totalCents:
            invoice.total_cents,
        }
      );

      return jsonError(
        "This invoice cannot currently be paid online.",
        409,
        "INVALID_INVOICE_TOTAL"
      );
    }

    // -------------------------------------------------------
    // Validate currency
    // -------------------------------------------------------

    if (
      typeof invoice.currency !==
        "string" ||
      !invoice.currency.trim()
    ) {
      console.error(
        "Stripe Checkout invalid currency:",
        {
          invoiceId: invoice.id,
          currency:
            invoice.currency,
        }
      );

      return jsonError(
        "This invoice cannot currently be paid online.",
        409,
        "INVALID_CURRENCY"
      );
    }

    const currency =
      invoice.currency
        .trim()
        .toLowerCase();

    // Drylake currently invoices in AUD.
    //
    // Keep this explicit so a bad database value cannot
    // unexpectedly create a Checkout Session in another
    // currency.

    if (currency !== "aud") {
      return jsonError(
        "Online payment is currently available for AUD invoices only.",
        409,
        "UNSUPPORTED_CURRENCY"
      );
    }

    // -------------------------------------------------------
    // Origin
    //
    // Use the incoming request origin rather than accepting
    // a redirect URL from the browser.
    // -------------------------------------------------------

    const requestUrl =
      new URL(request.url);

    const origin =
      requestUrl.origin;

    // -------------------------------------------------------
    // Stripe Checkout
    //
    // IMPORTANT:
    //
    // totalCents and currency came from the authenticated,
    // organisation-scoped Drylake invoice.
    //
    // They did NOT come from browser input.
    // -------------------------------------------------------

    const stripe = getStripe();

    const session =
      await stripe.checkout.sessions.create({
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

              unit_amount:
                totalCents,
            },

            quantity: 1,
          },
        ],

        client_reference_id:
          invoice.id,

        metadata: {
          drylake_invoice_id:
            invoice.id,

          drylake_invoice_number:
            invoice.invoice_number,

          drylake_organization_id:
            organization.id,
        },

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

        success_url:
          `${origin}/client/billing/${invoice.id}?payment=success`,

        cancel_url:
          `${origin}/client/billing/${invoice.id}?payment=cancelled`,
      });

    // NOTE:
    //
    // There is deliberately no permanent invoice-based Stripe
    // idempotency key here.
    //
    // A client may legitimately abandon or cancel Checkout and
    // need a completely fresh Session later.
    //
    // The client button prevents accidental rapid double clicks,
    // while the webhook and invoice lifecycle prevent a paid
    // invoice from being paid again through Drylake.

    if (!session.url) {
      console.error(
        `Stripe Checkout Session ${session.id} has no URL`
      );

      return jsonError(
        "Unable to open secure checkout.",
        500,
        "CHECKOUT_URL_MISSING"
      );
    }

    console.log(
      `Stripe Checkout ready for ${invoice.invoice_number}`,
      {
        invoiceId:
          invoice.id,

        checkoutSessionId:
          session.id,
      }
    );

    return NextResponse.json(
      {
        url: session.url,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Stripe Checkout creation failed:",
      error instanceof Error
        ? error.message
        : error
    );

    return jsonError(
      "Unable to start payment. Please try again.",
      500,
      "CHECKOUT_FAILED"
    );
  }
}