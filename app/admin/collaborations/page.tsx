import Link from "next/link";
import { ArrowRight, Handshake } from "lucide-react";

import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { ilikePattern, readFilterParam, type AdminSearchParams } from "@/lib/admin/filters";
import { ADMIN_LIST_LIMIT } from "@/lib/admin/search";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { PROJECT_FILTER_OPTIONS, PROJECT_LABELS } from "@/lib/collaboration/admin-labels";
import {
  CATEGORY_LABELS,
  PROPOSAL_STATUSES,
  PROPOSAL_STATUS_VALUES,
  STATUS_LABELS,
} from "@/lib/collaboration/catalog";
import { STATUS_BADGE } from "@/lib/collaboration/status-style";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Collaborations" };

type Row = {
  id: string;
  created_at: string;
  name: string;
  organisation: string;
  email: string;
  category: string;
  project: string;
  status: string;
};

const createdFormat = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Perth", day: "numeric", month: "short", year: "numeric" });

/* Filter values come from the URL: accept only a known status or project, else no filter. */
function readOption(params: AdminSearchParams, key: string, allowed: readonly string[]): string {
  const value = readFilterParam(params, key).toLowerCase();
  return allowed.includes(value) ? value : "";
}

/*
 * Collaboration proposals from /collaborate, newest first. Filters (status, project) and search
 * are URL parameters applied in the database. Internal notes are not selected here: they are
 * loaded only on the detail page.
 */
export default async function AdminCollaborationsPage({ searchParams }: { searchParams: Promise<AdminSearchParams> }) {
  await requirePlatformAdmin("/admin/collaborations");

  const params = await searchParams;
  const status = readOption(params, "status", PROPOSAL_STATUS_VALUES);
  const project = readOption(params, "project", PROJECT_FILTER_OPTIONS.map((o) => o.value));
  const q = readFilterParam(params, "q");

  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from("collaboration_proposals")
    .select("id, created_at, name, organisation, email, category, project, status", { count: "exact" });

  if (status) query = query.eq("status", status);
  if (project) query = query.eq("project", project);
  if (q) {
    const pattern = ilikePattern(q);
    query = query.or(`name.ilike.${pattern},organisation.ilike.${pattern},email.ilike.${pattern}`);
  }

  const { data, count, error } = await query.order("created_at", { ascending: false }).limit(ADMIN_LIST_LIMIT);
  if (error) console.error("Admin collaborations list failed:", { code: error.code, message: error.message });
  const rows = (data ?? []) as Row[];

  return (
    <main className="min-h-screen p-5 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-[1450px]">
        <AdminPageHeader
          eyebrow="Drylake Administration"
          title="Collaborations"
          description="Proposals sent through drylake.com.au/collaborate. These are enquiries, not partnerships; nothing here gives the sender access to Drylake Workspace."
        />

        <div className="mt-7">
          <AdminFilterBar
            searchPlaceholder="Search name, organisation or email"
            selects={[
              { param: "status", label: "Status", options: PROPOSAL_STATUSES.map((s) => ({ value: s.value, label: s.label })), allLabel: "All statuses" },
              { param: "project", label: "Project", options: PROJECT_FILTER_OPTIONS, allLabel: "All projects" },
            ]}
            resultCount={count ?? rows.length}
            resultNoun="proposals"
          />
        </div>

        {error ? (
          <p role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            Proposals could not be loaded. If this is the first deploy, check that the collaboration migration has been applied.
          </p>
        ) : rows.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-neutral-200 bg-white px-5 py-12 text-center shadow-sm">
            <Handshake aria-hidden="true" size={22} className="mx-auto text-[#f26a2e]" />
            <p className="mt-3 text-sm font-medium text-neutral-800">No proposals match these filters</p>
          </div>
        ) : (
          <>
            <div className="mt-6 hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm md:block">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Collaboration proposals</caption>
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-[0.08em] text-neutral-600">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Received</th>
                    <th scope="col" className="px-5 py-3 font-semibold">From</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Category</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Project</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-5 py-3"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                      <td className="px-5 py-4 text-xs text-neutral-600">{createdFormat.format(new Date(row.created_at))}</td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-neutral-950">{row.name}</p>
                        <p className="mt-0.5 text-xs text-neutral-600">{row.organisation}</p>
                      </td>
                      <td className="px-5 py-4 text-neutral-700">{CATEGORY_LABELS[row.category] ?? row.category}</td>
                      <td className="px-5 py-4 text-neutral-700">{PROJECT_LABELS[row.project] ?? row.project}</td>
                      <td className="px-5 py-4"><StatusBadge status={row.status} /></td>
                      <td className="px-5 py-4 text-right">
                        <Link href={`/admin/collaborations/${row.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-neutral-950">
                          View <span className="sr-only">{row.name}&apos;s proposal</span>
                          <ArrowRight aria-hidden="true" size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="mt-6 grid gap-3 md:hidden">
              {rows.map((row) => (
                <li key={row.id}>
                  <Link href={`/admin/collaborations/${row.id}`} className="block rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-neutral-950">{row.name}</p>
                        <p className="mt-0.5 truncate text-xs text-neutral-600">{row.organisation}</p>
                      </div>
                      <StatusBadge status={row.status} />
                    </div>
                    <p className="mt-3 text-sm text-neutral-800">{CATEGORY_LABELS[row.category] ?? row.category}</p>
                    <p className="text-xs text-neutral-600">
                      {PROJECT_LABELS[row.project] ?? row.project} · {createdFormat.format(new Date(row.created_at))}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_BADGE[status] ?? STATUS_BADGE.new}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
