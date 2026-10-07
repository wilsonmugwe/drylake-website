import { redirect } from "next/navigation";

import ClientBillingView from "@/components/client/ClientBillingView";
import ClientWorkspaceGate from "@/components/client/ClientWorkspaceGate";
import { getClientWorkspace } from "@/lib/auth/client-context";
import { signInUrl } from "@/lib/auth/guards";
import { displayStatus } from "@/lib/invoices/lifecycle";
import {
  logRouteTiming,
  startRequestTiming,
  timed,
} from "@/lib/perf/request-timing";

export const metadata = {
  title: { absolute: "Billing | Drylake Workspace" },
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function ClientBillingPage() {
  startRequestTiming();

  // ---------------------------------------------------------
  // The ONE authoritative workspace resolution (same as /client).
  // A ready workspace with no invoices renders the billing empty
  // state; it never falls back to an access screen.
  // ---------------------------------------------------------

  const workspace = await getClientWorkspace();

  if (workspace.state === "signed-out") {
    redirect(signInUrl("/client/billing"));
  }

  if (workspace.state !== "ready") {
    logRouteTiming("/client/billing", workspace.state);

    return (
      <ClientWorkspaceGate workspace={workspace} returnTo="/client/billing" />
    );
  }

  const { supabase, organization } = workspace;

  // ---------------------------------------------------------
  // Load invoices
  //
  // The explicit filters keep the query scoped and clear, but
  // they are NOT our security boundary.
  //
  // RLS independently requires:
  // - visible_to_client = true
  // - status != DRAFT
  // - invoice belongs to current Clerk organisation
  // ---------------------------------------------------------

  const { data: invoices, error: invoicesError } = await timed("content", () =>
    supabase
      .from("invoices")
      .select(
        `
        id,
        organization_id,
        project_id,
        invoice_number,
        status,
        currency,
        subtotal_cents,
        tax_cents,
        total_cents,
        due_date,
        paid_at,
        created_at
      `,
      )
      .eq("organization_id", organization.id)
      .eq("visible_to_client", true)
      .neq("status", "DRAFT")
      .order("created_at", { ascending: false }),
  );

  if (invoicesError) {
    console.error("Client invoice lookup failed:", {
      code: invoicesError.code,
      message: invoicesError.message,
    });
  }

  logRouteTiming("/client/billing", workspace.state);

  return (
    <ClientBillingView
      organizationName={organization.name}
      invoices={
        invoicesError
          ? { ok: false }
          : {
              ok: true,
              data: (invoices ?? []).map((invoice) => ({
                id: invoice.id,
                invoiceNumber: invoice.invoice_number,
                // OPEN past its due date is shown (and counted) as OVERDUE.
                status: displayStatus(invoice),
                currency: invoice.currency,
                totalCents: Number(invoice.total_cents),
                dueDate: invoice.due_date,
                issuedAt: invoice.created_at,
              })),
            }
      }
    />
  );
}
