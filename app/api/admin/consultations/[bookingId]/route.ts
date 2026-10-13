import { after } from "next/server";

import { authorizeAdminApi, jsonError, jsonResponse } from "@/lib/auth/admin-api";
import { runConsultationDispatch } from "@/lib/consultations/dispatch-server";
import { describeOutcome } from "@/lib/consultations/outcomes";
import { cancelConsultation, completeConsultation, rescheduleConsultation } from "@/lib/consultations/service";
import { tokenSecret } from "@/lib/consultations/token";
import { parseStart } from "@/lib/consultations/validate";
import { readJsonBody } from "@/lib/security/read-json";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

type RouteContext = { params: Promise<{ bookingId: string }> };

const ACTIONS = new Set(["reschedule", "cancel", "complete"]);

/*
 * Admin actions on one consultation: reschedule, cancel (optional reason), mark completed.
 * Platform admins only (checked before the body is read or the service-role client exists).
 * Every action goes through the same SQL function the customer uses, with actor ADMIN and the
 * admin's Clerk id, so the change is audited, version-checked (a stale screen is refused, not
 * overwritten) and the customer plus both founders are emailed from the outbox.
 * Body: { action, version, newStart?, reason? }
 */
export async function POST(request: Request, context: RouteContext) {
  const gate = await authorizeAdminApi(request, "/admin/consultations");
  if (!gate.ok) return gate.response;

  const { bookingId } = await context.params;
  if (!isUuid(bookingId)) return jsonError("Consultation not found.", 404);

  const read = await readJsonBody(request, 2_000);
  if (!read.ok) return jsonError(read.message, read.status);
  const body = (read.body && typeof read.body === "object" ? read.body : {}) as Record<string, unknown>;

  const action = typeof body.action === "string" ? body.action : "";
  const version = typeof body.version === "number" && Number.isInteger(body.version) && body.version > 0 ? body.version : 0;
  if (!ACTIONS.has(action) || version === 0) return jsonError("Invalid request.", 400);

  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  const newStart = action === "reschedule" ? parseStart(body.newStart) : null;
  if (action === "reschedule" && !newStart) return jsonError("Choose a new consultation time.", 400);

  try {
    const supabase = createAdminSupabaseClient();
    const actor = { type: "ADMIN" as const, clerkUserId: gate.userId };
    let outcome: string;

    if (action === "reschedule") {
      ({ outcome } = await rescheduleConsultation(supabase, {
        id: bookingId,
        expectedVersion: version,
        newStart: newStart as Date,
        actor,
        secret: tokenSecret(process.env),
      }));
    } else if (action === "cancel") {
      ({ outcome } = await cancelConsultation(supabase, { id: bookingId, expectedVersion: version, actor, reason: reason || null }));
    } else {
      ({ outcome } = await completeConsultation(supabase, { id: bookingId, expectedVersion: version, clerkUserId: gate.userId }));
    }

    const described = describeOutcome(outcome);
    if (!["rescheduled", "cancelled", "completed"].includes(outcome)) {
      return jsonError(described.message, described.status, outcome);
    }

    if (outcome !== "completed") after(() => runConsultationDispatch(supabase));

    return jsonResponse({ success: true, outcome, message: described.message });
  } catch (error) {
    console.error("Admin consultation action failed:", action, error instanceof Error ? error.message : typeof error);
    return jsonError("The change could not be saved. Nothing was changed. Please try again.", 500);
  }
}
