import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { authorizeAdminApi, jsonError, jsonResponse } from "@/lib/auth/admin-api";
import { writeAuditLog } from "@/lib/auth/audit";
import { createClientInvitation } from "@/lib/auth/client-onboarding";
import { isDocumentNavigation } from "@/lib/auth/request-kind";
import {
  clerkErrorCode,
  invitationRedirectUrl,
} from "@/lib/clients/invitations";
import {
  isChecked,
  normalizeClientName,
  normalizeContactName,
  parseOptionalEmail,
} from "@/lib/clients/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type InviteOutcome = "sent" | "failed" | "skipped";

/*
 * POST /api/admin/clients
 * Form fields: name (required), contactName, contactEmail (optional), sendInvite.
 *
 * 1. Create the Clerk organisation (the tenant identity).
 * 2. Create the Supabase organizations row mapped to it, with the primary contact stored
 *    in billing_contact_name / billing_email (the existing contact columns).
 * 3. Optionally invite the contact to the Clerk org as org:member.
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

  const contactName = normalizeContactName(formData.get("contactName"));

  if (!contactName.ok) {
    return jsonError(contactName.error, 400);
  }

  const contactEmail = parseOptionalEmail(formData.get("contactEmail"));

  if (!contactEmail.ok) {
    return jsonError(contactEmail.error, 400);
  }

  const wantsInvite = isChecked(formData.get("sendInvite"));

  if (wantsInvite && !contactEmail.value) {
    return jsonError("Add the contact email to send a portal invitation.", 400);
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

  const supabase = createAdminSupabaseClient();
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
  // 3. Optional portal invitation
  // -------------------------------------------------------

  let invite: InviteOutcome = "skipped";

  if (wantsInvite && contactEmail.value) {
    try {
      const invitation = await createClientInvitation({
        clerkOrgId,
        emailAddress: contactEmail.value,
        redirectUrl: invitationRedirectUrl(new URL(request.url).origin),
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
