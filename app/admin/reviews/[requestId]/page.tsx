import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminReviewActions from "@/components/admin/AdminReviewActions";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import {
  PUBLIC_STATE_BADGE,
  REQUEST_STATUS_BADGE,
  actorTag,
  consentLabel,
  publicStateLabel,
  ratingLabel,
} from "@/lib/reviews/admin-view";
import { DISPLAY_CHOICES, REQUEST_STATUS_LABELS } from "@/lib/reviews/catalog";
import { byline } from "@/lib/reviews/testimonials";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review" };

const stamp = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Perth",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

type Request = {
  id: string;
  engagement_kind: string;
  engagement_id: string;
  organisation_name: string | null;
  recipient_name: string;
  recipient_email: string;
  status: string;
  sent_at: string | null;
  sent_by: string;
  submitted_at: string | null;
  token_expires_at: string;
  last_error: string | null;
  created_at: string;
};

type Feedback = {
  id: string;
  created_at: string;
  rating: number | null;
  comments: string | null;
  publish_consent: boolean;
  consent_at: string | null;
  display_choice: string | null;
  display_name: string | null;
  display_organisation: string | null;
  approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
  removed_at: string | null;
  removed_by: string | null;
};

export default async function AdminReviewPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  await requirePlatformAdmin(`/admin/reviews/${requestId}`);
  if (!isUuid(requestId)) notFound();

  const supabase = createAdminSupabaseClient();
  const [requestResult, feedbackResult] = await Promise.all([
    supabase
      .from("review_requests")
      .select("id, engagement_kind, engagement_id, organisation_name, recipient_name, recipient_email, status, sent_at, sent_by, submitted_at, token_expires_at, last_error, created_at")
      .eq("id", requestId)
      .maybeSingle(),
    supabase
      .from("review_feedback")
      .select("id, created_at, rating, comments, publish_consent, consent_at, display_choice, display_name, display_organisation, approved, approved_at, approved_by, removed_at, removed_by")
      .eq("request_id", requestId)
      .maybeSingle(),
  ]);

  if (requestResult.error) console.error("Admin review load failed:", { code: requestResult.error.code, message: requestResult.error.message });
  if (!requestResult.data) notFound();

  const request = requestResult.data as Request;
  const feedback = (feedbackResult.data ?? null) as Feedback | null;
  const now = new Date();
  const expired = request.status === "sent" && new Date(request.token_expires_at) <= now;
  // Queued for over five minutes: the server stopped before the email went (see retryRequest).
  const stuckQueued = request.status === "queued" && now.getTime() - new Date(request.created_at).getTime() > 5 * 60_000;

  const requestActions = [
    ...(request.status === "failed" || expired || stuckQueued
      ? [{ key: "retry", label: "Send again", endpoint: `/api/admin/reviews/requests/${request.id}` }]
      : []),
    ...(request.status !== "submitted" && request.status !== "withdrawn"
      ? [
          {
            key: "withdraw",
            label: "Withdraw link",
            endpoint: `/api/admin/reviews/requests/${request.id}`,
            destructive: true,
            confirm: "Withdraw this request? The link in the email will stop working. This cannot be undone.",
          },
        ]
      : []),
  ];

  const feedbackActions = feedback
    ? [
        ...(!feedback.approved && feedback.publish_consent && feedback.comments && !feedback.removed_at
          ? [{ key: "approve", label: "Approve for the public site", endpoint: `/api/admin/reviews/feedback/${feedback.id}` }]
          : []),
        ...(feedback.approved
          ? [{ key: "unapprove", label: "Remove from the public site", endpoint: `/api/admin/reviews/feedback/${feedback.id}` }]
          : []),
        ...(feedback.comments && !feedback.removed_at
          ? [
              {
                key: "remove",
                label: "Remove written content",
                endpoint: `/api/admin/reviews/feedback/${feedback.id}`,
                destructive: true,
                confirm:
                  "Delete the written comment? It is cleared for good and unapproved. The rating and the fact that feedback arrived are kept.",
              },
            ]
          : []),
      ]
    : [];

  const state = feedback ? publicStateLabel(feedback) : null;

  return (
    <main className="min-h-screen p-5 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-[1100px]">
        <Link href="/admin/reviews" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-950">
          <ArrowLeft aria-hidden="true" size={15} /> All reviews
        </Link>

        <AdminPageHeader
          eyebrow="Review request"
          title={request.recipient_name}
          description={`${request.engagement_kind === "project" ? "Completed project" : "Completed consultation"}${request.organisation_name ? `, ${request.organisation_name}` : ""}. Times are Perth time.`}
          action={
            <span className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${REQUEST_STATUS_BADGE[request.status] ?? ""}`}>
              {expired ? "Link expired" : (REQUEST_STATUS_LABELS[request.status] ?? request.status)}
            </span>
          }
        />

        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="request-heading" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 id="request-heading" className="font-semibold text-neutral-950">The request</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <Detail label="Recipient" value={request.recipient_name} />
              <Detail label="Email" value={<span className="break-all">{request.recipient_email}</span>} />
              <Detail label="Sent" value={request.sent_at ? stamp.format(new Date(request.sent_at)) : "Not sent"} />
              <Detail label="Sent by" value={actorTag(request.sent_by)} />
              <Detail label="Link expires" value={stamp.format(new Date(request.token_expires_at))} />
              <Detail label="Answered" value={request.submitted_at ? stamp.format(new Date(request.submitted_at)) : "Not yet"} />
            </dl>
            {request.last_error ? <p role="alert" className="mt-4 text-sm text-red-700">Last error: {request.last_error}</p> : null}
            <div className="mt-5">
              <AdminReviewActions actions={requestActions} />
            </div>
          </section>

          <section aria-labelledby="feedback-heading" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 id="feedback-heading" className="font-semibold text-neutral-950">The feedback</h2>
            {!feedback ? (
              <p className="mt-4 text-sm text-neutral-600">No feedback has been submitted for this request.</p>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${PUBLIC_STATE_BADGE[state ?? ""] ?? ""}`}>{state}</span>
                  <span className="text-xs text-neutral-600">{stamp.format(new Date(feedback.created_at))}</span>
                </div>
                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                  <Detail label="Rating" value={ratingLabel(feedback.rating)} />
                  <Detail label="Publication consent" value={consentLabel(feedback)} />
                  {feedback.publish_consent ? (
                    <>
                      <Detail label="Consent given" value={feedback.consent_at ? stamp.format(new Date(feedback.consent_at)) : "Unknown"} />
                      <Detail label="Credited as" value={DISPLAY_CHOICES.find((c) => c.value === feedback.display_choice)?.label ?? "Not set"} />
                      <Detail label="Would appear as" value={byline(feedback)} />
                    </>
                  ) : null}
                  {feedback.approved_at ? <Detail label="Approved" value={`${stamp.format(new Date(feedback.approved_at))} by ${actorTag(feedback.approved_by)}`} /> : null}
                  {feedback.removed_at ? <Detail label="Content removed" value={`${stamp.format(new Date(feedback.removed_at))} by ${actorTag(feedback.removed_by)}`} /> : null}
                </dl>
                <div className="mt-5 border-t border-neutral-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Comments</p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-800">
                    {feedback.comments ?? (feedback.removed_at ? "The written content was removed." : "No comment was written.")}
                  </p>
                </div>
                <div className="mt-5">
                  <AdminReviewActions actions={feedbackActions} />
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</dt>
      <dd className="mt-1 break-words text-neutral-900">{value}</dd>
    </div>
  );
}
