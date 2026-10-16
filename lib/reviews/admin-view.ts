/* Presentation helpers for the admin review pages. PURE (unit-tested). */

export type FeedbackView = {
  rating: number | null;
  comments: string | null;
  publish_consent: boolean;
  approved: boolean;
  removed_at: string | null;
};

export function consentLabel(row: Pick<FeedbackView, "publish_consent">): string {
  return row.publish_consent ? "Agreed to publication" : "Private (no publication consent)";
}

/* The public state of one piece of feedback, in the words an admin needs. */
export function publicStateLabel(row: FeedbackView): string {
  if (row.removed_at) return "Content removed";
  if (row.approved) return "Shown on the public site";
  if (row.publish_consent) return "Awaiting your approval";
  return "Not for publication";
}

export function ratingLabel(rating: number | null): string {
  return rating === null ? "No rating" : `${rating} out of 5`;
}

export function snippet(text: string | null, max = 140): string {
  if (!text) return "";
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 3)}...` : flat;
}

/* The last characters of a Clerk user id: enough to tell admins apart without printing the id. */
export function actorTag(clerkUserId: string | null | undefined): string {
  return clerkUserId ? `admin ...${clerkUserId.slice(-6)}` : "unknown";
}

export const PUBLIC_STATE_BADGE: Record<string, string> = {
  "Shown on the public site": "bg-emerald-50 text-emerald-900 ring-emerald-200",
  "Awaiting your approval": "bg-orange-50 text-orange-900 ring-orange-200",
  "Not for publication": "bg-neutral-100 text-neutral-700 ring-neutral-200",
  "Content removed": "bg-neutral-100 text-neutral-600 ring-neutral-200",
};

export const REQUEST_STATUS_BADGE: Record<string, string> = {
  queued: "bg-neutral-100 text-neutral-700 ring-neutral-200",
  sent: "bg-sky-50 text-sky-900 ring-sky-200",
  failed: "bg-red-50 text-red-800 ring-red-200",
  submitted: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  withdrawn: "bg-neutral-100 text-neutral-600 ring-neutral-200",
};
