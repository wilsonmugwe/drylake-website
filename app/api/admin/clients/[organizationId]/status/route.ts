import { authorizeAdminApi, jsonError, jsonResponse } from "@/lib/auth/admin-api";
import { writeAuditLog } from "@/lib/auth/audit";
import { revokePendingClientInvitations } from "@/lib/auth/client-onboarding";
import {
  STATUS_MIGRATION_FILE,
  availableStatusActions,
  checkClientStatusTransition,
  isStatusSchemaRejection,
  parseClientStatus,
  statusLabel,
} from "@/lib/clients/status";
import { isChecked } from "@/lib/clients/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ organizationId: string }>;
};

/*
 * POST /api/admin/clients/:organizationId/status   (form fields: status, confirm)
 *
 * Moves a client through ACTIVE / INACTIVE / ARCHIVED (rules in lib/clients/status.ts).
 * The update is conditional on the status the admin saw, so two admins acting at once
 * cannot silently overwrite each other. Archiving needs confirm=true and revokes pending
 * invitations. Clerk memberships are kept, so a restored client regains access as-is;
 * while not ACTIVE, every client page and API refuses the workspace.
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
    return jsonError("Invalid status request.", 400);
  }

  const target = parseClientStatus(formData.get("status"));

  if (!target) {
    return jsonError("Choose a valid client status.", 400);
  }

  const supabase = createAdminSupabaseClient();
  const { data: organization, error: lookupError } = await supabase
    .from("organizations")
    .select("id, name, status, clerk_org_id")
    .eq("id", organizationId)
    .maybeSingle();

  if (lookupError) {
    console.error("Status organisation lookup failed:", {
      code: lookupError.code,
      message: lookupError.message,
    });

    return jsonError("Unable to change the client status.", 500);
  }

  if (!organization) {
    return jsonError("Client organisation not found.", 404);
  }

  const transition = checkClientStatusTransition(organization.status, target);

  if (!transition.ok) {
    return jsonError(transition.reason, 409);
  }

  const action = availableStatusActions(organization.status).find((item) => item.to === target);

  if (action?.requiresConfirmation && !isChecked(formData.get("confirm"))) {
    return jsonError("Confirm this change before continuing.", 400);
  }

  const { data: updated, error: updateError } = await supabase
    .from("organizations")
    .update({ status: target })
    .eq("id", organization.id)
    .eq("status", organization.status)
    .select("id, status")
    .maybeSingle();

  if (updateError) {
    if (isStatusSchemaRejection(updateError)) {
      // The database does not accept this status yet. Nothing was written.
      return jsonError(
        `The database does not accept the ${statusLabel(target).toLowerCase()} status yet. Apply ${STATUS_MIGRATION_FILE} in Supabase, then try again.`,
        409,
        "STATUS_MIGRATION_REQUIRED"
      );
    }

    console.error("Client status update failed:", {
      code: updateError.code,
      message: updateError.message,
    });

    return jsonError("Unable to change the client status.", 500);
  }

  if (!updated) {
    return jsonError(
      "The client status changed while you were viewing it. Reload and try again.",
      409
    );
  }

  let revokedInvitations = 0;

  if (target === "ARCHIVED" && organization.clerk_org_id) {
    try {
      revokedInvitations = await revokePendingClientInvitations(organization.clerk_org_id);
    } catch (error) {
      // Access is already blocked by status; a leftover invitation only leads to the
      // "workspace archived" screen. Logged for follow-up, not fatal.
      console.error("Revoking invitations on archive failed:", {
        message: error instanceof Error ? error.message : "Unknown Clerk error",
      });
    }
  }

  await writeAuditLog(supabase, {
    actorClerkUserId: gate.userId,
    action: "CLIENT_STATUS_CHANGED",
    entityType: "organization",
    entityId: organization.id,
    metadata: {
      organization_id: organization.id,
      from_status: organization.status,
      to_status: target,
      revoked_invitations: revokedInvitations,
    },
  });

  return jsonResponse({
    success: true,
    status: target,
    message: `Client is now ${statusLabel(target).toLowerCase()}.`,
  });
}
