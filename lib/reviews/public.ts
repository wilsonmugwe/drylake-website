import "server-only";

import { type FeedbackRow, type Testimonial, visibleTestimonials } from "@/lib/reviews/testimonials";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const TIMEOUT_MS = 4_000;

/*
 * Approved, consented feedback for the public site. Contract: returns [] on ANY failure
 * (database unreachable, migration not applied, misconfiguration, timeout), so a page that shows
 * these can never break or show a placeholder because of them. The query repeats the publication
 * invariant in SQL terms and visibleTestimonials() applies it again in code: consent given,
 * approved by an admin, not removed, with text. Only the display fields and the text are selected:
 * never the recipient's email, the rating or anything else.
 */
export async function getApprovedQuotes(limit = 6): Promise<Testimonial[]> {
  try {
    const supabase = createAdminSupabaseClient();
    const query = supabase
      .from("review_feedback")
      .select("comments, publish_consent, approved, removed_at, display_name, display_organisation, approved_at")
      .eq("approved", true)
      .eq("publish_consent", true)
      .is("removed_at", null)
      .not("comments", "is", null)
      .order("approved_at", { ascending: false })
      .limit(limit)
      .then((result) => result);

    const result = await Promise.race([
      query,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS)),
    ]);

    if (!result || result.error) return [];
    return visibleTestimonials((result.data ?? []) as FeedbackRow[], limit);
  } catch {
    return [];
  }
}
