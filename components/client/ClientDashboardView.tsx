import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileText,
  FolderKanban,
  MessageSquareText,
  ReceiptText,
} from "lucide-react";

import { formatDate, formatMoney } from "./format";
import MessageDrylake from "./MessageDrylake";
import { DocumentList, SupportCard } from "./portal-sections";
import {
  EmptyState,
  ErrorState,
  FigureBand,
  PageHeader,
  Panel,
  ProgressBar,
  SectionLink,
  StatusPill,
  UNAVAILABLE,
} from "./portal-ui";
import type {
  ClientDocumentSummary,
  ClientInvoiceSummary,
  ClientProjectSummary,
  ClientUpdateSummary,
  Loadable,
} from "./types";
import {
  type ActivityItem,
  type AttentionItem,
  activityFeed,
  attentionItems,
  balanceByCurrency,
  briefingSentence,
  isOpenProjectStatus,
  orderProjects,
  perthToday,
} from "./workspace-derive";

export type ClientDashboardViewProps = {
  organizationName: string;
  projects: Loadable<ClientProjectSummary[]>;
  updates: Loadable<ClientUpdateSummary[]>;
  /** Latest documents plus the total client-visible count. */
  documents: Loadable<{ items: ClientDocumentSummary[]; total: number }>;
  /** Every non-draft invoice for the organisation; the view picks out what needs attention. */
  invoices: Loadable<ClientInvoiceSummary[]>;
  /** Perth calendar date (YYYY-MM-DD) used to derive overdue. Defaults to now. */
  today?: string;
};

function formatBalance(balances: Array<{ currency: string; cents: number }>, fallbackCurrency: string) {
  return balances.length === 0
    ? formatMoney(0, fallbackCurrency)
    : balances.map((b) => formatMoney(b.cents, b.currency)).join(" + ");
}

/*
 * The overview answers four questions in order:
 *   1. What is happening?        the briefing line and key figures
 *   2. What needs my attention?  invoices to pay, overdue first
 *   3. What changed?             one timeline of updates, documents and invoices
 *   4. What can I do?            open a project, pay, download, start a conversation
 */
