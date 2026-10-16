import { NextResponse } from "next/server";

import { COLLABORATION_ACTION, MAX_COLLABORATION_REQUEST_BYTES } from "@/lib/collaboration/catalog";
import { projectOptions } from "@/lib/collaboration/projects";
import { validateProposal } from "@/lib/collaboration/validate";
import { clientIp, verifyTurnstile } from "@/lib/contact/turnstile";
import { acknowledgeProposal, notifyProposal } from "@/lib/email/collaboration";
import { readJsonBody } from "@/lib/security/read-json";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { redactSensitive } from "@/lib/security/redact";
import { CONTACT_EMAIL } from "@/lib/site";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const NO_STORE = { "Cache-Control": "no-store" };

/* Five proposals per address per ten minutes, per instance (see lib/security/rate-limit.ts). */
const limiter = createRateLimiter(5, 10 * 60_000);

function jsonError(message: string, status: number, field?: string) {
  return NextResponse.json({ success: false, error: message, ...(field ? { field } : {}) }, { status, headers: NO_STORE });
}

/*
 * Public collaboration proposal. Order: size/type -> field rules -> rate limit -> Turnstile
 * (its own action) -> database insert -> emails -> respond.
 *
 * The row is the source of truth: it is written BEFORE any email, so a Resend outage never loses
 * a proposal (it is visible in /admin/collaborations). The visitor is told "received" only after
 * the insert committed. Email failures are logged with redacted text and do not fail the request.
 * Logs carry error classes and redacted provider text only, never the visitor's details.
 */
export async function POST(request: Request) {
  try {
    const read = await readJsonBody(request, MAX_COLLABORATION_REQUEST_BYTES);
    if (!read.ok) return jsonError(read.message, read.status);

    // Abbicare (and any future owner-gated project) is accepted only while its flag is on.
    const allowedProjects = projectOptions(process.env).map((option) => option.value);
    const validation = validateProposal(read.body, allowedProjects);
    if (!validation.ok) return jsonError(validation.message, validation.status, validation.field);
    const fields = validation.fields;

    if (!limiter.take(clientIp(request) ?? "unknown")) {
      return jsonError("Too many attempts in a short time. Please wait a few minutes and try again.", 429);
    }

    let supabase: ReturnType<typeof createAdminSupabaseClient>;
    try {
      supabase = createAdminSupabaseClient();
    } catch (error) {
      console.error("Collaboration form misconfigured:", redactSensitive(error instanceof Error ? error.message : "unknown"));
      return jsonError(`This form is temporarily unavailable. Please email ${CONTACT_EMAIL}.`, 503);
    }

    const verdict = await verifyTurnstile(fields.turnstileToken, clientIp(request), supabase, COLLABORATION_ACTION);
    if (!verdict.ok) {
      if (verdict.reason === "misconfigured" || verdict.reason === "unreachable") {
        return jsonError(`Security verification is temporarily unavailable. Please try again shortly, or email ${CONTACT_EMAIL}.`, 503);
      }
      return jsonError("Security verification failed. Please complete the check again and resend.", 403);
    }

    const receivedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("collaboration_proposals")
      .insert({
        name: fields.name,
        organisation: fields.organisation,
        email: fields.email,
        category: fields.category,
        project: fields.project,
        summary: fields.summary,
        website: fields.website,
        // Set by the server: the client cannot back-date or omit its acknowledgement.
        consent_at: receivedAt,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("Collaboration proposal insert failed:", { code: error?.code, message: redactSensitive(error?.message) });
      return jsonError(`We couldn't save your proposal. Please try again, or email ${CONTACT_EMAIL}.`, 502);
    }

    const proposal = {
      id: String(data.id),
      name: fields.name,
      organisation: fields.organisation,
      email: fields.email,
      category: fields.category,
      project: fields.project,
      summary: fields.summary,
      website: fields.website,
      receivedAt,
    };

    const sent = await Promise.allSettled([notifyProposal(proposal), acknowledgeProposal(proposal)]);
    sent.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          index === 0 ? "Collaboration notification failed:" : "Collaboration acknowledgement failed:",
          redactSensitive(result.reason instanceof Error ? result.reason.message : "unknown error")
        );
      }
    });

    return NextResponse.json({ success: true }, { status: 200, headers: NO_STORE });
  } catch (error) {
    // Generic by design: log the error class only, never its message.
    console.error("Collaboration route failed:", error instanceof Error ? error.name : typeof error);
    return jsonError("Unable to process your proposal.", 500);
  }
}
