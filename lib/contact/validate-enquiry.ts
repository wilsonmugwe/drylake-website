/*
 * Contact form input rules. PURE: unit-tested in tests/security-hardening.test.mjs and
 * applied by app/api/contact/route.ts before Turnstile verification and email delivery.
 *
 * Contract: returns the trimmed fields only when every rule passes; otherwise a
 * user-safe message and HTTP status. Nothing here logs or echoes the input.
 */

export const MAX_REQUEST_BYTES = 10_000;

export const LIMITS = {
  name: 120,
  email: 200,
  company: 160,
  projectType: 100,
  helpType: 100,
  message: 5000,
  phone: 40,
} as const;

export type EnquiryFields = {
  name: string;
  email: string;
  company: string;
  projectType: string;
  helpType: string;
  message: string;
  turnstileToken: string;
  /* Optional extras used by the AI assistant's escalation form; empty/false for the contact page. */
  phone: string;
  source: "" | "assistant";
  wantsHuman: boolean;
};

export type EnquiryValidation =
  | { ok: true; fields: EnquiryFields }
  | { ok: false; status: number; message: string };

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/* C0 controls except tab, LF and CR, plus DEL. Applies to every field. */
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/*
 * Line breaks of any kind. Refused in single-line fields: the name and company are placed in
 * the email Subject, and a line break there is how header injection starts. The message
 * body keeps its line breaks (it is HTML-escaped and sent as the body, never as a header).
 */
const LINE_BREAK = /[\r\n\u0085\u2028\u2029]/;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEnquiry(body: unknown): EnquiryValidation {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, message: "Invalid request." };
  }

  const raw = body as Record<string, unknown>;
  const fields: EnquiryFields = {
    name: getString(raw.name),
    email: getString(raw.email).toLowerCase(),
    company: getString(raw.company),
    projectType: getString(raw.projectType),
    // "What kind of help". Sent as `budget` before 2026-10-08; a tab opened before that deploy
    // still posts the old key, so read it as a fallback rather than drop the answer.
    helpType: getString(raw.helpType) || getString(raw.budget),
    message: getString(raw.message),
    turnstileToken: getString(raw.turnstileToken),
    phone: getString(raw.phone),
    // Only the known tag is honoured: arbitrary text must never reach the email.
    source: raw.source === "assistant" ? "assistant" : "",
    wantsHuman: raw.source === "assistant" && raw.wantsHuman === true,
  };

  if (!fields.name || !fields.email || !fields.message) {
    return { ok: false, status: 400, message: "Name, email and project details are required." };
  }

  // The assistant's form states what consent covers; an assistant enquiry without it is refused.
  if (fields.source === "assistant" && raw.consent !== true) {
    return { ok: false, status: 400, message: "Please tick the box to confirm we may reply to you." };
  }

  const tooLong = (Object.keys(LIMITS) as Array<keyof typeof LIMITS>).some(
    (key) => fields[key].length > LIMITS[key]
  );

  if (tooLong) {
    return { ok: false, status: 400, message: "One or more fields are too long." };
  }

  if (!EMAIL.test(fields.email)) {
    return { ok: false, status: 400, message: "Please enter a valid email address." };
  }

  const singleLine = [fields.name, fields.email, fields.company, fields.projectType, fields.helpType, fields.phone];

  if (
    [...singleLine, fields.message].some((value) => CONTROL.test(value)) ||
    singleLine.some((value) => LINE_BREAK.test(value))
  ) {
    return { ok: false, status: 400, message: "Invalid characters detected." };
  }

  return { ok: true, fields };
}
