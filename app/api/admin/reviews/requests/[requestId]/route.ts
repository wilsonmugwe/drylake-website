import { authorizeAdminApi, jsonError, jsonResponse } from "@/lib/auth/admin-api";
import { retryRequest, withdrawRequest } from "@/lib/reviews/service";
import { REQUEST_ACTIONS, validateAction } from "@/lib/reviews/validate";
import { readJsonBody } from "@/lib/security/read-json";
import { redactSensitive } from "@/lib/security/redact";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

type RouteContext = { params: Promise<{ requestId: string }> };

/* Retry a failed or expired request, or withdraw one so its link stops working. Admins only. */
export async function POST(request: Request, context: RouteContext) {
  const gate = await authorizeAdminApi(request, "/admin/reviews");
  if (!gate.ok) return gate.response;

  const { requestId } = await context.params;
  if (!isUuid(requestId)) return jsonError("Request not found.", 404);

  const read = await readJsonBody(request, 1_000);
  if (!read.ok) return jsonError(read.message, read.status);

  const action = validateAction(read.body, REQUEST_ACTIONS);
  if (!action) return jsonError("Invalid request.", 400);

  try {
    const supabase = createAdminSupabaseClient();

    if (action === "withdraw") {
      const result = await withdrawRequest(supabase, { requestId, actorClerkUserId: gate.userId });
      if (result === "not_found") return jsonError("Request not found.", 404);
      if (result === "not_withdrawable") return jsonError("This request has already been answered or withdrawn.", 409);
      return jsonResponse({ success: true, message: "Request withdrawn. The link no longer works." });
    }

    const result = await retryRequest(supabase, { requestId, actorClerkUserId: gate.userId });
    if (result.outcome === "not_found") return jsonError("Request not found.", 404);
    if (result.outcome === "not_retryable") return jsonError("Only a failed or expired request can be retried.", 409);
    if (result.outcome === "suppressed") return jsonError("This person has opted out of feedback requests.", 409, "suppressed");
    if (result.outcome === "email_failed") return jsonError("The email could not be sent. Try again shortly.", 502, "email_failed");
    return jsonResponse({ success: true, message: "Review request sent again." });
  } catch (error) {
    console.error("Admin review request action failed:", action, redactSensitive(error instanceof Error ? error.message : "unknown"));
    return jsonError("The change could not be saved. Please try again.", 500);
  }
}
