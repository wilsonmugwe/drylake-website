/*
 * Drylake business identity and GST registration: the ONE source every invoice surface
 * (admin, client portal, email, Stripe) reads. Pure: no framework imports, so it is unit
 * tested (tests/gst.test.mjs).
 *
 * Drylake is NOT GST registered (ABN Lookup, extracted 9 Oct 2026: "Not currently registered
 * for GST"; drylake-ops D39, which supersedes D31). Collecting GST while unregistered is
 * unlawful, so every NEW invoice is plain AUD with no GST line (lib/invoices/gst.ts).
 * Registration is being lodged with date of effect 24 September 2026, annual reporting.
 * Flip this to true ONLY once ABN Lookup shows "Registered from ..."; ABN Lookup is the source
 * of truth, not a chat confirmation (D31 was a chat confirmation and was wrong).
 *
 * This is a constant on purpose, not an env flag: GST treatment is a fact about the business,
 * and a per-deployment switch could silently mis-tax invoices.
 *
 * Never hard-code the ABN or legal name in a component: import DRYLAKE_BUSINESS.
 */

export const DRYLAKE_BUSINESS = {
  legalName: "DRYLAKE PTY LTD",
  abn: "70 702 662 557",
  acn: "702 662 557",
  country: "Australia",
  gstRegistered: false,
} as const;
