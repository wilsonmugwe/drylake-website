/*
 * Drylake business identity and GST registration: the ONE source every invoice surface
 * (admin, client portal, email, Stripe) reads. Pure: no framework imports, so it is unit
 * tested (tests/gst.test.mjs).
 *
 * Drylake is GST registered: every NEW invoice carries 10% GST on top
 * (lib/invoices/gst.ts). This is a constant on purpose, not an env flag: GST treatment is
 * a fact about the business, and a per-deployment switch could silently mis-tax invoices.
 * ATO GST registration: date of effect 24 September 2026, annual GST reporting (voluntary,
 * turnover under A$75k; drylake-ops D31). Invoices dated on or after that date carry GST.
 * Annual reporting ends once turnover is projected over A$75k: quarterly BAS from then on.
 *
 * Never hard-code the ABN or legal name in a component: import DRYLAKE_BUSINESS.
 */

export const DRYLAKE_BUSINESS = {
  legalName: "DRYLAKE PTY LTD",
  abn: "70 702 662 557",
  acn: "702 662 557",
  country: "Australia",
  gstRegistered: true,
} as const;
