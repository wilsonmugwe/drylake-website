import { Check, FileText, Flag, MessageSquareText } from "lucide-react";

import { clampPercent, formatDate } from "./format";
import MessageDrylake from "./MessageDrylake";
import { DocumentList, SupportCard } from "./portal-sections";
import {
  BackLink,
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
  const total = milestones.ok ? milestones.data.length : 0;
  const completed = milestones.ok
    ? milestones.data.filter((m) => m.status === "COMPLETED").length
    : 0;
  const nextMilestone = milestones.ok
    ? milestones.data.find((m) => m.status !== "COMPLETED") ?? null
    : null;
  const latestUpdate = updates.ok ? updates.data[0] ?? null : null;
  const percent = clampPercent(project.progress);

  return (
    <>
      <PageHeader
        back={<BackLink href="/client" label="Overview" />}
        eyebrow={`Project · ${organizationName}`}
        title={project.name}
        meta={<StatusPill status={project.status} />}
      />

      {/* Where the project stands: progress, dates, and what comes next. */}
      <section id="project-status" aria-labelledby="standing-heading" className="cp-card cp-anchor overflow-hidden">
        <h2 id="standing-heading" className="sr-only">
          Project status
        </h2>
        <div className="grid gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-10">
          <div>
            <p className="cp-label">Progress</p>
            <p className="cp-figure-value mt-2 text-[2.6rem]">
              {percent}
              <span className="ml-0.5 text-xl text-neutral-500">%</span>
            </p>
            <div className="mt-4">
              <ProgressBar value={percent} label="Project progress" size="lg" />
            </div>
            <p className="mt-2.5 text-sm text-neutral-600">
              {!milestones.ok
                ? "Milestones could not load."
                : total === 0
                  ? "Milestones are not planned yet."
                  : `${completed} of ${total} milestones complete`}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 self-start">
            <div>
              <dt className="cp-label">Started</dt>
              <dd className="mt-1.5 text-sm font-semibold text-neutral-900">{formatDate(project.startDate)}</dd>
            </div>
            <div>
              <dt className="cp-label">Target completion</dt>
              <dd className="mt-1.5 text-sm font-semibold text-neutral-900">
                {formatDate(project.targetEndDate)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="cp-label">Next milestone</dt>
              <dd className="mt-1.5 text-sm font-semibold text-neutral-900">
                {nextMilestone ? (
                  <>
                    {nextMilestone.title}
                    {nextMilestone.dueDate ? (
                      <span className="font-normal text-neutral-600"> · due {formatDate(nextMilestone.dueDate)}</span>
                    ) : null}
                  </>
                ) : total > 0 ? (
                  "All milestones complete"
                ) : (
                  "None yet"
                )}
              </dd>
            </div>
            {latestUpdate ? (
              <div className="col-span-2">
                <dt className="cp-label">Latest update</dt>
                <dd className="mt-1.5 text-sm text-neutral-900">
                  <span className="font-semibold">{latestUpdate.title}</span>
                  <span className="text-neutral-600"> · {formatDate(latestUpdate.publishedAt, "")}</span>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel
            labelledBy="milestones-heading"
            anchor="milestones"
            title="Milestones"
            count={milestones.ok ? total : undefined}
            description="Delivery checkpoints, in order"
          >
            {!milestones.ok ? (
              <ErrorState subject="the milestones" />
            ) : milestones.data.length === 0 ? (
              <EmptyState icon={<Flag size={17} />} title="No milestones yet.">
                Drylake will publish delivery checkpoints here once the plan is set.
              </EmptyState>
            ) : (
              <ol className="px-5 py-3 sm:px-6">
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
            anchor="updates"
            title="Project updates"
            count={updates.ok ? updates.data.length : undefined}
            description="Published by Drylake, newest first"
          >
            {!updates.ok ? (
              <ErrorState subject="the project updates" />
            ) : updates.data.length === 0 ? (
              <EmptyState
                icon={<MessageSquareText size={17} />}
                title="No updates yet."
                action={<MessageDrylake variant="inline" />}
              >
                Drylake will post progress here as the work moves forward. Ask the team any time.
              </EmptyState>
            ) : (
              <ol className="cp-timeline px-5 py-3 sm:px-6">
                {updates.data.map((update) => (
                  <li key={update.id} className="cp-timeline-item">
                    <article className="cp-timeline-link">
                      <span aria-hidden="true" className="cp-timeline-node">
                        <MessageSquareText size={13} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                          <h3 className="break-words text-sm font-semibold leading-6 text-neutral-950">
                            {update.title}
                          </h3>
                          <time
                            dateTime={update.publishedAt?.slice(0, 10)}
                            className="shrink-0 text-xs text-neutral-600"
                          >
                            {formatDate(update.publishedAt, "")}
                          </time>
                        </div>
                        {update.body ? (
                          <p className="mt-1.5 max-w-3xl whitespace-pre-wrap break-words text-sm leading-6 text-neutral-600">
                            {update.body}
                          </p>
                        ) : null}
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Panel
            labelledBy="project-documents-heading"
            anchor="project-documents"
            title="Documents"
            count={documents.ok ? documents.data.length : undefined}
            description="Files shared for this project"
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
          className={`absolute bottom-[-6px] left-[13px] top-[46px] w-px ${done ? "bg-neutral-900/40" : "bg-neutral-200"}`}
        />
      ) : null}

      <span
        aria-hidden="true"
        className={`relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-[0.65rem] font-semibold tabular-nums ${
          done
            ? "border-neutral-900 bg-neutral-900 text-white"
            : inProgress
              ? "border-signal bg-white text-signal-ink ring-4 ring-signal/15"
              : "border-neutral-300 bg-white text-neutral-500"
        }`}
      >
        {done ? <Check size={14} strokeWidth={2.75} /> : step}
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h3 className="break-words text-sm font-semibold leading-6 text-neutral-950">
            <span className="sr-only">Step {step}: </span>
            {milestone.title}
          </h3>
          <StatusPill status={milestone.status} />
        </div>

        {milestone.description ? (
          <p className="mt-1.5 max-w-2xl whitespace-pre-wrap break-words text-sm leading-6 text-neutral-600">
            {milestone.description}
          </p>
        ) : null}

        <p className="mt-1.5 text-xs text-neutral-600">
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
