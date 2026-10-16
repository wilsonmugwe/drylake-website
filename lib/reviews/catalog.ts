/*
 * Vocabularies and limits for review requests and first-party feedback. PURE and safe in the
 * browser (the public feedback form imports it).
 */

export const DISPLAY_CHOICES = [
  { value: "name_and_organisation", label: "My name and organisation" },
  { value: "first_name_and_organisation", label: "My first name and organisation" },
  { value: "organisation_only", label: "My organisation only" },
  { value: "anonymous", label: "Anonymous" },
] as const;

export type DisplayChoice = (typeof DISPLAY_CHOICES)[number]["value"];

export const DISPLAY_CHOICE_VALUES: readonly string[] = DISPLAY_CHOICES.map((c) => c.value);

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  queued: "Sending",
  sent: "Sent, awaiting feedback",
  failed: "Email failed",
  submitted: "Feedback received",
  withdrawn: "Withdrawn",
};

export const REVIEW_LIMITS = {
  comments: 2000,
  displayName: 120,
} as const;

export const MAX_FEEDBACK_REQUEST_BYTES = 6_000;

/* Outcomes of review_submit_feedback and what the visitor is told. */
export const SUBMIT_MESSAGES: Record<string, { status: number; message: string }> = {
  submitted: { status: 200, message: "Thank you. Your feedback has been received." },
  already_submitted: { status: 409, message: "This link has already been used. Thank you for your feedback." },
  expired: { status: 410, message: "This link has expired. If you would still like to share feedback, please email us." },
  withdrawn: { status: 410, message: "This link is no longer active." },
  invalid: { status: 404, message: "We could not find this feedback link." },
  empty: { status: 400, message: "Please add a rating or a comment before sending." },
  consent_needs_comments: { status: 400, message: "To publish a testimonial, please write a comment." },
  invalid_input: { status: 400, message: "Please check what you entered and try again." },
};
