/*
 * Plain props contract between the client portal page loaders (app/client/**) and the
 * presentational views (components/client/**). Loaders do auth + scoped queries and map rows
 * into these shapes; views never fetch. A failed query is passed as { ok: false } so each
 * section can show its own error state without hiding the rest of the page.
 */

export type Loadable<T> = { ok: true; data: T } | { ok: false };

export type ClientProjectSummary = {
  id: string;
  name: string;
  status: string;
  progress: number;
  startDate: string | null;
  targetEndDate: string | null;
};

export type ClientUpdateSummary = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  publishedAt: string | null;
};

export type ClientDocumentSummary = {
  id: string;
  name: string;
  projectName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string | null;
};

export type ClientInvoiceSummary = {
  id: string;
  invoiceNumber: string;
  status: string;
  currency: string;
  totalCents: number;
  dueDate: string | null;
  issuedAt: string | null;
};

export type ClientMilestone = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
};

export type ClientProjectUpdate = {
  id: string;
  title: string;
  body: string | null;
  publishedAt: string | null;
};
