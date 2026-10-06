/*
 * Drylake business identity and GST registration: the ONE source every invoice surface
 * (admin, client portal, email, Stripe) reads. Pure: no framework imports, so it is unit
 * tested (tests/gst.test.mjs).
 *
 * Drylake is GST registered: every NEW invoice carries 10% GST on top
 * (lib/invoices/gst.ts). This is a constant on purpose, not an env flag: GST treatment is
 * a fact about the business, and a per-deployment switch could silently mis-tax invoices.
 * Assumes the ATO GST registration is effective before the first invoice is issued from
 * this build.
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
