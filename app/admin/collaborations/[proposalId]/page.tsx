import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import AdminCollaborationPanel from "@/components/admin/AdminCollaborationPanel";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { PROJECT_LABELS } from "@/lib/collaboration/admin-labels";
import { CATEGORY_LABELS, PROPOSAL_STATUSES, STATUS_LABELS } from "@/lib/collaboration/catalog";
import { STATUS_BADGE } from "@/lib/collaboration/status-style";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

export const dynamic = "force-dynamic";
export const metadata = { title: "Collaboration proposal" };

const stamp = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Perth",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

type Proposal = {
  id: string;
  created_at: string;
  name: string;
  organisation: string;
  email: string;
  category: string;
  project: string;
  summary: string;
  website: string | null;
  consent_at: string;
  status: string;
  internal_notes: string | null;
  updated_at: string;
  updated_by: string | null;
};

export default async function AdminCollaborationPage({ params }: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await params;
  await requirePlatformAdmin(`/admin/collaborations/${proposalId}`);
  if (!isUuid(proposalId)) notFound();

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("collaboration_proposals")
    .select("id, created_at, name, organisation, email, category, project, summary, website, consent_at, status, internal_notes, updated_at, updated_by")
    .eq("id", proposalId)
    .maybeSingle();

  if (error) console.error("Admin collaboration load failed:", { code: error.code, message: error.message });
  if (!data) notFound();

  const proposal = data as Proposal;

  return (
    <main className="min-h-screen p-5 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-[1100px]">
        <Link href="/admin/collaborations" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-950">
          <ArrowLeft aria-hidden="true" size={15} /> All proposals
        </Link>

        <AdminPageHeader
          eyebrow="Collaboration proposal"
          title={proposal.organisation}
          description={`From ${proposal.name}, received ${stamp.format(new Date(proposal.created_at))} (Perth time).`}
          action={
            <span className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${STATUS_BADGE[proposal.status] ?? ""}`}>
              {STATUS_LABELS[proposal.status] ?? proposal.status}
            </span>
          }
        />

        <div className="mt-7 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section aria-labelledby="proposal-heading" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 id="proposal-heading" className="font-semibold text-neutral-950">Contact and proposal</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <Detail label="Name" value={proposal.name} />
              <Detail label="Organisation" value={proposal.organisation} />
              <Detail label="Email" value={<a className="break-all underline" href={`mailto:${proposal.email}`}>{proposal.email}</a>} />
              <Detail
                label="Website"
                value={
                  proposal.website ? (
                    <a className="break-all underline" href={proposal.website} target="_blank" rel="noopener noreferrer">
                      {proposal.website}
                    </a>
                  ) : (
                    "Not provided"
                  )
                }
              />
              <Detail label="Category" value={CATEGORY_LABELS[proposal.category] ?? proposal.category} />
              <Detail label="Project of interest" value={PROJECT_LABELS[proposal.project] ?? proposal.project} />
              <Detail label="Privacy acknowledged" value={stamp.format(new Date(proposal.consent_at))} />
              <Detail label="Last changed" value={stamp.format(new Date(proposal.updated_at))} />
            </dl>
            <div className="mt-5 border-t border-neutral-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Proposal</p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-800">{proposal.summary}</p>
            </div>
          </section>

          <section aria-labelledby="triage-heading" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 id="triage-heading" className="font-semibold text-neutral-950">Status and internal notes</h2>
            <p className="mt-1 text-xs leading-5 text-neutral-500">Internal notes are visible to Drylake admins only. Every change is recorded in the audit log.</p>
            <div className="mt-4">
              <AdminCollaborationPanel
                proposalId={proposal.id}
                status={proposal.status}
                notes={proposal.internal_notes ?? ""}
                statuses={PROPOSAL_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
              />
            </div>
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
