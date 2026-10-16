import { authorizeAdminApi, jsonError, jsonResponse } from "@/lib/auth/admin-api";
import { sendRequest } from "@/lib/reviews/service";
import { validateSendRequest } from "@/lib/reviews/validate";
import { readJsonBody } from "@/lib/security/read-json";
import { redactSensitive } from "@/lib/security/redact";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/*
 * Send ONE review request for ONE engagement. Platform admins only (checked before the body is
 * read or the service-role client exists). Body: { kind, engagementId, confirm: true }; a request
 * without confirm:true is refused, so the UI's confirm step cannot be skipped by a scripted call.
 * Eligibility, the duplicate guard and the suppression list are all re-checked server side.
 */
export async function POST(request: Request) {
  const gate = await authorizeAdminApi(request, "/admin/reviews");
  if (!gate.ok) return gate.response;

  const read = await readJsonBody(request, 2_000);
  if (!read.ok) return jsonError(read.message, read.status);

  const input = validateSendRequest(read.body);
  if (!input.ok) return jsonError(input.message, 400);

  try {
    const result = await sendRequest(createAdminSupabaseClient(), {
      kind: input.kind,
      engagementId: input.engagementId,
      actorClerkUserId: gate.userId,
    });

    switch (result.outcome) {
      case "sent":
        return jsonResponse({ success: true, message: "Review request sent." });
      case "duplicate":
        return jsonError("A request has already been sent to this person for this engagement.", 409, "duplicate");
      case "suppressed":
        return jsonError("This person has opted out of feedback requests, so nothing was sent.", 409, "suppressed");
      case "not_eligible":
        return jsonError("This engagement is not eligible for a review request.", 404, "not_eligible");
      default:
        return jsonError("The email could not be sent. The request is saved; open it to retry.", 502, "email_failed");
    }
  } catch (error) {
    console.error("Admin review request failed:", redactSensitive(error instanceof Error ? error.message : "unknown"));
    return jsonError("The request could not be created. Nothing was sent. Please try again.", 500);
  }
}
