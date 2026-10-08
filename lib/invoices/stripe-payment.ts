/*
 * Stripe Checkout <-> Drylake invoice decision logic. Pure, no SDK import, no I/O, so the
 * webhook and checkout routes can be reasoned about (and tested) without Stripe or Postgres.
 * Tests: tests/stripe-payment.test.mjs.
 *
 * Invariants this module enforces:
 *   - Only a signed webhook carrying a fully paid, matching session produces MARK_PAID.
 *   - Amount AND currency must equal the stored invoice. Metadata identifies the invoice,
 *     it is never proof of what was paid.
 *   - PAID never moves backwards. A second payment against a PAID invoice is reported as a
 *     DUPLICATE_PAYMENT anomaly (refund by hand), never silently absorbed or re-stamped.
 *   - Sessions without Drylake metadata are not ours and are ignored, not retried.
 */

import { isPayableStatus, normalisePaymentCurrency } from "./lifecycle.ts";

export const METADATA_INVOICE_ID = "drylake_invoice_id";
export const METADATA_INVOICE_NUMBER = "drylake_invoice_number";
export const METADATA_ORGANIZATION_ID = "drylake_organization_id";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Re-using a session this close to expiry risks the client landing on an expired page. */
const REUSE_MIN_REMAINING_SECONDS = 15 * 60;

export type WebhookAction =
  | "SETTLE"
  | "AWAIT_ASYNC"
  | "ASYNC_FAILED"
  | "EXPIRED"
  | "PAYMENT_FAILED"
  | "IGNORE";

/* Maps a Stripe event (type + session payment_status) onto what Drylake should do. */
export function classifyWebhookEvent(
  type: string,
  paymentStatus?: string | null
): WebhookAction {
  switch (type) {
    case "checkout.session.completed":
      // Card payments complete as "paid". Delayed methods (e.g. BECS) complete "unpaid" and
      // settle later through async_payment_succeeded / async_payment_failed.
      if (paymentStatus === "paid") return "SETTLE";
      if (paymentStatus === "unpaid") return "AWAIT_ASYNC";
      return "IGNORE";
    case "checkout.session.async_payment_succeeded":
      return "SETTLE";
    case "checkout.session.async_payment_failed":
      return "ASYNC_FAILED";
    case "checkout.session.expired":
      return "EXPIRED";
    // The webhook route logs and returns on this event type before classifying, so the route
    // never reaches this branch; it is kept so the classifier stays total (and is unit tested).
    case "payment_intent.payment_failed":
      return "PAYMENT_FAILED";
    default:
      return "IGNORE";
  }
}

type SessionReferenceInput = {
  metadata?: Record<string, string> | null;
  client_reference_id?: string | null;
};

export type SessionReference =
  | { kind: "NOT_DRYLAKE" }
  | { kind: "MALFORMED"; reason: string }
  | { kind: "OK"; invoiceId: string; organizationId: string };

/* Extracts and validates the Drylake identifiers we put on the session at creation. */
export function readSessionReference(session: SessionReferenceInput): SessionReference {
  const invoiceId = session.metadata?.[METADATA_INVOICE_ID];
  const organizationId = session.metadata?.[METADATA_ORGANIZATION_ID];

  if (!invoiceId && !organizationId) {
    return { kind: "NOT_DRYLAKE" };
  }

  if (!invoiceId || !organizationId) {
    return { kind: "MALFORMED", reason: "METADATA_INCOMPLETE" };
  }

  // Non-UUIDs would make Postgres raise, which would turn into an endless retry loop.
  if (!UUID_PATTERN.test(invoiceId) || !UUID_PATTERN.test(organizationId)) {
    return { kind: "MALFORMED", reason: "METADATA_NOT_UUID" };
  }

  if (session.client_reference_id && session.client_reference_id !== invoiceId) {
    return { kind: "MALFORMED", reason: "CLIENT_REFERENCE_MISMATCH" };
  }

  return { kind: "OK", invoiceId, organizationId };
}

export type SettlementInvoice = {
  id: string;
  organization_id: string;
  status: string;
  currency: unknown;
  total_cents: unknown;
  stripe_checkout_session_id?: string | null;
};

export type SettlementSession = {
  id: string;
  mode: string | null | undefined;
  payment_status: string | null | undefined;
  amount_total: number | null | undefined;
  currency: string | null | undefined;
};

export type SettlementDecision =
  | { action: "MARK_PAID"; expectedStatus: string; amountCents: number; currency: string }
  | { action: "ALREADY_PAID" }
  | { action: "REJECT"; reason: string };

