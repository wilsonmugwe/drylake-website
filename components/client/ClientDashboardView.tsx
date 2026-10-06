import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  FileText,
  FolderKanban,
  MessageSquareText,
  ReceiptText,
} from "lucide-react";

import { formatDate, formatMoney, isOpenProject, sumByCurrency } from "./format";
import { DocumentList, SupportCard } from "./portal-sections";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  ProgressBar,
  StatTile,
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

export type ClientDashboardViewProps = {
  organizationName: string;
  projects: Loadable<ClientProjectSummary[]>;
  updates: Loadable<ClientUpdateSummary[]>;
  /** Latest documents plus the total client-visible count. */
  documents: Loadable<{ items: ClientDocumentSummary[]; total: number }>;
  /** Every non-draft invoice for the organisation; the view picks out what needs attention. */
  invoices: Loadable<ClientInvoiceSummary[]>;
};

function formatBalance(balances: Array<{ currency: string; cents: number }>) {
  return balances.map((b) => formatMoney(b.cents, b.currency)).join(" + ");
}

export default function ClientDashboardView({
  organizationName,
  projects,
  updates,
  documents,
  invoices,
}: ClientDashboardViewProps) {
  const openProjects = projects.ok ? projects.data.filter((p) => isOpenProject(p.status)) : [];

  const attention = invoices.ok
    ? invoices.data
        .filter((i) => i.status === "OPEN" || i.status === "OVERDUE")
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === "OVERDUE" ? -1 : 1;
          return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
        })
    : [];

  const amountDue = sumByCurrency(attention);
  const overdue = attention.filter((invoice) => invoice.status === "OVERDUE").length;

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={organizationName}
        description="Project progress, updates, deliverables and billing from Drylake, in one place."
      />

      {attention.length > 0 ? (
        <AttentionBanner
          count={attention.length}
          overdue={overdue}
          balance={formatBalance(amountDue)}
          first={attention[0]}
        />
      ) : null}

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatTile
          label="Active projects"
          icon={<FolderKanban size={16} />}
          value={projects.ok ? openProjects.length : UNAVAILABLE}
          detail={
            projects.ok
              ? `${projects.data.length} ${projects.data.length === 1 ? "project" : "projects"} in total`
              : "Refresh to try again"
          }
        />
        <StatTile
          label="Open invoices"
          icon={<ReceiptText size={16} />}
          value={invoices.ok ? attention.length : UNAVAILABLE}
          detail={
            !invoices.ok
              ? "Refresh to try again"
              : attention.length > 0
                ? `${formatBalance(amountDue)} due`
                : "Nothing due"
          }
        />
        <StatTile
          className="col-span-2 lg:col-span-1"
          label="Documents"
          icon={<FileText size={16} />}
          value={documents.ok ? documents.data.total : UNAVAILABLE}
          detail={documents.ok ? "Shared with your team" : "Refresh to try again"}
        />
      </section>

      <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
          <ProjectsPanel projects={projects} />
          <ActivityPanel updates={updates} />
        </div>

        <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
          <InvoicesPanel invoices={invoices} attention={attention} />
          <DocumentsPanel documents={documents} />
          <SupportCard />
        </div>
      </div>
    </>
  );
}

/* The one thing a client may need to act on, above everything else. */
function AttentionBanner({
  count,
  overdue,
  balance,
  first,
}: {
  count: number;
  overdue: number;
  balance: string;
  first: ClientInvoiceSummary;
}) {
  const single = count === 1;

  return (
    <section
      aria-label="Invoices needing attention"
      className="cp-card mb-4 flex flex-col gap-4 border-l-4 border-l-[#f26a2e] p-5 sm:mb-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg cp-tint text-[#f26a2e]"
        >
          <CalendarClock size={17} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-950">
            {single ? "1 invoice needs attention" : `${count} invoices need attention`}
            {overdue > 0 ? <span className="text-red-700"> ({overdue} overdue)</span> : null}
          </p>
          <p className="mt-0.5 text-sm text-neutral-500">
            {balance} due{single ? `, ${formatDate(first.dueDate, "no due date set")}` : ""}
          </p>
        </div>
      </div>

      <Link
        href={single ? `/client/billing/${first.id}` : "/client/billing"}
        className="cp-button-primary shrink-0"
      >
        {single ? "View and pay" : "Review invoices"}
        <ArrowRight aria-hidden="true" size={15} />
      </Link>
    </section>
  );
}

