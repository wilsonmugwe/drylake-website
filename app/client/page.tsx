import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  FolderKanban,
  LogOut,
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
  // This uses the Clerk session token.
  // RLS determines what this client is allowed to retrieve.
  // ---------------------------------------------------------

  const supabase = createServerSupabaseClient();

  // ---------------------------------------------------------
  // Find organisation through Clerk org ID
  // ---------------------------------------------------------

  const { data: organization, error: organizationError } =
    await supabase
      .from("organizations")
      .select("id, clerk_org_id, name, status")
      .eq("clerk_org_id", orgId)
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
  // organization_id filter is explicit AND RLS still applies.
  // ---------------------------------------------------------

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select(
      "id, name, status, progress_override, start_date, target_end_date, created_at"
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
            View your Drylake projects, progress and delivery
            information.
          </p>
        </section>

        {/* Summary */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6">
            <FolderKanban
              size={20}
              className="text-[#f26a2e]"
            />

            <p className="mt-5 text-3xl font-medium">
              {projectList.length}
            </p>

            <p className="mt-1 text-sm text-white/40">
              Projects
            </p>
          </div>

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
        </section>

        {/* Projects */}
        <section className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025]">
          <div className="border-b border-white/10 px-6 py-5 sm:px-8">
            <h2 className="font-medium">Projects</h2>

            <p className="mt-1 text-xs text-white/35">
              Projects available to your organisation
            </p>
          </div>

          {projectsError ? (
            <div className="px-6 py-8 sm:px-8">
              <p className="text-sm text-red-400">
                Unable to load projects.
              </p>
            </div>
          ) : projectList.length > 0 ? (
            <div>
              {projectList.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between gap-6 border-b border-white/10 px-6 py-5 last:border-b-0 sm:px-8"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {project.name}
                    </p>

                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/30">
                      {project.status.replaceAll("_", " ")}
                    </p>
                  </div>

                  <span className="text-sm text-white/35">
                    {project.progress_override !== null
                      ? `${project.progress_override}%`
                      : "Automatic"}
                  </span>
                </div>
              ))}
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