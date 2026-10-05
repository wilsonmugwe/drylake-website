import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  ChevronRight,
  Plus,
  SearchX,
  ShieldCheck,
  Users,
} from "lucide-react";

import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import {
  type AdminSearchParams,
  ilikePattern,
  readEnumParam,
  readFilterParam,
  toOptions,
} from "@/lib/admin/filters";
import { ADMIN_LIST_LIMIT } from "@/lib/admin/search";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Clients",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type ClientsPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

type OrganizationRow = {
  id: string;
  clerk_org_id: string;
  name: string;
  status: string;
  billing_contact_name: string | null;
  billing_email: string | null;
};

export default async function AdminClientsPage({
  searchParams,
}: ClientsPageProps) {
  // ---------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------

  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/admin/clients");
  }

  // ---------------------------------------------------------
  // Platform-admin authorization
  // ---------------------------------------------------------

  const platformAdmin = await isPlatformAdmin();

  if (!platformAdmin) {
    redirect("/client");
  }

  const supabase = createAdminSupabaseClient();

  // ---------------------------------------------------------
  // Status overview (unfiltered)
  //
  // Organisation status has no enum defined in this repo, so the
  // filter options are the statuses actually present. The same
  // rows give the summary counts, independent of the filters.
  // ---------------------------------------------------------

  const { data: statusRows, error: statusError } = await supabase
    .from("organizations")
    .select("status");

  const allStatuses: Array<{ status: string }> = statusRows ?? [];
  const totalCount = allStatuses.length;
  const activeCount = allStatuses.filter(
    (row) => row.status === "ACTIVE"
  ).length;
  const knownStatuses = [
    ...new Set(
      allStatuses
        .map((row) => row.status)
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.toUpperCase())
    ),
  ].sort();

  // ---------------------------------------------------------
  // Filters
  // ---------------------------------------------------------

  const params = await searchParams;
  const q = readFilterParam(params, "q");
  const status = readEnumParam(params, "status", knownStatuses);
  const hasFilters = Boolean(q || status);

  // ---------------------------------------------------------
  // Load organisations
  // ---------------------------------------------------------

  let query = supabase
    .from("organizations")
    .select(
      "id, clerk_org_id, name, status, billing_contact_name, billing_email, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .limit(ADMIN_LIST_LIMIT);

  if (status) {
    query = query.eq("status", status);
  } else {
    // Archived clients are hidden unless the status filter asks for them.
    query = query.neq("status", "ARCHIVED");
  }

  if (q) {
    const pattern = ilikePattern(q);

    query = query.or(
      [
        `name.ilike.${pattern}`,
        `billing_contact_name.ilike.${pattern}`,
        `billing_email.ilike.${pattern}`,
      ].join(",")
    );
  }

  const { data: organizations, error: listError, count } = await query;

  const error = listError ?? statusError;

  if (error) {
    console.error("Admin client list failed:", {
      code: error.code,
      message: error.message,
    });
  }

  const organizationList: OrganizationRow[] = organizations ?? [];
  const totalMatches = count ?? organizationList.length;

  return (
    <main className="min-h-screen p-5 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-[1450px]">
        <AdminPageHeader
          eyebrow="Client management"
          title="Clients"
          description="Manage the organisations connected to the Drylake client platform, their access and operational workspaces."
          action={
            <Link
              href="/admin/clients/new"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              <Plus size={16} aria-hidden="true" />
              Create Client
            </Link>
          }
        />

        {/* Summary */}

        {!error && (
          <section className="mt-7 grid gap-4 sm:grid-cols-3">
            <AdminStatCard
              label="Total"
              value={totalCount}
              detail="Client organisations"
              icon={<Building2 size={17} />}
            />

            <AdminStatCard
              label="Active"
              value={activeCount}
              detail="Active organisations"
              icon={<ShieldCheck size={17} />}
            />

            <AdminStatCard
              label="Access"
              value="Clerk"
              detail="Organisation identity provider"
              icon={<Users size={17} />}
            />
          </section>
        )}

        <div className="mt-6">
          <AdminFilterBar
            searchPlaceholder="Search by company, contact name or email"
            searchLabel="Search clients"
            selects={[
              {
                param: "status",
                label: "Status",
                options: toOptions(knownStatuses),
                allLabel: "All statuses",
              },
            ]}
            resultCount={error ? undefined : totalMatches}
            resultNoun={totalMatches === 1 ? "client" : "clients"}
          />
        </div>

        {error ? (
          <section className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-6 sm:p-7">
            <Building2
              size={20}
              strokeWidth={1.8}
              className="text-red-600"
            />

            <h2 className="mt-4 text-lg font-semibold text-neutral-950">
              Unable to load clients
            </h2>

            <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-600">
              The administration database connection could not retrieve
              organisations.
            </p>
          </section>
        ) : organizationList.length > 0 ? (
          <section className="mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-neutral-100 px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-950">
                  Client organisations
                </p>

                <p className="mt-1 text-xs text-neutral-500">
                  Select an organisation to manage its workspace
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
                {totalMatches}{" "}
                {totalMatches === 1 ? "organisation" : "organisations"}
              </span>
            </div>

            <div>
              {organizationList.map((organization) => {
                const isActive = organization.status === "ACTIVE";
                const contact = [
                  organization.billing_contact_name,
                  organization.billing_email,
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <Link
                    key={organization.id}
                    href={`/admin/clients/${organization.id}`}
                    className="group flex items-center justify-between gap-4 border-b border-neutral-100 px-5 py-4 transition last:border-0 hover:bg-neutral-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                        <Building2
                          size={17}
                          className="text-[#f26a2e]"
                        />

                        {isActive && (
                          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#f26a2e]" />
                        )}
                      </span>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-neutral-950 transition-colors group-hover:text-[#f26a2e]">
                          {organization.name}
                        </p>

                        {contact ? (
                          <p className="mt-1 truncate text-xs text-neutral-500">
                            {contact}
                          </p>
                        ) : null}

                        <p className="mt-1 truncate font-mono text-[10px] text-neutral-400">
                          {organization.clerk_org_id}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={
                          isActive
                            ? "rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-orange-700"
                            : "rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-600"
                        }
                      >
                        {organization.status}
                      </span>

                      <ChevronRight
                        size={15}
                        className="hidden text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-neutral-500 sm:block"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>

            {totalMatches > organizationList.length ? (
              <p className="border-t border-neutral-100 px-5 py-3 text-xs text-neutral-500">
                Showing the newest {organizationList.length} of{" "}
                {totalMatches}. Narrow the search to find older clients.
              </p>
            ) : null}
          </section>
        ) : hasFilters ? (
          <section className="mt-5 rounded-2xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
            <SearchX className="mx-auto text-[#f26a2e]" />

            <h2 className="mt-4 font-semibold text-neutral-950">
              No clients match your filters
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              Try a different search term or{" "}
              <Link
                href="/admin/clients"
                className="font-semibold text-neutral-950 underline underline-offset-4"
              >
                clear the filters
              </Link>
              .
            </p>
          </section>
        ) : (
          <section className="mt-5 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm sm:p-10">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f26a2e]/10">
              <Building2
                size={19}
                className="text-[#f26a2e]"
              />
            </span>

            <h2 className="mt-5 text-xl font-semibold tracking-[-0.02em] text-neutral-950">
              No client organisations
            </h2>

            <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-500">
              Client organisations created for the Drylake platform will
              appear here.
            </p>

            <Link
              href="/admin/clients/new"
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              <Plus size={15} aria-hidden="true" />
              Create your first client
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
