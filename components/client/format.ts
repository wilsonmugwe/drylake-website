/*
 * Display formatters shared by the client portal views.
 * Pure functions only: the views must render identically from sample props.
 */

export function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/*
 * Accepts a date-only value ("2026-10-05") or a timestamp. Only the calendar date is shown,
 * pinned to UTC so a date-only column never shifts a day with the server's timezone.
 */
export function formatDate(value: string | null, fallback = "Not set") {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

export function formatFileSize(bytes: number | null) {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) {
    return null;
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* "IN_PROGRESS" -> "In progress" */
export function humanizeStatus(status: string) {
  const words = status.replaceAll("_", " ").toLowerCase();

  return words.charAt(0).toUpperCase() + words.slice(1);
}

/* Short file-type tag for a document row, derived from its MIME type or file name. */
export function fileTypeLabel(mimeType: string | null, name: string) {
  const extension = name.includes(".")
    ? name.split(".").pop()?.toUpperCase()
    : undefined;

  if (extension && extension.length <= 5) {
    return extension;
  }

  if (mimeType?.includes("/")) {
    return mimeType.split("/")[1].toUpperCase().slice(0, 5);
  }

  return "FILE";
}

export function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/* Project statuses that no longer represent ongoing work. */
const CLOSED_PROJECT_STATUSES = new Set(["COMPLETED", "CANCELLED", "DELIVERED"]);

export function isOpenProject(status: string) {
  return !CLOSED_PROJECT_STATUSES.has(status);
}

export function isPayableInvoice(status: string) {
  return status === "OPEN" || status === "OVERDUE";
}

/* Sums amounts per currency so a mixed-currency balance is never added together. */
export function sumByCurrency(
  items: Array<{ currency: string; totalCents: number }>
) {
  const totals = new Map<string, number>();

  for (const item of items) {
    totals.set(item.currency, (totals.get(item.currency) ?? 0) + item.totalCents);
  }

  return Array.from(totals, ([currency, cents]) => ({ currency, cents }));
}
