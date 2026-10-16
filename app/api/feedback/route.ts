import { NextResponse } from "next/server";

import { clientIp } from "@/lib/contact/turnstile";
import { MAX_FEEDBACK_REQUEST_BYTES, SUBMIT_MESSAGES } from "@/lib/reviews/catalog";
import { hashToken } from "@/lib/reviews/tokens";
import { validateFeedbackInput } from "@/lib/reviews/validate";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { readJsonBody } from "@/lib/security/read-json";
import { redactSensitive } from "@/lib/security/redact";
import { CONTACT_EMAIL } from "@/lib/site";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const NO_STORE = { "Cache-Control": "no-store" };

/* Twenty calls per address per ten minutes, per instance: a page load is one, a send is one. */
const limiter = createRateLimiter(20, 10 * 60_000);

function reply(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/*
 * First-party feedback. The caller proves itself with the single-use token from the emailed link
 * (a 256-bit capability, hashed before any lookup), so there is no Turnstile here: there is no
 * open form to spam, only someone holding a link we issued. Rate limited per address anyway.
 *
 *   { action: "lookup", token }                                  -> state of the link
 *   { action: "submit", token, rating?, comments?, publishConsent?, displayChoice? }
 *
 * Single use is enforced by the database (review_submit_feedback locks the request row and spends
 * the token in the same transaction as the insert), not by this handler. Nothing the visitor typed
 * is logged. Display name and organisation are computed in the database from the request, never
 * taken from the browser, so a testimonial can only ever carry the recipient's own details.
 */
export async function POST(request: Request) {
  try {
    const read = await readJsonBody(request, MAX_FEEDBACK_REQUEST_BYTES);
    if (!read.ok) return reply({ success: false, error: read.message }, read.status);

    const input = validateFeedbackInput(read.body);
    if (!input.ok) return reply({ success: false, error: input.message }, input.status);

    if (!limiter.take(clientIp(request) ?? "unknown")) {
      return reply({ success: false, error: "Too many attempts in a short time. Please wait a few minutes and try again." }, 429);
    }

    let supabase: ReturnType<typeof createAdminSupabaseClient>;
    try {
      supabase = createAdminSupabaseClient();
    } catch (error) {
      console.error("Feedback misconfigured:", redactSensitive(error instanceof Error ? error.message : "unknown"));
      return reply({ success: false, error: `This form is temporarily unavailable. Please email ${CONTACT_EMAIL}.` }, 503);
    }

    if (input.action === "lookup") {
      const { data, error } = await supabase.rpc("review_lookup", { p_token_hash: hashToken(input.token) });
      if (error) throw new Error(`lookup: ${error.code ?? ""} ${redactSensitive(error.message)}`);
      const row = (Array.isArray(data) ? data[0] : data) as { state: string; recipient_name: string | null; organisation_name: string | null } | null;
      const state = row?.state ?? "invalid";

      if (state !== "open") {
        const message = SUBMIT_MESSAGES[state === "submitted" ? "already_submitted" : state]?.message ?? SUBMIT_MESSAGES.invalid.message;
        return reply({ success: true, state, message }, 200);
      }

      return reply({ success: true, state, recipientName: row?.recipient_name ?? null, organisationName: row?.organisation_name ?? null }, 200);
    }

    const { submission } = input;
    const { data, error } = await supabase.rpc("review_submit_feedback", {
      p_token_hash: hashToken(submission.token),
      p_rating: submission.rating,
      p_comments: submission.comments,
      p_publish_consent: submission.publishConsent,
      p_display_choice: submission.displayChoice,
    });
    if (error) throw new Error(`submit: ${error.code ?? ""} ${redactSensitive(error.message)}`);

    const outcome = typeof data === "string" ? data : "invalid";
    const described = SUBMIT_MESSAGES[outcome] ?? SUBMIT_MESSAGES.invalid;
    return reply({ success: outcome === "submitted", outcome, ...(outcome === "submitted" ? { message: described.message } : { error: described.message }) }, described.status);
  } catch (error) {
    // Error class only: the message could echo what the visitor wrote.
    console.error("Feedback route failed:", error instanceof Error ? error.name : typeof error);
    return reply({ success: false, error: `We couldn't save your feedback. Please try again, or email ${CONTACT_EMAIL}.` }, 500);
  }
}
