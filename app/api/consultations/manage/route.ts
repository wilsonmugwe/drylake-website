import { NextResponse, after } from "next/server";

import { clientIp } from "@/lib/contact/turnstile";
import { runConsultationDispatch } from "@/lib/consultations/dispatch-server";
import { describeOutcome } from "@/lib/consultations/outcomes";
import {
  cancelConsultation,
  customerView,
  findById,
  findByManageToken,
  rescheduleConsultation,
} from "@/lib/consultations/service";
import { tokenSecret } from "@/lib/consultations/token";
import { validateManageRequest } from "@/lib/consultations/validate";
import { readJsonBody } from "@/lib/security/read-json";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { CONTACT_EMAIL } from "@/lib/site";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const NO_STORE = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

/* Token guessing is hopeless (256-bit HMAC), but every lookup still costs a query: bound it. */
const limiter = createRateLimiter(30, 10 * 60_000);

const LINK_INVALID =
  "This appointment link is not valid or has expired. Please use the link in your most recent email from Drylake.";

function jsonError(message: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ success: false, error: message, ...extra }, { status, headers: NO_STORE });
}

/*
 * Customer appointment management, authorised ONLY by the management token from the email
 * (POST body, never a URL query, so it is never in a log). The token opens exactly one booking;
 * it carries no admin rights and no other customer's data.
 *
 *   view        -> the booking's own details
 *   cancel      -> consultation_cancel_booking (actor CUSTOMER)
 *   reschedule  -> consultation_reschedule_booking (actor CUSTOMER), atomic; returns the new
 *                  token because the old link is revoked by the change
 *
 * Unknown, malformed and expired tokens get the same 404, so the endpoint reveals nothing
 * about which bookings exist.
 */
export async function POST(request: Request) {
  try {
    if (!limiter.take(clientIp(request) ?? "unknown")) {
      return jsonError("Too many attempts in a short time. Please wait a few minutes and try again.", 429);
    }

    const read = await readJsonBody(request, 2_000);
    if (!read.ok) return jsonError(read.message, read.status);

    const validation = validateManageRequest(read.body);
    if (!validation.ok) return jsonError(validation.message, validation.status);
    const { token, action, version, newStart } = validation.fields;

    let supabase: ReturnType<typeof createAdminSupabaseClient>;
    let secret: string;
    try {
      supabase = createAdminSupabaseClient();
      secret = tokenSecret(process.env);
    } catch (error) {
      console.error("Consultation manage misconfigured:", error instanceof Error ? error.message : "unknown error");
      return jsonError(`Appointment changes are temporarily unavailable. Please email ${CONTACT_EMAIL}.`, 503);
    }

    const booking = await findByManageToken(supabase, token);
    if (!booking) return jsonError(LINK_INVALID, 404, { code: "invalid_link" });

    if (action === "view") {
      return NextResponse.json({ success: true, booking: customerView(booking) }, { headers: NO_STORE });
    }

    const actor = { type: "CUSTOMER" as const, clerkUserId: null };
    let outcome: string;
    let newToken: string | null = null;

    if (action === "cancel") {
      ({ outcome } = await cancelConsultation(supabase, { id: booking.id, expectedVersion: version, actor, reason: null }));
    } else {
      const result = await rescheduleConsultation(supabase, {
        id: booking.id,
        expectedVersion: version,
        newStart: newStart as Date,
        actor,
        secret,
      });
      outcome = result.outcome;
      newToken = result.newToken;
    }

    const described = describeOutcome(outcome);
    const latest = await findById(supabase, booking.id);
    const view = latest ? customerView(latest) : null;

    if (outcome !== "cancelled" && outcome !== "rescheduled") {
      console.warn("Consultation change refused:", action, outcome);
      return jsonError(described.message, described.status, { code: outcome, booking: view });
    }

    after(() => runConsultationDispatch(supabase));

    return NextResponse.json(
      { success: true, message: described.message, booking: view, ...(newToken ? { token: newToken } : {}) },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("Consultation manage failed:", error instanceof Error ? error.message : typeof error);
    return jsonError(`We couldn't update your appointment. Please try again, or email ${CONTACT_EMAIL}.`, 500);
  }
}
