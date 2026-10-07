import { NextResponse } from "next/server";

import { authorizeAdminApi } from "@/lib/auth/admin-api";
import {
  deliverInvoiceEmail,
  INVOICE_EMAIL_SELECT,
  loadInvoiceEmailContext,
  type InvoiceEmailRow,
} from "@/lib/invoices/invoice-notifications";
import { appBaseUrl, clientInvoiceUrl } from "@/lib/invoices/invoice-url";
import { canResend } from "@/lib/invoices/lifecycle";
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

function backToInvoice(request: Request, invoiceId: string, notice: string) {
  const url = new URL(`/admin/invoices/${invoiceId}`, request.url);
  url.searchParams.set("notice", notice);
  return NextResponse.redirect(url, 303);
}

/*
 * Resend Invoice Email for an OPEN or OVERDUE (stored or derived) invoice.
 * Platform admin only. NEVER changes invoice status. Each send is a new notification row,
 * so earlier FAILED rows stay in the history. The current billing contact is used.
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
    console.error("Resend invoice lookup failed:", { code: invoiceError.code });
    return backToInvoice(request, invoiceId, "LOOKUP_FAILED");
  }

  if (!invoice) {
    return noStore("Invoice not found.", 404);
  }

  const eligibility = canResend(invoice);

  if (!eligibility.ok) {
    return backToInvoice(request, invoice.id, eligibility.code);
  }

  const emailContext = await loadInvoiceEmailContext(supabase, invoice);

  if (!emailContext.ok) {
    return backToInvoice(request, invoice.id, emailContext.code);
  }

  const outcome = await deliverInvoiceEmail(supabase, invoice, emailContext.context, {
    kind: "REMINDER",
    actorUserId: userId,
    portalUrl: clientInvoiceUrl(invoice.id, appBaseUrl(process.env)),
  });

  return backToInvoice(
    request,
    invoice.id,
    outcome === "SENT" ? "RESENT" : outcome === "FAILED" ? "RESEND_FAILED" : "RESEND_NOT_RECORDED"
  );
}
