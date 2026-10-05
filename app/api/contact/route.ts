import { NextResponse } from "next/server";

import { clientIp, verifyTurnstile } from "@/lib/contact/turnstile";
import { deliverContactEnquiry } from "@/lib/email/contact-enquiry";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { CONTACT_EMAIL } from "@/lib/site";

interface ContactRequest {
  name?: unknown;
  email?: unknown;
  company?: unknown;
  projectType?: unknown;
  budget?: unknown;
  message?: unknown;
  turnstileToken?: unknown;
}

const MAX_REQUEST_BYTES = 10_000;

const LIMITS = {
  name: 120,
  email: 200,
  company: 160,
  projectType: 100,
  budget: 100,
  message: 5000,
} as const;

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email: string): boolean {
  return (
    email.length <= LIMITS.email &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

function containsControlCharacters(value: string): boolean {
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value);
}

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

    let body: ContactRequest;

    try {
      body = (await request.json()) as ContactRequest;
    } catch {
      return jsonError("Invalid request.", 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonError("Invalid request.", 400);
    }

    const name = getString(body.name);
    const email = getString(body.email).toLowerCase();
    const company = getString(body.company);
    const projectType = getString(body.projectType);
    const budget = getString(body.budget);
    const message = getString(body.message);
    const turnstileToken = getString(body.turnstileToken);

    if (!name || !email || !message) {
      return jsonError(
        "Name, email and project details are required.",
        400
      );
    }

    if (
      name.length > LIMITS.name ||
      email.length > LIMITS.email ||
      company.length > LIMITS.company ||
      projectType.length > LIMITS.projectType ||
      budget.length > LIMITS.budget ||
      message.length > LIMITS.message
    ) {
      return jsonError("One or more fields are too long.", 400);
    }

    if (!isValidEmail(email)) {
      return jsonError(
        "Please enter a valid email address.",
        400
      );
    }

    if (
      containsControlCharacters(name) ||
      containsControlCharacters(email) ||
      containsControlCharacters(company) ||
      containsControlCharacters(projectType) ||
      containsControlCharacters(budget) ||
      containsControlCharacters(message)
    ) {
      return jsonError("Invalid characters detected.", 400);
    }

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
      budget,
      message,
      receivedAt: new Date().toISOString(),
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