function ProjectsPanel({ projects }: { projects: Loadable<ClientProjectSummary[]> }) {
  // Open work first, then closed, each keeping the loader's newest-first order.
  const ordered = projects.ok
    ? [
        ...projects.data.filter((p) => isOpenProject(p.status)),
        ...projects.data.filter((p) => !isOpenProject(p.status)),
      ]
    : [];

  return (
    <Panel
      labelledBy="projects-heading"
      title="Projects"
      description="Delivery progress across your organisation"
      icon={<FolderKanban size={16} />}
    >
      {!projects.ok ? (
        <ErrorState subject="your projects" />
      ) : ordered.length === 0 ? (
        <EmptyState icon={<FolderKanban size={17} />} title="No active projects yet.">
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
                    <h3 className="break-words text-sm font-semibold leading-6 text-neutral-950">
                      {project.name}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <StatusPill status={project.status} />
                      {project.targetEndDate ? (
                        <span className="text-xs text-neutral-500">
                          Target {formatDate(project.targetEndDate)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <ArrowRight
                    aria-hidden="true"
                    size={16}
                    className="mt-1 shrink-0 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-[#f26a2e]"
                  />
                </div>

                <div className="mt-3.5 flex items-center gap-3">
                  <div className="flex-1">
                    <ProgressBar value={project.progress} label={`${project.name} progress`} />
                  </div>
                  <span className="w-10 text-right text-xs font-semibold tabular-nums text-neutral-700">
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

function ActivityPanel({ updates }: { updates: Loadable<ClientUpdateSummary[]> }) {
  return (
    <Panel
      labelledBy="activity-heading"
      title="Recent activity"
      description="The latest updates Drylake has published"
      icon={<MessageSquareText size={16} />}
    >
      {!updates.ok ? (
        <ErrorState subject="recent updates" />
      ) : updates.data.length === 0 ? (
        <EmptyState icon={<MessageSquareText size={17} />} title="No updates yet.">
          Drylake will post progress here as your work moves forward.
        </EmptyState>
      ) : (
        <ol>
          {updates.data.map((update) => (
            <li key={update.id} className="cp-row">
              <Link
                href={`/client/projects/${update.projectId}`}
                className="cp-row-link group flex gap-3.5 px-5 py-3.5 sm:px-6"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#f26a2e] ring-4 ring-[#f26a2e]/15"
                />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium leading-6 text-neutral-900">
                    {update.title}
                  </p>
                  <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-neutral-500">
                    <span className="min-w-0 truncate">{update.projectName}</span>
                    <span aria-hidden="true" className="text-neutral-300">·</span>
                    <span className="whitespace-nowrap">{formatDate(update.publishedAt, "")}</span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function InvoicesPanel({
  invoices,
  attention,
}: {
  invoices: Loadable<ClientInvoiceSummary[]>;
  attention: ClientInvoiceSummary[];
}) {
  return (
    <Panel
      labelledBy="invoices-heading"
      title="Invoices needing attention"
      icon={<ReceiptText size={16} />}
      action={
        <Link
          href="/client/billing"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
        >
          All billing
          <ArrowRight aria-hidden="true" size={13} />
        </Link>
      }
    >
      {!invoices.ok ? (
        <ErrorState subject="your invoices" />
      ) : attention.length === 0 ? (
        <EmptyState icon={<ReceiptText size={17} />} title="Nothing to pay right now.">
          Open invoices from Drylake will appear here with a link to pay online.
        </EmptyState>
      ) : (
        <ul>
          {attention.slice(0, 4).map((invoice) => (
            <li key={invoice.id} className="cp-row">
              <Link
                href={`/client/billing/${invoice.id}`}
                className="cp-row-link group flex items-center justify-between gap-4 px-5 py-3.5 sm:px-6"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-medium text-neutral-900">
                    {invoice.invoiceNumber}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <StatusPill status={invoice.status} />
                    <span className="text-xs text-neutral-500">
                      Due {formatDate(invoice.dueDate, "not set")}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-neutral-950">
                  {formatMoney(invoice.totalCents, invoice.currency)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
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
      title="Documents"
      description="Latest deliverables and files"
      icon={<FileText size={16} />}
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
