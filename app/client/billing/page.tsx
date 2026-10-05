import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import ClientAccessState from "@/components/client/ClientAccessState";
import ClientBillingView from "@/components/client/ClientBillingView";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Billing | Client Portal",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function ClientBillingPage() {
  // ---------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------

  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/client/billing");
  }

  // An authenticated account without an active Clerk
  // organisation must never receive client billing data.
  if (!orgId) {
    redirect("/client");
  }

  // ---------------------------------------------------------
  // Authenticated Supabase client
  //
  // Uses the Clerk session token.
  // Supabase RLS remains the actual tenant boundary.
  // ---------------------------------------------------------

  const supabase = createServerSupabaseClient();

  // ---------------------------------------------------------
  // Resolve active Drylake organisation
  // ---------------------------------------------------------

  const { data: organization, error: organizationError } =
    await supabase
      .from("organizations")
      .select("id, clerk_org_id, name, status")
      .eq("clerk_org_id", orgId)
      .eq("status", "ACTIVE")
      .maybeSingle();

  if (organizationError) {
    console.error("Billing organisation lookup failed:", {
      code: organizationError.code,
      message: organizationError.message,
    });
  }

  if (organizationError || !organization) {
    return <ClientAccessState variant="billing-unavailable" />;
  }

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

  const { data: invoices, error: invoicesError } =
    await supabase
      .from("invoices")
      .select(`
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
      `)
      .eq("organization_id", organization.id)
      .eq("visible_to_client", true)
      .neq("status", "DRAFT")
      .order("created_at", { ascending: false });

  if (invoicesError) {
    console.error("Client invoice lookup failed:", {
      code: invoicesError.code,
      message: invoicesError.message,
    });
  }

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
                status: invoice.status,
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
