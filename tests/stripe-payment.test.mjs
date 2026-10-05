/*
 * Stripe Checkout <-> invoice decisions (lib/invoices/stripe-payment.ts): event mapping,
 * metadata validation, settlement (amount/currency match, idempotent repeat completion,
 * PAID never reverts, duplicate payment flagged) and Checkout Session re-use.
 * Run: npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  checkoutIdempotencyKey,
  classifyWebhookEvent,
  decideSessionReuse,
  evaluateSettlement,
  readSessionReference,
} from "../lib/invoices/stripe-payment.ts";

const ORG = "3f2b8c1e-9a4d-4c7e-8b1a-2d5e6f7a8b9c";
const OTHER_ORG = "0190f3c2-7b1a-7e3d-9c2b-1a2b3c4d5e6f";
const INVOICE_ID = "11111111-2222-4333-8444-555555555555";

function invoice(overrides = {}) {
  return {
    id: INVOICE_ID,
    organization_id: ORG,
    status: "OPEN",
    currency: "AUD",
    total_cents: 125000,
    stripe_checkout_session_id: "cs_test_a",
    ...overrides,
  };
}

function session(overrides = {}) {
  return {
    id: "cs_test_a",
    mode: "payment",
    payment_status: "paid",
    amount_total: 125000,
    currency: "aud",
    ...overrides,
  };
}

describe("classifyWebhookEvent", () => {
  it("maps checkout events", () => {
    assert.equal(classifyWebhookEvent("checkout.session.completed", "paid"), "SETTLE");
    assert.equal(classifyWebhookEvent("checkout.session.completed", "unpaid"), "AWAIT_ASYNC");
    assert.equal(classifyWebhookEvent("checkout.session.completed", "no_payment_required"), "IGNORE");
    assert.equal(classifyWebhookEvent("checkout.session.async_payment_succeeded", "paid"), "SETTLE");
    assert.equal(classifyWebhookEvent("checkout.session.async_payment_failed", "unpaid"), "ASYNC_FAILED");
    assert.equal(classifyWebhookEvent("checkout.session.expired", "unpaid"), "EXPIRED");
    assert.equal(classifyWebhookEvent("payment_intent.payment_failed"), "PAYMENT_FAILED");
  });

  it("ignores unknown or irrelevant events", () => {
    assert.equal(classifyWebhookEvent("customer.created"), "IGNORE");
    assert.equal(classifyWebhookEvent("charge.refunded"), "IGNORE");
  });
});

describe("readSessionReference", () => {
  const metadata = { drylake_invoice_id: INVOICE_ID, drylake_organization_id: ORG };

  it("reads valid Drylake metadata", () => {
    assert.deepEqual(readSessionReference({ metadata, client_reference_id: INVOICE_ID }), {
      kind: "OK",
      invoiceId: INVOICE_ID,
      organizationId: ORG,
    });
  });

  it("ignores sessions that are not Drylake's", () => {
    assert.equal(readSessionReference({ metadata: {} }).kind, "NOT_DRYLAKE");
    assert.equal(readSessionReference({ metadata: null }).kind, "NOT_DRYLAKE");
  });

  it("flags incomplete, non-UUID or inconsistent metadata", () => {
    assert.equal(readSessionReference({ metadata: { drylake_invoice_id: INVOICE_ID } }).kind, "MALFORMED");
    assert.equal(
      readSessionReference({ metadata: { ...metadata, drylake_invoice_id: "1 OR 1=1" } }).kind,
      "MALFORMED"
    );
    assert.equal(
      readSessionReference({ metadata, client_reference_id: OTHER_ORG }).reason,
      "CLIENT_REFERENCE_MISMATCH"
    );
  });
});

describe("evaluateSettlement", () => {
  it("marks an OPEN or OVERDUE invoice paid when amount and currency match", () => {
    assert.deepEqual(evaluateSettlement(invoice(), ORG, session()), {
      action: "MARK_PAID",
      expectedStatus: "OPEN",
      amountCents: 125000,
      currency: "aud",
    });
    assert.equal(evaluateSettlement(invoice({ status: "OVERDUE" }), ORG, session()).expectedStatus, "OVERDUE");
  });

  it("rejects amount and currency mismatches", () => {
    assert.equal(evaluateSettlement(invoice(), ORG, session({ amount_total: 100 })).reason, "AMOUNT_MISMATCH");
    assert.equal(evaluateSettlement(invoice(), ORG, session({ amount_total: null })).reason, "AMOUNT_MISMATCH");
    assert.equal(evaluateSettlement(invoice(), ORG, session({ currency: "usd" })).reason, "CURRENCY_MISMATCH");
    assert.equal(evaluateSettlement(invoice({ currency: "USD" }), ORG, session({ currency: "usd" })).reason, "CURRENCY_MISMATCH");
  });

  it("repeated completion of the same session is idempotent", () => {
    const paid = invoice({ status: "PAID", stripe_checkout_session_id: "cs_test_a" });
    assert.deepEqual(evaluateSettlement(paid, ORG, session()), { action: "ALREADY_PAID" });
    // Even with a different amount on a replay, PAID is never re-evaluated or reverted.
    assert.deepEqual(evaluateSettlement(paid, ORG, session({ amount_total: 1 })), { action: "ALREADY_PAID" });
  });

  it("a second, different paid session against a PAID invoice is a duplicate payment", () => {
    const paid = invoice({ status: "PAID", stripe_checkout_session_id: "cs_test_a" });
    assert.equal(evaluateSettlement(paid, ORG, session({ id: "cs_test_b" })).reason, "DUPLICATE_PAYMENT");
    const manual = invoice({ status: "PAID", stripe_checkout_session_id: null });
    assert.equal(evaluateSettlement(manual, ORG, session()).reason, "DUPLICATE_PAYMENT");
  });

  it("never settles DRAFT, VOID, unpaid, wrong-mode or another organisation's invoice", () => {
    assert.equal(evaluateSettlement(invoice({ status: "DRAFT" }), ORG, session()).reason, "INVOICE_NOT_PAYABLE");
    assert.equal(evaluateSettlement(invoice({ status: "VOID" }), ORG, session()).reason, "INVOICE_NOT_PAYABLE");
    assert.equal(evaluateSettlement(invoice(), ORG, session({ payment_status: "unpaid" })).reason, "NOT_PAID");
    assert.equal(evaluateSettlement(invoice(), ORG, session({ mode: "subscription" })).reason, "UNEXPECTED_MODE");
    assert.equal(evaluateSettlement(invoice(), OTHER_ORG, session()).reason, "ORGANIZATION_MISMATCH");
    assert.equal(evaluateSettlement(null, ORG, session()).reason, "INVOICE_NOT_FOUND");
  });

  it("no decision ever moves a PAID invoice to another status", () => {
    const paid = invoice({ status: "PAID" });
    for (const s of [session(), session({ id: "x" }), session({ payment_status: "unpaid" }), session({ amount_total: 5 })]) {
      assert.notEqual(evaluateSettlement(paid, ORG, s).action, "MARK_PAID");
    }
  });
});

describe("decideSessionReuse", () => {
  const now = 1_800_000_000;
  const expected = { invoiceId: INVOICE_ID, amountCents: 125000, currency: "aud" };
  const stored = (overrides = {}) => ({
    id: "cs_test_a",
    status: "open",
    payment_status: "unpaid",
    amount_total: 125000,
    currency: "aud",
    expires_at: now + 3600,
    metadata: { drylake_invoice_id: INVOICE_ID },
    ...overrides,
  });

  it("re-uses an open, matching, fresh session", () => {
    assert.deepEqual(decideSessionReuse(stored(), expected, now), { action: "REUSE" });
  });

  it("refuses a new payment while a completed session settles", () => {
    assert.deepEqual(decideSessionReuse(stored({ status: "complete", payment_status: "paid" }), expected, now), {
      action: "PROCESSING",
    });
    assert.deepEqual(decideSessionReuse(stored({ status: "complete" }), expected, now), { action: "PROCESSING" });
  });

  it("expires a stale or outdated open session before creating a new one", () => {
    assert.deepEqual(decideSessionReuse(stored({ expires_at: now + 60 }), expected, now), {
      action: "CREATE_NEW",
      expirePrevious: true,
    });
    assert.deepEqual(decideSessionReuse(stored({ amount_total: 999 }), expected, now), {
      action: "CREATE_NEW",
      expirePrevious: true,
    });
  });

  it("creates fresh when nothing usable is stored (cancelled checkout can be retried)", () => {
    assert.deepEqual(decideSessionReuse(null, expected, now), { action: "CREATE_NEW", expirePrevious: false });
    assert.deepEqual(decideSessionReuse(stored({ status: "expired" }), expected, now), {
      action: "CREATE_NEW",
      expirePrevious: false,
    });
    assert.deepEqual(decideSessionReuse(stored({ metadata: { drylake_invoice_id: "other" } }), expected, now), {
      action: "CREATE_NEW",
      expirePrevious: false,
    });
  });
});

describe("checkoutIdempotencyKey", () => {
  it("is stable for the same invoice state and changes after a previous session", () => {
    const a = checkoutIdempotencyKey(INVOICE_ID, 125000, "aud", null);
    assert.equal(a, checkoutIdempotencyKey(INVOICE_ID, 125000, "aud", null));
    assert.notEqual(a, checkoutIdempotencyKey(INVOICE_ID, 125000, "aud", "cs_test_a"));
    assert.notEqual(a, checkoutIdempotencyKey(INVOICE_ID, 125001, "aud", null));
    assert.ok(a.length <= 255);
  });
});
