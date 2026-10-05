import Link from "next/link";
import {
  ArrowRight,
  Receipt,
  SearchX,
} from "lucide-react";

import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  type AdminSearchParams,
  ilikePattern,
  readEnumParam,
  readFilterParam,
  toOptions,
} from "@/lib/admin/filters";
import {
  ADMIN_LIST_LIMIT,
  findIdsByName,
  inClause,
  orFilter,
} from "@/lib/admin/search";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Statuses written by the invoice create, issue, checkout and Stripe webhook routes.
const INVOICE_STATUSES = ["DRAFT", "OPEN", "OVERDUE", "PAID"] as const;

type InvoicesPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

type InvoiceRow = {
  id: string;
  organization_id: string;
  project_id: string | null;
  invoice_number: string;
  status: string;
  currency: string;
  total_cents: number;
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export default async function InvoicesPage({
  searchParams,
}: InvoicesPageProps) {
  const params = await searchParams;
  const q = readFilterParam(params, "q");
  const status = readEnumParam(params, "status", INVOICE_STATUSES);
  const hasFilters = Boolean(q || status);

  const supabase = createAdminSupabaseClient();

  let query = supabase
    .from("invoices")
    .select(
      `
        id,
        organization_id,
        project_id,
        invoice_number,
        status,
        currency,
        total_cents,
        due_date,
        paid_at,
        created_at
      `,
      { count: "exact" }
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(ADMIN_LIST_LIMIT);

  if (status) {
    query = query.eq("status", status);
  }

  if (q) {
    const pattern = ilikePattern(q);
    const [organizationIds, projectIds] = await Promise.all([
      findIdsByName(supabase, "organizations", pattern),
      findIdsByName(supabase, "projects", pattern),
    ]);

    query = query.or(
      orFilter([
        `invoice_number.ilike.${pattern}`,
        inClause("organization_id", organizationIds),
        inClause("project_id", projectIds),
      ])
    );
  }

  const { data, error, count } = await query;

  const invoices: InvoiceRow[] = data ?? [];
  const totalMatches = count ?? invoices.length;

  const organizationIds = [
    ...new Set(
      invoices.map((invoice) => invoice.organization_id)
    ),
  ];

  const projectIds = [
    ...new Set(
      invoices
        .map((invoice) => invoice.project_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const [{ data: organizations }, { data: projects }] = await Promise.all([
    organizationIds.length > 0
      ? supabase
          .from("organizations")
          .select("id, name")
          .in("id", organizationIds)
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? supabase
          .from("projects")
          .select("id, name")
          .in("id", projectIds)
      : Promise.resolve({ data: [] }),
  ]);

  const organizationNames = new Map<string, string>(
    (organizations ?? []).map(
      (organization: { id: string; name: string }) => [
        organization.id,
        organization.name,
      ]
    )
  );

  const projectNames = new Map<string, string>(
    (projects ?? []).map((project: { id: string; name: string }) => [
      project.id,
      project.name,
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

        <div className="mt-7">
          <AdminFilterBar
            searchPlaceholder="Search by invoice number, client or project"
            searchLabel="Search invoices"
            selects={[
              {
                param: "status",
                label: "Status",
                options: toOptions(INVOICE_STATUSES),
                allLabel: "All statuses",
              },
            ]}
            resultCount={error ? undefined : totalMatches}
            resultNoun={totalMatches === 1 ? "invoice" : "invoices"}
          />
        </div>

        <section className="mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {error ? (
            <p className="p-6 text-sm text-red-600">
              Unable to load invoices.
            </p>
          ) : invoices.length > 0 ? (
            invoices.map((invoice) => {
              const projectName = invoice.project_id
                ? projectNames.get(invoice.project_id)
                : undefined;

              return (
                <Link
                  key={invoice.id}
                  href={`/admin/invoices/${invoice.id}`}
                  className="grid gap-3 border-b border-neutral-100 px-5 py-4 transition last:border-0 hover:bg-neutral-50 sm:grid-cols-[1.2fr_1fr_0.7fr_auto] sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                      <Receipt
                        size={17}
                        className="text-[#f26a2e]"
                      />
                    </span>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-950">
                        {invoice.invoice_number}
                      </p>

                      <p className="mt-1 truncate text-xs text-neutral-500">
                        {organizationNames.get(
                          invoice.organization_id
                        ) ?? "Client"}
                        {projectName ? ` · ${projectName}` : ""}
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
                    className="hidden text-neutral-300 sm:block"
                  />
                </Link>
              );
            })
          ) : hasFilters ? (
            <div className="p-10 text-center">
              <SearchX className="mx-auto text-[#f26a2e]" />

              <h2 className="mt-4 font-semibold text-neutral-950">
                No invoices match your filters
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                Try a different search term or{" "}
                <Link
                  href="/admin/invoices"
                  className="font-semibold text-neutral-950 underline underline-offset-4"
                >
                  clear the filters
                </Link>
                .
              </p>
            </div>
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

          {!error && totalMatches > invoices.length ? (
            <p className="border-t border-neutral-100 px-5 py-3 text-xs text-neutral-500">
              Showing the newest {invoices.length} of {totalMatches}.
              Narrow the search to find older invoices.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
