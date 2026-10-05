import Link from "next/link";
import {
  ArrowRight,
  CreditCard,
  SearchX,
} from "lucide-react";

import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import {
  type AdminSearchParams,
  ilikePattern,
  readEnumParam,
  readFilterParam,
} from "@/lib/admin/filters";
import {
  ADMIN_LIST_LIMIT,
  findIdsByName,
  inClause,
  orFilter,
} from "@/lib/admin/search";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Payments are paid invoices (there is no payments table), so every row is already PAID.
// The useful split is how it was paid: through Stripe (has a payment intent) or recorded
// manually (no payment intent).
const PAYMENT_METHODS = ["STRIPE", "MANUAL"] as const;

type PaymentsPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

type PaidInvoiceRow = {
  id: string;
  organization_id: string;
  invoice_number: string;
  currency: string;
  total_cents: number;
  paid_at: string | null;
  stripe_payment_intent_id: string | null;
};

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

export default async function PaymentsPage({
  searchParams,
}: PaymentsPageProps) {
  const params = await searchParams;
  const q = readFilterParam(params, "q");
  const method = readEnumParam(params, "method", PAYMENT_METHODS);
  const hasFilters = Boolean(q || method);

  // Page-level gate: the layout check alone does not stop this page's service-role

  // queries from running on a direct RSC request (see lib/auth/guards.ts).

  await requirePlatformAdmin("/admin/payments");


  const supabase = createAdminSupabaseClient();

  // Totals for the stat cards cover every paid invoice, independent of the filters
  // and of the list cap below.
  const totalsPromise = supabase
    .from("invoices")
    .select("total_cents")
    .eq("status", "PAID");

  let query = supabase
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
      `,
      { count: "exact" }
    )
    .eq("status", "PAID")
    .order("paid_at", {
      ascending: false,
    })
    .limit(ADMIN_LIST_LIMIT);

  if (method === "STRIPE") {
    query = query.not("stripe_payment_intent_id", "is", null);
  } else if (method === "MANUAL") {
    query = query.is("stripe_payment_intent_id", null);
  }

  if (q) {
    const pattern = ilikePattern(q);
    const organizationIds = await findIdsByName(
      supabase,
      "organizations",
      pattern
    );

    query = query.or(
      orFilter([
        `invoice_number.ilike.${pattern}`,
        `stripe_payment_intent_id.ilike.${pattern}`,
        `stripe_checkout_session_id.ilike.${pattern}`,
        inClause("organization_id", organizationIds),
      ])
    );
  }

  const [{ data, error, count }, { data: totals }] = await Promise.all([
    query,
    totalsPromise,
  ]);

  const paidInvoices: PaidInvoiceRow[] = data ?? [];
  const totalMatches = count ?? paidInvoices.length;

  const allPaid: Array<{ total_cents: number }> = totals ?? [];

  const totalCollected = allPaid.reduce(
    (sum, invoice) => sum + invoice.total_cents,
    0
  );

  const organizationIds = [
    ...new Set(paidInvoices.map((invoice) => invoice.organization_id)),
  ];

  const { data: organizations } =
    organizationIds.length > 0
      ? await supabase
          .from("organizations")
          .select("id, name")
          .in("id", organizationIds)
      : { data: [] };

  const organizationNames = new Map<string, string>(
    (organizations ?? []).map(
      (organization: { id: string; name: string }) => [
        organization.id,
        organization.name,
      ]
    )
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
            value={allPaid.length}
            icon={<CreditCard size={17} />}
          />

          <AdminStatCard
            label="Collected"
            value={formatMoney(totalCollected, "AUD")}
            detail="Recorded paid invoice value"
            icon={<CreditCard size={17} />}
          />
        </section>

        <div className="mt-6">
          <AdminFilterBar
            searchPlaceholder="Search by client, invoice number or Stripe reference"
            searchLabel="Search payments"
            selects={[
              {
                param: "method",
                label: "Method",
                options: [
                  { value: "STRIPE", label: "Stripe" },
                  { value: "MANUAL", label: "Recorded manually" },
                ],
                allLabel: "All methods",
              },
            ]}
            resultCount={error ? undefined : totalMatches}
            resultNoun={totalMatches === 1 ? "payment" : "payments"}
          />
        </div>

        <section className="mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
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
                <div className="min-w-0">
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

                  <p className="mt-1 truncate text-xs text-neutral-500">
                    {organizationNames.get(invoice.organization_id) ??
                      "Client"}
                    {" · "}
                    {formatPaidAt(invoice.paid_at)}
                  </p>

                  {invoice.stripe_payment_intent_id ? (
                    <p className="mt-1 max-w-[220px] truncate font-mono text-[10px] text-neutral-400 sm:max-w-[300px]">
                      {invoice.stripe_payment_intent_id}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-4">
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
          ) : hasFilters ? (
            <div className="p-10 text-center">
              <SearchX className="mx-auto text-[#f26a2e]" />

              <h2 className="mt-4 font-semibold text-neutral-950">
                No payments match your filters
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                Try a different search term or{" "}
                <Link
                  href="/admin/payments"
                  className="font-semibold text-neutral-950 underline underline-offset-4"
                >
                  clear the filters
                </Link>
                .
              </p>
            </div>
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

          {!error && totalMatches > paidInvoices.length ? (
            <p className="border-t border-neutral-100 px-5 py-3 text-xs text-neutral-500">
              Showing the latest {paidInvoices.length} of {totalMatches}.
              Narrow the search to find older payments.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
