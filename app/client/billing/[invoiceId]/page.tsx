import {
  notFound,
  redirect,
} from "next/navigation";

import ClientAccessState from "@/components/client/ClientAccessState";
import ClientInvoiceView from "@/components/client/ClientInvoiceView";
import ClientWorkspaceGate from "@/components/client/ClientWorkspaceGate";
import { signInUrl } from "@/lib/auth/guards";
import { getClientWorkspace } from "@/lib/auth/client-context";
import { DRYLAKE_BUSINESS } from "@/lib/business";
import { presentInvoiceTax } from "@/lib/invoices/gst";
import {
  clientInvoicePath,
  invoiceSignInPath,
} from "@/lib/invoices/invoice-url";
import { displayStatus } from "@/lib/invoices/lifecycle";
import {
  logRouteTiming,
  startRequestTiming,
  timed,
} from "@/lib/perf/request-timing";

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
  startRequestTiming();

  const { invoiceId } =
    await params;

  // Return here after sign-in or workspace activation (never a foreign URL).
  // Same builder as the invoice email, so the destination is never dropped.
  const returnTo = isUuid(invoiceId)
    ? clientInvoicePath(invoiceId)
    : "/client/billing";

  // ---------------------------------------------------------
  // The ONE authoritative workspace resolution (same as /client).
  // Organisation comes from Clerk membership, never from the URL
  // or from email.
  // ---------------------------------------------------------

  const workspace =
    await getClientWorkspace();

  if (workspace.state === "signed-out") {
    redirect(
      isUuid(invoiceId)
        ? invoiceSignInPath(invoiceId)
        : signInUrl(returnTo)
    );
  }

  if (workspace.state !== "ready") {
    logRouteTiming(
      "/client/billing/[invoiceId]",
      workspace.state
    );

    return (
      <ClientWorkspaceGate
        workspace={workspace}
        returnTo={returnTo}
      />
    );
  }

  if (!isUuid(invoiceId)) {
    notFound();
  }

  // RLS-scoped client that verified this organisation with the user's token.
  const {
    supabase,
    organization,
  } = workspace;

  // ---------------------------------------------------------
  // Invoice
  //
  // Explicit organisation constraint is used on top of RLS.
  // ---------------------------------------------------------

  const {
    data: invoice,
    error: invoiceError,
  } = await timed("content", () =>
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
    .maybeSingle()
  );

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
    // A second round trip only when the invoice names a project (its ID is not known before).
    const projectResult =
      await timed("content", () =>
        supabase
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
        .maybeSingle()
      );

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

  logRouteTiming(
    "/client/billing/[invoiceId]",
    workspace.state
  );

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