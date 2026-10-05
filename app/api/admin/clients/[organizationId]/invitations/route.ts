import { authorizeAdminApi, jsonError, jsonResponse } from "@/lib/auth/admin-api";
import { writeAuditLog } from "@/lib/auth/audit";
import {
  createClientInvitation,
  ensureClerkOrganization,
  listClientInvitations,
  listClientMembers,
} from "@/lib/auth/client-onboarding";
import {
  clerkErrorCode,
  findPendingInvitation,
  invitationErrorMessage,
  invitationRedirectUrl,
} from "@/lib/clients/invitations";
import { isClientOperational } from "@/lib/clients/status";
import { parseRequiredEmail } from "@/lib/clients/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ organizationId: string }>;
};

/*
 * POST /api/admin/clients/:organizationId/invitations   (form field: email)
 *
 * Invites a client contact to the client's Clerk organisation as org:member, creating
 * and linking the Clerk organisation first if the row has none. Idempotent: an existing
 * pending invitation for the same email is reported, not duplicated.
 */
export async function POST(request: Request, context: RouteContext) {
  const { organizationId } = await context.params;
  const gate = await authorizeAdminApi(request, `/admin/clients/${organizationId}`);

  if (!gate.ok) {
    return gate.response;
  }

  if (!isUuid(organizationId)) {
    return jsonError("Client organisation not found.", 404);
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError("Invalid invitation request.", 400);
  }

  const email = parseRequiredEmail(formData.get("email"));

  if (!email.ok) {
    return jsonError(email.error, 400);
  }

  const supabase = createAdminSupabaseClient();
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name, status, clerk_org_id")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError) {
    console.error("Invitation organisation lookup failed:", {
      code: organizationError.code,
      message: organizationError.message,
    });

    return jsonError("Unable to send the invitation.", 500);
  }

  if (!organization) {
    return jsonError("Client organisation not found.", 404);
  }

  if (!isClientOperational(organization.status)) {
    return jsonError(
      "Invitations can only be sent for an active client. Reactivate the client first.",
      409
    );
  }

  let clerkOrgId: string;

  try {
    clerkOrgId = await ensureClerkOrganization(supabase, organization);
  } catch (error) {
    console.error("Ensuring Clerk organisation failed:", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return jsonError("Unable to prepare the client workspace in Clerk.", 502);
  }

  try {
    const [invitations, members] = await Promise.all([
      listClientInvitations(clerkOrgId),
      listClientMembers(clerkOrgId),
    ]);

    if (members.some((member) => member.identifier.toLowerCase() === email.value)) {
      return jsonError("This person is already a member of the client workspace.", 409);
    }

    const pending = findPendingInvitation(invitations, email.value);

    if (pending) {
      return jsonResponse({
        success: true,
        changed: false,
        invitationId: pending.id,
        message: "An invitation is already pending for this email. Use Resend to send it again.",
      });
    }

    const invitation = await createClientInvitation({
      clerkOrgId,
      emailAddress: email.value,
      redirectUrl: invitationRedirectUrl(new URL(request.url).origin),
    });

    // Email is deliberately not copied into the audit log (personal information).
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

    return jsonResponse({
      success: true,
      changed: true,
      invitationId: invitation.id,
      message: "Invitation sent.",
    });
  } catch (error) {
    const code = clerkErrorCode(error);

    console.error("Client invitation failed:", {
      code,
      message: error instanceof Error ? error.message : "Unknown Clerk error",
    });

    return jsonError(invitationErrorMessage(code), code ? 409 : 502);
  }
}
