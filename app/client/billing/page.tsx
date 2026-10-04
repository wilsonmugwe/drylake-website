import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  ShieldCheck,
} from "lucide-react";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Billing | Drylake Client Portal",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

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
  }).format(new Date(`${date}T00:00:00Z`));
}

function getStatusClasses(status: string) {
  switch (status) {
    case "PAID":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";

    case "OVERDUE":
      return "border-red-500/20 bg-red-500/10 text-red-300";

    case "VOID":
      return "border-white/10 bg-white/[0.03] text-white/30";

    case "OPEN":
    default:
      return "border-[#f26a2e]/20 bg-[#f26a2e]/10 text-[#f26a2e]";
  }
}

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
    return (
      <main className="min-h-screen bg-[#080808] text-white">
        <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-12">
          <header className="border-b border-white/10 pb-6">
            <Link
              href="/"
              className="text-sm font-medium tracking-[0.16em] text-white"
            >
              DRYLAKE
            </Link>
          </header>

          <section className="py-20 sm:py-28">
            <Building2 size={26} className="text-[#f26a2e]" />

            <h1 className="mt-8 text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
              Billing access unavailable
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-7 text-white/45">
              We could not find an active Drylake client organisation
              associated with your current organisation.
            </p>

            <Link
              href="/client"
              className="mt-8 inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white"
            >
              <ArrowLeft size={15} />
              Return to dashboard
            </Link>
          </section>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------
  // Load invoices
  //
  // The explicit organization_id filter keeps the query
  // scoped and clear, but it is NOT our security boundary.
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
      .order("created_at", { ascending: false });

  if (invoicesError) {
    console.error("Client invoice lookup failed:", {
      code: invoicesError.code,
      message: invoicesError.message,
    });
  }

  const invoiceList = invoices ?? [];

  const outstandingInvoices = invoiceList.filter(
    (invoice) =>
      invoice.status === "OPEN" ||
      invoice.status === "OVERDUE"
  );

  const outstandingTotal = outstandingInvoices.reduce(
    (total, invoice) => total + Number(invoice.total_cents),
    0
  );

  const defaultCurrency =
    invoiceList.length > 0 ? invoiceList[0].currency : "AUD";

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
        {/* Header */}

        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <Link
            href="/"
            className="text-sm font-medium tracking-[0.16em] text-white"
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

        {/* Back navigation */}

        <div className="pt-8">
          <Link
            href="/client"
            className="inline-flex items-center gap-2 text-sm text-white/40 transition hover:text-white"
          >
            <ArrowLeft size={15} />
            Dashboard
          </Link>
        </div>

        {/* Heading */}

        <section className="py-10 sm:py-14">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#f26a2e]">
            Billing
          </p>

          <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
            Invoices
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-6 text-white/45">
            View invoices and billing information for {organization.name}.
          </p>
        </section>

        {/* Summary cards */}

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6">
            <FileText size={20} className="text-[#f26a2e]" />

            <p className="mt-5 text-3xl font-medium">
              {invoiceList.length}
            </p>

            <p className="mt-1 text-sm text-white/40">
              {invoiceList.length === 1 ? "Invoice" : "Invoices"}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6">
            <CreditCard size={20} className="text-[#f26a2e]" />

            <p className="mt-5 text-3xl font-medium">
              {outstandingInvoices.length}
            </p>

            <p className="mt-1 text-sm text-white/40">
              Outstanding
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6">
            <CalendarDays size={20} className="text-[#f26a2e]" />

            <p className="mt-5 text-2xl font-medium">
              {formatMoney(outstandingTotal, defaultCurrency)}
            </p>

            <p className="mt-1 text-sm text-white/40">
              Outstanding balance
            </p>
          </div>
        </section>

        {/* Invoice list */}

        <section className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025]">
          <div className="border-b border-white/10 px-6 py-5 sm:px-8">
            <h2 className="font-medium">Invoices</h2>

            <p className="mt-1 text-xs text-white/35">
              Billing records available to your organisation
            </p>
          </div>

          {invoicesError ? (
            <div className="px-6 py-8 sm:px-8">
              <p className="text-sm text-red-400">
                Unable to load invoices.
              </p>
            </div>
          ) : invoiceList.length > 0 ? (
            <div>
              {invoiceList.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/client/billing/${invoice.id}`}
                  className="group block border-b border-white/10 px-6 py-6 transition-colors last:border-b-0 hover:bg-white/[0.025] sm:px-8"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-medium text-white">
                          {invoice.invoice_number}
                        </h3>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.1em] ${getStatusClasses(
                            invoice.status
                          )}`}
                        >
                          {invoice.status}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/35">
                        <span>
                          Issued{" "}
                          {formatDate(
                            invoice.created_at.slice(0, 10)
                          )}
                        </span>

                        <span>
                          Due {formatDate(invoice.due_date)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-8 sm:justify-end">
                      <div className="text-left sm:text-right">
                        <p className="text-lg font-medium">
                          {formatMoney(
                            Number(invoice.total_cents),
                            invoice.currency
                          )}
                        </p>

                        <p className="mt-1 text-xs text-white/30">
                          Total
                        </p>
                      </div>

                      <ArrowRight
                        size={18}
                        className="shrink-0 text-white/25 transition group-hover:translate-x-1 group-hover:text-white"
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-6 py-10 sm:px-8">
              <FileText size={22} className="text-[#f26a2e]" />

              <h2 className="mt-5 text-lg font-medium">
                No invoices
              </h2>

              <p className="mt-2 max-w-lg text-sm leading-6 text-white/40">
                Client-visible invoices for your organisation will appear
                here.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}