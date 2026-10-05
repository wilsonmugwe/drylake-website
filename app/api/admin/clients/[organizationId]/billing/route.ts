import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

type RouteContext = {
  params: Promise<{
    organizationId: string;
  }>;
};

const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

function normalizeText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ");
}

function normalizeEmail(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

function isValidEmail(email: string) {
  if (email.length < 3 || email.length > 254) {
    return false;
  }

  if (CONTROL_CHARACTERS.test(email)) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

  const billingContactName = normalizeText(
    formData.get("billingContactName")
  );

  const billingEmail = normalizeEmail(
    formData.get("billingEmail")
  );

  if (
    billingContactName.length > 100 ||
    CONTROL_CHARACTERS.test(billingContactName)
  ) {
    return new NextResponse(
      "Invalid billing contact name.",
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  if (!isValidEmail(billingEmail)) {
    return new NextResponse(
      "Invalid billing email address.",
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const supabase = createAdminSupabaseClient();

  // ---------------------------------------------------------
  // Verify organisation server-side.
  // ---------------------------------------------------------

  const { data: organization, error: organizationError } =
    await supabase
      .from("organizations")
      .select(
        `
          id,
          name,
          status,
          billing_contact_name,
          billing_email
        `
      )
      .eq("id", organizationId)
      .maybeSingle();

  if (organizationError) {
    console.error("Billing organisation lookup failed:", {
      code: organizationError.code,
      message: organizationError.message,
    });

    return new NextResponse(
      "Unable to update billing contact.",
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  if (!organization) {
    return new NextResponse(
      "Client organisation not found.",
      {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  if (organization.status !== "ACTIVE") {
    return new NextResponse(
      "Billing details cannot be changed for an inactive client.",
      {
        status: 409,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  // ---------------------------------------------------------
  // Update billing contact.
  // ---------------------------------------------------------

  const { error: updateError } = await supabase
    .from("organizations")
    .update({
      billing_contact_name:
        billingContactName || null,
      billing_email: billingEmail,
    })
    .eq("id", organization.id);

  if (updateError) {
    console.error("Billing contact update failed:", {
      code: updateError.code,
      message: updateError.message,
    });

    return new NextResponse(
      "Unable to update billing contact.",
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  // ---------------------------------------------------------
  // Audit the change.
  //
  // We deliberately do NOT put the email address or contact
  // name into audit metadata.
  // ---------------------------------------------------------

  const { error: auditError } = await supabase
    .from("audit_logs")
    .insert({
      actor_clerk_user_id: userId,
      action: "BILLING_CONTACT_UPDATED",
      entity_type: "organization",
      entity_id: organization.id,
      metadata: {
        organization_id: organization.id,
      },
    });

  if (auditError) {
    console.error("Billing contact audit failed:", {
      code: auditError.code,
      message: auditError.message,
    });
  }

  return NextResponse.redirect(
    new URL(
      `/admin/clients/${organization.id}`,
      request.url
    ),
    303
  );
}