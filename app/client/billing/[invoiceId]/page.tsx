import {
  auth,
} from "@clerk/nextjs/server";

import {
  notFound,
  redirect,
} from "next/navigation";

import ClientAccessState from "@/components/client/ClientAccessState";
import ClientInvoiceView from "@/components/client/ClientInvoiceView";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  isGstRegistered,
  NO_GST_NOTE,
} from "@/lib/tax";

import { isUuid } from "@/lib/validation/uuid";

export const metadata = {
  title:
    "Invoice | Client Portal",

  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic =
  "force-dynamic";

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

  const {
    userId,
    orgId,
  } = await auth();

  if (!userId) {
    redirect(
      "/sign-in?redirect_url=/client/billing"
    );
  }

  if (!orgId) {
    redirect("/client");
  }

  const { invoiceId } =
    await params;

  if (!isUuid(invoiceId)) {
    notFound();
  }

  // ---------------------------------------------------------
  // Authenticated Supabase client
  //
  // Supabase RLS remains the tenant boundary.
  // ---------------------------------------------------------

  const supabase =
    createServerSupabaseClient();

  // ---------------------------------------------------------
  // Organisation
  // ---------------------------------------------------------

  const {
    data: organization,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .select(
      `
        id,
        clerk_org_id,
        name,
        status
      `
    )
    .eq("clerk_org_id", orgId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (organizationError) {
    console.error(
      "Invoice organisation lookup failed:",
      {
        code:
          organizationError.code,

        message:
          organizationError.message,
      }
    );
  }

  if (
    organizationError ||
    !organization
  ) {
    return (
      <ClientAccessState variant="invoice-unavailable" />
    );
  }

  // ---------------------------------------------------------
  // Invoice
  //
  // Explicit organisation constraint is used on top of RLS.
  // ---------------------------------------------------------

  const {
    data: invoice,
    error: invoiceError,
  } = await supabase
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
      `
    )
    .eq("id", invoiceId)
    .eq(
      "organization_id",
      organization.id
    )
    .eq(
      "visible_to_client",
      true
    )
    .neq("status", "DRAFT")
    .maybeSingle();

  if (invoiceError) {
    console.error(
      "Client invoice lookup failed:",
      {
        code:
          invoiceError.code,

        message:
          invoiceError.message,
      }
    );
  }

  // Do not disclose whether the invoice is:
  // - missing
  // - owned by another tenant
  // - hidden
  // - still a draft

  if (
    invoiceError ||
    !invoice
  ) {
    return (
      <ClientAccessState
        variant="invoice-unavailable"
        organizationName={
          organization.name
        }
      />
    );
  }

  // ---------------------------------------------------------
  // Optional project
  // ---------------------------------------------------------

  let project: {
    id: string;
    name: string;
  } | null = null;

  if (invoice.project_id) {
    const projectResult =
      await supabase
        .from("projects")
        .select("id, name")
        .eq(
          "id",
          invoice.project_id
        )
        .eq(
          "organization_id",
          organization.id
        )
        .maybeSingle();

    if (projectResult.error) {
      console.error(
        "Invoice project lookup failed:",
        {
          code:
            projectResult.error
              .code,

          message:
            projectResult.error
              .message,
        }
      );
    }

    project =
      projectResult.data;
  }

  // ---------------------------------------------------------
  // Render
  //
  // ClientInvoiceView decides whether to display Pay Invoice.
  //
  // The API independently enforces OPEN / OVERDUE, ownership,
  // amount and currency.
  // ---------------------------------------------------------

  return (
    <ClientInvoiceView
      organizationName={
        organization.name
      }
      invoice={{
        id:
          invoice.id,

        invoiceNumber:
          invoice.invoice_number,

        status:
          invoice.status,

        currency:
          invoice.currency,

        subtotalCents:
          Number(
            invoice.subtotal_cents
          ),

        taxCents:
          Number(
            invoice.tax_cents
          ),

        totalCents:
          Number(
            invoice.total_cents
          ),

        dueDate:
          invoice.due_date,

        paidAt:
          invoice.paid_at,

        issuedAt:
          invoice.created_at,
      }}
      project={project}
      showTaxLine={
        isGstRegistered()
      }
      noGstNote={
        NO_GST_NOTE
      }
    />
  );
}