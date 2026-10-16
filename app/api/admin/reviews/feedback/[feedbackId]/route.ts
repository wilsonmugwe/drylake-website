import { revalidatePath } from "next/cache";

import { authorizeAdminApi, jsonError, jsonResponse } from "@/lib/auth/admin-api";
import { actOnFeedback } from "@/lib/reviews/service";
import { FEEDBACK_ACTIONS, validateAction } from "@/lib/reviews/validate";
import { readJsonBody } from "@/lib/security/read-json";
import { redactSensitive } from "@/lib/security/redact";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

type RouteContext = { params: Promise<{ feedbackId: string }> };

const MESSAGES = {
  approve: "Approved. It now appears on the public site.",
  unapprove: "Unapproved. It no longer appears on the public site.",
  remove: "The written content was removed and the feedback unapproved.",
} as const;

/*
 * Approve, unapprove or remove one piece of feedback. Platform admins only. Approval is refused
 * unless the customer gave the separate publication consent (the database refuses it as well).
 * Every action is audit-logged with ids and state only.
 */
export async function POST(request: Request, context: RouteContext) {
  const gate = await authorizeAdminApi(request, "/admin/reviews");
  if (!gate.ok) return gate.response;

  const { feedbackId } = await context.params;
  if (!isUuid(feedbackId)) return jsonError("Feedback not found.", 404);

  const read = await readJsonBody(request, 1_000);
  if (!read.ok) return jsonError(read.message, read.status);

  const action = validateAction(read.body, FEEDBACK_ACTIONS);
  if (!action) return jsonError("Invalid request.", 400);

  try {
    const result = await actOnFeedback(createAdminSupabaseClient(), { feedbackId, action, actorClerkUserId: gate.userId });

    if (result === "not_found") return jsonError("Feedback not found.", 404);
    if (result === "no_consent") return jsonError("The customer has not agreed to publication, so this cannot be shown publicly.", 409, "no_consent");
    if (result === "nothing_to_publish") return jsonError("There is no written content to publish.", 409, "nothing_to_publish");
    // Approval state changed: refresh the static page that shows approved quotes now, not in an hour.
    revalidatePath("/services");
    return jsonResponse({ success: true, message: MESSAGES[action] });
  } catch (error) {
    console.error("Admin review feedback action failed:", action, redactSensitive(error instanceof Error ? error.message : "unknown"));
    return jsonError("The change could not be saved. Nothing was changed. Please try again.", 500);
  }
}
