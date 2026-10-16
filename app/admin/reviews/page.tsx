import Link from "next/link";
import { ArrowRight, MessageSquareText } from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminReviewSend from "@/components/admin/AdminReviewSend";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import {
  PUBLIC_STATE_BADGE,
  REQUEST_STATUS_BADGE,
  actorTag,
  publicStateLabel,
  ratingLabel,
  snippet,
} from "@/lib/reviews/admin-view";
import { REQUEST_STATUS_LABELS } from "@/lib/reviews/catalog";
import type { Candidate } from "@/lib/reviews/eligibility";
import { loadCandidates } from "@/lib/reviews/service";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reviews" };

const stamp = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Perth", day: "numeric", month: "short", year: "numeric" });

type RequestRow = {
  id: string;
  engagement_kind: string;
  engagement_id: string;
  recipient_name: string;
  recipient_email: string;
  status: string;
  sent_at: string | null;
  sent_by: string;
  token_expires_at: string;
};

type FeedbackRow = {
  id: string;
  request_id: string;
  created_at: string;
  rating: number | null;
  comments: string | null;
  publish_consent: boolean;
  approved: boolean;
  removed_at: string | null;
};

/*
 * Review requests and first-party feedback. Three sections: who is ready to be asked (derived
 * from completed projects and completed consultations, rule in lib/reviews/eligibility.ts), the
 * requests already sent, and the feedback received. All feedback is listed here, negative
 * included: nothing is filtered or hidden from this view. External review platforms remain
 * authoritative for their own reviews; this page manages only Drylake's own requests and form.
 */
