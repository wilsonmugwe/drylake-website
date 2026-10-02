import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CreditCard,
  FolderKanban,
  ShieldCheck,
} from "lucide-react";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Client Portal | Drylake",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function ClientDashboardPage() {
  // ---------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------

  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/client");
  }

  // ---------------------------------------------------------
  // No organisation membership
  //
  // An account alone never grants access to client data.
  // ---------------------------------------------------------

  if (!orgId) {
    return (
      <main className="min-h-screen bg-[#080808] text-white">
        <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-12">
          <header className="flex items-center justify-between border-b border-white/10 pb-6">
            <Link
              href="/"
              className="text-sm font-medium tracking-[0.16em] text-white"
            >
              DRYLAKE
            </Link>

            <div className="flex items-center gap-2">
              <ShieldCheck
                size={14}
                className="text-[#f26a2e]"
              />

              <span className="text-xs uppercase tracking-[0.16em] text-white/35">
                Secure Portal
              </span>
            </div>
          </header>

          <section className="py-20 sm:py-28">
            <Building2
              size={26}
              className="text-[#f26a2e]"
            />

            <p className="mt-8 text-xs font-medium uppercase tracking-[0.2em] text-[#f26a2e]">
              Client Portal
            </p>

            <h1 className="mt-4 max-w-2xl text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
              Welcome to Drylake.
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-7 text-white/45">
              Your account is active, but it has not yet been connected
              to a client organisation. Once Drylake grants your account
              access, your projects and project information will appear
              here.
            </p>

            <Link
              href="/"
              className="mt-8 inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm text-white/60 transition hover:border-white/20 hover:text-white"
            >
              Return to Drylake
              <ArrowUpRight size={15} />
            </Link>
          </section>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------
  // Authenticated Supabase client
  //
  // IMPORTANT:
  // Uses the Clerk session token.
  // Supabase RLS remains the tenant-isolation boundary.
  // ---------------------------------------------------------

  const supabase = createServerSupabaseClient();

  // ---------------------------------------------------------
  // Find organisation through active Clerk org ID
  // ---------------------------------------------------------

  const { data: organization, error: organizationError } =
    await supabase
      .from("organizations")
      .select("id, clerk_org_id, name, status")
      .eq("clerk_org_id", orgId)
      .eq("status", "ACTIVE")
      .maybeSingle();

  if (organizationError) {
    console.error("Client organisation lookup failed:", {
      code: organizationError.code,
      message: organizationError.message,
    });
  }

  // ---------------------------------------------------------
  // No authorized Drylake organisation
  // ---------------------------------------------------------

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
            <Building2
              size={26}
              className="text-[#f26a2e]"
            />

            <h1 className="mt-8 text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
              Portal access pending
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-7 text-white/45">
              We could not find an active Drylake client organisation
              associated with your current organisation.
            </p>
          </section>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------
  // Load projects
  //
  // Explicit organization filter + RLS.
  // ---------------------------------------------------------

  const { data: projects, error: projectsError } =
    await supabase
      .from("projects")
      .select(
        `
          id,
          name,
          status,
          progress_override,
          start_date,
          target_end_date,
          created_at
        `
      )
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false });

  if (projectsError) {
    console.error("Client projects lookup failed:", {
      code: projectsError.code,
      message: projectsError.message,
    });
  }

  const projectList = projects ?? [];

  // ---------------------------------------------------------
  // Load milestones for the organisation's projects.
  //
  // This lets the dashboard show the same automatic progress
  // calculation as the individual project page.
  // ---------------------------------------------------------

  const projectIds = projectList.map((project) => project.id);

  let milestones: Array<{
    id: string;
    project_id: string;
    status: string;
  }> = [];

  let milestonesError: {
    code?: string;
    message?: string;
  } | null = null;

  if (projectIds.length > 0) {
    const milestoneResult = await supabase
      .from("milestones")
      .select("id, project_id, status")
      .in("project_id", projectIds);

    milestones = milestoneResult.data ?? [];
    milestonesError = milestoneResult.error;

    if (milestonesError) {
      console.error("Client dashboard milestones failed:", {
        code: milestonesError.code,
        message: milestonesError.message,
      });
    }
  }

  // ---------------------------------------------------------
  // Calculate project progress
  // ---------------------------------------------------------

  function getProjectProgress(
    projectId: string,
    progressOverride: number | null
  ) {
    if (progressOverride !== null) {
      return progressOverride;
    }

    const projectMilestones = milestones.filter(
      (milestone) => milestone.project_id === projectId
    );

    if (projectMilestones.length === 0) {
      return 0;
    }

    const completed = projectMilestones.filter(
      (milestone) => milestone.status === "COMPLETED"
    ).length;

    return Math.round(
      (completed / projectMilestones.length) * 100
    );
  }

  // ---------------------------------------------------------
  // Render dashboard
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
            <ShieldCheck
              size={14}
              className="text-[#f26a2e]"
            />

            <span className="text-xs uppercase tracking-[0.16em] text-white/35">
              Client Portal
            </span>
          </div>
        </header>

        {/* Heading */}
        <section className="py-14 sm:py-16">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#f26a2e]">
            Client Portal
          </p>

          <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
            {organization.name}
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-6 text-white/45">
            View your Drylake projects, delivery progress, billing and latest
            project information.
          </p>
        </section>

        {/* Summary */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Projects */}
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6">
            <FolderKanban
              size={20}
              className="text-[#f26a2e]"
            />

            <p className="mt-5 text-3xl font-medium">
              {projectList.length}
            </p>

            <p className="mt-1 text-sm text-white/40">
              {projectList.length === 1 ? "Project" : "Projects"}
            </p>
          </div>

          {/* Organisation */}
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6">
            <Building2
              size={20}
              className="text-[#f26a2e]"
            />

            <p className="mt-5 text-lg font-medium">
              {organization.status}
            </p>

            <p className="mt-1 text-sm text-white/40">
              Organisation status
            </p>
          </div>

          {/* Billing */}
          <Link
            href="/client/billing"
            className="group rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
          >
            <div className="flex items-start justify-between">
              <CreditCard
                size={20}
                className="text-[#f26a2e]"
              />

              <ArrowRight
                size={17}
                className="text-white/25 transition-transform group-hover:translate-x-1 group-hover:text-white"
              />
            </div>

            <p className="mt-5 text-lg font-medium">
              Billing
            </p>

            <p className="mt-1 text-sm text-white/40">
              View invoices
            </p>
          </Link>
        </section>

        {/* Projects */}
        <section className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025]">
          <div className="border-b border-white/10 px-6 py-5 sm:px-8">
            <h2 className="font-medium">
              Projects
            </h2>

            <p className="mt-1 text-xs text-white/35">
              Projects available to your organisation
            </p>
          </div>

          {projectsError || milestonesError ? (
            <div className="px-6 py-8 sm:px-8">
              <p className="text-sm text-red-400">
                Unable to load projects.
              </p>
            </div>
          ) : projectList.length > 0 ? (
            <div>
              {projectList.map((project) => {
                const progress = getProjectProgress(
                  project.id,
                  project.progress_override
                );

                return (
                  <Link
                    key={project.id}
                    href={`/client/projects/${project.id}`}
                    className="group block border-b border-white/10 px-6 py-6 transition-colors last:border-b-0 hover:bg-white/[0.025] sm:px-8"
                  >
                    <div className="flex items-start justify-between gap-6">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="truncate font-medium text-white">
                            {project.name}
                          </h3>

                          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.1em] text-white/35">
                            {project.status.replaceAll("_", " ")}
                          </span>
                        </div>

                        <div className="mt-5 flex items-center gap-4">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-[#f26a2e]"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(0, progress)
                                )}%`,
                              }}
                            />
                          </div>

                          <span className="w-10 text-right text-sm text-white/45">
                            {progress}%
                          </span>
                        </div>
                      </div>

                      <ArrowRight
                        size={18}
                        className="mt-1 shrink-0 text-white/25 transition group-hover:translate-x-1 group-hover:text-white"
                      />
                    </div>

                    <p className="mt-4 text-xs text-white/30">
                      View project
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-10 sm:px-8">
              <FolderKanban
                size={22}
                className="text-[#f26a2e]"
              />

              <h2 className="mt-5 text-lg font-medium">
                No projects yet
              </h2>

              <p className="mt-2 max-w-lg text-sm leading-6 text-white/40">
                Projects assigned to your organisation will appear here.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}