import { NextResponse } from "next/server";

import { deliverContactEnquiry } from "@/lib/email/contact-enquiry";

interface ContactRequest {
  name?: unknown;
  email?: unknown;
  company?: unknown;
  projectType?: unknown;
  budget?: unknown;
  message?: unknown;
  turnstileToken?: unknown;
}

interface TurnstileResponse {
  success: boolean;
  "error-codes"?: string[];
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

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.error("TURNSTILE_SECRET_KEY is not configured.");
    return false;
  }

  try {
    const formData = new FormData();

    formData.append("secret", secret);
    formData.append("response", token);

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return false;
    }

    const result = (await response.json()) as TurnstileResponse;

    return result.success === true;
  } catch {
    return false;
  }
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

    /*
     * Verify the anti-bot token before processing the enquiry.
     */
    if (!turnstileToken) {
      return jsonError("Security verification is required.", 403);
    }

    const turnstileValid = await verifyTurnstile(turnstileToken);

    if (!turnstileValid) {
      return jsonError(
        "Security verification failed. Please try again.",
        403
      );
    }

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
    } catch {
      return jsonError(
        "We couldn't send your enquiry. Please email hello@drylake.com.au directly.",
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