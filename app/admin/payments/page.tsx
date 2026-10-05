import Link from "next/link";
import {
  ArrowRight,
  CreditCard,
} from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function formatPaidAt(value: string | null) {
  if (!value) {
    return "Paid";
  }

  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function PaymentsPage() {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("invoices")
    .select(
      `
        id,
        organization_id,
        invoice_number,
        currency,
        total_cents,
        paid_at,
        stripe_checkout_session_id,
        stripe_payment_intent_id
      `
    )
    .eq("status", "PAID")
    .order("paid_at", {
      ascending: false,
    });

  const paidInvoices = data ?? [];

  const totalCollected = paidInvoices.reduce(
    (sum, invoice) => sum + invoice.total_cents,
    0
  );

  return (
    <main className="min-h-screen p-5 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-[1450px]">
        <AdminPageHeader
          eyebrow="Finance"
          title="Payments"
          description="Confirmed invoice payments recorded by the Drylake billing workflow."
        />

        <section className="mt-7 grid gap-4 sm:grid-cols-2">
          <AdminStatCard
            label="Paid invoices"
            value={paidInvoices.length}
            icon={<CreditCard size={17} />}
          />

          <AdminStatCard
            label="Collected"
            value={formatMoney(totalCollected, "AUD")}
            detail="Recorded paid invoice value"
            icon={<CreditCard size={17} />}
          />
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {error ? (
            <p className="p-6 text-sm text-red-600">
              Unable to load payments.
            </p>
          ) : paidInvoices.length > 0 ? (
            paidInvoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/admin/invoices/${invoice.id}`}
                className="flex items-center justify-between gap-4 border-b border-neutral-100 px-5 py-4 transition last:border-0 hover:bg-neutral-50"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-neutral-950">
                      {invoice.invoice_number}
                    </p>

                    {invoice.stripe_payment_intent_id ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-700">
                        Stripe
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 text-xs text-neutral-500">
                    {formatPaidAt(invoice.paid_at)}
                  </p>

                  {invoice.stripe_payment_intent_id ? (
                    <p className="mt-1 max-w-[300px] truncate font-mono text-[10px] text-neutral-400">
                      {invoice.stripe_payment_intent_id}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-4">
                  <p className="text-sm font-semibold text-neutral-950">
                    {formatMoney(
                      invoice.total_cents,
                      invoice.currency
                    )}
                  </p>

                  <ArrowRight
                    size={15}
                    className="text-neutral-300"
                  />
                </div>
              </Link>
            ))
          ) : (
            <div className="p-10 text-center">
              <CreditCard className="mx-auto text-[#f26a2e]" />

              <h2 className="mt-4 font-semibold text-neutral-950">
                No payments yet
              </h2>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-neutral-500">
                Successful invoice payments will appear here
                after the payment webhook marks an invoice as
                paid.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}