import { authorizeAdminApi, jsonError, jsonResponse } from "@/lib/auth/admin-api";
import { writeAuditLog } from "@/lib/auth/audit";
import {
  createClientInvitation,
  getClientInvitation,
  revokeClientInvitation,
} from "@/lib/auth/client-onboarding";
import {
  clerkErrorCode,
  invitationErrorMessage,
  invitationOrigin,
  invitationRedirectUrl,
  isClerkInvitationId,
} from "@/lib/clients/invitations";
import { isClientOperational } from "@/lib/clients/status";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ organizationId: string; invitationId: string }>;
};

/*
 * POST /api/admin/clients/:organizationId/invitations/:invitationId  (form field: action)
 *   action=revoke  revoke a pending invitation
 *   action=resend  revoke it (if still pending) and send a fresh one to the same email
 *
 * The invitation is always fetched through the client's OWN Clerk org id, so an id from
 * another organisation cannot be revoked or resent through this client's URL.
 */
export async function POST(request: Request, context: RouteContext) {
  const { organizationId, invitationId } = await context.params;
  const gate = await authorizeAdminApi(request, `/admin/clients/${organizationId}`);

  if (!gate.ok) {
    return gate.response;
  }

  if (!isUuid(organizationId) || !isClerkInvitationId(invitationId)) {
    return jsonError("Invitation not found.", 404);
  }

  let action: FormDataEntryValue | null;

  try {
    action = (await request.formData()).get("action");
  } catch {
    return jsonError("Invalid invitation request.", 400);
  }

  if (action !== "revoke" && action !== "resend") {
    return jsonError("Unknown invitation action.", 400);
  }

  const supabase = createAdminSupabaseClient();
  const { data: organization, error } = await supabase
    .from("organizations")
    .select("id, status, clerk_org_id")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    console.error("Invitation organisation lookup failed:", {
      code: error.code,
      message: error.message,
    });

    return jsonError("Unable to update the invitation.", 500);
  }

  if (!organization?.clerk_org_id) {
    return jsonError("Invitation not found.", 404);
  }

  if (action === "resend" && !isClientOperational(organization.status)) {
    return jsonError("Invitations can only be sent for an active client.", 409);
  }

  try {
    const invitation = await getClientInvitation(organization.clerk_org_id, invitationId);

    if (invitation.organizationId !== organization.clerk_org_id) {
      return jsonError("Invitation not found.", 404);
    }

    if (action === "revoke") {
      if (invitation.status !== "pending") {
        return jsonError("Only a pending invitation can be revoked.", 409);
      }

      await revokeClientInvitation(organization.clerk_org_id, invitation.id);
      await writeAuditLog(supabase, {
        actorClerkUserId: gate.userId,
        action: "CLIENT_INVITATION_REVOKED",
        entityType: "organization",
        entityId: organization.id,
        metadata: { organization_id: organization.id, invitation_id: invitation.id },
      });

      return jsonResponse({ success: true, message: "Invitation revoked." });
    }

    if (invitation.status === "accepted") {
      return jsonError("This invitation was already accepted.", 409);
    }

    if (invitation.status === "pending") {
      await revokeClientInvitation(organization.clerk_org_id, invitation.id);
    }

    const replacement = await createClientInvitation({
      clerkOrgId: organization.clerk_org_id,
      emailAddress: invitation.emailAddress,
      redirectUrl: invitationRedirectUrl(
        invitationOrigin(new URL(request.url).origin, process.env)
      ),
    });

    await writeAuditLog(supabase, {
      actorClerkUserId: gate.userId,
      action: "CLIENT_INVITATION_RESENT",
      entityType: "organization",
      entityId: organization.id,
      metadata: {
        organization_id: organization.id,
        previous_invitation_id: invitation.id,
        invitation_id: replacement.id,
      },
    });

    return jsonResponse({ success: true, message: "Invitation sent again." });
  } catch (caught) {
    const code = clerkErrorCode(caught);

    // Code and error class only: Clerk messages can echo the invited email address.
    console.error("Client invitation update failed:", {
      code,
      name: caught instanceof Error ? caught.name : "Unknown Clerk error",
    });

    if (code === "resource_not_found") {
      return jsonError("Invitation not found.", 404);
    }

    return jsonError(invitationErrorMessage(code), code ? 409 : 502);
  }
}
