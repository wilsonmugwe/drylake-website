/*
 * Collaboration proposal input rules. PURE: unit-tested in tests/collaboration.test.mjs and
 * applied by app/api/collaboration/route.ts before the rate limit, Turnstile and any write.
 *
 * Contract: returns the trimmed fields only when every rule passes; otherwise a user-safe
 * message, an HTTP status and the field name. Nothing here logs or echoes the input.
 * `allowedProjects` is passed in (never imported) so an owner-gated project can be accepted
 * only while its flag is on, without this shared module naming it.
 */

import {
  COLLABORATION_CATEGORY_VALUES,
  COLLABORATION_LIMITS as LIMITS,
} from "./catalog.ts";

export type ProposalFields = {
  name: string;
  organisation: string;
  email: string;
  category: string;
  project: string;
  summary: string;
  website: string | null;
  turnstileToken: string;
};

export type ProposalValidation =
  | { ok: true; fields: ProposalFields }
  | { ok: false; status: number; message: string; field?: string };

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/* C0 controls except tab, LF and CR, plus DEL. */
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
/* Line breaks of any kind: refused in single-line fields (they go in email subjects). */
const LINE_BREAK = /[\r\n\u0085\u2028\u2029]/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/*
 * Optional website. Accepts "example.com.au" or a full http(s) URL; stores a normalised https/http
 * URL. Rejects other schemes (javascript:, data:), embedded credentials and bare hostnames.
 */
export function normaliseWebsite(input: string): string | null {
  const text = input.trim();
  if (!text || /\s/.test(text)) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  let url: URL;

  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  if (!url.hostname.includes(".") || url.hostname.endsWith(".")) return null;

  return url.href;
}

export function validateProposal(body: unknown, allowedProjects: readonly string[]): ProposalValidation {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, message: "Invalid request." };
  }

  const raw = body as Record<string, unknown>;
  const websiteText = getString(raw.website);
  const fields = {
    name: getString(raw.name),
    organisation: getString(raw.organisation),
    email: getString(raw.email).toLowerCase(),
    category: getString(raw.category),
    project: getString(raw.project),
    summary: getString(raw.summary),
    turnstileToken: getString(raw.turnstileToken),
  };

  if (raw.consent !== true) {
    return {
      ok: false,
      status: 400,
      field: "consent",
      message: "Please confirm you have read the privacy policy before sending.",
    };
  }

  if (!fields.name) return { ok: false, status: 400, field: "name", message: "Please enter your name." };
  if (!fields.organisation) return { ok: false, status: 400, field: "organisation", message: "Please enter your organisation." };
  if (!fields.email) return { ok: false, status: 400, field: "email", message: "Please enter your email address." };

  if (fields.summary.length < LIMITS.summaryMin) {
    return {
      ok: false,
      status: 400,
      field: "summary",
      message: `Please describe your proposal in at least ${LIMITS.summaryMin} characters.`,
    };
  }

  const tooLong =
    fields.name.length > LIMITS.name ||
    fields.organisation.length > LIMITS.organisation ||
    fields.email.length > LIMITS.email ||
    fields.summary.length > LIMITS.summary ||
    websiteText.length > LIMITS.website;

  if (tooLong) return { ok: false, status: 400, message: "One or more fields are too long." };

  if (!EMAIL.test(fields.email)) {
    return { ok: false, status: 400, field: "email", message: "Please enter a valid email address." };
  }

  if (!COLLABORATION_CATEGORY_VALUES.includes(fields.category)) {
    return { ok: false, status: 400, field: "category", message: "Please choose a collaboration category." };
  }

  if (!allowedProjects.includes(fields.project)) {
    return { ok: false, status: 400, field: "project", message: "Please choose a project of interest." };
  }

  const singleLine = [fields.name, fields.organisation, fields.email, websiteText];
  if (
    [...singleLine, fields.summary].some((value) => CONTROL.test(value)) ||
    singleLine.some((value) => LINE_BREAK.test(value))
  ) {
    return { ok: false, status: 400, message: "Invalid characters detected." };
  }

  let website: string | null = null;
  if (websiteText) {
    website = normaliseWebsite(websiteText);
    if (!website || website.length > LIMITS.website) {
      return { ok: false, status: 400, field: "website", message: "Please enter a valid website address, such as example.com.au." };
    }
  }

  return { ok: true, fields: { ...fields, website } };
}

/* Admin update body: { status?, notes? }. At least one must be present and valid. */
export type ProposalUpdate = { status?: string; notes?: string | null };

export function validateProposalUpdate(
  body: unknown,
  statuses: readonly string[]
): { ok: true; update: ProposalUpdate } | { ok: false; message: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "Invalid request." };
  }

  const raw = body as Record<string, unknown>;
  const update: ProposalUpdate = {};

  if (raw.status !== undefined) {
    if (typeof raw.status !== "string" || !statuses.includes(raw.status)) {
      return { ok: false, message: "Choose a valid status." };
    }
    update.status = raw.status;
  }

  if (raw.notes !== undefined) {
    if (raw.notes !== null && typeof raw.notes !== "string") return { ok: false, message: "Invalid notes." };
    const notes = typeof raw.notes === "string" ? raw.notes.trim() : "";
    if (notes.length > LIMITS.notes) return { ok: false, message: `Notes can be at most ${LIMITS.notes} characters.` };
    if (CONTROL.test(notes)) return { ok: false, message: "Notes contain invalid characters." };
    update.notes = notes === "" ? null : notes;
  }

  if (update.status === undefined && update.notes === undefined) {
    return { ok: false, message: "Nothing to change." };
  }

  return { ok: true, update };
}
