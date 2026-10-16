import { NextResponse, after } from "next/server";

import { CONSULTATION_ACTION } from "@/lib/contact/turnstile-action";
import { clientIp, verifyTurnstile } from "@/lib/contact/turnstile";
import { reportCalendarFailure } from "@/lib/consultations/calendar-alert-server";
import { runCalendarSync } from "@/lib/consultations/calendar-sync-server";
import { calendarSetting } from "@/lib/consultations/calendar/provider";
import { CalendarUnavailableError } from "@/lib/consultations/calendar/types";
import { runConsultationDispatch } from "@/lib/consultations/dispatch-server";
import { SUCCESS_OUTCOMES, describeOutcome } from "@/lib/consultations/outcomes";
import { consultationEnd } from "@/lib/consultations/rules";
import { createConsultation, freeRepresentativesAt } from "@/lib/consultations/service";
import { tokenSecret } from "@/lib/consultations/token";
import { MAX_BOOKING_REQUEST_BYTES, validateBookingRequest } from "@/lib/consultations/validate";
import { readJsonBody } from "@/lib/security/read-json";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { CONTACT_EMAIL } from "@/lib/site";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const NO_STORE = { "Cache-Control": "no-store" };

/* Five booking attempts per address per ten minutes, per instance (see lib/security/rate-limit.ts). */
const limiter = createRateLimiter(5, 10 * 60_000);

function jsonError(message: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ success: false, error: message, ...extra }, { status, headers: NO_STORE });
}

/*
 * Book a free consultation. Order: size/type -> field rules -> rate limit -> Turnstile ->
 * Microsoft 365 free/busy for this one slot, fresh (when connected; failure = nothing booked) ->
 * database function (slot rules, per-representative overlap, fair assignment among the free
 * representatives, notice, per-email limit, idempotency, audit event, email outbox, all in one
 * transaction) -> respond -> after the response: create the Outlook event (Teams link or phone
 * details, invitation to the customer), then deliver the queued emails.
 *
 * The response never says "booked" unless the database committed the booking. Email delivery
 * is not part of that promise: it is durable in the outbox and retried if Resend is down.
 * Logs carry outcome codes and error classes only, never the visitor's details.
 */
export async function POST(request: Request) {
  try {
    const read = await readJsonBody(request, MAX_BOOKING_REQUEST_BYTES);
    if (!read.ok) return jsonError(read.message, read.status);

    const validation = validateBookingRequest(read.body);
    if (!validation.ok) return jsonError(validation.message, validation.status, validation.field ? { field: validation.field } : {});
    const fields = validation.fields;

    if (!limiter.take(clientIp(request) ?? "unknown")) {
      return jsonError("Too many attempts in a short time. Please wait a few minutes and try again.", 429);
    }

    let supabase: ReturnType<typeof createAdminSupabaseClient>;
    let secret: string;
    try {
      supabase = createAdminSupabaseClient();
      secret = tokenSecret(process.env);
    } catch (error) {
      console.error("Consultation booking misconfigured:", error instanceof Error ? error.message : "unknown error");
      return jsonError(`Booking is temporarily unavailable. Please email ${CONTACT_EMAIL} and we will arrange a time.`, 503);
    }

    const verdict = await verifyTurnstile(fields.turnstileToken, clientIp(request), supabase, CONSULTATION_ACTION);
    if (!verdict.ok) {
      if (verdict.reason === "misconfigured" || verdict.reason === "unreachable") {
        return jsonError(`Security verification is temporarily unavailable. Please try again shortly, or email ${CONTACT_EMAIL}.`, 503);
      }
      return jsonError("Security verification failed. Please complete the check again and confirm.", 403);
    }

    // Revalidate calendars for exactly this slot. Unverifiable = refuse, never guess.
    let candidates: Awaited<ReturnType<typeof freeRepresentativesAt>>;
    try {
      candidates = await freeRepresentativesAt(calendarSetting(process.env), fields.start);
    } catch (error) {
      if (!(error instanceof CalendarUnavailableError)) throw error;
      console.error("Consultation booking: calendar check failed:", error.message);
      // A refused credential means every visitor is being turned away: tell the admins now.
      after(() => reportCalendarFailure(error));
      const described = describeOutcome("calendar_unavailable");
      return jsonError(described.message, described.status, { code: "calendar_unavailable" });
    }

    const result = await createConsultation(supabase, fields, secret, candidates);
    const described = describeOutcome(result.outcome);

    if (!SUCCESS_OUTCOMES.has(result.outcome) || !result.reference || !result.start_time) {
      console.warn("Consultation booking refused:", result.outcome);
      return jsonError(described.message, described.status, { code: result.outcome });
    }

    // Calendar event first (the Teams link goes in the confirmation), then the emails. Both are
    // durable queues: the cron retries anything that fails here.
    const bookingId = result.booking_id;
    after(async () => {
      if (bookingId) await runCalendarSync(supabase, { bookingId, limit: 1 });
      await runConsultationDispatch(supabase);
    });

    const start = new Date(result.start_time);
    return NextResponse.json(
      {
        success: true,
        replayed: result.outcome === "replayed",
        booking: { reference: result.reference, start: start.toISOString(), end: consultationEnd(start).toISOString() },
      },
      { status: described.status, headers: NO_STORE }
    );
  } catch (error) {
    console.error("Consultation booking failed:", error instanceof Error ? error.message : typeof error);
    return jsonError(`We couldn't complete your booking. Please try again, or email ${CONTACT_EMAIL}.`, 500);
  }
}
