import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isGstRegistered } from "@/lib/tax";
import { isUuid } from "@/lib/validation/uuid";

const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

const ALLOWED_CURRENCIES = new Set(["AUD"]);

function redirectTo(path: string, request: Request) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

function parseMoneyToCents(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  // Strict decimal money format.
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [wholePart, decimalPart = ""] = normalized.split(".");

  const whole = Number(wholePart);
  const fraction = Number(decimalPart.padEnd(2, "0"));

  if (
    !Number.isSafeInteger(whole) ||
    !Number.isSafeInteger(fraction)
  ) {
    return null;
  }

  const cents = whole * 100 + fraction;

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

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

type RouteContext = {
  params: Promise<{
    organizationId: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const platformAdmin = await isPlatformAdmin();

  if (!platformAdmin) {
    return new NextResponse("Forbidden", {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const { organizationId } = await context.params;

  // A malformed ID can never match a row: 404 before the query, not a database error.
  if (!isUuid(organizationId)) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  const formData = await request.formData();

  const rawInvoiceNumber = formData.get("invoiceNumber");
  const rawProjectId = formData.get("projectId");
  const rawSubtotal = formData.get("subtotal");
  const rawTax = formData.get("tax");
  const rawDueDate = formData.get("dueDate");
  const rawVisibleToClient = formData.get("visibleToClient");

  if (typeof rawInvoiceNumber !== "string") {
    return new NextResponse("Invalid invoice number.", {
      status: 400,
    });
  }

  const invoiceNumber = rawInvoiceNumber
    .trim()
    .replace(/\s+/g, " ");

  if (
    invoiceNumber.length < 2 ||
    invoiceNumber.length > 60 ||
    CONTROL_CHARACTERS.test(invoiceNumber)
  ) {
    return new NextResponse("Invalid invoice number.", {
      status: 400,
    });
  }

  const subtotalCents = parseMoneyToCents(rawSubtotal);
  // Unregistered for GST: tax is always zero, whatever the form sent.
  const taxCents = isGstRegistered() ? parseMoneyToCents(rawTax) : 0;

  if (
    subtotalCents === null ||
    subtotalCents <= 0 ||
    taxCents === null
  ) {
    return new NextResponse("Invalid invoice amount.", {
      status: 400,
    });
  }

  const totalCents = subtotalCents + taxCents;

  if (
    !Number.isSafeInteger(totalCents) ||
    totalCents <= 0 ||
    totalCents > 999_999_999
  ) {
    return new NextResponse("Invalid invoice total.", {
      status: 400,
    });
  }

  const currency = "AUD";

  if (!ALLOWED_CURRENCIES.has(currency)) {
    return new NextResponse("Unsupported currency.", {
      status: 400,
    });
  }

  let dueDate: string | null = null;

  if (typeof rawDueDate === "string" && rawDueDate.trim()) {
    dueDate = rawDueDate.trim();

    if (!validDate(dueDate)) {
      return new NextResponse("Invalid due date.", {
        status: 400,
      });
    }
  }

  const visibleToClient =
    rawVisibleToClient === "true";

  const supabase = createAdminSupabaseClient();

  // ---------------------------------------------------------
  // Organisation authorization boundary
  // ---------------------------------------------------------

  const { data: organization, error: organizationError } =
    await supabase
      .from("organizations")
      .select("id, status")
      .eq("id", organizationId)
      .maybeSingle();

  if (organizationError) {
    console.error("Invoice organisation validation failed:", {
      code: organizationError.code,
      message: organizationError.message,
    });

    return new NextResponse("Unable to create invoice.", {
      status: 500,
    });
  }

  if (!organization) {
    return new NextResponse("Organisation not found.", {
      status: 404,
    });
  }

  if (organization.status !== "ACTIVE") {
    return new NextResponse(
      "Invoices cannot be created for an inactive organisation.",
      {
        status: 409,
      }
    );
  }

  // ---------------------------------------------------------
  // Optional project validation
  //
  // Critical: project must belong to THIS organisation.
  // ---------------------------------------------------------

  let projectId: string | null = null;

  if (
    typeof rawProjectId === "string" &&
    rawProjectId.trim()
  ) {
    projectId = rawProjectId.trim();

    const { data: project, error: projectError } =
      await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("organization_id", organization.id)
        .maybeSingle();

    if (projectError) {
      console.error("Invoice project validation failed:", {
        code: projectError.code,
        message: projectError.message,
      });

      return new NextResponse("Unable to create invoice.", {
        status: 500,
      });
    }

    if (!project) {
      return new NextResponse(
        "Project does not belong to this organisation.",
        {
          status: 400,
        }
      );
    }
  }

  // ---------------------------------------------------------
  // Insert invoice
  // ---------------------------------------------------------

  const { data: invoice, error: invoiceError } =
    await supabase
      .from("invoices")
      .insert({
        organization_id: organization.id,
        project_id: projectId,
        invoice_number: invoiceNumber,
        stripe_invoice_id: null,

        // Creating the record does not mean it has been sent.
        status: "DRAFT",

        currency,
        subtotal_cents: subtotalCents,
        tax_cents: taxCents,
        total_cents: totalCents,
        due_date: dueDate,
        paid_at: null,
        visible_to_client: visibleToClient,
      })
      .select("id")
      .single();

  if (invoiceError) {
    console.error("Invoice creation failed:", {
      code: invoiceError.code,
      message: invoiceError.message,
    });

    return new NextResponse("Unable to create invoice.", {
      status: 500,
    });
  }

  // ---------------------------------------------------------
  // Audit event
  // ---------------------------------------------------------

  const { error: auditError } = await supabase
    .from("audit_logs")
    .insert({
      actor_clerk_user_id: userId,
      action: "INVOICE_CREATED",
      entity_type: "invoice",
      entity_id: invoice.id,
      metadata: {
        organization_id: organization.id,
        project_id: projectId,
        invoice_number: invoiceNumber,
        total_cents: totalCents,
        currency,
        visible_to_client: visibleToClient,
      },
    });

  if (auditError) {
    // A valid invoice should not be rolled back merely because
    // auxiliary audit logging failed.
    console.error("Invoice audit log failed:", {
      code: auditError.code,
      message: auditError.message,
    });
  }

  return redirectTo(
    `/admin/clients/${organization.id}`,
    request
  );
}