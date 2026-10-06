/*
 * GST: the single cents-based calculation (lib/invoices/gst.ts), the business config
 * (lib/business.ts), the shared tax presentation every surface renders, and historical
 * invoices staying exactly as issued. Run: npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { DRYLAKE_BUSINESS } from "../lib/business.ts";
import {
  amountsAreConsistent,
  calculateGstCents,
  calculateInvoiceAmounts,
  GST_RATE_PERCENT,
  NO_GST_CHARGED_NOTE,
  presentInvoiceTax,
  sameAmounts,
} from "../lib/invoices/gst.ts";

describe("calculateGstCents (10%, integer cents, half up)", () => {
  it("is 10% for whole-dollar and exact-cent subtotals", () => {
    assert.equal(GST_RATE_PERCENT, 10);
    assert.equal(calculateGstCents(100_000), 10_000); // $1,000.00 -> $100.00
    assert.equal(calculateGstCents(125_000), 12_500);
    assert.equal(calculateGstCents(10), 1);
    assert.equal(calculateGstCents(0), 0);
  });

  it("rounds fractional-cent GST half up", () => {
    // subtotal -> exact 10% -> expected cents
    const cases = [
      [1, 0], // 0.1c
      [4, 0], // 0.4c
      [5, 1], // 0.5c rounds up
      [9, 1], // 0.9c
      [15, 2], // 1.5c
      [1004, 100], // 100.4c
      [1005, 101], // 100.5c
      [1006, 101], // 100.6c
      [99_999, 10_000], // 9,999.9c
      [645_000, 64_500], // the Central Therapy full move
      [999_999_999, 100_000_000],
    ];

    for (const [subtotal, expected] of cases) {
      assert.equal(calculateGstCents(subtotal), expected, `subtotal ${subtotal}`);
    }
  });

  it("refuses non-integer or negative cents rather than guessing", () => {
    for (const bad of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "100"]) {
      assert.throws(() => calculateGstCents(bad), RangeError, String(bad));
    }
  });
});

describe("calculateInvoiceAmounts", () => {
  it("$1,000.00 + GST $100.00 = $1,100.00", () => {
    assert.deepEqual(calculateInvoiceAmounts(100_000, true), {
      subtotalCents: 100_000,
      taxCents: 10_000,
      totalCents: 110_000,
    });
  });

  it("no GST when it does not apply", () => {
    assert.deepEqual(calculateInvoiceAmounts(100_000, false), {
      subtotalCents: 100_000,
      taxCents: 0,
      totalCents: 100_000,
    });
  });

  it("subtotal + tax = total for every subtotal in a dense sweep", () => {
    for (let subtotal = 1; subtotal <= 20_000; subtotal += 1) {
      const amounts = calculateInvoiceAmounts(subtotal, true);
      assert.equal(amounts.subtotalCents + amounts.taxCents, amounts.totalCents);
      assert.ok(amountsAreConsistent(amounts));
      // Never more than half a cent away from the exact 10%.
      assert.ok(Math.abs(amounts.taxCents - subtotal / 10) <= 0.5);
    }
  });

  it("amountsAreConsistent rejects a broken breakdown", () => {
    assert.equal(amountsAreConsistent({ subtotalCents: 100, taxCents: 10, totalCents: 111 }), false);
    assert.equal(amountsAreConsistent({ subtotalCents: 100, taxCents: -10, totalCents: 90 }), false);
    assert.equal(amountsAreConsistent({ subtotalCents: "100", taxCents: 10, totalCents: 110 }), false);
  });

  it("sameAmounts compares to the cent", () => {
    assert.equal(sameAmounts(calculateInvoiceAmounts(500, true), calculateInvoiceAmounts(500, true)), true);
    assert.equal(sameAmounts(calculateInvoiceAmounts(500, true), calculateInvoiceAmounts(500, false)), false);
  });
});

describe("business config (single source)", () => {
  it("Drylake is GST registered, with its legal name and ABN, as constants", () => {
    assert.equal(DRYLAKE_BUSINESS.gstRegistered, true);
    assert.equal(DRYLAKE_BUSINESS.legalName, "DRYLAKE PTY LTD");
    assert.equal(DRYLAKE_BUSINESS.abn, "70 702 662 557");
  });

  it("GST is not switchable by environment variable", () => {
    const source = readFileSync(fileURLToPath(new URL("../lib/business.ts", import.meta.url)), "utf8");
    const tax = readFileSync(fileURLToPath(new URL("../lib/tax.ts", import.meta.url)), "utf8");
    assert.equal(/process\.env/.test(source + tax), false);
  });

  it("a new invoice gets 10% GST on top", () => {
    assert.deepEqual(calculateInvoiceAmounts(645_000, DRYLAKE_BUSINESS.gstRegistered), {
      subtotalCents: 645_000,
      taxCents: 64_500,
      totalCents: 709_500,
    });
  });
});

describe("presentInvoiceTax (admin, client and email all render this)", () => {
  it("issued GST invoice: tax invoice, GST (10%) line, total including GST", () => {
    const view = presentInvoiceTax({ status: "OPEN", subtotalCents: 100_000, taxCents: 10_000 });
    assert.deepEqual(view, {
      documentTitle: "Tax invoice",
      showGstLine: true,
      gstLabel: "GST (10%)",
      totalLabel: "Total including GST",
      noGstNote: null,
    });
  });

  it("paid and overdue GST invoices stay tax invoices", () => {
    for (const status of ["PAID", "OVERDUE"]) {
      assert.equal(
        presentInvoiceTax({ status, subtotalCents: 1005, taxCents: 101 }).documentTitle,
        "Tax invoice"
      );
    }
  });

  it("a draft is never labelled a tax invoice", () => {
    const view = presentInvoiceTax({ status: "DRAFT", subtotalCents: 100_000, taxCents: 10_000 });
    assert.equal(view.documentTitle, "Draft invoice");
    assert.equal(view.showGstLine, true);
  });

  it("historical no-GST invoice reads exactly as issued, whatever today's config is", () => {
    const view = presentInvoiceTax({ status: "PAID", subtotalCents: 125_000, taxCents: 0 });
    assert.deepEqual(view, {
      documentTitle: "Invoice",
      showGstLine: false,
      gstLabel: "GST",
      totalLabel: "Total",
      noGstNote: NO_GST_CHARGED_NOTE,
    });
  });

  it("a non-standard stored GST amount is shown as stored, without claiming 10%", () => {
    const view = presentInvoiceTax({ status: "OPEN", subtotalCents: 100_000, taxCents: 15_000 });
    assert.equal(view.gstLabel, "GST");
    assert.equal(view.showGstLine, true);
  });

  it("contains no em dashes in any label", () => {
    for (const taxCents of [0, 10_000]) {
      for (const status of ["DRAFT", "OPEN", "PAID"]) {
        const view = presentInvoiceTax({ status, subtotalCents: 100_000, taxCents });
        assert.equal(JSON.stringify(view).includes("—"), false);
      }
    }
  });
});
