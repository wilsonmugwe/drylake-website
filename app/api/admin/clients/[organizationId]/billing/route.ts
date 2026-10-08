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

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store",
  };
}

/*
 * POST: update an ACTIVE client's billing contact (form fields billingContactName,
 * billingEmail). Admin only. The email is required because issuing an invoice refuses a
 * client with no valid billing email. The gate is inline and answers 401 JSON when signed
 * out, because the admin form posts with fetch and handles navigation itself.
 */
export async function POST(
  request: Request,
  context: RouteContext
) {
  // ---------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------

  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      {
        status: 401,
        headers: noStoreHeaders(),
      }
    );
  }

  // ---------------------------------------------------------
  // Platform admin authorization
  // ---------------------------------------------------------

  const platformAdmin = await isPlatformAdmin();

  if (!platformAdmin) {
    return NextResponse.json(
      {
        success: false,
        error: "Forbidden",
      },
      {
        status: 403,
        headers: noStoreHeaders(),
      }
    );
  }

  // ---------------------------------------------------------
  // Organisation ID validation
  // ---------------------------------------------------------

  const { organizationId } = await context.params;

  if (!isUuid(organizationId)) {
    return NextResponse.json(
      {
        success: false,
        error: "Client organisation not found.",
      },
      {
        status: 404,
        headers: noStoreHeaders(),
      }
    );
  }

  // ---------------------------------------------------------
  // Parse request
  // ---------------------------------------------------------

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid billing contact request.",
      },
      {
        status: 400,
        headers: noStoreHeaders(),
      }
    );
  }

  const billingContactName = normalizeText(
    formData.get("billingContactName")
  );

  const billingEmail = normalizeEmail(
    formData.get("billingEmail")
  );

  // ---------------------------------------------------------
  // Validate billing contact name
  // ---------------------------------------------------------

  if (
    billingContactName.length > 100 ||
    CONTROL_CHARACTERS.test(billingContactName)
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid billing contact name.",
      },
      {
        status: 400,
        headers: noStoreHeaders(),
      }
    );
  }

  // ---------------------------------------------------------
  // Validate billing email
  // ---------------------------------------------------------

  if (!isValidEmail(billingEmail)) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid billing email address.",
      },
      {
        status: 400,
        headers: noStoreHeaders(),
      }
    );
  }

  const supabase = createAdminSupabaseClient();

  // ---------------------------------------------------------
  // Verify organisation
  // ---------------------------------------------------------

  const {
    data: organization,
    error: organizationError,
  } = await supabase
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
    console.error(
      "Billing organisation lookup failed:",
      {
        code: organizationError.code,
        message: organizationError.message,
      }
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to update billing contact.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }

  if (!organization) {
    return NextResponse.json(
      {
        success: false,
        error: "Client organisation not found.",
      },
      {
        status: 404,
        headers: noStoreHeaders(),
      }
    );
  }

  // ---------------------------------------------------------
  // Prevent changes to inactive clients
  // ---------------------------------------------------------

  if (organization.status !== "ACTIVE") {
    return NextResponse.json(
      {
        success: false,
        error:
          "Billing details cannot be changed for an inactive client.",
      },
      {
        status: 409,
        headers: noStoreHeaders(),
      }
    );
  }

  // ---------------------------------------------------------
  // Detect whether anything actually changed
  // ---------------------------------------------------------

  const existingContactName =
    organization.billing_contact_name?.trim() ?? "";

  const existingBillingEmail =
    organization.billing_email?.trim().toLowerCase() ?? "";

  const hasChanged =
    existingContactName !== billingContactName ||
    existingBillingEmail !== billingEmail;

  if (!hasChanged) {
    return NextResponse.json(
      {
        success: true,
        changed: false,
        organizationId: organization.id,
        message: "Billing contact is already up to date.",
      },
      {
        status: 200,
        headers: noStoreHeaders(),
      }
    );
  }

  // ---------------------------------------------------------
  // Update billing contact
  // ---------------------------------------------------------

  const {
    data: updatedOrganization,
    error: updateError,
  } = await supabase
    .from("organizations")
    .update({
      billing_contact_name:
        billingContactName || null,
      billing_email: billingEmail,
    })
    .eq("id", organization.id)
    .select(
      `
        id,
        billing_contact_name,
        billing_email
      `
    )
    .maybeSingle();

  if (updateError) {
    console.error("Billing contact update failed:", {
      code: updateError.code,
      message: updateError.message,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Unable to update billing contact.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }

  if (!updatedOrganization) {
    console.error(
      "Billing contact update returned no organisation:",
      {
        organizationId: organization.id,
      }
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to update billing contact.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }

  // ---------------------------------------------------------
  // Audit
  //
  // Billing contact name/email are deliberately excluded from
  // metadata so personal information is not copied into the
  // audit log.
  //
  // Audit failure does not undo the successful billing update.
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

  // ---------------------------------------------------------
  // Return JSON
  //
  // AdminBillingForm handles the client-side navigation.
  // This avoids fetch() following a server redirect and
  // downloading the destination page unnecessarily.
  // ---------------------------------------------------------

  return NextResponse.json(
    {
      success: true,
      changed: true,
      organizationId: organization.id,
      message: "Billing contact saved.",
    },
    {
      status: 200,
      headers: noStoreHeaders(),
    }
  );
}