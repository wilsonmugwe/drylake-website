import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import {
  deliverInvoiceEmail,
  INVOICE_EMAIL_SELECT,
  loadInvoiceEmailContext,
  type InvoiceEmailRow,
} from "@/lib/invoices/invoice-notifications";
import { canIssue } from "@/lib/invoices/lifecycle";
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

  const { data: issued, error: updateError } = await supabase
    .from("invoices")
    .update({ status: "OPEN" })
    .eq("id", invoice.id)
    .eq("status", "DRAFT")
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
      total_cents: invoice.total_cents,
    },
  });

  if (auditError) {
    console.error("Invoice issue audit failed:", { code: auditError.code });
  }

  const outcome = await deliverInvoiceEmail(supabase, issued, emailContext.context, {
    kind: "ISSUED",
    actorUserId: userId,
    portalUrl: new URL(`/client/billing/${invoice.id}`, request.url).toString(),
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
