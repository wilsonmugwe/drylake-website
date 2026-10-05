import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PayInvoiceButton from "@/components/billing/PayInvoiceButton";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isGstRegistered, NO_GST_NOTE } from "@/lib/tax";

export const metadata = {
  title: "Invoice | Drylake Client Portal",
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

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function formatDate(date: string | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date.slice(0, 10)}T00:00:00Z`));
}

function getStatusClasses(status: string) {
  switch (status) {
    case "PAID":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";

    case "OVERDUE":
      return "border-red-500/20 bg-red-500/10 text-red-300";

    case "VOID":
      return "border-white/10 bg-white/[0.03] text-white/35";

    case "OPEN":
    default:
      return "border-[#f26a2e]/20 bg-[#f26a2e]/10 text-[#f26a2e]";
  }
}

function InvoiceUnavailable() {
  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <Link
            href="/"
            className="text-sm font-medium tracking-[0.16em]"
          >
            DRYLAKE
          </Link>

          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-[#f26a2e]" />

            <span className="text-xs uppercase tracking-[0.16em] text-white/35">
              Client Portal
            </span>
          </div>
        </header>

        <section className="py-20 sm:py-28">
          <FileText size={26} className="text-[#f26a2e]" />

          <p className="mt-8 text-xs font-medium uppercase tracking-[0.2em] text-[#f26a2e]">
            Billing
          </p>

          <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
            Invoice unavailable
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-7 text-white/45">
            This invoice is not available to your organisation.
          </p>

          <Link
            href="/client/billing"
            className="mt-8 inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white"
          >
            <ArrowLeft size={15} />
            Return to billing
          </Link>
        </section>
      </div>
    </main>
  );
}

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
    return <InvoiceUnavailable />;
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
    return <InvoiceUnavailable />;
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
  // Invoice amounts
  // ---------------------------------------------------------

  const subtotal = Number(invoice.subtotal_cents);
  const tax = Number(invoice.tax_cents);
  const total = Number(invoice.total_cents);

  const formattedTotal = formatMoney(
    total,
    invoice.currency
  );

  // Only OPEN and OVERDUE invoices can initiate payment.
  //
  // This UI rule is also independently enforced by the
  // Stripe Checkout API route.
  const isPayable =
    invoice.status === "OPEN" ||
    invoice.status === "OVERDUE";

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-12">
        {/* Header */}

        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <Link
            href="/"
            className="text-sm font-medium tracking-[0.16em]"
          >
            DRYLAKE
          </Link>

          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-[#f26a2e]" />

            <span className="text-xs uppercase tracking-[0.16em] text-white/35">
              Client Portal
            </span>
          </div>
        </header>

        {/* Back */}

        <div className="pt-8">
          <Link
            href="/client/billing"
            className="inline-flex items-center gap-2 text-sm text-white/40 transition hover:text-white"
          >
            <ArrowLeft size={15} />
            Billing
          </Link>
        </div>

        {/* Invoice heading */}

        <section className="py-10 sm:py-14">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#f26a2e]">
                Invoice
              </p>

              <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
                {invoice.invoice_number}
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full border px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.12em] ${getStatusClasses(
                    invoice.status
                  )}`}
                >
                  {invoice.status}
                </span>

                <span className="text-sm text-white/35">
                  {organization.name}
                </span>
              </div>
            </div>

            {/* Total + Stripe payment */}

            <div className="sm:text-right">
              <p className="text-xs uppercase tracking-[0.14em] text-white/30">
                Total
              </p>

              <p className="mt-2 text-3xl font-medium tracking-[-0.03em]">
                {formattedTotal}
              </p>

              {isPayable && (
                <div className="mt-6 flex sm:justify-end">
                  <PayInvoiceButton
                    invoiceId={invoice.id}
                    amount={formattedTotal}
                  />
                </div>
              )}

              {invoice.status === "PAID" && (
                <div className="mt-5 flex items-center gap-2 text-sm text-emerald-300 sm:justify-end">
                  <CheckCircle2 size={16} />
                  Payment received
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Invoice information */}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6">
            <CalendarDays
              size={20}
              className="text-[#f26a2e]"
            />

            <p className="mt-5 text-xs uppercase tracking-[0.12em] text-white/30">
              Issued
            </p>

            <p className="mt-2 font-medium">
              {formatDate(invoice.created_at)}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6">
            <CalendarDays
              size={20}
              className="text-[#f26a2e]"
            />

            <p className="mt-5 text-xs uppercase tracking-[0.12em] text-white/30">
              Due
            </p>

            <p className="mt-2 font-medium">
              {formatDate(invoice.due_date)}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6">
            {invoice.status === "PAID" ? (
              <CheckCircle2
                size={20}
                className="text-emerald-300"
              />
            ) : (
              <ReceiptText
                size={20}
                className="text-[#f26a2e]"
              />
            )}

            <p className="mt-5 text-xs uppercase tracking-[0.12em] text-white/30">
              Payment
            </p>

            <p className="mt-2 font-medium">
              {invoice.status === "PAID"
                ? `Paid ${formatDate(invoice.paid_at)}`
                : invoice.status.replaceAll("_", " ")}
            </p>
          </div>
        </section>

        {/* Billing breakdown */}

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025]">
          <div className="border-b border-white/10 px-6 py-5 sm:px-8">
            <h2 className="font-medium">
              Billing summary
            </h2>

            <p className="mt-1 text-xs text-white/35">
              Invoice totals recorded by Drylake
            </p>
          </div>

          <div className="px-6 py-2 sm:px-8">
            <div className="flex items-center justify-between border-b border-white/10 py-5">
              <span className="text-sm text-white/45">
                Subtotal
              </span>

              <span className="text-sm font-medium">
                {formatMoney(subtotal, invoice.currency)}
              </span>
            </div>

            {isGstRegistered() ? (
<div className="flex items-center justify-between border-b border-white/10 py-5">
              <span className="text-sm text-white/45">
                Tax
              </span>

              <span className="text-sm font-medium">
                {formatMoney(tax, invoice.currency)}
              </span>
            </div>
) : (
<p className="text-xs opacity-60">{NO_GST_NOTE}</p>
)}

            <div className="flex items-center justify-between py-6">
              <span className="font-medium">
                Total
              </span>

              <span className="text-xl font-medium">
                {formattedTotal}
              </span>
            </div>
          </div>
        </section>

        {/* Payment section */}

        {isPayable && (
          <section className="mt-8 rounded-[2rem] border border-[#f26a2e]/20 bg-[#f26a2e]/[0.04] p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ReceiptText
                    size={18}
                    className="text-[#f26a2e]"
                  />

                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#f26a2e]">
                    Payment
                  </p>
                </div>

                <h2 className="mt-4 text-xl font-medium">
                  Pay this invoice
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-white/40">
                  Continue to our secure payment provider to pay{" "}
                  {formattedTotal}.
                </p>
              </div>

              <div className="shrink-0">
                <PayInvoiceButton
                  invoiceId={invoice.id}
                  amount={formattedTotal}
                />
              </div>
            </div>
          </section>
        )}

        {/* Paid confirmation */}

        {invoice.status === "PAID" && (
          <section className="mt-8 rounded-[2rem] border border-emerald-500/20 bg-emerald-500/[0.04] p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <CheckCircle2
                size={22}
                className="mt-0.5 shrink-0 text-emerald-300"
              />

              <div>
                <h2 className="font-medium text-emerald-200">
                  Payment received
                </h2>

                <p className="mt-2 text-sm leading-6 text-white/40">
                  This invoice was paid
                  {invoice.paid_at
                    ? ` on ${formatDate(invoice.paid_at)}`
                    : ""}
                  .
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Related project */}

        {project && (
          <section className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <Building2
                size={20}
                className="mt-0.5 shrink-0 text-[#f26a2e]"
              />

              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-white/30">
                  Related project
                </p>

                <Link
                  href={`/client/projects/${project.id}`}
                  className="mt-2 inline-block font-medium transition hover:text-[#f26a2e]"
                >
                  {project.name}
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}

        <div className="py-10">
          <p className="max-w-2xl text-xs leading-6 text-white/25">
            Payments are processed securely through Stripe. Drylake does
            not collect or store your card details on this page.
          </p>
        </div>
      </div>
    </main>
  );
}