/*
 * Decide what a paid Checkout Session means for the stored invoice. REJECT reasons other
 * than for a missing invoice mean money may have been taken for something we cannot apply
 * it to: the caller records an anomaly for a human, it does not retry.
 */
export function evaluateSettlement(
  invoice: SettlementInvoice | null,
  organizationId: string,
  session: SettlementSession
): SettlementDecision {
  if (!invoice) {
    return { action: "REJECT", reason: "INVOICE_NOT_FOUND" };
  }

  if (invoice.organization_id !== organizationId) {
    return { action: "REJECT", reason: "ORGANIZATION_MISMATCH" };
  }

  if (session.mode !== "payment") {
    return { action: "REJECT", reason: "UNEXPECTED_MODE" };
  }

  if (session.payment_status !== "paid") {
    return { action: "REJECT", reason: "NOT_PAID" };
  }

  if (invoice.status === "PAID") {
    // The webhook always stores the paying session when it marks PAID, so the same session
    // re-delivered is a harmless duplicate event. Any other paid session (including against
    // an invoice marked paid outside Stripe, where no session is stored) is a second charge.
    if (invoice.stripe_checkout_session_id === session.id) {
      return { action: "ALREADY_PAID" };
    }

    return { action: "REJECT", reason: "DUPLICATE_PAYMENT" };
  }

  if (!isPayableStatus(invoice.status)) {
    return { action: "REJECT", reason: "INVOICE_NOT_PAYABLE" };
  }

  const amountCents = Number(invoice.total_cents);

  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    return { action: "REJECT", reason: "INVALID_STORED_TOTAL" };
  }

  if (session.amount_total !== amountCents) {
    return { action: "REJECT", reason: "AMOUNT_MISMATCH" };
  }

  const currency = normalisePaymentCurrency(invoice.currency);
  const paidCurrency =
    typeof session.currency === "string" ? session.currency.trim().toLowerCase() : null;

  if (!currency || paidCurrency !== currency) {
    return { action: "REJECT", reason: "CURRENCY_MISMATCH" };
  }

  return { action: "MARK_PAID", expectedStatus: invoice.status, amountCents, currency };
}

export type StoredSessionSnapshot = {
  id: string;
  status: string | null | undefined;
  payment_status: string | null | undefined;
  amount_total: number | null | undefined;
  currency: string | null | undefined;
  expires_at: number | null | undefined;
  metadata?: Record<string, string> | null;
};

export type SessionReuseDecision =
  | { action: "REUSE" }
  | { action: "PROCESSING" }
  | { action: "CREATE_NEW"; expirePrevious: boolean };

/*
 * Before creating a Checkout Session, look at the one we stored last time for the invoice.
 * Re-using an open session (and refusing while a completed one settles) stops a client
 * paying the same invoice twice through two tabs or a back-button retry.
 */
export function decideSessionReuse(
  stored: StoredSessionSnapshot | null,
  expected: { invoiceId: string; amountCents: number; currency: string },
  nowSeconds: number
): SessionReuseDecision {
  if (!stored) {
    return { action: "CREATE_NEW", expirePrevious: false };
  }

  if (stored.metadata?.[METADATA_INVOICE_ID] !== expected.invoiceId) {
    return { action: "CREATE_NEW", expirePrevious: false };
  }

  if (stored.status === "complete") {
    // Paid (webhook pending) or a delayed method still settling. Either way: do not charge again.
    return { action: "PROCESSING" };
  }

  if (stored.status !== "open") {
    return { action: "CREATE_NEW", expirePrevious: false };
  }

  const matches =
    stored.amount_total === expected.amountCents &&
    typeof stored.currency === "string" &&
    stored.currency.toLowerCase() === expected.currency;

  const fresh =
    typeof stored.expires_at === "number" &&
    stored.expires_at - nowSeconds > REUSE_MIN_REMAINING_SECONDS;

  if (matches && fresh) {
    return { action: "REUSE" };
  }

  // Stale or for an outdated amount: close it so it can never be paid, then start again.
  return { action: "CREATE_NEW", expirePrevious: true };
}

/*
 * Stripe idempotency key for session creation. Two concurrent clicks with the same invoice
 * state get the SAME session back. Including the previous session id means a retry after
 * an expired or cancelled session gets a fresh key, so a new session can be created.
 */
export function checkoutIdempotencyKey(
  invoiceId: string,
  amountCents: number,
  currency: string,
  previousSessionId: string | null
): string {
  return `drylake-checkout:${invoiceId}:${amountCents}:${currency}:${previousSessionId ?? "first"}`;
}
