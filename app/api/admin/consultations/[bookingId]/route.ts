import { after } from "next/server";

import { authorizeAdminApi, jsonError, jsonResponse } from "@/lib/auth/admin-api";
import { reportCalendarFailure } from "@/lib/consultations/calendar-alert-server";
import { runCalendarSync } from "@/lib/consultations/calendar-sync-server";
import { calendarSetting } from "@/lib/consultations/calendar/provider";
import { CalendarUnavailableError } from "@/lib/consultations/calendar/types";
import { runConsultationDispatch } from "@/lib/consultations/dispatch-server";
import { describeOutcome } from "@/lib/consultations/outcomes";
import { cancelConsultation, completeConsultation, freeRepresentativesAt, rescheduleConsultation } from "@/lib/consultations/service";
import { tokenSecret } from "@/lib/consultations/token";
import { parseStart } from "@/lib/consultations/validate";
import { readJsonBody } from "@/lib/security/read-json";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

type RouteContext = { params: Promise<{ bookingId: string }> };

const ACTIONS = new Set(["reschedule", "cancel", "complete", "retry_calendar"]);

/*
 * Admin actions on one consultation: reschedule, cancel (optional reason), mark completed, and
 * retry a calendar sync that gave up (FAILED). Reschedule checks Microsoft 365 for the new slot
 * first, exactly as the customer path does, and may reassign the representative.
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
  if (!ACTIONS.has(action) || (version === 0 && action !== "retry_calendar")) return jsonError("Invalid request.", 400);

  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  const newStart = action === "reschedule" ? parseStart(body.newStart) : null;
  if (action === "reschedule" && !newStart) return jsonError("Choose a new consultation time.", 400);

  try {
    const supabase = createAdminSupabaseClient();
    const actor = { type: "ADMIN" as const, clerkUserId: gate.userId };
    let outcome: string;

    if (action === "retry_calendar") {
      const { data, error } = await supabase.rpc("consultation_retry_calendar_sync", {
        p_booking_id: bookingId,
        p_actor_clerk_user_id: gate.userId,
      });
      if (error) throw new Error(`retry calendar: ${error.code ?? ""} ${error.message}`);
      if (data !== "queued") return jsonError("This consultation has no failed calendar sync to retry.", 409, "not_failed");
      after(() => runCalendarSync(supabase, { bookingId, limit: 1 }));
      return jsonResponse({ success: true, outcome: "calendar_retry_queued", message: "Calendar sync queued again." });
    }

    if (action === "reschedule") {
      let candidates: Awaited<ReturnType<typeof freeRepresentativesAt>>;
      try {
        candidates = await freeRepresentativesAt(calendarSetting(process.env), newStart as Date);
      } catch (error) {
        if (!(error instanceof CalendarUnavailableError)) throw error;
        after(() => reportCalendarFailure(error));
        const described = describeOutcome("calendar_unavailable");
        return jsonError("Microsoft 365 calendars could not be checked, so nothing was changed. Try again shortly.", described.status, "calendar_unavailable");
      }
      ({ outcome } = await rescheduleConsultation(supabase, {
        id: bookingId,
        expectedVersion: version,
        newStart: newStart as Date,
        actor,
        secret: tokenSecret(process.env),
        candidates,
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

    if (outcome !== "completed") {
      after(async () => {
        await runCalendarSync(supabase, { bookingId, limit: 1 });
        await runConsultationDispatch(supabase);
      });
    }

    return jsonResponse({ success: true, outcome, message: described.message });
  } catch (error) {
    console.error("Admin consultation action failed:", action, error instanceof Error ? error.message : typeof error);
    return jsonError("The change could not be saved. Nothing was changed. Please try again.", 500);
  }
}
