import Link from "next/link";
import {
  ArrowRight,
  Receipt,
} from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export default async function InvoicesPage() {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("invoices")
    .select(
      `
        id,
        organization_id,
        invoice_number,
        status,
        currency,
        total_cents,
        due_date,
        paid_at,
        created_at
      `
    )
    .order("created_at", {
      ascending: false,
    });

  const invoices = data ?? [];

  const organizationIds = [
    ...new Set(
      invoices.map((invoice) => invoice.organization_id)
    ),
  ];

  const { data: organizations } =
    organizationIds.length > 0
      ? await supabase
          .from("organizations")
          .select("id, name")
          .in("id", organizationIds)
      : { data: [] };

  const organizationNames = new Map(
    (organizations ?? []).map((organization) => [
      organization.id,
      organization.name,
    ])
  );

  return (
    <main className="min-h-screen p-5 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-[1450px]">
        <AdminPageHeader
          eyebrow="Finance"
          title="Invoices"
          description="Track drafts, issued invoices, overdue balances and paid invoices across every client."
        />

        <section className="mt-7 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {error ? (
            <p className="p-6 text-sm text-red-600">
              Unable to load invoices.
            </p>
          ) : invoices.length > 0 ? (
            invoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/admin/invoices/${invoice.id}`}
                className="grid gap-3 border-b border-neutral-100 px-5 py-4 transition last:border-0 hover:bg-neutral-50 sm:grid-cols-[1.2fr_1fr_0.7fr_auto] sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                    <Receipt
                      size={17}
                      className="text-[#f26a2e]"
                    />
                  </span>

                  <div>
                    <p className="text-sm font-semibold text-neutral-950">
                      {invoice.invoice_number}
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      {organizationNames.get(
                        invoice.organization_id
                      ) ?? "Client"}
                    </p>
                  </div>
                </div>

                <p className="text-sm font-medium text-neutral-800">
                  {formatMoney(
                    invoice.total_cents,
                    invoice.currency
                  )}
                </p>

                <span
                  className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                    invoice.status === "PAID"
                      ? "bg-emerald-50 text-emerald-700"
                      : invoice.status === "OVERDUE"
                        ? "bg-red-50 text-red-700"
                        : invoice.status === "OPEN"
                          ? "bg-orange-50 text-orange-700"
                          : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {invoice.status}
                </span>

                <ArrowRight
                  size={15}
                  className="text-neutral-300"
                />
              </Link>
            ))
          ) : (
            <div className="p-10 text-center">
              <Receipt className="mx-auto text-[#f26a2e]" />

              <h2 className="mt-4 font-semibold text-neutral-950">
                No invoices yet
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                Client invoices will appear here.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}