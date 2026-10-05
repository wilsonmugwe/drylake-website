/*
 * Invoice email rendering (lib/email/invoice-email.ts): escaping, GST rule, portal link,
 * overdue reminder copy, no em dashes, billing email normalisation. Run: npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normaliseBillingEmail, renderInvoiceEmail } from "../lib/email/invoice-email.ts";
import { NO_GST_NOTE } from "../lib/tax.ts";

function input(overrides = {}) {
  return {
    kind: "ISSUED",
    invoiceNumber: "DL-0042",
    organizationName: "Acme <Care> & Co",
    contactName: "Sam O'Neil",
    projectName: "Website",
    currency: "AUD",
    subtotalCents: 125000,
    taxCents: 12500,
    totalCents: 125000,
    dueDate: "2026-10-20",
    overdue: false,
    portalUrl: "https://drylake.com.au/client/billing/11111111-2222-4333-8444-555555555555",
    gstRegistered: false,
    noGstNote: NO_GST_NOTE,
    ...overrides,
  };
}

describe("renderInvoiceEmail", () => {
  it("escapes every interpolated value in HTML", () => {
    const { html } = renderInvoiceEmail(input());
    assert.ok(html.includes("Acme &lt;Care&gt; &amp; Co"));
    assert.ok(html.includes("Sam O&#039;Neil"));
    assert.equal(html.includes("<Care>"), false);
  });

  it("shows no GST line while not registered, and the no-GST note instead", () => {
    const { html, text } = renderInvoiceEmail(input());
    assert.equal(/>GST</.test(html), false);
    assert.equal(/^GST:/m.test(text), false);
    assert.ok(text.includes(NO_GST_NOTE));
  });

  it("shows the GST line only when registered", () => {
    const { html, text } = renderInvoiceEmail(input({ gstRegistered: true }));
    assert.ok(/>GST</.test(html));
    assert.ok(/^GST: \$125\.00$/m.test(text));
  });

  it("links to the invoice in the client portal", () => {
    const { html, text } = renderInvoiceEmail(input());
    assert.ok(html.includes('href="https://drylake.com.au/client/billing/'));
    assert.ok(text.includes("https://drylake.com.au/client/billing/"));
  });

  it("reminder copy reflects overdue state; no stale 'payment not enabled' copy", () => {
    const overdue = renderInvoiceEmail(input({ kind: "REMINDER", overdue: true }));
    assert.match(overdue.subject, /^Overdue: invoice DL-0042/);
    assert.ok(overdue.text.includes("now overdue"));
    const reminder = renderInvoiceEmail(input({ kind: "REMINDER" }));
    assert.equal(reminder.subject, "Invoice DL-0042 from Drylake");
    assert.equal(/once payment processing is enabled/i.test(reminder.html), false);
  });

  it("contains no em dashes", () => {
    for (const kind of ["ISSUED", "REMINDER"]) {
      for (const overdue of [true, false]) {
        const { subject, html, text } = renderInvoiceEmail(input({ kind, overdue }));
        assert.equal(`${subject}${html}${text}`.includes("—"), false, `${kind}/${overdue}`);
      }
    }
  });
});

describe("normaliseBillingEmail", () => {
  it("trims, lower-cases and validates", () => {
    assert.equal(normaliseBillingEmail("  Accounts@Example.COM "), "accounts@example.com");
    assert.equal(normaliseBillingEmail(""), null);
    assert.equal(normaliseBillingEmail("not an email"), null);
    assert.equal(normaliseBillingEmail(null), null);
    assert.equal(normaliseBillingEmail(`${"a".repeat(250)}@x.io`), null);
  });
});
