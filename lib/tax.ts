/*
 * Does GST apply to an invoice created or issued now? Read from the single business
 * config (lib/business.ts), where Drylake is recorded as GST registered.
 *
 * Existing invoices are never recalculated by this: each invoice's GST is fixed in its
 * stored subtotal/tax/total once issued (lib/invoices/gst.ts). Only a DRAFT is
 * recalculated, at the moment it is issued.
 */
import { DRYLAKE_BUSINESS } from "@/lib/business";

export function gstAppliesToNewInvoices(): boolean {
  return DRYLAKE_BUSINESS.gstRegistered;
}
