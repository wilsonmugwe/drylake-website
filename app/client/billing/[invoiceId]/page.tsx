import {
  notFound,
  redirect,
} from "next/navigation";

import ClientAccessState from "@/components/client/ClientAccessState";
import ClientInvoiceView from "@/components/client/ClientInvoiceView";
import ClientWorkspaceGate from "@/components/client/ClientWorkspaceGate";

import {
  type ClientAccess,
  ClientAccessLookupError,
  getClientAccess,
} from "@/lib/auth/client-context";
import { DRYLAKE_BUSINESS } from "@/lib/business";
import { presentInvoiceTax } from "@/lib/invoices/gst";
import {
  clientInvoicePath,
  invoiceSignInPath,
} from "@/lib/invoices/invoice-url";
import { displayStatus } from "@/lib/invoices/lifecycle";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
  searchParams: Promise<{
    payment?: string | string[];
  }>;
};

/* Only the two values our own Checkout success/cancel URLs use are recognised. */
function readPaymentReturn(value: string | string[] | undefined) {
  return value === "success" || value === "cancelled" ? value : null;
}

export default async function ClientInvoicePage({
  params,
  searchParams,
}: PageProps) {
  const { invoiceId } =
    await params;

  // ---------------------------------------------------------
  // Authentication + workspace
  //
  // This is where the invoice email lands. The destination is
  // never dropped:
  //   - signed out: proxy.ts already sent the user to sign-in
  //     with this exact path; the fallback below does the same.
  //   - signed in with no active Clerk organisation (the normal
  //     state of a fresh sign-in): the shared resolver
  //     (lib/auth/client-context.ts) activates the user's single
  //     client workspace, or asks them to choose, and returns
  //     HERE, not to /client. Previously this page redirected to
  //     /client whenever orgId was empty, which is why "View and
  //     pay invoice" opened the dashboard (or the setup screen)
  //     instead of the invoice.
  // Membership is still the only route to an organisation:
  // nothing here matches on email.
  // ---------------------------------------------------------

  if (!isUuid(invoiceId)) {
    notFound();
  }

  const invoicePath =
    clientInvoicePath(invoiceId);

  let access: ClientAccess;

  try {
    access = await getClientAccess();
  } catch (error) {
    if (error instanceof ClientAccessLookupError) {
      return <ClientAccessState variant="lookup-failed" />;
    }

    throw error;
  }

  if (!access.signedIn) {
    redirect(invoiceSignInPath(invoiceId));
  }

  if (access.resolution.kind !== "ready") {
    return (
      <ClientWorkspaceGate
        resolution={access.resolution}
        returnTo={invoicePath}
      />
    );
  }

  const resolvedOrganization =
    access.resolution.organization;

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
    .eq("id", resolvedOrganization.id)
    .eq(
      "clerk_org_id",
      resolvedOrganization.clerk_org_id as string
    )
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
  // amount and currency. ?payment=success never implies PAID:
  // the status shown always comes from the row above, which only
  // the Stripe webhook moves to PAID.
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

        displayStatus:
          displayStatus(invoice),

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
      tax={presentInvoiceTax({
        status: invoice.status,
        subtotalCents: Number(
          invoice.subtotal_cents
        ),
        taxCents: Number(
          invoice.tax_cents
        ),
      })}
      business={DRYLAKE_BUSINESS}
      paymentReturn={readPaymentReturn(
        (await searchParams).payment
      )}
    />
  );
}