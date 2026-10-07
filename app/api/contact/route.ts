import { NextResponse } from "next/server";

import { getPortalContext } from "@/lib/contact/portal-context";
import { clientIp, verifyTurnstile } from "@/lib/contact/turnstile";
import { deliverContactEnquiry } from "@/lib/email/contact-enquiry";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { MAX_REQUEST_BYTES, validateEnquiry } from "@/lib/contact/validate-enquiry";
import { CONTACT_EMAIL } from "@/lib/site";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(request: Request) {
  try {
    const contentLength = request.headers.get("content-length");

    if (contentLength) {
      const bytes = Number(contentLength);

      if (!Number.isFinite(bytes) || bytes < 0) {
        return jsonError("Invalid request.", 400);
      }

      if (bytes > MAX_REQUEST_BYTES) {
        return jsonError("Request is too large.", 413);
      }
    }

    const contentType = request.headers.get("content-type") ?? "";

    if (!contentType.toLowerCase().startsWith("application/json")) {
      return jsonError("Unsupported content type.", 415);
    }

    // Enforce the size on the bytes actually received: Content-Length is optional (chunked
    // requests omit it), so the header check above cannot be the only limit.
    let rawBody: string;

    try {
      rawBody = await request.text();
    } catch {
      return jsonError("Invalid request.", 400);
    }

    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return jsonError("Request is too large.", 413);
    }

    let body: unknown;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonError("Invalid request.", 400);
    }

    // Field rules (required, lengths, email shape, control characters, no line breaks in
    // single-line fields) live in lib/contact/validate-enquiry.ts and are unit-tested.
    const validation = validateEnquiry(body);

    if (!validation.ok) {
      return jsonError(validation.message, validation.status);
    }

    const { name, email, company, projectType, helpType, message, turnstileToken } =
      validation.fields;

    /*
     * Server-side Turnstile verification, after the cheap field checks and before any
     * processing. Missing, invalid, expired, reused or foreign-host tokens are rejected.
     */
    // Shared single-use store for tokens. Missing Supabase config must not take the contact
    // form down: the verifier then falls back to its in-memory replay check.
    let claimStore: ReturnType<typeof createAdminSupabaseClient> | null = null;

    try {
      claimStore = createAdminSupabaseClient();
    } catch {
      console.error("Turnstile: Supabase not configured; token replay check is per-instance only.");
    }

    const verdict = await verifyTurnstile(turnstileToken, clientIp(request), claimStore);

    if (!verdict.ok) {
      if (verdict.reason === "misconfigured" || verdict.reason === "unreachable") {
        return jsonError(
          `Security verification is temporarily unavailable. Please try again shortly, or email ${CONTACT_EMAIL} directly.`,
          503
        );
      }

      return jsonError(
        "Security verification failed. Please complete the check again and resend.",
        403
      );
    }

    const enquiry = {
      name,
      email,
      company,
      projectType,
      helpType,
      message,
      receivedAt: new Date().toISOString(),
      // Signed-in senders (the portal's "Start a conversation") carry server-verified
      // account and workspace context; anonymous visitors carry none.
      portal: await getPortalContext(),
    };

    // Fail loudly: a visitor must never see "received" for an enquiry that was not delivered.
    try {
      await deliverContactEnquiry(enquiry);
    } catch (error) {
      // Log the cause, never the enquiry: the message comes from config checks
      // ("Missing CONTACT_TO_EMAIL", "Missing EMAIL_FROM", "Missing RESEND_API_KEY") or
      // from Resend's error, and contains no personal information. Without this line a
      // misconfigured mailer is invisible in the Vercel logs.
      console.error(
        "Contact enquiry delivery failed:",
        error instanceof Error ? error.message : "unknown error"
      );

      return jsonError(
        `We couldn't send your enquiry. Please email ${CONTACT_EMAIL} directly.`,
        502
      );
    }

    return NextResponse.json(
      { success: true },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    return jsonError(
      "Unable to process your enquiry.",
      500
    );
  }
}