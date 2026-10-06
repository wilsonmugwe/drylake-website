import {
  CalendarCheck2,
  CalendarDays,
  Check,
  FileText,
  Flag,
  Gauge,
  MessageSquareText,
} from "lucide-react";

import { formatDate } from "./format";
import { DocumentList, SupportCard } from "./portal-sections";
import {
  BackLink,
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  ProgressBar,
  StatTile,
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
  const total = milestones.ok ? milestones.data.length : 0;
  const completed = milestones.ok
    ? milestones.data.filter((m) => m.status === "COMPLETED").length
    : 0;
  const nextMilestone = milestones.ok
    ? milestones.data.find((m) => m.status !== "COMPLETED") ?? null
    : null;

  return (
    <>
      <PageHeader
        back={<BackLink href="/client" label="Overview" />}
        eyebrow={`Project · ${organizationName}`}
        title={project.name}
        meta={<StatusPill status={project.status} />}
      />

      <section
        aria-label="Project summary"
        className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
      >
        <StatTile
          className="col-span-2 xl:col-span-1"
          label="Progress"
          icon={<Gauge size={16} />}
          value={`${project.progress}%`}
          accent={<ProgressBar value={project.progress} label="Project progress" size="lg" />}
        />
        <StatTile
          label="Milestones"
          icon={<Flag size={16} />}
          value={milestones.ok ? `${completed} of ${total}` : "Unavailable"}
          detail={
            !milestones.ok
              ? "Refresh to try again"
              : nextMilestone
                ? `Next: ${nextMilestone.title}`
                : total > 0
                  ? "All complete"
                  : "Not yet planned"
          }
        />
        <StatTile
          label="Start date"
          icon={<CalendarDays size={16} />}
          value={<span className="text-lg tracking-[-0.02em]">{formatDate(project.startDate)}</span>}
        />
        <StatTile
          className="col-span-2 sm:col-span-1"
          label="Target completion"
          icon={<CalendarCheck2 size={16} />}
          value={<span className="text-lg tracking-[-0.02em]">{formatDate(project.targetEndDate)}</span>}
        />
      </section>

      <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
          <Panel
            labelledBy="milestones-heading"
            title="Milestones"
            description="Delivery checkpoints for this project"
            icon={<Flag size={16} />}
          >
            {!milestones.ok ? (
              <ErrorState subject="the milestones" />
            ) : milestones.data.length === 0 ? (
              <EmptyState icon={<Flag size={17} />} title="No milestones yet.">
                Drylake will publish delivery checkpoints here once the plan is set.
              </EmptyState>
            ) : (
              <ol className="px-5 py-2 sm:px-6">
                {milestones.data.map((milestone, index) => (
                  <MilestoneRow
                    key={milestone.id}
                    milestone={milestone}
                    step={index + 1}
                    last={index === milestones.data.length - 1}
                  />
                ))}
              </ol>
            )}
          </Panel>

          <Panel
            labelledBy="updates-heading"
            title="Project updates"
            description="Published by Drylake, newest first"
            icon={<MessageSquareText size={16} />}
          >
            {!updates.ok ? (
              <ErrorState subject="the project updates" />
            ) : updates.data.length === 0 ? (
              <EmptyState icon={<MessageSquareText size={17} />} title="No updates yet.">
                Drylake will post progress here as the work moves forward.
              </EmptyState>
            ) : (
              <div>
                {updates.data.map((update) => (
                  <article key={update.id} className="cp-row px-5 py-4 sm:px-6">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                      <h3 className="break-words text-sm font-semibold leading-6 text-neutral-950">
                        {update.title}
                      </h3>
                      <time className="shrink-0 text-xs text-neutral-500">
                        {formatDate(update.publishedAt, "")}
                      </time>
                    </div>
                    {update.body ? (
                      <p className="mt-2 max-w-3xl whitespace-pre-wrap break-words text-sm leading-6 text-neutral-600">
                        {update.body}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
          <Panel
            labelledBy="project-documents-heading"
            title="Documents"
            description="Files shared for this project"
            icon={<FileText size={16} />}
          >
            {!documents.ok ? (
              <ErrorState subject="the documents" />
            ) : documents.data.length === 0 ? (
              <EmptyState icon={<FileText size={17} />} title="No documents yet.">
                Files Drylake shares for this project will appear here to download.
              </EmptyState>
            ) : (
              <DocumentList items={documents.data} />
            )}
          </Panel>

          <SupportCard />
        </div>
      </div>
    </>
  );
}

function MilestoneRow({
  milestone,
  step,
  last,
}: {
  milestone: ClientMilestone;
  step: number;
  last: boolean;
}) {
  const done = milestone.status === "COMPLETED";
  const inProgress = milestone.status === "IN_PROGRESS";

  return (
    <li className="relative flex gap-4 py-3.5">
      {/* Connector to the next step. */}
      {!last ? (
        <span
          aria-hidden="true"
          className={`absolute left-[13px] top-[46px] bottom-[-6px] w-px ${done ? "bg-[#f26a2e]/40" : "bg-neutral-200"}`}
        />
      ) : null}

      <span
        aria-hidden="true"
        className={`relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[0.65rem] font-semibold tabular-nums ${
          done
            ? "border-[#f26a2e] bg-[#f26a2e] text-white"
            : inProgress
              ? "border-[#f26a2e] bg-white text-[#b9481a] ring-4 ring-[#f26a2e]/15"
              : "border-neutral-300 bg-white text-neutral-500"
        }`}
      >
        {done ? <Check size={14} strokeWidth={2.75} /> : step}
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h3 className="break-words text-sm font-semibold leading-6 text-neutral-950">
            {milestone.title}
          </h3>
          <StatusPill status={milestone.status} />
        </div>

        {milestone.description ? (
          <p className="mt-1.5 max-w-2xl whitespace-pre-wrap break-words text-sm leading-6 text-neutral-600">
            {milestone.description}
          </p>
        ) : null}

        <p className="mt-1.5 text-xs text-neutral-500">
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
