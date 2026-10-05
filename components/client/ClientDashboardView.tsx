import Link from "next/link";
import {
  ArrowRight,
  FileText,
  FolderKanban,
  MessageSquareText,
  ReceiptText,
} from "lucide-react";

import ClientShell from "./ClientShell";
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
  /** The user belongs to more than one active client workspace. */
  canSwitchWorkspace?: boolean;
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
  canSwitchWorkspace = false,
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

  return (
    <ClientShell organizationName={organizationName} section="overview">
      <PageHeader
        eyebrow="Your Drylake workspace"
        title={organizationName}
        description="Project progress, updates, deliverables and billing from Drylake, in one place."
        meta={
          canSwitchWorkspace ? (
            <Link
              href="/portal/workspaces"
              className="text-sm text-white/70 underline decoration-white/25 underline-offset-4 hover:text-white"
            >
              Switch workspace
            </Link>
          ) : undefined
        }
      />

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          label="Active projects"
          value={projects.ok ? openProjects.length : UNAVAILABLE}
          detail={
            projects.ok
              ? `${projects.data.length} ${projects.data.length === 1 ? "project" : "projects"} in total`
              : "Refresh to try again"
          }
        />
        <StatTile
          label="Open invoices"
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
          className="col-span-2 sm:col-span-1"
          label="Documents"
          value={documents.ok ? documents.data.total : UNAVAILABLE}
          detail={documents.ok ? "Shared with your team" : "Refresh to try again"}
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <ProjectsPanel projects={projects} />
          <ActivityPanel updates={updates} />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <InvoicesPanel invoices={invoices} attention={attention} />
          <DocumentsPanel documents={documents} />
          <SupportCard />
        </div>
      </div>
    </ClientShell>
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
    >
      {!projects.ok ? (
        <ErrorState subject="your projects" />
      ) : ordered.length === 0 ? (
        <EmptyState icon={<FolderKanban size={16} />} title="No projects yet.">
          When Drylake starts work with you, each project and its progress will appear here.
        </EmptyState>
      ) : (
        <ul>
          {ordered.map((project) => (
            <li key={project.id} className="cp-row">
              <Link
                href={`/client/projects/${project.id}`}
                className="group block px-5 py-5 transition-colors hover:bg-white/[0.03] sm:px-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="break-words font-medium leading-6 text-white">
                      {project.name}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <StatusPill status={project.status} />
                      {project.targetEndDate ? (
                        <span className="text-xs text-white/55">
                          Target {formatDate(project.targetEndDate)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <ArrowRight
                    aria-hidden="true"
                    size={17}
                    className="mt-1 shrink-0 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white"
                  />
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <div className="flex-1">
                    <ProgressBar value={project.progress} label={`${project.name} progress`} />
                  </div>
                  <span className="w-10 text-right font-mono text-xs text-white/65">
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
    >
      {!updates.ok ? (
        <ErrorState subject="recent updates" />
      ) : updates.data.length === 0 ? (
        <EmptyState icon={<MessageSquareText size={16} />} title="No updates yet.">
          Drylake will post progress here as your work moves forward.
        </EmptyState>
      ) : (
        <ol>
          {updates.data.map((update) => (
            <li key={update.id} className="cp-row">
              <Link
                href={`/client/projects/${update.projectId}`}
                className="group flex gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03] sm:px-6"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f26a2e]"
                />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium leading-6 text-white">
                    {update.title}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-white/55">
                    <span className="min-w-0 truncate">{update.projectName}</span>
                    <span aria-hidden="true" className="text-white/25">/</span>
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
      action={
        <Link
          href="/client/billing"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-medium text-white/65 transition-colors hover:text-white"
        >
          All billing
          <ArrowRight aria-hidden="true" size={13} />
        </Link>
      }
    >
      {!invoices.ok ? (
        <ErrorState subject="your invoices" />
      ) : attention.length === 0 ? (
        <EmptyState icon={<ReceiptText size={16} />} title="Nothing to pay right now.">
          Open invoices from Drylake will appear here with a link to pay online.
        </EmptyState>
      ) : (
        <ul>
          {attention.slice(0, 4).map((invoice) => (
            <li key={invoice.id} className="cp-row">
              <Link
                href={`/client/billing/${invoice.id}`}
                className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03] sm:px-6"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm text-white">{invoice.invoiceNumber}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <StatusPill status={invoice.status} />
                    <span className="text-xs text-white/55">
                      Due {formatDate(invoice.dueDate, "not set")}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 text-right text-sm font-semibold tracking-[-0.02em]">
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
    <Panel labelledBy="documents-heading" title="Documents" description="Latest deliverables and files">
      {!documents.ok ? (
        <ErrorState subject="your documents" />
      ) : documents.data.items.length === 0 ? (
        <EmptyState icon={<FileText size={16} />} title="No documents yet.">
          Files Drylake shares with you, such as specifications and handover notes, will appear here.
        </EmptyState>
      ) : (
        <DocumentList items={documents.data.items} showProject />
      )}
    </Panel>
  );
}
