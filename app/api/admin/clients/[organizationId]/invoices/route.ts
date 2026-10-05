import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isGstRegistered } from "@/lib/tax";

const ALLOWED_CURRENCIES = new Set(["AUD"]);

type RouteContext = {
  params: Promise<{
    organizationId: string;
  }>;
};

function redirectTo(
  path: string,
  request: Request
) {
  return NextResponse.redirect(
    new URL(path, request.url),
    303
  );
}

function redirectWithError(
  organizationId: string,
  message: string,
  request: Request
) {
  const url = new URL(
    `/admin/clients/${organizationId}/invoices/new`,
    request.url
  );

  url.searchParams.set("error", message);

  return NextResponse.redirect(url, 303);
}

function parseMoneyToCents(
  value: FormDataEntryValue | null
) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [wholePart, decimalPart = ""] =
    normalized.split(".");

  const whole = Number(wholePart);

  const fraction = Number(
    decimalPart.padEnd(2, "0")
  );

  if (
    !Number.isSafeInteger(whole) ||
    !Number.isSafeInteger(fraction)
  ) {
    return null;
  }

  const cents =
    whole * 100 + fraction;

  if (
    !Number.isSafeInteger(cents) ||
    cents < 0 ||
    cents > 999_999_999
  ) {
    return null;
  }

  return cents;
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(
    `${value}T00:00:00Z`
  );

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  // ---------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------

  const { userId } = await auth();

  if (!userId) {
    return redirectTo(
      "/sign-in?redirect_url=/admin",
      request
    );
  }

  // ---------------------------------------------------------
  // Platform-admin authorization
  // ---------------------------------------------------------

  const platformAdmin =
    await isPlatformAdmin();

  if (!platformAdmin) {
    return new NextResponse("Forbidden", {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const { organizationId } =
    await context.params;

  // ---------------------------------------------------------
  // Parse form
  // ---------------------------------------------------------

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return redirectWithError(
      organizationId,
      "The invoice form could not be processed. Please try again.",
      request
    );
  }

  const rawProjectId =
    formData.get("projectId");

  const rawSubtotal =
    formData.get("subtotal");

  const rawTax =
    formData.get("tax");

  const rawDueDate =
    formData.get("dueDate");

  const rawVisibleToClient =
    formData.get("visibleToClient");

  // ---------------------------------------------------------
  // Validate money
  // ---------------------------------------------------------

  const subtotalCents =
    parseMoneyToCents(rawSubtotal);

  const taxCents =
    isGstRegistered()
      ? parseMoneyToCents(rawTax)
      : 0;

  if (
    subtotalCents === null ||
    subtotalCents <= 0 ||
    taxCents === null
  ) {
    return redirectWithError(
      organizationId,
      "Enter a valid invoice amount.",
      request
    );
  }

  const totalCents =
    subtotalCents + taxCents;

  if (
    !Number.isSafeInteger(totalCents) ||
    totalCents <= 0 ||
    totalCents > 999_999_999
  ) {
    return redirectWithError(
      organizationId,
      "The invoice total is invalid.",
      request
    );
  }

  // ---------------------------------------------------------
  // Currency
  // ---------------------------------------------------------

  const currency = "AUD";

  if (!ALLOWED_CURRENCIES.has(currency)) {
    return redirectWithError(
      organizationId,
      "The selected currency is not supported.",
      request
    );
  }

  // ---------------------------------------------------------
  // Due date
  // ---------------------------------------------------------

  let dueDate: string | null = null;

  if (
    typeof rawDueDate === "string" &&
    rawDueDate.trim()
  ) {
    dueDate = rawDueDate.trim();

    if (!validDate(dueDate)) {
      return redirectWithError(
        organizationId,
        "Enter a valid due date.",
        request
      );
    }
  }

  const visibleToClient =
    rawVisibleToClient === "true";

  const supabase =
    createAdminSupabaseClient();

  // ---------------------------------------------------------
  // Organisation validation
  // ---------------------------------------------------------

  const {
    data: organization,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .select("id, status")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError) {
    console.error(
      "Invoice organisation validation failed:",
      {
        code: organizationError.code,
        message: organizationError.message,
      }
    );

    return redirectWithError(
      organizationId,
      "Unable to create the invoice. Please try again.",
      request
    );
  }

  if (!organization) {
    return redirectWithError(
      organizationId,
      "The client organisation could not be found.",
      request
    );
  }

  if (organization.status !== "ACTIVE") {
    return redirectWithError(
      organizationId,
      "Invoices cannot be created for an inactive organisation.",
      request
    );
  }

  // ---------------------------------------------------------
  // Optional project validation
  //
  // The project must belong to this organisation.
  // ---------------------------------------------------------

  let projectId: string | null = null;

  if (
    typeof rawProjectId === "string" &&
    rawProjectId.trim()
  ) {
    projectId = rawProjectId.trim();

    const {
      data: project,
      error: projectError,
    } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq(
        "organization_id",
        organization.id
      )
      .maybeSingle();

    if (projectError) {
      console.error(
        "Invoice project validation failed:",
        {
          code: projectError.code,
          message: projectError.message,
        }
      );

      return redirectWithError(
        organizationId,
        "Unable to validate the selected project.",
        request
      );
    }

    if (!project) {
      return redirectWithError(
        organizationId,
        "The selected project does not belong to this client.",
        request
      );
    }
  }

  // ---------------------------------------------------------
  // Create invoice
  //
  // IMPORTANT:
  // invoice_number is deliberately omitted.
  //
  // PostgreSQL generates it atomically using:
  // generate_drylake_invoice_number()
  //
  // This prevents duplicate invoice numbers and protects
  // concurrent invoice creation.
  // ---------------------------------------------------------

  const {
    data: invoice,
    error: invoiceError,
  } = await supabase
    .from("invoices")
    .insert({
      organization_id: organization.id,
      project_id: projectId,

      stripe_invoice_id: null,

      status: "DRAFT",

      currency,

      subtotal_cents: subtotalCents,
      tax_cents: taxCents,
      total_cents: totalCents,

      due_date: dueDate,

      paid_at: null,

      visible_to_client:
        visibleToClient,
    })
    .select(
      `
        id,
        invoice_number
      `
    )
    .single();

  if (invoiceError || !invoice) {
    console.error(
      "Invoice creation failed:",
      {
        code: invoiceError?.code,
        message: invoiceError?.message,
      }
    );

    return redirectWithError(
      organizationId,
      "Unable to create the invoice. Please try again.",
      request
    );
  }

  // ---------------------------------------------------------
  // Audit event
  // ---------------------------------------------------------

  const { error: auditError } =
    await supabase
      .from("audit_logs")
      .insert({
        actor_clerk_user_id: userId,

        action: "INVOICE_CREATED",

        entity_type: "invoice",

        entity_id: invoice.id,

        metadata: {
          organization_id:
            organization.id,

          project_id: projectId,

          invoice_number:
            invoice.invoice_number,

          total_cents:
            totalCents,

          currency,

          visible_to_client:
            visibleToClient,
        },
      });

  if (auditError) {
    console.error(
      "Invoice audit log failed:",
      {
        code: auditError.code,
        message: auditError.message,
      }
    );
  }

  // ---------------------------------------------------------
  // Success
  //
  // Go directly to the invoice that was just created.
  // ---------------------------------------------------------

  return redirectTo(
    `/admin/invoices/${invoice.id}`,
    request
  );
}