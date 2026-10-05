/*
 * Pure validation and error mapping for creating a DRAFT invoice.
 *
 * Shared by the API route (authoritative) and covered by tests/invoice-creation.test.mjs.
 * No framework or database imports: relative imports only, so Node's test runner can
 * load it directly.
 *
 * Money is handled as integer cents end to end. Amounts typed in the browser are only
 * ever parsed here on the server; the browser never supplies a total.
 */

export const MAX_INVOICE_CENTS = 999_999_999;

export const ALLOWED_CURRENCIES = ["AUD"] as const;

export type InvoiceCurrency = (typeof ALLOWED_CURRENCIES)[number];

export type InvoiceField = "projectId" | "subtotal" | "tax" | "dueDate" | "requestId" | "form";

/* Stable codes: the no-JavaScript fallback passes only these in the URL, never text. */
export const CREATE_ERROR_MESSAGES = {
  invalid_form: "The invoice form could not be read. Please try again.",
  invalid_amount: "Enter an amount greater than zero, with at most two decimal places.",
  invalid_tax: "Enter a valid GST amount.",
  invalid_total: "The invoice total is outside the allowed range.",
  invalid_date: "Enter a valid due date.",
  invalid_project: "The selected project could not be found for this client.",
  invalid_request: "Please reload the page and try again.",
  organization_not_found: "This client could not be found.",
  organization_inactive: "Invoices cannot be created for an inactive client.",
  numbering_failed: "Drylake could not assign an invoice number. Please try again in a moment.",
  database_timeout: "Creating the invoice took too long. Please check the invoice list before trying again.",
  database_error: "The invoice could not be saved. Please try again.",
  forbidden: "You do not have permission to create invoices.",
  unauthenticated: "Your session has expired. Please sign in again.",
} as const;

export type CreateErrorCode = keyof typeof CREATE_ERROR_MESSAGES;

export function isCreateErrorCode(value: unknown): value is CreateErrorCode {
  return typeof value === "string" && Object.hasOwn(CREATE_ERROR_MESSAGES, value);
}

/* "1,250.50" style input is rejected on purpose: digits, optional . and two decimals. */
export function parseMoneyToCents(value: unknown): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [wholePart, decimalPart = ""] = normalized.split(".");
  const cents = Number(wholePart) * 100 + Number(decimalPart.padEnd(2, "0"));

  if (!Number.isSafeInteger(cents) || cents < 0 || cents > MAX_INVOICE_CENTS) {
    return null;
  }

  return cents;
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidLike(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export type DraftInvoiceInput = {
  projectId: string | null;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  currency: InvoiceCurrency;
  dueDate: string | null;
  visibleToClient: boolean;
  requestId: string | null;
};

export type ValidationResult =
  | { ok: true; value: DraftInvoiceInput }
  | { ok: false; code: CreateErrorCode; field: InvoiceField };

type RawFields = {
  projectId?: unknown;
  subtotal?: unknown;
  tax?: unknown;
  dueDate?: unknown;
  visibleToClient?: unknown;
  requestId?: unknown;
};

/*
 * Validates the raw form fields. Same rules as before this module existed (a due date
 * in the past is allowed, so an admin can backdate), plus UUID checks on browser ids.
 */
export function validateDraftInvoice(
  fields: RawFields,
  options: { gstRegistered: boolean }
): ValidationResult {
  const subtotalCents = parseMoneyToCents(fields.subtotal);

  if (subtotalCents === null || subtotalCents <= 0) {
    return { ok: false, code: "invalid_amount", field: "subtotal" };
  }

  // Not GST-registered: tax is always zero, whatever the form sent.
  const taxCents = options.gstRegistered ? parseMoneyToCents(fields.tax ?? "0") : 0;

  if (taxCents === null) {
    return { ok: false, code: "invalid_tax", field: "tax" };
  }

  const totalCents = subtotalCents + taxCents;

  if (!Number.isSafeInteger(totalCents) || totalCents <= 0 || totalCents > MAX_INVOICE_CENTS) {
    return { ok: false, code: "invalid_total", field: "subtotal" };
  }

  let dueDate: string | null = null;

  if (typeof fields.dueDate === "string" && fields.dueDate.trim()) {
    dueDate = fields.dueDate.trim();

    if (!isValidIsoDate(dueDate)) {
      return { ok: false, code: "invalid_date", field: "dueDate" };
    }
  }

  let projectId: string | null = null;

  if (typeof fields.projectId === "string" && fields.projectId.trim()) {
    projectId = fields.projectId.trim();

    if (!isUuidLike(projectId)) {
      return { ok: false, code: "invalid_project", field: "projectId" };
    }
  }

  let requestId: string | null = null;

  if (typeof fields.requestId === "string" && fields.requestId.trim()) {
    requestId = fields.requestId.trim();

    if (!isUuidLike(requestId)) {
      return { ok: false, code: "invalid_request", field: "requestId" };
    }
  }

  return {
    ok: true,
    value: {
      projectId,
      subtotalCents,
      taxCents,
      totalCents,
      currency: "AUD",
      dueDate,
      visibleToClient: fields.visibleToClient === "true",
      requestId,
    },
  };
}

/*
 * Maps a PostgREST/Postgres error code from the insert to a safe user-facing code.
 * `retryable` marks the one case worth a single automatic retry: a unique violation,
 * which is what a concurrent invoice-number collision looks like.
 */
export function classifyInsertError(code: string | undefined): {
  code: CreateErrorCode;
  retryable: boolean;
} {
  switch (code) {
    case "23505": // unique_violation (e.g. two inserts got the same invoice_number)
      return { code: "numbering_failed", retryable: true };
    case "57014": // query_canceled: statement_timeout
    case "55P03": // lock_not_available
    case "40P01": // deadlock_detected
      return { code: "database_timeout", retryable: false };
    case "23502": // not_null_violation: e.g. invoice_number trigger produced NULL
    case "P0001": // raise_exception from a trigger/function
    case "42883": // undefined_function: numbering function missing
      return { code: "numbering_failed", retryable: false };
    case "23503": // foreign_key_violation (organisation or project vanished)
      return { code: "invalid_project", retryable: false };
    default:
      return { code: "database_error", retryable: false };
  }
}
