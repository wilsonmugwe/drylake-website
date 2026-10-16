/*
 * Input rules for the review endpoints. PURE: unit-tested in tests/review-requests.test.mjs.
 * Nothing here logs or echoes input.
 */

import { DISPLAY_CHOICE_VALUES, REVIEW_LIMITS } from "./catalog.ts";
import { isTokenShape } from "./tokens.ts";

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export type FeedbackSubmission = {
  token: string;
  rating: number | null;
  comments: string | null;
  publishConsent: boolean;
  displayChoice: string | null;
};

export type FeedbackInput =
  | { ok: true; action: "lookup"; token: string }
  | { ok: true; action: "submit"; submission: FeedbackSubmission }
  | { ok: false; status: number; message: string };

export function validateFeedbackInput(body: unknown): FeedbackInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, message: "Invalid request." };
  }

  const raw = body as Record<string, unknown>;

  if (!isTokenShape(raw.token)) {
    return { ok: false, status: 404, message: "We could not find this feedback link." };
  }

  if (raw.action === "lookup") {
    return { ok: true, action: "lookup", token: raw.token };
  }

  if (raw.action !== "submit") {
    return { ok: false, status: 400, message: "Invalid request." };
  }

  let rating: number | null = null;
  if (raw.rating !== undefined && raw.rating !== null && raw.rating !== "") {
    if (typeof raw.rating !== "number" || !Number.isInteger(raw.rating) || raw.rating < 1 || raw.rating > 5) {
      return { ok: false, status: 400, message: "Please choose a rating from 1 to 5, or leave it blank." };
    }
    rating = raw.rating;
  }

  let comments: string | null = null;
  if (raw.comments !== undefined && raw.comments !== null) {
    if (typeof raw.comments !== "string") return { ok: false, status: 400, message: "Invalid request." };
    const text = raw.comments.trim();
    if (text.length > REVIEW_LIMITS.comments) {
      return { ok: false, status: 400, message: `Please keep your comments to ${REVIEW_LIMITS.comments} characters or fewer.` };
    }
    if (CONTROL.test(text)) return { ok: false, status: 400, message: "Invalid characters detected." };
    comments = text === "" ? null : text;
  }

  if (rating === null && comments === null) {
    return { ok: false, status: 400, message: "Please add a rating or a comment before sending." };
  }

  // Publication consent is its own explicit boolean. Anything but literal true is "no".
  const publishConsent = raw.publishConsent === true;
  let displayChoice: string | null = null;

  if (publishConsent) {
    if (comments === null) {
      return { ok: false, status: 400, message: "To publish a testimonial, please write a comment." };
    }
    if (typeof raw.displayChoice !== "string" || !DISPLAY_CHOICE_VALUES.includes(raw.displayChoice)) {
      return { ok: false, status: 400, message: "Please choose how your name should appear." };
    }
    displayChoice = raw.displayChoice;
  }

  return { ok: true, action: "submit", submission: { token: raw.token, rating, comments, publishConsent, displayChoice } };
}

export function validateUnsubscribeToken(value: unknown): string | null {
  return isTokenShape(value) ? value : null;
}

export type SendRequestInput =
  | { ok: true; kind: "project" | "consultation"; engagementId: string }
  | { ok: false; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Admin: a send needs the engagement AND an explicit confirm:true (the UI's confirm step). */
export function validateSendRequest(body: unknown): SendRequestInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, message: "Invalid request." };
  const raw = body as Record<string, unknown>;

  if (raw.kind !== "project" && raw.kind !== "consultation") return { ok: false, message: "Choose a project or a consultation." };
  if (typeof raw.engagementId !== "string" || !UUID.test(raw.engagementId)) return { ok: false, message: "Invalid engagement." };
  if (raw.confirm !== true) return { ok: false, message: "Please confirm before sending." };

  return { ok: true, kind: raw.kind, engagementId: raw.engagementId };
}

export const REQUEST_ACTIONS = ["retry", "withdraw"] as const;
export const FEEDBACK_ACTIONS = ["approve", "unapprove", "remove"] as const;

export function validateAction<T extends string>(body: unknown, allowed: readonly T[]): T | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const action = (body as Record<string, unknown>).action;
  return typeof action === "string" && (allowed as readonly string[]).includes(action) ? (action as T) : null;
}
