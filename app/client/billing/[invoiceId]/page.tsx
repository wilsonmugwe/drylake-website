import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import ClientAccessState from "@/components/client/ClientAccessState";
import ClientInvoiceView from "@/components/client/ClientInvoiceView";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isGstRegistered, NO_GST_NOTE } from "@/lib/tax";

export const metadata = {
  title: "Invoice | Client Portal",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    invoiceId: string;
  }>;
};

export default async function ClientInvoicePage({
  params,
}: PageProps) {
  // ---------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------

  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/client/billing");
  }

  if (!orgId) {
    redirect("/client");
  }

  const { invoiceId } = await params;

  // ---------------------------------------------------------
  // Authenticated Supabase client
  //
  // Uses the Clerk token.
  // Supabase RLS remains the tenant security boundary.
  // ---------------------------------------------------------

  const supabase = createServerSupabaseClient();

  // ---------------------------------------------------------
  // Resolve active organisation
  // ---------------------------------------------------------

  const { data: organization, error: organizationError } =
    await supabase
      .from("organizations")
      .select("id, clerk_org_id, name, status")
      .eq("clerk_org_id", orgId)
      .eq("status", "ACTIVE")
      .maybeSingle();

  if (organizationError) {
    console.error("Invoice organisation lookup failed:", {
      code: organizationError.code,
      message: organizationError.message,
    });
  }

  if (organizationError || !organization) {
    return <ClientAccessState variant="invoice-unavailable" />;
  }

  // ---------------------------------------------------------
  // Load invoice
  //
  // IMPORTANT:
  // This uses the authenticated Supabase client.
  // RLS decides whether the current organisation can see it.
  // ---------------------------------------------------------

  const { data: invoice, error: invoiceError } =
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
      .eq("id", invoiceId)
      // Explicit org filter on top of RLS: a policy regression must not expose
      // another organisation's invoice by ID.
      .eq("organization_id", organization.id)
      .eq("visible_to_client", true)
      .neq("status", "DRAFT")
      .maybeSingle();

  if (invoiceError) {
    console.error("Client invoice lookup failed:", {
      code: invoiceError.code,
      message: invoiceError.message,
    });
  }

  // Do not reveal whether an invoice:
  // - does not exist
  // - belongs to another organisation
  // - is hidden
  // - is DRAFT
  if (invoiceError || !invoice) {
    return (
      <ClientAccessState
        variant="invoice-unavailable"
        organizationName={organization.name}
      />
    );
  }

  // ---------------------------------------------------------
  // Optional related project
  // ---------------------------------------------------------

  let project: {
    id: string;
    name: string;
  } | null = null;

  if (invoice.project_id) {
    const projectResult = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", invoice.project_id)
      .eq("organization_id", organization.id)
      .maybeSingle();

    if (projectResult.error) {
      console.error("Invoice project lookup failed:", {
        code: projectResult.error.code,
        message: projectResult.error.message,
      });
    }

    project = projectResult.data;
  }

  // ---------------------------------------------------------
  // Render
  //
  // Payability (OPEN / OVERDUE) is decided in the view for the
  // button only; the Stripe Checkout route enforces it again.
  // Tax display follows lib/tax.ts: no tax line unless registered.
  // ---------------------------------------------------------

  return (
    <ClientInvoiceView
      organizationName={organization.name}
      invoice={{
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        status: invoice.status,
        currency: invoice.currency,
        subtotalCents: Number(invoice.subtotal_cents),
        taxCents: Number(invoice.tax_cents),
        totalCents: Number(invoice.total_cents),
        dueDate: invoice.due_date,
        paidAt: invoice.paid_at,
        issuedAt: invoice.created_at,
      }}
      project={project}
      showTaxLine={isGstRegistered()}
      noGstNote={NO_GST_NOTE}
    />
  );
}
