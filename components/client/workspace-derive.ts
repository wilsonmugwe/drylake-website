/*
 * Drylake Workspace: views DERIVED from data the page loaders already return.
 *
 * Pure functions, no imports at runtime (type imports are erased), so the node test runner
 * can import this file directly (tests/workspace-redesign.test.mjs). Nothing here fetches,
 * and nothing here invents data: every item maps 1:1 onto a row the loader passed in.
 */
import type {
  ClientDocumentSummary,
  ClientInvoiceSummary,
  ClientProjectSummary,
  ClientUpdateSummary,
} from "./types";

/* Drylake bills from Perth: "today" for due dates is the Perth calendar date (lib/invoices). */
export const WORKSPACE_TIME_ZONE = "Australia/Perth";

/* YYYY-MM-DD for `now` in Perth. */
export function perthToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: WORKSPACE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/*
 * Status as the client should read it. OPEN past its due date reads OVERDUE, the same rule
 * lib/invoices/lifecycle.ts applies on the billing pages (OPEN + due date before today in
 * Perth). A stored OVERDUE is honoured as is. Presentation only: payment eligibility is still
 * decided by the server.
 */
export function effectiveInvoiceStatus(
  invoice: Pick<ClientInvoiceSummary, "status" | "dueDate">,
  today: string
): string {
  if (invoice.status === "OPEN" && invoice.dueDate && invoice.dueDate.slice(0, 10) < today) {
    return "OVERDUE";
  }

  return invoice.status;
}

export function isPayable(status: string) {
  return status === "OPEN" || status === "OVERDUE";
}

const CLOSED_PROJECT_STATUSES = new Set(["COMPLETED", "CANCELLED", "DELIVERED"]);

export function isOpenProjectStatus(status: string) {
  return !CLOSED_PROJECT_STATUSES.has(status);
}

export type AttentionItem = {
  invoice: ClientInvoiceSummary;
  status: "OVERDUE" | "OPEN";
};

/* Invoices the client can act on: overdue first, then by due date (no due date last). */
export function attentionItems(invoices: ClientInvoiceSummary[], today: string): AttentionItem[] {
  return invoices
    .map((invoice) => ({ invoice, status: effectiveInvoiceStatus(invoice, today) }))
    .filter((item): item is AttentionItem => item.status === "OVERDUE" || item.status === "OPEN")
    .sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "OVERDUE" ? -1 : 1;
      }

      return (a.invoice.dueDate ?? "9999").localeCompare(b.invoice.dueDate ?? "9999");
    });
}

/* Sums amounts per currency so a mixed-currency balance is never added together. */
export function balanceByCurrency(items: Array<{ currency: string; totalCents: number }>) {
  const totals = new Map<string, number>();

  for (const item of items) {
    totals.set(item.currency, (totals.get(item.currency) ?? 0) + item.totalCents);
  }

  return Array.from(totals, ([currency, cents]) => ({ currency, cents }));
}

/* Open projects first, then closed, each keeping the loader's newest-first order. */
export function orderProjects(projects: ClientProjectSummary[]) {
  return [
    ...projects.filter((p) => isOpenProjectStatus(p.status)),
    ...projects.filter((p) => !isOpenProjectStatus(p.status)),
  ];
}

export type ActivityItem = {
  key: string;
  kind: "update" | "document" | "invoice";
  date: string;
  title: string;
  context: string | null;
  href: string;
};

/*
 * "What changed": published updates, shared documents and issued invoices merged into one
 * newest-first timeline. Only rows with a date take part; nothing is synthesised.
 */
export function activityFeed(
  input: {
    updates: ClientUpdateSummary[];
    documents: ClientDocumentSummary[];
    invoices: ClientInvoiceSummary[];
  },
  limit = 8
): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const update of input.updates) {
    if (update.publishedAt) {
      items.push({
        key: `update-${update.id}`,
        kind: "update",
        date: update.publishedAt,
        title: update.title,
        context: update.projectName,
        href: `/client/projects/${update.projectId}`,
      });
    }
  }

  for (const document of input.documents) {
    if (document.createdAt) {
      items.push({
        key: `document-${document.id}`,
        kind: "document",
        date: document.createdAt,
        title: document.name,
        context: document.projectName,
        href: `/api/client/documents/${document.id}/download`,
      });
    }
  }

  for (const invoice of input.invoices) {
    if (invoice.issuedAt) {
      items.push({
        key: `invoice-${invoice.id}`,
        kind: "invoice",
        date: invoice.issuedAt,
        title: `Invoice ${invoice.invoiceNumber} issued`,
        context: null,
        href: `/client/billing/${invoice.id}`,
      });
    }
  }

  return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/*
 * The one-sentence answer to "what is happening?" at the top of the overview, built only from
 * counts the loaders returned. Unknown sections (failed queries) are left out, never guessed.
 */
export function briefingSentence(input: {
  openProjects: number | null;
  overdue: number | null;
  awaitingPayment: number | null;
}): string {
  const parts: string[] = [];

  if (input.openProjects !== null) {
    parts.push(
      input.openProjects === 0
        ? "No projects are in progress"
        : `${plural(input.openProjects, "project is", "projects are")} in progress`
    );
  }

  if (input.overdue !== null && input.awaitingPayment !== null) {
    if (input.overdue > 0) {
      parts.push(`${plural(input.overdue, "invoice is", "invoices are")} overdue`);
    } else if (input.awaitingPayment > 0) {
      parts.push(`${plural(input.awaitingPayment, "invoice is", "invoices are")} awaiting payment`);
    } else {
      parts.push("nothing is waiting on you");
    }
  }

  if (parts.length === 0) {
    return "Some of your workspace could not load. Refresh to try again.";
  }

  const sentence = parts.join(", and ");

  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}
