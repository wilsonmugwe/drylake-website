import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  FileText,
  FolderKanban,
  Receipt,
  ShieldCheck,
  Users,
  Plus,
} from "lucide-react";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Client | Drylake Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type ClientPageProps = {
  params: Promise<{
    organizationId: string;
  }>;
};

export default async function AdminClientPage({
  params,
}: ClientPageProps) {
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

  const { organizationId } = await params;

  // ---------------------------------------------------------
  // Load organisation
  // ---------------------------------------------------------

  const supabase = createAdminSupabaseClient();

  const { data: organization, error: organizationError } =
    await supabase
      .from("organizations")
      .select(
        "id, clerk_org_id, name, status, created_at, updated_at"
      )
      .eq("id", organizationId)
      .maybeSingle();

  if (organizationError) {
    console.error("Admin client detail failed:", {
      code: organizationError.code,
      message: organizationError.message,
    });

    throw new Error("Unable to load client organisation.");
  }

  if (!organization) {
    notFound();
  }

  // ---------------------------------------------------------
  // Load projects belonging to this organisation
  // ---------------------------------------------------------

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select(
      "id, name, status, progress_override, start_date, target_end_date, created_at"
    )
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });

  if (projectsError) {
    console.error("Admin client projects failed:", {
      code: projectsError.code,
      message: projectsError.message,
    });
  }

  const projectCount = projects?.length ?? 0;

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <Link
            href="/admin/clients"
            className="flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} />
            Clients
          </Link>

          <div className="flex items-center gap-2">
            <ShieldCheck
              size={14}
              className="text-[#f26a2e]"
            />

            <p className="text-xs uppercase tracking-[0.18em] text-white/35">
              Platform Admin
            </p>
          </div>
        </header>

        {/* Client heading */}
        <section className="flex flex-col gap-8 py-14 sm:flex-row sm:items-end sm:justify-between sm:py-16">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.025]">
                <Building2
                  size={18}
                  className="text-[#f26a2e]"
                />
              </div>

              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#f26a2e]">
                Client Organisation
              </p>
            </div>

            <h1 className="mt-6 text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
              {organization.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-white/10 px-3 py-1 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-white/45">
                {organization.status}
              </span>

              <span className="text-xs text-white/30">
                {organization.clerk_org_id}
              </span>
            </div>
          </div>

          <Link
            href={`/admin/clients/${organization.id}/projects/new`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold !text-black transition-colors hover:bg-white/90"
          >
            <Plus size={16} />
            Create Project
          </Link>
        </section>

        {/* Overview cards */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6">
            <FolderKanban
              size={20}
              className="text-[#f26a2e]"
            />

            <p className="mt-5 text-3xl font-medium">
              {projectCount}
            </p>

            <p className="mt-1 text-sm text-white/40">
              Projects
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6">
            <FileText
              size={20}
              className="text-[#f26a2e]"
            />

            <p className="mt-5 text-3xl font-medium">—</p>

            <p className="mt-1 text-sm text-white/40">
              Documents
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6">
            <Receipt
              size={20}
              className="text-[#f26a2e]"
            />

            <p className="mt-5 text-3xl font-medium">—</p>

            <p className="mt-1 text-sm text-white/40">
              Invoices
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6">
            <Users
              size={20}
              className="text-[#f26a2e]"
            />

            <p className="mt-5 text-3xl font-medium">—</p>

            <p className="mt-1 text-sm text-white/40">
              Members
            </p>
          </div>
        </section>

        {/* Projects */}
        <section className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025]">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 sm:px-8">
            <div>
              <h2 className="font-medium">Projects</h2>

              <p className="mt-1 text-xs text-white/35">
                Projects belonging to {organization.name}
              </p>
            </div>

            <span className="text-xs uppercase tracking-[0.15em] text-white/30">
              {projectCount}{" "}
              {projectCount === 1 ? "project" : "projects"}
            </span>
          </div>

          {projectsError ? (
            <div className="px-6 py-8 sm:px-8">
              <p className="text-sm text-red-400">
                Unable to load projects.
              </p>
            </div>
          ) : projects && projects.length > 0 ? (
            <div>
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/admin/projects/${project.id}`}
                  className="group flex items-center justify-between gap-6 border-b border-white/10 px-6 py-5 transition-colors last:border-b-0 hover:bg-white/[0.035] sm:px-8"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">
                      {project.name}
                    </p>

                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/30">
                      {project.status.replaceAll("_", " ")}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    <span className="text-sm text-white/35">
                      {project.progress_override !== null
                        ? `${project.progress_override}%`
                        : "Auto"}
                    </span>

                    <ChevronRight
                      size={17}
                      className="text-white/25 transition-all group-hover:translate-x-1 group-hover:text-white/60"
                    />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-6 py-10 sm:px-8">
              <FolderKanban
                size={22}
                className="text-[#f26a2e]"
              />

              <h3 className="mt-5 text-lg font-medium">
                No projects yet
              </h3>

              <p className="mt-2 max-w-lg text-sm leading-6 text-white/40">
                Create the first project for this client to begin
                tracking milestones, progress, updates and documents.
              </p>

              <Link
                href={`/admin/clients/${organization.id}/projects/new`}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/70 transition hover:border-white/20 hover:text-white"
              >
                <Plus size={15} />
                Create Project
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}