export default async function AdminReviewsPage() {
  await requirePlatformAdmin("/admin/reviews");

  const supabase = createAdminSupabaseClient();
  const [requestsResult, feedbackResult, suppressionsResult, candidatesResult] = await Promise.all([
    supabase
      .from("review_requests")
      .select("id, engagement_kind, engagement_id, recipient_name, recipient_email, status, sent_at, sent_by, token_expires_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("review_feedback")
      .select("id, request_id, created_at, rating, comments, publish_consent, approved, removed_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("review_suppressions").select("email_lower, created_at, source").order("created_at", { ascending: false }).limit(200),
    loadCandidates(supabase).then(
      (data) => ({ data, failed: false }),
      (error: unknown) => {
        console.error("Admin reviews candidates failed:", error instanceof Error ? error.name : typeof error);
        return { data: [] as Candidate[], failed: true };
      }
    ),
  ]);

  for (const result of [requestsResult, feedbackResult, suppressionsResult]) {
    if (result.error) console.error("Admin reviews load failed:", { code: result.error.code, message: result.error.message });
  }

  const loadError = candidatesResult.failed || Boolean(requestsResult.error || feedbackResult.error || suppressionsResult.error);
  const candidates = candidatesResult.data;

  const requests = (requestsResult.data ?? []) as RequestRow[];
  const feedback = (feedbackResult.data ?? []) as FeedbackRow[];
  const suppressions = (suppressionsResult.data ?? []) as Array<{ email_lower: string; created_at: string; source: string }>;
  const requestById = new Map(requests.map((r) => [r.id, r]));
  const labelFor = new Map(candidates.map((c) => [`${c.kind}:${c.engagementId}`, c.engagementLabel]));
  const ready = candidates.filter((c) => c.blocked === null);

  return (
    <main className="min-h-screen p-5 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-[1450px]">
        <AdminPageHeader
          eyebrow="Drylake Administration"
          title="Reviews"
          description="Ask people who have worked with Drylake for honest feedback, and manage what comes back. Nothing is sent automatically, and every request needs your confirmation."
        />

        <p className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-700">
          External review platforms stay authoritative for their own reviews: Drylake never copies, edits or ranks them. This page covers requests sent from here and feedback received through Drylake&apos;s own form. A comment appears on the public site only if the customer ticked the separate publication consent and you approved it.
        </p>

        {loadError ? (
          <p role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            Some review data could not be loaded. If this is the first deploy, check that the review migration has been applied.
          </p>
        ) : null}

        <section aria-labelledby="ready-heading" className="mt-8">
          <h2 id="ready-heading" className="text-lg font-semibold text-neutral-950">Ready to ask ({ready.length})</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Completed projects (asking the client&apos;s billing contact) and completed consultations (asking the person who booked). Archived clients, invalid emails, people who opted out and engagements already asked are left out.
          </p>

          {ready.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-neutral-200 bg-white px-5 py-8 text-center text-sm text-neutral-600">No one is ready to be asked right now.</p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {ready.map((c) => (
                <li key={`${c.kind}:${c.engagementId}`} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-950">{c.engagementLabel}</p>
                    <p className="mt-0.5 text-sm text-neutral-700">
                      {c.recipientName}
                      {c.organisationName ? `, ${c.organisationName}` : ""}
                    </p>
                    <p className="mt-0.5 break-all text-xs text-neutral-600">
                      {c.recipientEmail} · {c.kind === "project" ? "Completed project" : "Completed consultation"}
                    </p>
                  </div>
                  <AdminReviewSend
                    kind={c.kind}
                    engagementId={c.engagementId}
                    engagementLabel={c.engagementLabel}
                    recipientName={c.recipientName}
                    recipientEmail={c.recipientEmail}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="requests-heading" className="mt-10">
          <h2 id="requests-heading" className="text-lg font-semibold text-neutral-950">Requests ({requests.length})</h2>
          {requests.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-neutral-200 bg-white px-5 py-8 text-center text-sm text-neutral-600">No requests have been sent yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <table className="w-full min-w-[720px] text-left text-sm">
                <caption className="sr-only">Review requests</caption>
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-[0.08em] text-neutral-600">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Recipient</th>
                    <th scope="col" className="px-5 py-3 font-semibold">About</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Sent</th>
                    <th scope="col" className="px-5 py-3"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                      <td className="px-5 py-4">
                        <p className="font-medium text-neutral-950">{r.recipient_name}</p>
                        <p className="mt-0.5 break-all text-xs text-neutral-600">{r.recipient_email}</p>
                      </td>
                      <td className="px-5 py-4 text-neutral-700">{labelFor.get(`${r.engagement_kind}:${r.engagement_id}`) ?? (r.engagement_kind === "project" ? "Project" : "Consultation")}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${REQUEST_STATUS_BADGE[r.status] ?? ""}`}>
                          {REQUEST_STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-neutral-600">
                        {r.sent_at ? stamp.format(new Date(r.sent_at)) : "Not sent"}
                        <br />by {actorTag(r.sent_by)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link href={`/admin/reviews/${r.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-neutral-950">
                          Open <span className="sr-only">request to {r.recipient_name}</span>
                          <ArrowRight aria-hidden="true" size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="feedback-heading" className="mt-10">
          <h2 id="feedback-heading" className="text-lg font-semibold text-neutral-950">Feedback received ({feedback.length})</h2>
          <p className="mt-1 text-sm text-neutral-600">Every submission is listed, whatever it says.</p>
          {feedback.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-neutral-200 bg-white px-5 py-10 text-center">
              <MessageSquareText aria-hidden="true" size={22} className="mx-auto text-[#f26a2e]" />
              <p className="mt-3 text-sm font-medium text-neutral-800">No feedback has been received yet</p>
            </div>
          ) : (
            <ul className="mt-4 grid gap-3">
              {feedback.map((f) => {
                const state = publicStateLabel(f);
                const request = requestById.get(f.request_id);
                return (
                  <li key={f.id}>
                    <Link href={`/admin/reviews/${f.request_id}`} className="block rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm hover:bg-neutral-50">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-neutral-950">{request?.recipient_name ?? "Customer"}</p>
                          <p className="mt-0.5 text-xs text-neutral-600">{ratingLabel(f.rating)} · {stamp.format(new Date(f.created_at))}</p>
                        </div>
                        <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${PUBLIC_STATE_BADGE[state] ?? ""}`}>{state}</span>
                      </div>
                      {f.comments ? <p className="mt-3 break-words text-sm leading-6 text-neutral-800">{snippet(f.comments)}</p> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="optout-heading" className="mt-10">
          <h2 id="optout-heading" className="text-lg font-semibold text-neutral-950">Opted out ({suppressions.length})</h2>
          <p className="mt-1 text-sm text-neutral-600">These addresses will never be sent another request.</p>
          {suppressions.length > 0 ? (
            <ul className="mt-3 grid gap-1 text-sm text-neutral-700">
              {suppressions.map((s) => (
                <li key={s.email_lower} className="break-all">{s.email_lower} <span className="text-xs text-neutral-500">({stamp.format(new Date(s.created_at))})</span></li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </main>
  );
}
