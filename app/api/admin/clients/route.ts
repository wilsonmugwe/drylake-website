import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const MAX_CLIENT_NAME_LENGTH = 100;

export async function POST(request: Request) {
  // ---------------------------------------------------------
  // 1. Authentication
  // ---------------------------------------------------------

  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(
      new URL("/sign-in?redirect_url=/admin/clients/new", request.url),
      303
    );
  }

  // ---------------------------------------------------------
  // 2. Platform-admin authorization
  // ---------------------------------------------------------

  const platformAdmin = await isPlatformAdmin();

  if (!platformAdmin) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  // ---------------------------------------------------------
  // 3. Read + validate form
  // ---------------------------------------------------------

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form submission." },
      { status: 400 }
    );
  }

  const rawName = formData.get("name");

  if (typeof rawName !== "string") {
    return NextResponse.json(
      { error: "Client organisation name is required." },
      { status: 400 }
    );
  }

  // Collapse repeated whitespace and trim the value.
  const name = rawName.replace(/\s+/g, " ").trim();

  if (name.length < 2 || name.length > MAX_CLIENT_NAME_LENGTH) {
    return NextResponse.json(
      {
        error:
          "Client organisation name must be between 2 and 100 characters.",
      },
      { status: 400 }
    );
  }

  // Reject control characters.
  if (/[\u0000-\u001F\u007F]/.test(name)) {
    return NextResponse.json(
      { error: "Client organisation name contains invalid characters." },
      { status: 400 }
    );
  }

  // ---------------------------------------------------------
  // 4. Create Clerk organisation
  // ---------------------------------------------------------

  const clerk = await clerkClient();

  let clerkOrganization: Awaited<
    ReturnType<typeof clerk.organizations.createOrganization>
  >;

  try {
    clerkOrganization =
      await clerk.organizations.createOrganization({
        name,

        // IMPORTANT:
        // Do NOT pass createdBy here.
        //
        // Passing createdBy would automatically make the
        // Drylake platform admin a member/admin of the client's
        // organisation.
      });
  } catch (error) {
    console.error("Clerk client organisation creation failed.", {
      message:
        error instanceof Error
          ? error.message
          : "Unknown Clerk error",
    });

    return NextResponse.json(
      { error: "Unable to create client organisation." },
      { status: 500 }
    );
  }

  // ---------------------------------------------------------
  // 5. Create matching Supabase organisation
  // ---------------------------------------------------------

  const supabase = createAdminSupabaseClient();

  const {
    data: organization,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .insert({
      clerk_org_id: clerkOrganization.id,
      name,
      status: "ACTIVE",
    })
    .select("id, clerk_org_id, name, status")
    .single();

  // ---------------------------------------------------------
  // 6. Compensating rollback
  //
  // Clerk succeeded but Supabase failed.
  //
  // Delete the Clerk organisation so we don't leave behind
  // an orphan/ghost organisation.
  // ---------------------------------------------------------

  if (organizationError || !organization) {
    console.error("Supabase client organisation creation failed.", {
      code: organizationError?.code,
      message: organizationError?.message,
    });

    try {
      await clerk.organizations.deleteOrganization(
        clerkOrganization.id
      );
    } catch (rollbackError) {
      // This is operationally important.
      //
      // Do not expose IDs or internal details to the browser,
      // but record that manual reconciliation may be required.
      console.error(
        "CRITICAL: Clerk organisation rollback failed after Supabase failure.",
        {
          message:
            rollbackError instanceof Error
              ? rollbackError.message
              : "Unknown rollback error",
        }
      );
    }

    return NextResponse.json(
      { error: "Unable to create client organisation." },
      { status: 500 }
    );
  }

  // ---------------------------------------------------------
  // 7. Audit log
  // ---------------------------------------------------------

  const { error: auditError } = await supabase
    .from("audit_logs")
    .insert({
      actor_clerk_user_id: userId,
      action: "CLIENT_ORGANIZATION_CREATED",
      entity_type: "organization",
      entity_id: organization.id,
      metadata: {
        organization_name: organization.name,
        clerk_org_id: organization.clerk_org_id,
      },
    });

  // Audit failure should NOT delete an otherwise valid client.
  //
  // However, we need to know if audit logging failed because
  // audit coverage is part of our security model.
  if (auditError) {
    console.error("Client creation audit log failed.", {
      code: auditError.code,
      message: auditError.message,
    });
  }

  // ---------------------------------------------------------
  // 8. Success
  // ---------------------------------------------------------

  return NextResponse.redirect(
    new URL("/admin/clients", request.url),
    303
  );
}