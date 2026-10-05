import Link from "next/link";
import {
  ArrowRight,
  FolderKanban,
  Plus,
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
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

export const dynamic = "force-dynamic";

// Values the project create route and the client portal use. Only these reach `.eq()`.
const PROJECT_STATUSES = [
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
] as const;

type ProjectsPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

type ProjectRow = {
  id: string;
  organization_id: string;
  name: string;
  status: string;
  progress_override: number | null;
};

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const params = await searchParams;
  const q = readFilterParam(params, "q");
  const status = readEnumParam(params, "status", PROJECT_STATUSES);
  const rawClient = readFilterParam(params, "client");

  // Page-level gate: the layout check alone does not stop this page's service-role

  // queries from running on a direct RSC request (see lib/auth/guards.ts).

  await requirePlatformAdmin("/admin/projects");


  const supabase = createAdminSupabaseClient();

  // Organisation list doubles as the client filter options and the row name lookup.
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name")
    .order("name", { ascending: true })
    .limit(500);

  const organizationList: Array<{ id: string; name: string }> =
    organizations ?? [];

  const organizationNames = new Map(
    organizationList.map((organization) => [
      organization.id,
      organization.name,
    ])
  );

  // A client id only filters if it is a real organisation we just loaded.
  const clientId =
    isUuid(rawClient) && organizationNames.has(rawClient) ? rawClient : "";

  const hasFilters = Boolean(q || status || clientId);

  let query = supabase
    .from("projects")
    .select(
      `
        id,
        organization_id,
        name,
        status,
        progress_override,
        start_date,
        target_end_date,
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

  if (clientId) {
    query = query.eq("organization_id", clientId);
  }

  if (q) {
    const pattern = ilikePattern(q);
    const matchingOrganizationIds = await findIdsByName(
      supabase,
      "organizations",
      pattern
    );

    query = query.or(
      orFilter([
        `name.ilike.${pattern}`,
        inClause("organization_id", matchingOrganizationIds),
      ])
    );
  }

  const { data, error, count } = await query;

  const projects: ProjectRow[] = data ?? [];
  const totalMatches = count ?? projects.length;

  return (
    <main className="min-h-screen p-5 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-[1450px]">
        <AdminPageHeader
          eyebrow="Workspace"
          title="Projects"
          description="All active and historical delivery work across Drylake clients."
          action={
            <Link
              href="/admin/projects/new"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              <Plus size={16} aria-hidden="true" />
              Create Project
            </Link>
          }
        />

        <div className="mt-7">
          <AdminFilterBar
            searchPlaceholder="Search by project or client name"
            searchLabel="Search projects"
            selects={[
              {
                param: "status",
                label: "Status",
                options: toOptions(PROJECT_STATUSES),
                allLabel: "All statuses",
              },
              {
                param: "client",
                label: "Client",
                options: organizationList.map((organization) => ({
                  value: organization.id,
                  label: organization.name,
                })),
                allLabel: "All clients",
              },
            ]}
            resultCount={error ? undefined : totalMatches}
            resultNoun={totalMatches === 1 ? "project" : "projects"}
          />
        </div>

        <section className="mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {error ? (
            <p className="p-6 text-sm text-red-600">
              Unable to load projects.
            </p>
          ) : projects.length > 0 ? (
            projects.map((project) => (
              <Link
                key={project.id}
                href={`/admin/projects/${project.id}`}
                className="flex items-center justify-between gap-4 border-b border-neutral-100 px-5 py-4 transition last:border-0 hover:bg-neutral-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                    <FolderKanban
                      size={17}
                      className="text-[#f26a2e]"
                    />
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-950">
                      {project.name}
                    </p>

                    <p className="mt-1 truncate text-xs text-neutral-500">
                      {organizationNames.get(
                        project.organization_id
                      ) ?? "Client"}
                      {" · "}
                      {project.status.replaceAll("_", " ")}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <span className="hidden text-xs text-neutral-400 sm:block">
                    {project.progress_override === null
                      ? "Auto"
                      : `${project.progress_override}%`}
                  </span>

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
                No projects match your filters
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                Try a different search term or{" "}
                <Link
                  href="/admin/projects"
                  className="font-semibold text-neutral-950 underline underline-offset-4"
                >
                  clear the filters
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="p-10 text-center">
              <FolderKanban className="mx-auto text-[#f26a2e]" />

              <h2 className="mt-4 font-semibold text-neutral-950">
                No projects yet
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                Use Create Project above, or start one from a
                client workspace. New projects will appear here.
              </p>
            </div>
          )}

          {!error && totalMatches > projects.length ? (
            <p className="border-t border-neutral-100 px-5 py-3 text-xs text-neutral-500">
              Showing the newest {projects.length} of {totalMatches}.
              Narrow the search to find older projects.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
