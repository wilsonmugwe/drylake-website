import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { authorizeAdminApi, jsonError, jsonResponse } from "@/lib/auth/admin-api";
import { writeAuditLog } from "@/lib/auth/audit";
import { createClientInvitation } from "@/lib/auth/client-onboarding";
import { isDocumentNavigation } from "@/lib/auth/request-kind";
import {
  clerkErrorCode,
  invitationOrigin,
  invitationRedirectUrl,
} from "@/lib/clients/invitations";
import {
  ilikeExact,
  normalizeClientName,
  parseRequiredContactName,
  parseRequiredEmail,
} from "@/lib/clients/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type InviteOutcome = "sent" | "failed";

/*
 * POST /api/admin/clients
 * Form fields: name, contactName, contactEmail (all required).
 *
 * The admin only ever supplies human-readable details. Drylake then:
 * 0. refuses a duplicate client name (no twin tenants from a double submit);
 * 1. creates the Clerk organisation (the tenant identity);
 * 2. creates the Supabase organizations row mapped to it (organizations.clerk_org_id),
 *    with the primary contact stored in billing_contact_name / billing_email;
 * 3. invites the contact's email to the Clerk org as org:member, automatically.
 * Nobody types, copies or sees an organisation id.
 *
 * A failed invitation never rolls back the client: the admin can resend from the client
 * page. A failed Supabase insert deletes the Clerk org so no orphan is left behind.
 */
export async function POST(request: Request) {
  const gate = await authorizeAdminApi(request, "/admin/clients/new");

  if (!gate.ok) {
    return gate.response;
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError("Invalid form submission.", 400);
  }

  const name = normalizeClientName(formData.get("name"));

  if (!name.ok) {
    return jsonError(name.error, 400);
  }

  const contactName = parseRequiredContactName(formData.get("contactName"));

  if (!contactName.ok) {
    return jsonError(contactName.error, 400);
  }

  // The invitation goes to this address, so it is required.
  const contactEmail = parseRequiredEmail(formData.get("contactEmail"));

  if (!contactEmail.ok) {
    return jsonError("Enter the primary contact's email address.", 400);
  }

  const supabase = createAdminSupabaseClient();

  // -------------------------------------------------------
  // 0. Duplicate guard: one Drylake client per organisation name (case-insensitive).
  //    A double-submitted form or a second admin cannot create a twin tenant.
  // -------------------------------------------------------

  const { data: existing, error: existingError } = await supabase
    .from("organizations")
    .select("id")
    .ilike("name", ilikeExact(name.value))
    .limit(1);

  if (existingError) {
    console.error("Client duplicate check failed:", {
      code: existingError.code,
      message: existingError.message,
    });

    return jsonError("Unable to create client organisation.", 500);
  }

  if (existing && existing.length > 0) {
    return jsonError(
      "A client with this name already exists. Open it from the client list instead.",
      409
    );
  }

  // -------------------------------------------------------
  // 1. Clerk organisation
  // -------------------------------------------------------

  const clerk = await clerkClient();
  let clerkOrgId: string;

  try {
    // No createdBy: that would make the Drylake admin a member of the client's org.
    const created = await clerk.organizations.createOrganization({ name: name.value });
    clerkOrgId = created.id;
  } catch (error) {
    console.error("Clerk client organisation creation failed.", {
      message: error instanceof Error ? error.message : "Unknown Clerk error",
    });

    return jsonError("Unable to create client organisation.", 502);
  }

  // -------------------------------------------------------
  // 2. Supabase organisation, mapped to the Clerk org
  // -------------------------------------------------------

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .insert({
      clerk_org_id: clerkOrgId,
      name: name.value,
      status: "ACTIVE",
      billing_contact_name: contactName.value,
      billing_email: contactEmail.value,
    })
    .select("id, clerk_org_id, name")
    .single();

  if (organizationError || !organization) {
    console.error("Supabase client organisation creation failed.", {
      code: organizationError?.code,
      message: organizationError?.message,
    });

    try {
      await clerk.organizations.deleteOrganization(clerkOrgId);
    } catch (rollbackError) {
      console.error("CRITICAL: Clerk organisation rollback failed after Supabase failure.", {
        message: rollbackError instanceof Error ? rollbackError.message : "Unknown",
      });
    }

    return jsonError("Unable to create client organisation.", 500);
  }

  // Back-reference for reconciliation; never used for authorization.
  try {
    await clerk.organizations.updateOrganizationMetadata(clerkOrgId, {
      privateMetadata: { drylake_organization_id: organization.id },
    });
  } catch (error) {
    console.error("Clerk organisation metadata update failed:", {
      message: error instanceof Error ? error.message : "Unknown Clerk error",
    });
  }

  await writeAuditLog(supabase, {
    actorClerkUserId: gate.userId,
    action: "CLIENT_ORGANIZATION_CREATED",
    entityType: "organization",
    entityId: organization.id,
    metadata: {
      organization_name: organization.name,
      clerk_org_id: organization.clerk_org_id,
      primary_contact_recorded: Boolean(contactEmail.value),
    },
  });

  // -------------------------------------------------------
  // 3. Portal invitation to the primary contact (always)
  // -------------------------------------------------------

  let invite: InviteOutcome = "failed";

  try {
    const invitation = await createClientInvitation({
      clerkOrgId,
      emailAddress: contactEmail.value,
      redirectUrl: invitationRedirectUrl(
        invitationOrigin(new URL(request.url).origin, process.env)
      ),
    });

    invite = "sent";

    await writeAuditLog(supabase, {
      actorClerkUserId: gate.userId,
      action: "CLIENT_INVITATION_SENT",
      entityType: "organization",
      entityId: organization.id,
      metadata: {
        organization_id: organization.id,
        clerk_org_id: clerkOrgId,
        invitation_id: invitation.id,
      },
    });
  } catch (error) {
    invite = "failed";
    console.error("Initial client invitation failed:", {
      code: clerkErrorCode(error),
      message: error instanceof Error ? error.message : "Unknown Clerk error",
    });
  }

  const destination = `/admin/clients/${organization.id}?created=1&invite=${invite}`;

  if (isDocumentNavigation(request.headers)) {
    return NextResponse.redirect(new URL(destination, request.url), 303);
  }

  return jsonResponse({
    success: true,
    organizationId: organization.id,
    invite,
    redirectTo: destination,
  });
}
