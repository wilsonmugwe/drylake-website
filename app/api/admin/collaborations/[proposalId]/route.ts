import { authorizeAdminApi, jsonError, jsonResponse } from "@/lib/auth/admin-api";
import { writeAuditLog } from "@/lib/auth/audit";
import { PROPOSAL_STATUS_VALUES } from "@/lib/collaboration/catalog";
import { validateProposalUpdate } from "@/lib/collaboration/validate";
import { readJsonBody } from "@/lib/security/read-json";
import { redactSensitive } from "@/lib/security/redact";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

type RouteContext = { params: Promise<{ proposalId: string }> };

/*
 * Admin update of one collaboration proposal: change status and/or save internal notes.
 * Platform admins only (checked before the body is read or the service-role client exists).
 * Every change is written to the audit log with ids and state only: never the proposer's details
 * and never the text of the notes (just whether they changed).
 * Body: { status?: "new"|"under_review"|"contacted"|"accepted"|"declined", notes?: string|null }
 */
export async function POST(request: Request, context: RouteContext) {
  const gate = await authorizeAdminApi(request, "/admin/collaborations");
  if (!gate.ok) return gate.response;

  const { proposalId } = await context.params;
  if (!isUuid(proposalId)) return jsonError("Proposal not found.", 404);

  const read = await readJsonBody(request, 8_000);
  if (!read.ok) return jsonError(read.message, read.status);

  const parsed = validateProposalUpdate(read.body, PROPOSAL_STATUS_VALUES);
  if (!parsed.ok) return jsonError(parsed.message, 400);

  try {
    const supabase = createAdminSupabaseClient();

    const { data: before, error: readError } = await supabase
      .from("collaboration_proposals")
      .select("id, status, internal_notes")
      .eq("id", proposalId)
      .maybeSingle();

    if (readError) throw new Error(`read: ${readError.code ?? ""} ${redactSensitive(readError.message)}`);
    if (!before) return jsonError("Proposal not found.", 404);

    const changes: Record<string, unknown> = { updated_by: gate.userId };
    if (parsed.update.status !== undefined) changes.status = parsed.update.status;
    if (parsed.update.notes !== undefined) changes.internal_notes = parsed.update.notes;

    const { error } = await supabase.from("collaboration_proposals").update(changes).eq("id", proposalId);
    if (error) throw new Error(`update: ${error.code ?? ""} ${redactSensitive(error.message)}`);

    await writeAuditLog(supabase, {
      actorClerkUserId: gate.userId,
      action: "collaboration.updated",
      entityType: "collaboration_proposal",
      entityId: proposalId,
      metadata: {
        status_from: before.status,
        status_to: parsed.update.status ?? before.status,
        notes_changed: parsed.update.notes !== undefined && (parsed.update.notes ?? null) !== (before.internal_notes ?? null),
      },
    });

    return jsonResponse({ success: true, message: "Saved." });
  } catch (error) {
    console.error("Admin collaboration update failed:", error instanceof Error ? error.message : typeof error);
    return jsonError("The change could not be saved. Nothing was changed. Please try again.", 500);
  }
}
