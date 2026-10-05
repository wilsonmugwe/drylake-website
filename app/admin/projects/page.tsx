import Link from "next/link";
import {
  ArrowRight,
  FolderKanban,
} from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
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
      `
    )
    .order("created_at", {
      ascending: false,
    });

  const projects = data ?? [];

  const organizationIds = [
    ...new Set(
      projects.map((project) => project.organization_id)
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
          eyebrow="Workspace"
          title="Projects"
          description="All active and historical delivery work across Drylake clients."
        />

        <section className="mt-7 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
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

                    <p className="mt-1 text-xs text-neutral-500">
                      {organizationNames.get(
                        project.organization_id
                      ) ?? "Client"}
                      {" · "}
                      {project.status.replaceAll("_", " ")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
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
          ) : (
            <div className="p-10 text-center">
              <FolderKanban className="mx-auto text-[#f26a2e]" />

              <h2 className="mt-4 font-semibold text-neutral-950">
                No projects yet
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                Projects created from client workspaces will
                appear here.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}