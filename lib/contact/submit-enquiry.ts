import { CONTACT_EMAIL } from "@/lib/site";

export interface EnquiryPayload {
  name: string;
  email: string;
  company: string;
  projectType: string;
  helpType: string;
  message: string;
  turnstileToken: string;
}

export type SubmitResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
      /** The security token was consumed or rejected: the widget must issue a new one. */
      securityFailed: boolean;
    };

const TIMEOUT_MS = 20_000;

const FALLBACK = `We couldn't send your enquiry right now. Please try again, or email ${CONTACT_EMAIL} directly.`;

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const data: unknown = await response.json();
    return data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  } catch {
    // A proxy or platform error page (HTML) is a failure, never a success.
    return null;
  }
}

/*
 * Posts an enquiry and reports the outcome.
 *
 * Contract: returns { ok: true } ONLY when the server answered 2xx AND explicitly confirmed
 * { success: true }. Every other outcome (validation error, security failure, rate limit,
 * server error, non-JSON body, network failure, timeout) is { ok: false } with a message
 * safe to show the visitor. Never throws.
 */
export async function submitEnquiry(
  payload: EnquiryPayload,
  fetchImpl: typeof fetch = fetch
): Promise<SubmitResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetchImpl("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";

    return {
      ok: false,
      securityFailed: true,
      message: timedOut
        ? "This is taking longer than expected, so we stopped waiting. Your enquiry may not have been sent. Please try again."
        : "We couldn't reach Drylake. Please check your connection and try again.",
    };
  } finally {
    clearTimeout(timer);
  }

  const data = await readJson(response);
  const serverMessage = typeof data?.error === "string" ? data.error : null;

  if (response.ok && data?.success === true) {
    return { ok: true };
  }

  // Any server round trip consumed the single-use security token.
  if (response.status === 403) {
    return {
      ok: false,
      securityFailed: true,
      message: "The security check didn't go through. Please complete it again and resend.",
    };
  }

  if (response.status === 429) {
    return {
      ok: false,
      securityFailed: true,
      message: "Too many attempts in a short time. Please wait a minute and try again.",
    };
  }

  if (response.status >= 400 && response.status < 500 && serverMessage) {
    return { ok: false, securityFailed: true, message: serverMessage };
  }

  if (response.status >= 500 && serverMessage) {
    return { ok: false, securityFailed: true, message: serverMessage };
  }

  return { ok: false, securityFailed: true, message: FALLBACK };
}
