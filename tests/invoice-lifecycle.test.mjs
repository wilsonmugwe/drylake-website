/*
 * Invoice lifecycle rules (lib/invoices/lifecycle.ts): transitions, issue/resend eligibility,
 * derived OVERDUE, client visibility, and checkout eligibility (ownership, DRAFT/PAID/VOID
 * refusal, trusted amount + currency). Run: npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  billingToday,
  canIssue,
  canResend,
  canTransition,
  displayStatus,
  evaluateCheckout,
  INVOICE_STATUSES,
  isClientVisible,
  isOverdue,
  isPayableStatus,
  normalisePaymentCurrency,
} from "../lib/invoices/lifecycle.ts";
import { adminNoticeFor } from "../lib/invoices/admin-notices.ts";

const ORG = "3f2b8c1e-9a4d-4c7e-8b1a-2d5e6f7a8b9c";
const OTHER_ORG = "0190f3c2-7b1a-7e3d-9c2b-1a2b3c4d5e6f";
const INVOICE_ID = "11111111-2222-4333-8444-555555555555";

function invoice(overrides = {}) {
  return {
    id: INVOICE_ID,
    organization_id: ORG,
    status: "OPEN",
    visible_to_client: true,
    total_cents: 125000,
    currency: "AUD",
    due_date: "2026-10-20",
    ...overrides,
  };
}

describe("canTransition", () => {
  it("allows the documented lifecycle", () => {
    assert.equal(canTransition("DRAFT", "OPEN"), true);
    assert.equal(canTransition("OPEN", "PAID"), true);
    assert.equal(canTransition("OVERDUE", "PAID"), true);
    assert.equal(canTransition("OPEN", "OVERDUE"), true);
  });

  it("never moves PAID anywhere, including backwards", () => {
    for (const to of INVOICE_STATUSES) {
      assert.equal(canTransition("PAID", to), false, `PAID -> ${to}`);
    }
  });

  it("refuses skipping issue and unknown statuses", () => {
    assert.equal(canTransition("DRAFT", "PAID"), false);
    assert.equal(canTransition("VOID", "OPEN"), false);
    assert.equal(canTransition("OPEN", "DRAFT"), false);
    assert.equal(canTransition("OPEN", "REFUNDED"), false);
    assert.equal(canTransition(undefined, "OPEN"), false);
  });
});

describe("canIssue / canResend", () => {
  it("issues only a client-visible DRAFT with a positive total", () => {
    assert.equal(canIssue(invoice({ status: "DRAFT" })).ok, true);
    assert.equal(canIssue(invoice({ status: "OPEN" })).code, "NOT_DRAFT");
    assert.equal(canIssue(invoice({ status: "PAID" })).code, "NOT_DRAFT");
    assert.equal(canIssue(invoice({ status: "DRAFT", visible_to_client: false })).code, "INTERNAL_INVOICE");
    assert.equal(canIssue(invoice({ status: "DRAFT", total_cents: 0 })).code, "INVALID_TOTAL");
    assert.equal(canIssue(invoice({ status: "DRAFT", total_cents: 10.5 })).code, "INVALID_TOTAL");
  });

  it("resends only OPEN or OVERDUE", () => {
    assert.equal(canResend(invoice({ status: "OPEN" })).ok, true);
    assert.equal(canResend(invoice({ status: "OVERDUE" })).ok, true);
    for (const status of ["DRAFT", "PAID", "VOID"]) {
      assert.equal(canResend(invoice({ status })).code, "NOT_OUTSTANDING", status);
    }
  });

  it("every refusal code has admin copy without em dashes", () => {
    for (const code of ["NOT_DRAFT", "INTERNAL_INVOICE", "INVALID_TOTAL", "NOT_OUTSTANDING", "ISSUED_EMAIL_FAILED"]) {
      const notice = adminNoticeFor(code);
      assert.ok(notice, code);
      assert.equal(notice.message.includes("—"), false, code);
    }
    assert.equal(adminNoticeFor("<script>"), null);
    assert.equal(adminNoticeFor("toString"), null);
  });
});

describe("overdue (derived)", () => {
  const now = new Date("2026-10-05T02:00:00Z"); // 10:00 in Perth, 5 Oct

  it("uses the Perth calendar date", () => {
    assert.equal(billingToday(now), "2026-10-05");
    // 17:00 UTC on 4 Oct is already 5 Oct 01:00 in Perth.
    assert.equal(billingToday(new Date("2026-10-04T17:00:00Z")), "2026-10-05");
  });

  it("OPEN past due reads OVERDUE; due today is not overdue", () => {
    assert.equal(isOverdue(invoice({ due_date: "2026-10-04" }), now), true);
    assert.equal(isOverdue(invoice({ due_date: "2026-10-05" }), now), false);
    assert.equal(isOverdue(invoice({ due_date: null }), now), false);
    assert.equal(displayStatus(invoice({ due_date: "2026-09-01" }), now), "OVERDUE");
  });

  it("never re-labels PAID, DRAFT or VOID, and honours a stored OVERDUE", () => {
    for (const status of ["PAID", "DRAFT", "VOID"]) {
      assert.equal(displayStatus(invoice({ status, due_date: "2020-01-01" }), now), status);
    }
    assert.equal(isOverdue(invoice({ status: "OVERDUE", due_date: "2099-01-01" }), now), true);
  });

  it("OVERDUE stays payable", () => {
    assert.equal(isPayableStatus("OVERDUE"), true);
    assert.equal(isPayableStatus("OPEN"), true);
    assert.equal(isPayableStatus("DRAFT"), false);
  });
});

describe("isClientVisible", () => {
  it("DRAFT is never visible to a client", () => {
    assert.equal(isClientVisible(invoice({ status: "DRAFT" }), ORG), false);
  });

  it("requires visible_to_client and the caller's organisation", () => {
    assert.equal(isClientVisible(invoice(), ORG), true);
    assert.equal(isClientVisible(invoice({ visible_to_client: false }), ORG), false);
    assert.equal(isClientVisible(invoice(), OTHER_ORG), false);
    assert.equal(isClientVisible(invoice(), null), false);
    assert.equal(isClientVisible(invoice({ visible_to_client: "true" }), ORG), false);
  });
});

describe("evaluateCheckout", () => {
  it("takes amount and currency only from the stored invoice", () => {
    const result = evaluateCheckout(invoice({ total_cents: 125000, currency: " AUD " }), ORG);
    assert.deepEqual(result, { ok: true, amountCents: 125000, currency: "aud" });
  });

  it("pays OVERDUE (stored) and OPEN past due", () => {
    assert.equal(evaluateCheckout(invoice({ status: "OVERDUE" }), ORG).ok, true);
    assert.equal(evaluateCheckout(invoice({ due_date: "2020-01-01" }), ORG).ok, true);
  });

  it("refuses another organisation's invoice as not found (no existence leak)", () => {
    const result = evaluateCheckout(invoice(), OTHER_ORG);
    assert.equal(result.ok, false);
    assert.equal(result.code, "INVOICE_NOT_FOUND");
    assert.equal(result.httpStatus, 404);
  });

  it("DRAFT and hidden invoices are not found; PAID and VOID are not payable", () => {
    assert.equal(evaluateCheckout(invoice({ status: "DRAFT" }), ORG).code, "INVOICE_NOT_FOUND");
    assert.equal(evaluateCheckout(invoice({ visible_to_client: false }), ORG).code, "INVOICE_NOT_FOUND");
    assert.equal(evaluateCheckout(null, ORG).code, "INVOICE_NOT_FOUND");
    assert.equal(evaluateCheckout(invoice({ status: "PAID" }), ORG).code, "INVOICE_ALREADY_PAID");
    assert.equal(evaluateCheckout(invoice({ status: "VOID" }), ORG).code, "INVOICE_NOT_PAYABLE");
  });

  it("refuses bad stored totals and non-AUD currency", () => {
    for (const total_cents of [0, -100, 12.5, Number.NaN, "abc", 2 ** 60]) {
      assert.equal(evaluateCheckout(invoice({ total_cents }), ORG).code, "INVALID_INVOICE_TOTAL", String(total_cents));
    }
    for (const currency of ["usd", "", null, 42]) {
      assert.equal(evaluateCheckout(invoice({ currency }), ORG).code, "UNSUPPORTED_CURRENCY", String(currency));
    }
    assert.equal(normalisePaymentCurrency("Aud"), "aud");
  });
});
