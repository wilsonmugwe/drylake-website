/*
 * The ONLY place invoice GST is calculated or interpreted. Pure, integer cents, relative
 * imports only (tests/gst.test.mjs).
 *
 * Rules:
 *   - GST is 10% of the taxable subtotal, calculated once at INVOICE level, rounded half up
 *     to the cent: tax = floor((subtotal + 5) / 10). No floating point anywhere.
 *   - total = subtotal + tax, always, by construction.
 *   - Stored invoices are interpreted from their STORED amounts, never from today's
 *     configuration. A historical invoice issued with tax_cents = 0 (before Drylake charged
 *     GST) stays a no-GST invoice forever; nothing re-reads business config for it.
 *
 * Callers: invoice creation (server), Issue (draft recalculation), admin + client views,
 * invoice emails. Stripe charges the stored total_cents, which this module produced.
 */

export const GST_RATE_PERCENT = 10;

export function isValidCents(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/* 10% of `subtotalCents`, rounded half up to the cent. */
export function calculateGstCents(subtotalCents: number): number {
  if (!isValidCents(subtotalCents)) {
    throw new RangeError("Subtotal must be a non-negative integer number of cents.");
  }

  return Math.floor((subtotalCents + 5) / 10);
}

export type InvoiceAmounts = {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
};

export function calculateInvoiceAmounts(
  subtotalCents: number,
  gstApplies: boolean
): InvoiceAmounts {
  const taxCents = gstApplies ? calculateGstCents(subtotalCents) : 0;

  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

export function amountsAreConsistent(amounts: {
  subtotalCents: unknown;
  taxCents: unknown;
  totalCents: unknown;
}): boolean {
  const { subtotalCents, taxCents, totalCents } = amounts;

  return (
    isValidCents(subtotalCents) &&
    isValidCents(taxCents) &&
    isValidCents(totalCents) &&
    subtotalCents + taxCents === totalCents
  );
}

/* True when two amount sets are identical to the cent. */
export function sameAmounts(a: InvoiceAmounts, b: InvoiceAmounts): boolean {
  return (
    a.subtotalCents === b.subtotalCents &&
    a.taxCents === b.taxCents &&
    a.totalCents === b.totalCents
  );
}

export type InvoiceTaxPresentation = {
  /* "Tax invoice" only for an issued invoice that charged GST. */
  documentTitle: "Draft invoice" | "Tax invoice" | "Invoice";
  showGstLine: boolean;
  gstLabel: string;
  totalLabel: string;
  /* Shown instead of a GST line on an invoice that charged none. */
  noGstNote: string | null;
};

export const NO_GST_CHARGED_NOTE = "No GST was charged on this invoice.";

/*
 * How every surface labels an invoice's tax, derived ONLY from the stored amounts and
 * status. Admin detail, client detail, client billing and email all call this, so they
 * cannot disagree.
 */
export function presentInvoiceTax(invoice: {
  status: string;
  subtotalCents: number;
  taxCents: number;
}): InvoiceTaxPresentation {
  const chargedGst = invoice.taxCents > 0;
  const standardRate =
    chargedGst &&
    isValidCents(invoice.subtotalCents) &&
    calculateGstCents(invoice.subtotalCents) === invoice.taxCents;

  return {
    documentTitle:
      invoice.status === "DRAFT" ? "Draft invoice" : chargedGst ? "Tax invoice" : "Invoice",
    showGstLine: chargedGst,
    gstLabel: standardRate ? `GST (${GST_RATE_PERCENT}%)` : "GST",
    totalLabel: chargedGst ? "Total including GST" : "Total",
    noGstNote: chargedGst ? null : NO_GST_CHARGED_NOTE,
  };
}
