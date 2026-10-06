/*
 * Invoice lifecycle rules: the single source of truth for which invoice may be issued,
 * resent, shown to a client or paid, and how a Stripe Checkout result maps onto an invoice.
 *
 * Pure functions only, relative imports only (none at all here), so the rules are unit
 * tested directly by node's test runner (tests/invoice-lifecycle.test.mjs). Routes do the
 * I/O and call these functions to decide.
 *
 * Contract:
 *   DRAFT --issue--> OPEN --webhook--> PAID
 *   OPEN/OVERDUE --void--> VOID (admin, not implemented here)
 *   PAID and VOID are terminal. Nothing moves an invoice out of PAID.
 *   OVERDUE is normally DERIVED (OPEN + due date before today in Perth). A stored OVERDUE
 *   status is still honoured everywhere, so either representation works.
 *   Only the Stripe webhook may produce PAID. The checkout redirect never does.
 */

export const INVOICE_STATUSES = ["DRAFT", "OPEN", "OVERDUE", "PAID", "VOID"] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  DRAFT: ["OPEN", "VOID"],
  OPEN: ["OVERDUE", "PAID", "VOID"],
  OVERDUE: ["OPEN", "PAID", "VOID"],
  PAID: [],
  VOID: [],
};

/* Drylake is Perth based; "today" for due dates is the Perth calendar date. */
export const BILLING_TIME_ZONE = "Australia/Perth";

/* Only AUD is accepted online. A bad stored currency must never reach Stripe. */
export const SUPPORTED_PAYMENT_CURRENCIES = ["aud"] as const;

export function isInvoiceStatus(value: unknown): value is InvoiceStatus {
  return typeof value === "string" && (INVOICE_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: unknown, to: unknown): boolean {
  if (!isInvoiceStatus(from) || !isInvoiceStatus(to)) {
    return false;
  }

  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isPayableStatus(status: unknown): boolean {
  return status === "OPEN" || status === "OVERDUE";
}

export function isValidTotalCents(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/* Lower-cased supported currency, or null for anything we will not charge in. */
export function normalisePaymentCurrency(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const currency = value.trim().toLowerCase();

  return (SUPPORTED_PAYMENT_CURRENCIES as readonly string[]).includes(currency) ? currency : null;
}

type IssuableInvoice = {
  status: unknown;
  visible_to_client: unknown;
  total_cents: unknown;
};

export type LifecycleRefusal = {
  ok: false;
  code: string;
  message: string;
};

export type LifecycleDecision = { ok: true } | LifecycleRefusal;

function refuse(code: string, message: string): LifecycleRefusal {
  return { ok: false, code, message };
}

export function canIssue(invoice: IssuableInvoice): LifecycleDecision {
  if (invoice.status !== "DRAFT") {
    return refuse("NOT_DRAFT", "Only draft invoices can be issued.");
  }

  if (invoice.visible_to_client !== true) {
    return refuse("INTERNAL_INVOICE", "Internal invoices cannot be issued.");
  }

  if (!isValidTotalCents(Number(invoice.total_cents))) {
    return refuse("INVALID_TOTAL", "Invoice total must be greater than zero.");
  }

  return { ok: true };
}

export function canResend(invoice: IssuableInvoice): LifecycleDecision {
  if (!isPayableStatus(invoice.status)) {
    return refuse("NOT_OUTSTANDING", "Only open or overdue invoices can be resent.");
  }

  if (invoice.visible_to_client !== true) {
    return refuse("INTERNAL_INVOICE", "Internal invoices cannot be emailed.");
  }

  if (!isValidTotalCents(Number(invoice.total_cents))) {
    return refuse("INVALID_TOTAL", "Invoice total must be greater than zero.");
  }

  return { ok: true };
}

/* Calendar date (YYYY-MM-DD) for `now` in the billing time zone. */
export function billingToday(now: Date = new Date(), timeZone = BILLING_TIME_ZONE): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/* An invoice is overdue when it is still outstanding and its due date is before today. */
export function isOverdue(
  invoice: { status: unknown; due_date: string | null | undefined },
  now: Date = new Date()
): boolean {
  if (invoice.status === "OVERDUE") {
    return true;
  }

  if (invoice.status !== "OPEN" || !invoice.due_date) {
    return false;
  }

  return invoice.due_date.slice(0, 10) < billingToday(now);
}

/* Status to show a person: OPEN past its due date reads as OVERDUE. Never changes PAID. */
export function displayStatus(
  invoice: { status: string; due_date: string | null | undefined },
  now: Date = new Date()
): string {
  return isOverdue(invoice, now) ? "OVERDUE" : invoice.status;
}

/*
 * Client visibility predicate. Mirrors the query filters every client billing query uses:
 * same organisation, visible_to_client = true, status != DRAFT. DRAFT is never visible.
 */
export function isClientVisible(
  invoice: { organization_id: unknown; visible_to_client: unknown; status: unknown },
  callerOrganizationId: string | null | undefined
): boolean {
  return (
    typeof callerOrganizationId === "string" &&
    callerOrganizationId.length > 0 &&
    invoice.organization_id === callerOrganizationId &&
    invoice.visible_to_client === true &&
    isInvoiceStatus(invoice.status) &&
    invoice.status !== "DRAFT"
  );
}

type CheckoutInvoice = {
  id: string;
  organization_id: unknown;
  status: unknown;
  visible_to_client: unknown;
  total_cents: unknown;
  currency: unknown;
  /* When supplied, subtotal + tax must equal total or the invoice is not charged. */
  subtotal_cents?: unknown;
  tax_cents?: unknown;
};

export type CheckoutEligibility =
  | { ok: true; amountCents: number; currency: string }
  | (LifecycleRefusal & { httpStatus: number });

/*
 * May this caller start a payment for this invoice? Amount and currency come ONLY from the
 * stored invoice. A different organisation's invoice is reported as not found, so the
 * response never confirms that another tenant's invoice exists.
 */
export function evaluateCheckout(
  invoice: CheckoutInvoice | null,
  callerOrganizationId: string | null | undefined
): CheckoutEligibility {
  if (!invoice || !isClientVisible(invoice, callerOrganizationId)) {
    return { ...refuse("INVOICE_NOT_FOUND", "Invoice not found."), httpStatus: 404 };
  }

  if (invoice.status === "PAID") {
    return {
      ...refuse("INVOICE_ALREADY_PAID", "This invoice has already been paid."),
      httpStatus: 409,
    };
  }

  if (!isPayableStatus(invoice.status)) {
    return {
      ...refuse("INVOICE_NOT_PAYABLE", "This invoice is not currently available for payment."),
      httpStatus: 409,
    };
  }

  const amountCents = Number(invoice.total_cents);

  if (!isValidTotalCents(amountCents)) {
    return {
      ...refuse("INVALID_INVOICE_TOTAL", "This invoice cannot currently be paid online."),
      httpStatus: 409,
    };
  }

  if (
    invoice.subtotal_cents !== undefined &&
    invoice.tax_cents !== undefined &&
    Number(invoice.subtotal_cents) + Number(invoice.tax_cents) !== amountCents
  ) {
    // A stored total that disagrees with its own breakdown is never sent to Stripe.
    return {
      ...refuse("INVALID_INVOICE_TOTAL", "This invoice cannot currently be paid online."),
      httpStatus: 409,
    };
  }

  const currency = normalisePaymentCurrency(invoice.currency);

  if (!currency) {
    return {
      ...refuse(
        "UNSUPPORTED_CURRENCY",
        "Online payment is currently available for AUD invoices only."
      ),
      httpStatus: 409,
    };
  }

  return { ok: true, amountCents, currency };
}
