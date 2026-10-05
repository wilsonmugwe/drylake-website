import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
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
  title: "Client Portal",
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
  // An authenticated account alone never grants access
  // to client/project data.
  // ---------------------------------------------------------

  // Intentional routing rule: a Drylake admin with no active client organisation belongs
  // in the admin workspace, not on the client "no organisation" screen. An admin who is
  // also a member of a client org (active org set) still sees that org's client view.
  if (!orgId && (await isPlatformAdmin())) {
    redirect("/admin");
  }

  if (!orgId) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
        {/* =====================================================
            BACKGROUND
        ===================================================== */}

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Primary orange atmospheric glow */}
          <div className="absolute -left-[15%] top-[10%] h-[650px] w-[650px] rounded-full bg-[#f26a2e]/[0.075] blur-[150px]" />

          {/* Upper-right secondary glow */}
          <div className="absolute -right-[12%] top-[-5%] h-[550px] w-[550px] rounded-full bg-[#f26a2e]/[0.04] blur-[170px]" />

          {/* Bottom atmospheric glow */}
          <div className="absolute bottom-[-300px] left-1/2 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-white/[0.025] blur-[150px]" />

          {/* Technical grid */}
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.75) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.75) 1px, transparent 1px)
              `,
              backgroundSize: "72px 72px",
              maskImage: "linear-gradient(to bottom, black, transparent 88%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, black, transparent 88%)",
            }}
          />

          {/* Left vertical accent */}
          <div className="absolute left-[7%] top-[24%] h-[340px] w-px bg-gradient-to-b from-transparent via-[#f26a2e]/20 to-transparent" />

          {/* Right vertical accent */}
          <div className="absolute right-[9%] top-[12%] h-[220px] w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />

          {/* Top horizontal highlight */}
          <div className="absolute left-1/2 top-0 h-px w-[70%] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Decorative orange dot */}
          <div className="absolute left-[7%] top-[47%] h-1.5 w-1.5 rounded-full bg-[#f26a2e]/50 shadow-[0_0_20px_rgba(242,106,46,0.5)]" />
        </div>

        {/* =====================================================
            PAGE
        ===================================================== */}

        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-5 sm:px-8 lg:px-12">
          {/* Header */}

          <header className="flex items-center justify-between border-b border-white/[0.08] py-7">
            <Link
              href="/"
              className="text-sm font-semibold tracking-[0.2em] text-white transition-opacity hover:opacity-60"
            >
              DRYLAKE
            </Link>

            <div className="flex items-center gap-3">
              <div className="relative flex h-2 w-2 items-center justify-center">
                <div className="absolute h-3.5 w-3.5 rounded-full bg-[#f26a2e]/10" />
                <div className="relative h-1.5 w-1.5 rounded-full bg-[#f26a2e] shadow-[0_0_10px_rgba(242,106,46,0.5)]" />
              </div>

              <span className="text-[0.65rem] font-medium uppercase tracking-[0.22em] text-white/35">
                Secure Portal
              </span>
            </div>
          </header>

          {/* Main */}

          <section className="flex flex-1 items-center py-14 sm:py-20 lg:py-24">
            <div className="grid w-full gap-14 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-24">
              {/* =================================================
                  LEFT — WELCOME
              ================================================= */}

              <div className="max-w-2xl">
                {/* Portal badge */}

                <div className="inline-flex items-center gap-2.5 rounded-full border border-[#f26a2e]/15 bg-[#f26a2e]/[0.05] px-3.5 py-2 backdrop-blur-sm">
                  <ShieldCheck
                    size={13}
                    strokeWidth={1.8}
                    className="text-[#f26a2e]"
                  />

                  <span className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#f26a2e]">
                    Client Portal
                  </span>
                </div>

                {/* Welcome */}

                <h1 className="mt-8 max-w-2xl text-[3.3rem] font-medium leading-[0.96] tracking-[-0.055em] sm:text-6xl lg:text-[4.7rem]">
                  Welcome
                  <br />

                  <span className="relative inline-block">
                    to Drylake.

                    <span className="absolute -bottom-3 left-0 h-px w-16 bg-gradient-to-r from-[#f26a2e] to-[#f26a2e]/10" />
                  </span>
                </h1>

                <p className="mt-10 max-w-lg text-[0.95rem] leading-7 text-white/45">
                  Your Drylake account is active and secure. We&apos;re
                  preparing your client workspace and connecting it to your
                  organisation.
                </p>

                {/* Authentication status */}

                <div className="mt-9 flex max-w-lg items-center gap-4 border-t border-white/[0.08] pt-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#f26a2e]/15 bg-[#f26a2e]/[0.05]">
                    <ShieldCheck
                      size={16}
                      strokeWidth={1.7}
                      className="text-[#f26a2e]"
                    />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-white/75">
                      Authentication complete
                    </p>

                    <p className="mt-1 text-xs text-white/30">
                      Your identity has been securely verified.
                    </p>
                  </div>
                </div>

                {/* Actions */}

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link
                    href="/"
                    className="group inline-flex items-center gap-3 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-black transition duration-300 hover:bg-neutral-200"
                  >
                    Return to Drylake

                    <ArrowUpRight
                      size={15}
                      className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  </Link>

                  <div className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-white/25" />

                    <span className="text-xs text-white/25">
                      No action required
                    </span>
                  </div>
                </div>
              </div>

              {/* =================================================
                  RIGHT — WORKSPACE STATUS
              ================================================= */}

              <div className="relative mx-auto w-full max-w-lg lg:mx-0 lg:ml-auto">
                {/* Glow behind card */}

                <div className="pointer-events-none absolute -inset-16 rounded-full bg-[#f26a2e]/[0.04] blur-[110px]" />

                {/* Connection line */}

                <div className="absolute -left-12 top-1/2 hidden h-px w-12 bg-gradient-to-r from-transparent to-[#f26a2e]/30 lg:block" />

                {/* Card */}

                <div className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.1] bg-[#0b0b0b]/80 shadow-[0_35px_100px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                  {/* Card lighting */}

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-[#f26a2e]/[0.025]" />

                  <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                  {/* Card header */}

                  <div className="relative flex items-center justify-between border-b border-white/[0.08] px-6 py-5 sm:px-7">
                    <div>
                      <p className="text-sm font-medium text-white">
                        Workspace status
                      </p>

                      <p className="mt-1 text-xs text-white/30">
                        Drylake Client Portal
                      </p>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025]">
                      <Building2
                        size={17}
                        strokeWidth={1.7}
                        className="text-white/45"
                      />
                    </div>
                  </div>

                  {/* Status steps */}

                  <div className="relative px-6 py-8 sm:px-7">
                    {/* Connecting line */}

                    <div className="absolute bottom-[72px] left-[39px] top-[53px] w-px bg-gradient-to-b from-[#f26a2e]/35 via-white/10 to-white/[0.04] sm:left-[43px]" />

                    {/* Step 1 */}

                    <div className="relative flex gap-4">
                      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#f26a2e]/25 bg-[#15100d] shadow-[0_0_25px_rgba(242,106,46,0.08)]">
                        <ShieldCheck
                          size={14}
                          strokeWidth={2}
                          className="text-[#f26a2e]"
                        />
                      </div>

                      <div className="pb-9">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <p className="text-sm font-medium text-white">
                            Account active
                          </p>

                          <span className="rounded-full border border-[#f26a2e]/15 bg-[#f26a2e]/[0.06] px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.13em] text-[#f26a2e]">
                            Complete
                          </span>
                        </div>

                        <p className="mt-2 max-w-sm text-xs leading-5 text-white/35">
                          Your identity has been verified and your secure portal
                          account is ready.
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}

                    <div className="relative flex gap-4">
                      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#f26a2e]/20 bg-[#100c0a]">
                        <div className="h-2 w-2 rounded-full bg-[#f26a2e] shadow-[0_0_12px_rgba(242,106,46,0.7)]" />
                      </div>

                      <div className="pb-9">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <p className="text-sm font-medium text-white">
                            Organisation access
                          </p>

                          <span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-2 py-0.5 text-[0.55rem] font-medium uppercase tracking-[0.13em] text-white/35">
                            In progress
                          </span>
                        </div>

                        <p className="mt-2 max-w-sm text-xs leading-5 text-white/35">
                          Drylake is connecting your account to your client
                          organisation.
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}

                    <div className="relative flex gap-4">
                      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[#0c0c0c]">
                        <FolderKanban
                          size={13}
                          strokeWidth={1.7}
                          className="text-white/25"
                        />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <p className="text-sm font-medium text-white/60">
                            Project workspace
                          </p>

                          <span className="rounded-full border border-white/[0.06] px-2 py-0.5 text-[0.55rem] font-medium uppercase tracking-[0.13em] text-white/20">
                            Next
                          </span>
                        </div>

                        <p className="mt-2 max-w-sm text-xs leading-5 text-white/25">
                          Projects, milestones, delivery updates and billing
                          will appear here once access is granted.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card footer */}

                  <div className="relative flex items-center justify-between border-t border-white/[0.08] bg-white/[0.012] px-6 py-4 sm:px-7">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#f26a2e] shadow-[0_0_8px_rgba(242,106,46,0.5)]" />

                      <span className="text-[0.62rem] text-white/30">
                        Secure connection
                      </span>
                    </div>

                    <span className="text-[0.62rem] tracking-[0.14em] text-white/20">
                      DRYLAKE
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}

          <footer className="flex flex-col gap-3 border-t border-white/[0.07] py-6 text-[0.65rem] text-white/20 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Drylake Pty Ltd</span>

            <div className="flex items-center gap-5">
              <span>Secure client environment</span>

              <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />

              <span>Perth, Australia</span>
            </div>
          </footer>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------
  // Authenticated Supabase client
  //
  // Uses the Clerk session token.
  // Supabase RLS remains the tenant-isolation boundary.
  // ---------------------------------------------------------

  const supabase = createServerSupabaseClient();

  // ---------------------------------------------------------
  // Find organisation through active Clerk org ID
  // ---------------------------------------------------------

  const { data: organization, error: organizationError } = await supabase
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
      <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
        {/* Background */}

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-[10%] top-[15%] h-[500px] w-[500px] rounded-full bg-[#f26a2e]/[0.06] blur-[150px]" />

          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)
              `,
              backgroundSize: "72px 72px",
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-12">
          <header className="flex items-center justify-between border-b border-white/[0.08] pb-6">
            <Link
              href="/"
              className="text-sm font-semibold tracking-[0.18em] text-white"
            >
              DRYLAKE
            </Link>

            <div className="flex items-center gap-2">
              <ShieldCheck size={13} className="text-[#f26a2e]" />

              <span className="text-[0.65rem] uppercase tracking-[0.18em] text-white/30">
                Secure Portal
              </span>
            </div>
          </header>

          <section className="py-20 sm:py-28">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#f26a2e]/15 bg-[#f26a2e]/[0.05]">
              <Building2
                size={20}
                strokeWidth={1.7}
                className="text-[#f26a2e]"
              />
            </div>

            <p className="mt-8 text-xs font-medium uppercase tracking-[0.2em] text-[#f26a2e]">
              Client Portal
            </p>

            <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
              Portal access pending
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-7 text-white/45">
              Your organisation has been identified, but we could not find an
              active Drylake client workspace associated with it.
            </p>

            <p className="mt-3 max-w-xl text-sm leading-7 text-white/30">
              No action is required unless Drylake has asked you to provide
              additional information.
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
  // Load projects
  //
  // Explicit organization filter + RLS.
  // ---------------------------------------------------------

  const { data: projects, error: projectsError } = await supabase
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
  // Load milestones for the organisation's projects
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

    return Math.round((completed / projectMilestones.length) * 100);
  }

  // ---------------------------------------------------------
  // Render client dashboard
  // ---------------------------------------------------------

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070707] text-white">
      {/* Dashboard background */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[15%] top-[5%] h-[600px] w-[600px] rounded-full bg-[#f26a2e]/[0.045] blur-[160px]" />

        <div className="absolute right-[-15%] top-[30%] h-[500px] w-[500px] rounded-full bg-white/[0.015] blur-[150px]" />

        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)
            `,
            backgroundSize: "80px 80px",
            maskImage: "linear-gradient(to bottom, black, transparent 80%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black, transparent 80%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
        {/* Header */}

        <header className="flex items-center justify-between border-b border-white/[0.08] pb-6">
          <Link
            href="/"
            className="text-sm font-semibold tracking-[0.18em] text-white transition-opacity hover:opacity-60"
          >
            DRYLAKE
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="h-1.5 w-1.5 rounded-full bg-[#f26a2e] shadow-[0_0_8px_rgba(242,106,46,0.5)]" />

            <span className="text-[0.65rem] uppercase tracking-[0.18em] text-white/35">
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

          <div className="rounded-[1.5rem] border border-white/[0.09] bg-white/[0.025] p-6 backdrop-blur-sm">
            <FolderKanban size={20} className="text-[#f26a2e]" />

            <p className="mt-5 text-3xl font-medium">{projectList.length}</p>

            <p className="mt-1 text-sm text-white/40">
              {projectList.length === 1 ? "Project" : "Projects"}
            </p>
          </div>

          {/* Organisation */}

          <div className="rounded-[1.5rem] border border-white/[0.09] bg-white/[0.025] p-6 backdrop-blur-sm">
            <Building2 size={20} className="text-[#f26a2e]" />

            <p className="mt-5 text-lg font-medium">{organization.status}</p>

            <p className="mt-1 text-sm text-white/40">
              Organisation status
            </p>
          </div>

          {/* Billing */}

          <Link
            href="/client/billing"
            className="group rounded-[1.5rem] border border-white/[0.09] bg-white/[0.025] p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.04]"
          >
            <div className="flex items-start justify-between">
              <CreditCard size={20} className="text-[#f26a2e]" />

              <ArrowRight
                size={17}
                className="text-white/25 transition-transform group-hover:translate-x-1 group-hover:text-white"
              />
            </div>

            <p className="mt-5 text-lg font-medium">Billing</p>

            <p className="mt-1 text-sm text-white/40">View invoices</p>
          </Link>
        </section>

        {/* Projects */}

        <section className="mt-10 overflow-hidden rounded-[2rem] border border-white/[0.09] bg-white/[0.025] backdrop-blur-sm">
          <div className="border-b border-white/[0.08] px-6 py-5 sm:px-8">
            <h2 className="font-medium">Projects</h2>

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
                    className="group block border-b border-white/[0.08] px-6 py-6 transition-colors last:border-b-0 hover:bg-white/[0.025] sm:px-8"
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
              <FolderKanban size={22} className="text-[#f26a2e]" />

              <h2 className="mt-5 text-lg font-medium">No projects yet</h2>

              <p className="mt-2 max-w-lg text-sm leading-6 text-white/40">
                Projects assigned to your organisation will appear here.
              </p>
            </div>
          )}
        </section>

        {/* Footer */}

        <footer className="mt-12 flex flex-col gap-3 border-t border-white/[0.07] py-6 text-[0.65rem] text-white/20 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Drylake Pty Ltd</span>

          <div className="flex items-center gap-5">
            <span>Secure client environment</span>

            <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />

            <span>Perth, Australia</span>
          </div>
        </footer>
      </div>
    </main>
  );
}