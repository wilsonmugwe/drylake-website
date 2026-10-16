/*
 * What the public site may show. PURE (unit-tested). The ONLY path from a customer's words to a
 * public page runs through visibleTestimonials(): consent given, approved by an admin, not
 * removed, with text. The database enforces the same invariant (review_feedback check
 * constraints); this is the second lock.
 *
 * Deliberately absent: any rating arithmetic. The site never shows stars, an average or a count
 * of reviews, and never emits aggregateRating or Review structured data. Google's guidance treats
 * a business marking up reviews about itself on its own site as self-serving, so no Review or
 * AggregateRating markup is added anywhere, ever (tests/review-requests.test.mjs pins this).
 */

export type FeedbackRow = {
  comments: string | null;
  publish_consent: boolean;
  approved: boolean;
  removed_at: string | null;
  display_name: string | null;
  display_organisation: string | null;
  approved_at: string | null;
};

export type Testimonial = { quote: string; byline: string };

export function byline(row: Pick<FeedbackRow, "display_name" | "display_organisation">): string {
  const parts = [row.display_name?.trim(), row.display_organisation?.trim()].filter((p): p is string => Boolean(p));
  return parts.length > 0 ? parts.join(", ") : "A Drylake client";
}

export function visibleTestimonials(rows: readonly FeedbackRow[], limit = 6): Testimonial[] {
  return rows
    .filter((r) => r.publish_consent && r.approved && !r.removed_at && typeof r.comments === "string" && r.comments.trim() !== "")
    .sort((a, b) => (b.approved_at ?? "").localeCompare(a.approved_at ?? ""))
    .slice(0, limit)
    .map((r) => ({ quote: (r.comments as string).trim(), byline: byline(r) }));
}

/*
 * REVIEW_PLATFORM_URL: where a customer can leave a review on a platform the business does not
 * control (for example a Google Business Profile review link). https only; nothing else renders.
 */
export function reviewPlatformUrl(value: string | undefined): { href: string; host: string } | null {
  const text = (value ?? "").trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".")) return null;
    return { href: url.href, host: url.hostname.replace(/^www\./, "") };
  } catch {
    return null;
  }
}
