import { NextResponse } from "next/server";

import { authorizeAdminApi } from "@/lib/auth/admin-api";
import {
  deliverInvoiceEmail,
  INVOICE_EMAIL_SELECT,
  loadInvoiceEmailContext,
  type InvoiceEmailRow,
} from "@/lib/invoices/invoice-notifications";
import { calculateInvoiceAmounts, sameAmounts } from "@/lib/invoices/gst";
import { appBaseUrl, clientInvoiceUrl } from "@/lib/invoices/invoice-url";
import { canIssue } from "@/lib/invoices/lifecycle";
import { gstAppliesToNewInvoices } from "@/lib/tax";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ invoiceId: string }>;
};

function noStore(message: string, status: number) {
  return new NextResponse(message, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/* The admin page posts a plain form, so every outcome returns to it with a notice code. */
function backToInvoice(request: Request, invoiceId: string, notice: string) {
  const url = new URL(`/admin/invoices/${invoiceId}`, request.url);
  url.searchParams.set("notice", notice);
  return NextResponse.redirect(url, 303);
}

/*
 * Issue Invoice: DRAFT -> OPEN, then email the billing contact.
 * Platform admin only. The transition is a conditional update on status = DRAFT, so two
 * concurrent clicks cannot both issue. Email failure leaves the invoice OPEN and the
 * notification row FAILED; the admin resends (lib/invoices/invoice-notifications.ts).
 *
 * GST is fixed at ISSUE. A draft is not yet a tax invoice, so if GST registration took
 * effect between drafting and issuing (or the draft predates it), the amounts are
 * recalculated from the stored subtotal by lib/invoices/gst.ts in the same conditional
 * update that issues it. Once OPEN, amounts never change again.
 */
export async function POST(request: Request, context: RouteContext) {
  const { invoiceId } = await context.params;

  // Shared admin gate (QA PR 7): this is a native form post, so an expired session goes to
  // sign-in and back to this invoice instead of a bare "Unauthorized" page; a programmatic
  // caller gets 401 JSON; a signed-in non-admin 403 JSON. Nothing is read before this.
  const returnTo = isUuid(invoiceId) ? `/admin/invoices/${invoiceId}` : "/admin/invoices";
  const gate = await authorizeAdminApi(request, returnTo);

  if (!gate.ok) {
    return gate.response;
  }

  const { userId } = gate;

  // A malformed ID can never match a row: 404 before the query, not a database error.
  if (!isUuid(invoiceId)) {
    return noStore("Invoice not found.", 404);
  }

  const supabase = createAdminSupabaseClient();

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select(INVOICE_EMAIL_SELECT)
    .eq("id", invoiceId)
    .maybeSingle<InvoiceEmailRow>();

  if (invoiceError) {
    console.error("Issue invoice lookup failed:", { code: invoiceError.code });
    return backToInvoice(request, invoiceId, "LOOKUP_FAILED");
  }

  if (!invoice) {
    return noStore("Invoice not found.", 404);
  }

  const eligibility = canIssue(invoice);

  if (!eligibility.ok) {
    return backToInvoice(request, invoice.id, eligibility.code);
  }

  // Check the recipient BEFORE the transition, so an invoice is never issued to nobody.
  const emailContext = await loadInvoiceEmailContext(supabase, invoice);

  if (!emailContext.ok) {
    return backToInvoice(request, invoice.id, emailContext.code);
  }

  const stored = {
    subtotalCents: Number(invoice.subtotal_cents),
    taxCents: Number(invoice.tax_cents),
    totalCents: Number(invoice.total_cents),
  };
  const issuedAmounts = calculateInvoiceAmounts(stored.subtotalCents, gstAppliesToNewInvoices());
  const recalculated = !sameAmounts(stored, issuedAmounts);

  const { data: issued, error: updateError } = await supabase
    .from("invoices")
    .update({
      status: "OPEN",
      subtotal_cents: issuedAmounts.subtotalCents,
      tax_cents: issuedAmounts.taxCents,
      total_cents: issuedAmounts.totalCents,
    })
    .eq("id", invoice.id)
    .eq("status", "DRAFT")
    // Optimistic lock: issue exactly the amounts that were just read.
    .eq("total_cents", stored.totalCents)
    .select(INVOICE_EMAIL_SELECT)
    .maybeSingle<InvoiceEmailRow>();

  if (updateError) {
    console.error("Issue invoice update failed:", { code: updateError.code });
    return backToInvoice(request, invoice.id, "UPDATE_FAILED");
  }

  if (!issued) {
    // Another request issued (or changed) it first.
    return backToInvoice(request, invoice.id, "STATUS_CHANGED");
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_clerk_user_id: userId,
    action: "INVOICE_ISSUED",
    entity_type: "invoice",
    entity_id: invoice.id,
    metadata: {
      organization_id: invoice.organization_id,
      invoice_number: invoice.invoice_number,
      previous_status: "DRAFT",
      new_status: "OPEN",
      subtotal_cents: issuedAmounts.subtotalCents,
      tax_cents: issuedAmounts.taxCents,
      total_cents: issuedAmounts.totalCents,
      gst_recalculated_at_issue: recalculated,
      previous_total_cents: recalculated ? stored.totalCents : undefined,
    },
  });

  if (auditError) {
    console.error("Invoice issue audit failed:", { code: auditError.code });
  }

  const outcome = await deliverInvoiceEmail(supabase, issued, emailContext.context, {
    kind: "ISSUED",
    actorUserId: userId,
    portalUrl: clientInvoiceUrl(invoice.id, appBaseUrl(process.env)),
  });

  return backToInvoice(
    request,
    invoice.id,
    outcome === "SENT"
      ? "ISSUED"
      : outcome === "FAILED"
        ? "ISSUED_EMAIL_FAILED"
        : "ISSUED_EMAIL_NOT_RECORDED"
  );
}
