import Link from "next/link";
import { ArrowLeft, Check, FileText, Flag, MessageSquareText } from "lucide-react";

import ClientShell from "./ClientShell";
import { formatDate } from "./format";
import { DocumentList, SupportCard } from "./portal-sections";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  ProgressBar,
  StatusPill,
} from "./portal-ui";
import type {
  ClientDocumentSummary,
  ClientMilestone,
  ClientProjectUpdate,
  Loadable,
} from "./types";

export type ClientProjectViewProps = {
  organizationName: string;
  project: {
    name: string;
    status: string;
    progress: number;
    startDate: string | null;
    targetEndDate: string | null;
  };
  milestones: Loadable<ClientMilestone[]>;
  updates: Loadable<ClientProjectUpdate[]>;
  documents: Loadable<ClientDocumentSummary[]>;
};

export default function ClientProjectView({
  organizationName,
  project,
  milestones,
  updates,
  documents,
}: ClientProjectViewProps) {
  const completed = milestones.ok
    ? milestones.data.filter((m) => m.status === "COMPLETED").length
    : 0;

  return (
    <ClientShell organizationName={organizationName} section="overview">
      <div className="pt-6">
        <Link
          href="/client"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft aria-hidden="true" size={15} />
          Overview
        </Link>
      </div>

      <PageHeader
        eyebrow={`Project / ${organizationName}`}
        title={project.name}
        meta={<StatusPill status={project.status} />}
      />

      <section
        aria-label="Project summary"
        className="grid gap-px border border-white/[0.09] bg-white/[0.09] sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="bg-[#0a0a0a] p-5 sm:p-6">
          <p className="tech-label text-white/50">Progress</p>
          <p className="mt-3 text-[2.2rem] font-semibold leading-none tracking-[-0.05em]">
            {project.progress}%
          </p>
          <div className="mt-4">
            <ProgressBar value={project.progress} label="Project progress" size="lg" />
          </div>
        </div>
        <SummaryItem label="Milestones" value={milestones.ok ? `${completed} of ${milestones.data.length}` : "Unavailable"} />
        <SummaryItem label="Start date" value={formatDate(project.startDate)} />
        <SummaryItem label="Target completion" value={formatDate(project.targetEndDate)} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel
            labelledBy="milestones-heading"
            title="Milestones"
            description="Delivery checkpoints for this project"
          >
            {!milestones.ok ? (
              <ErrorState subject="the milestones" />
            ) : milestones.data.length === 0 ? (
              <EmptyState icon={<Flag size={16} />} title="No milestones yet.">
                Drylake will publish delivery checkpoints here once the plan is set.
              </EmptyState>
            ) : (
              <ol>
                {milestones.data.map((milestone, index) => (
                  <MilestoneRow
                    key={milestone.id}
                    milestone={milestone}
                    step={index + 1}
                  />
                ))}
              </ol>
            )}
          </Panel>

          <Panel
            labelledBy="updates-heading"
            title="Project updates"
            description="Published by Drylake, newest first"
          >
            {!updates.ok ? (
              <ErrorState subject="the project updates" />
            ) : updates.data.length === 0 ? (
              <EmptyState icon={<MessageSquareText size={16} />} title="No updates yet.">
                Drylake will post progress here as the work moves forward.
              </EmptyState>
            ) : (
              <div>
                {updates.data.map((update) => (
                  <article key={update.id} className="cp-row px-5 py-5 sm:px-6">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                      <h3 className="break-words font-medium leading-6">{update.title}</h3>
                      <time className="shrink-0 font-mono text-xs text-white/55">
                        {formatDate(update.publishedAt, "")}
                      </time>
                    </div>
                    {update.body ? (
                      <p className="mt-3 max-w-3xl whitespace-pre-wrap break-words text-sm leading-6 text-white/65">
                        {update.body}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Panel
            labelledBy="project-documents-heading"
            title="Documents"
            description="Files shared for this project"
          >
            {!documents.ok ? (
              <ErrorState subject="the documents" />
            ) : documents.data.length === 0 ? (
              <EmptyState icon={<FileText size={16} />} title="No documents yet.">
                Files Drylake shares for this project will appear here to download.
              </EmptyState>
            ) : (
              <DocumentList items={documents.data} />
            )}
          </Panel>

          <SupportCard />
        </div>
      </div>
    </ClientShell>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0a0a0a] p-5 sm:p-6">
      <p className="tech-label text-white/50">{label}</p>
      <p className="mt-3 text-lg font-semibold tracking-[-0.03em]">{value}</p>
    </div>
  );
}

function MilestoneRow({ milestone, step }: { milestone: ClientMilestone; step: number }) {
  const done = milestone.status === "COMPLETED";
  const inProgress = milestone.status === "IN_PROGRESS";

  return (
    <li className="cp-row flex gap-4 px-5 py-5 sm:px-6">
      <span
        aria-hidden="true"
        className={`flex h-7 w-7 shrink-0 items-center justify-center border font-mono text-[0.65rem] ${
          done
            ? "border-[#f26a2e] bg-[#f26a2e] text-black"
            : inProgress
              ? "border-[#f26a2e]/70 text-[#ff9a6b]"
              : "border-white/20 text-white/55"
        }`}
      >
        {done ? <Check size={14} strokeWidth={2.5} /> : String(step).padStart(2, "0")}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="break-words font-medium leading-6">{milestone.title}</h3>
          <StatusPill status={milestone.status} />
        </div>

        {milestone.description ? (
          <p className="mt-2 max-w-2xl whitespace-pre-wrap break-words text-sm leading-6 text-white/60">
            {milestone.description}
          </p>
        ) : null}

        <p className="mt-2 text-xs text-white/55">
          {done && milestone.completedAt
            ? `Completed ${formatDate(milestone.completedAt)}`
            : milestone.dueDate
              ? `Due ${formatDate(milestone.dueDate)}`
              : "No due date"}
        </p>
      </div>
    </li>
  );
}
