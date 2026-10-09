/*
 * Invoice email rendering (lib/email/invoice-email.ts): escaping, GST rule, portal link,
 * overdue reminder copy, no em dashes, billing email normalisation. Run: npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normaliseBillingEmail, renderInvoiceEmail } from "../lib/email/invoice-email.ts";
import { NO_GST_CHARGED_NOTE } from "../lib/invoices/gst.ts";
import { clientInvoiceUrl } from "../lib/invoices/invoice-url.ts";

const INVOICE_ID = "11111111-2222-4333-8444-555555555555";
const PORTAL_URL = clientInvoiceUrl(INVOICE_ID, "https://drylake.com.au");

function input(overrides = {}) {
  return {
    kind: "ISSUED",
    invoiceNumber: "DL-0042",
    organizationName: "Acme <Care> & Co",
    contactName: "Sam O'Neil",
    projectName: "Website",
    currency: "AUD",
    subtotalCents: 125000,
    taxCents: 0,
    totalCents: 125000,
    dueDate: "2026-10-20",
    overdue: false,
    portalUrl: PORTAL_URL,
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

  it("an invoice stored without GST shows no GST line and the no-GST note (historical)", () => {
    const { html, text } = renderInvoiceEmail(input());
    assert.equal(/>GST/.test(html), false);
    assert.equal(/^GST/m.test(text), false);
    assert.ok(text.includes(NO_GST_CHARGED_NOTE));
    assert.equal(html.includes("Tax invoice"), false);
    assert.ok(/^Total \(AUD\): \$1,250\.00$/m.test(text));
  });

  it("a GST invoice shows Subtotal, GST (10%) and Total including GST, as a tax invoice", () => {
    const { html, text } = renderInvoiceEmail(
      input({ subtotalCents: 100_000, taxCents: 10_000, totalCents: 110_000 })
    );
    assert.ok(/^Subtotal: \$1,000\.00$/m.test(text));
    assert.ok(/^GST \(10%\): \$100\.00$/m.test(text));
    assert.ok(/^Total including GST \(AUD\): \$1,100\.00$/m.test(text));
    assert.ok(html.includes(">GST (10%)<"));
    assert.ok(html.includes("Total including GST (AUD)"));
    assert.ok(html.includes("Tax invoice"));
    assert.ok(text.includes("ABN 70 702 662 557"));
    assert.equal(text.includes(NO_GST_CHARGED_NOTE), false);
  });

  it("the button and the fallback hyperlink are the same canonical invoice URL, never printed", () => {
    const { html, text } = renderInvoiceEmail(input());
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(hrefs.filter((href) => href.includes("/client/")), [PORTAL_URL, PORTAL_URL], "button + fallback link");
    assert.ok(html.includes(">View and pay invoice</a>"));
    assert.ok(html.includes(">Open your invoice in your browser</a>"));
    assert.equal(html.includes(`>${PORTAL_URL}<`), false, "the URL is not printed as visible text");
    // Every other link is the shared footer/logo set (site, email, phone), nothing invoice-specific.
    assert.deepEqual(
      [...new Set(hrefs.filter((href) => !href.includes("/client/")))].sort(),
      ["https://drylake.com.au", "mailto:hello@drylake.com.au", "tel:+61433448000"]
    );
    assert.ok(text.split("\n").includes(PORTAL_URL), "plain-text body link");
    assert.equal(PORTAL_URL, `https://drylake.com.au/client/billing/${INVOICE_ID}`);
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
