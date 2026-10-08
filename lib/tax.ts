/*
 * Does GST apply to an invoice created or issued now? Read from the single business
 * config (lib/business.ts), where Drylake is recorded as GST registered.
 *
 * Existing invoices are never recalculated by this: each invoice's GST is fixed in its
 * stored subtotal/tax/total once issued (lib/invoices/gst.ts). Only a DRAFT is
 * recalculated, at the moment it is issued.
 */
import { DRYLAKE_BUSINESS } from "@/lib/business";

/**
 * No date comparison on purpose: registration is already in effect for every invoice created
 * or issued now, so the answer is the registration flag alone. Drafts created before
 * registration pick up GST when they are issued (the issue route recalculates them).
 */
export function gstAppliesToNewInvoices(): boolean {
  return DRYLAKE_BUSINESS.gstRegistered;
}