export default function ClientDashboardView({
  organizationName,
  projects,
  updates,
  documents,
  invoices,
  today = perthToday(),
}: ClientDashboardViewProps) {
  const openProjects = projects.ok ? projects.data.filter((p) => isOpenProjectStatus(p.status)) : [];
  const attention = invoices.ok ? attentionItems(invoices.data, today) : [];
  const overdue = attention.filter((item) => item.status === "OVERDUE").length;
  const balance = formatBalance(
    balanceByCurrency(attention.map((item) => item.invoice)),
    invoices.ok ? (invoices.data[0]?.currency ?? "AUD") : "AUD"
  );
  const nextDue = attention.find((item) => item.invoice.dueDate)?.invoice.dueDate ?? null;

  const feed =
    updates.ok && documents.ok && invoices.ok
      ? activityFeed({ updates: updates.data, documents: documents.data.items, invoices: invoices.data })
      : null;

  const brandNew =
    projects.ok &&
    projects.data.length === 0 &&
    invoices.ok &&
    invoices.data.length === 0 &&
    documents.ok &&
    documents.data.total === 0 &&
    updates.ok &&
    updates.data.length === 0;

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={organizationName}
        description={briefingSentence({
          openProjects: projects.ok ? openProjects.length : null,
          overdue: invoices.ok ? overdue : null,
          awaitingPayment: invoices.ok ? attention.length : null,
        })}
      />

      {brandNew ? (
        <WelcomePanel organizationName={organizationName} />
      ) : (
        <>
          <FigureBand
            label="Workspace at a glance"
            figures={[
              {
                label: "Balance due",
                value: invoices.ok ? balance : UNAVAILABLE,
                detail: !invoices.ok
                  ? "Refresh to try again"
                  : attention.length > 0
                    ? `${attention.length} ${attention.length === 1 ? "invoice" : "invoices"} to pay`
                    : "Nothing to pay right now",
              },
              {
                label: "Next due",
                value: invoices.ok ? (nextDue ? formatDate(nextDue) : "None") : UNAVAILABLE,
                detail: overdue > 0 ? `${overdue} overdue` : undefined,
              },
              {
                label: "Active projects",
                value: projects.ok ? openProjects.length : UNAVAILABLE,
                detail: projects.ok ? `${projects.data.length} in total` : undefined,
              },
              {
                label: "Documents",
                value: documents.ok ? documents.data.total : UNAVAILABLE,
                detail: documents.ok ? "Shared with your team" : undefined,
              },
            ]}
          />

          <AttentionSection invoices={invoices} items={attention} />

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-6">
              <ProjectsPanel projects={projects} />
              <ActivityPanel feed={feed} />
            </div>

            <div className="flex min-w-0 flex-col gap-6">
              <DocumentsPanel documents={documents} />
              <SupportCard />
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* A ready workspace with nothing in it yet: honest about what will appear, one next step. */
function WelcomePanel({ organizationName }: { organizationName: string }) {
  const steps = [
    { icon: <FolderKanban size={16} />, title: "Projects", text: "Each engagement, its status and its progress." },
    { icon: <MessageSquareText size={16} />, title: "Updates", text: "Progress notes Drylake publishes as work moves." },
    { icon: <FileText size={16} />, title: "Documents", text: "Specifications, handover notes and deliverables to download." },
    { icon: <ReceiptText size={16} />, title: "Invoices", text: "Every invoice, with secure online payment." },
  ];

  return (
    <section aria-labelledby="welcome-heading" className="cp-card overflow-hidden">
      <div className="px-5 pb-6 pt-6 sm:px-8 sm:pt-8">
        <p className="cp-label">Workspace ready</p>
        <h2 id="welcome-heading" className="cp-section-title mt-3 text-xl sm:text-2xl">
          Nothing is in progress yet.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
          This is where {organizationName} will follow its work with Drylake. As soon as Drylake shares
          something with you, it appears here.
        </p>
      </div>

      <ul className="grid border-t border-neutral-200/80 sm:grid-cols-2">
        {steps.map((step) => (
          <li key={step.title} className="cp-welcome-step flex gap-3 px-5 py-5 sm:px-8">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-app border border-neutral-200 bg-canvas text-neutral-600"
            >
              {step.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-neutral-900">{step.title}</span>
              <span className="mt-0.5 block text-sm leading-6 text-neutral-600">{step.text}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3 border-t border-neutral-200/80 bg-canvas/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="text-sm text-neutral-600">Expecting to see something already? Tell us and we will check.</p>
        <MessageDrylake variant="cta" organizationName={organizationName} />
      </div>
    </section>
  );
}

/* "What needs my attention?": the only section that can ask the client to act. */
function AttentionSection({
  invoices,
  items,
}: {
  invoices: Loadable<ClientInvoiceSummary[]>;
  items: AttentionItem[];
}) {
  if (!invoices.ok) {
    return (
      <section id="needs-attention" aria-labelledby="attention-heading" className="cp-card cp-anchor mt-6 overflow-hidden">
        <h2 id="attention-heading" className="cp-section-title px-5 pt-5 sm:px-6">
          Needs your attention
        </h2>
        <ErrorState subject="your invoices" />
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section
        id="needs-attention"
        aria-labelledby="attention-heading"
        className="cp-calm cp-anchor mt-6 flex items-center gap-3 px-5 py-4 sm:px-6"
      >
        <CheckCircle2 aria-hidden="true" size={18} className="shrink-0 text-emerald-700" />
        <h2 id="attention-heading" className="text-sm font-semibold text-neutral-900">
          Nothing needs your attention.
          <span className="ml-1 font-normal text-neutral-600">No invoices are waiting on you.</span>
        </h2>
      </section>
    );
  }

  return (
    <section
      id="needs-attention"
      aria-labelledby="attention-heading"
      className="cp-card cp-attention cp-anchor mt-6 overflow-hidden"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 px-5 pb-3 pt-5 sm:px-6">
        <h2 id="attention-heading" className="cp-section-title">
          Needs your attention
          <span className="ml-2 font-mono text-xs font-medium tabular-nums text-neutral-500">
            {items.length}
          </span>
        </h2>
        <SectionLink href="/client/billing">
          All billing
          <ArrowRight aria-hidden="true" size={13} />
        </SectionLink>
      </div>

      <ul className="border-t border-neutral-200/80">
        {items.slice(0, 4).map(({ invoice, status }) => {
          const late = status === "OVERDUE";

          return (
            <li key={invoice.id} className="cp-row">
              <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-5 sm:px-6">
                <span
                  className={`flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] sm:w-28 ${late ? "text-red-700" : "text-signal-ink"}`}
                >
                  {late ? (
                    <AlertTriangle aria-hidden="true" size={14} />
                  ) : (
                    <CalendarClock aria-hidden="true" size={14} />
                  )}
                  {late ? "Overdue" : "To pay"}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neutral-950">
                    Invoice <span className="font-mono">{invoice.invoiceNumber}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-neutral-600">
                    {late ? "Was due" : "Due"} {formatDate(invoice.dueDate, "date not set")}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <span className="text-base font-semibold tabular-nums text-neutral-950">
                    {formatMoney(invoice.totalCents, invoice.currency)}
                  </span>
                  <Link
                    href={`/client/billing/${invoice.id}`}
                    className="cp-button-primary shrink-0"
                    aria-label={`View and pay invoice ${invoice.invoiceNumber}`}
                  >
                    View and pay
                    <ArrowRight aria-hidden="true" size={15} />
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {items.length > 4 ? (
        <p className="border-t border-neutral-200/80 px-5 py-3 text-sm text-neutral-600 sm:px-6">
          {items.length - 4} more on the <Link href="/client/billing" className="cp-inline-link">billing page</Link>.
        </p>
      ) : null}
    </section>
  );
}

function ProjectsPanel({ projects }: { projects: Loadable<ClientProjectSummary[]> }) {
  const ordered = projects.ok ? orderProjects(projects.data) : [];

  return (
    <Panel
      labelledBy="projects-heading"
      anchor="projects"
      title="Projects"
      count={projects.ok ? projects.data.length : undefined}
      description="Open work first. Select a project for milestones, updates and files."
    >
      {!projects.ok ? (
        <ErrorState subject="your projects" />
      ) : ordered.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={17} />}
          title="No active projects yet."
          action={<MessageDrylake variant="inline" />}
        >
          When Drylake starts work with you, each project and its progress will appear here.
        </EmptyState>
      ) : (
        <ul>
          {ordered.map((project) => (
            <li key={project.id} className="cp-row">
              <Link
                href={`/client/projects/${project.id}`}
                className="cp-row-link group block px-5 py-4 sm:px-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="break-words text-[0.95rem] font-semibold leading-6 text-neutral-950">
                      {project.name}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <StatusPill status={project.status} />
                      {project.targetEndDate ? (
                        <span className="text-xs text-neutral-600">
                          Target {formatDate(project.targetEndDate)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <ArrowRight
                    aria-hidden="true"
                    size={16}
                    className="cp-nudge mt-1 shrink-0 text-neutral-400 group-hover:text-neutral-950"
                  />
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1">
                    <ProgressBar value={project.progress} label={`${project.name} progress`} />
                  </div>
                  <span className="w-11 text-right font-mono text-xs font-semibold tabular-nums text-neutral-700">
                    {project.progress}%
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const ACTIVITY_LABEL: Record<ActivityItem["kind"], string> = {
  update: "Update",
  document: "Document",
  invoice: "Invoice",
};

const ACTIVITY_ICON: Record<ActivityItem["kind"], typeof FileText> = {
  update: MessageSquareText,
  document: FileText,
  invoice: ReceiptText,
};

/* "What changed?": one timeline, newest first. */
function ActivityPanel({ feed }: { feed: ActivityItem[] | null }) {
  return (
    <Panel
      labelledBy="activity-heading"
      anchor="recent-activity"
      title="Recent activity"
      description="Updates, documents and invoices from Drylake, newest first"
    >
      {feed === null ? (
        <ErrorState subject="recent activity" />
      ) : feed.length === 0 ? (
        <EmptyState icon={<MessageSquareText size={17} />} title="No activity yet.">
          Drylake will post progress, share files and issue invoices here as your work moves forward.
        </EmptyState>
      ) : (
        <ol className="cp-timeline px-5 py-3 sm:px-6">
          {feed.map((item) => {
            const Icon = ACTIVITY_ICON[item.kind];
            const body = (
              <>
                <span aria-hidden="true" className="cp-timeline-node">
                  <Icon size={13} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-medium leading-6 text-neutral-900">
                    {item.title}
                  </span>
                  <span className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-neutral-600">
                    <span className="font-semibold uppercase tracking-[0.1em]">{ACTIVITY_LABEL[item.kind]}</span>
                    {item.context ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="min-w-0 truncate">{item.context}</span>
                      </>
                    ) : null}
                    <span aria-hidden="true">·</span>
                    <time dateTime={item.date.slice(0, 10)} className="whitespace-nowrap">
                      {formatDate(item.date, "")}
                    </time>
                  </span>
                </span>
              </>
            );

            return (
              <li key={item.key} className="cp-timeline-item">
                {item.kind === "document" ? (
                  // Plain anchor: the download route redirects to a short-lived signed URL.
                  <a href={item.href} className="cp-timeline-link">
                    {body}
                  </a>
                ) : (
                  <Link href={item.href} className="cp-timeline-link">
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

function DocumentsPanel({
  documents,
}: {
  documents: Loadable<{ items: ClientDocumentSummary[]; total: number }>;
}) {
  return (
    <Panel
      labelledBy="documents-heading"
      anchor="documents"
      title="Documents"
      count={documents.ok ? documents.data.total : undefined}
      description="Latest files shared with you"
    >
      {!documents.ok ? (
        <ErrorState subject="your documents" />
      ) : documents.data.items.length === 0 ? (
        <EmptyState icon={<FileText size={17} />} title="No documents yet.">
          Files Drylake shares with you, such as specifications and handover notes, will appear here.
        </EmptyState>
      ) : (
        <DocumentList items={documents.data.items} showProject />
      )}
    </Panel>
  );
}
