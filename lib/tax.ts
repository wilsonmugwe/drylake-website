/*
 * Does GST apply to an invoice created or issued now? Read from the single business
 * config (lib/business.ts). Drylake is not GST registered yet, so today this is false.
 *
 * Existing invoices are never recalculated by this: each invoice's GST is fixed in its
 * stored subtotal/tax/total once issued (lib/invoices/gst.ts). Only a DRAFT is
 * recalculated, at the moment it is issued.
 */
import { DRYLAKE_BUSINESS } from "@/lib/business";

/**
 * No date comparison on purpose: the answer is the registration flag alone. A DRAFT is
 * recalculated when it is issued, so drafts follow the flag at issue time; invoices already
 * issued keep their stored amounts and are never re-taxed by a change here.
 */
export function gstAppliesToNewInvoices(): boolean {
  return DRYLAKE_BUSINESS.gstRegistered;
}
