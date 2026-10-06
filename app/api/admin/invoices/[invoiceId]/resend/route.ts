import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
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
  const { userId } = await auth();

  if (!userId) {
    return noStore("Unauthorized", 401);
  }

  if (!(await isPlatformAdmin())) {
    return noStore("Forbidden", 403);
  }

  const { invoiceId } = await context.params;

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
