import Link from "next/link";
import {
  ArrowRight,
  Building2,
  FileText,
  FolderKanban,
  Receipt,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { requirePlatformAdmin } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Own guard, not just the layout: this page reads with the service-role client.
  await requirePlatformAdmin("/admin");

  const supabase = createAdminSupabaseClient();

  const [
    organizationsResult,
    projectsResult,
    invoicesResult,
    documentsResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("projects")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("invoices")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("documents")
      .select("*", { count: "exact", head: true }),
  ]);

  const clientCount = organizationsResult.count ?? 0;
  const projectCount = projectsResult.count ?? 0;
  const invoiceCount = invoicesResult.count ?? 0;
  const documentCount = documentsResult.count ?? 0;

  const { data: recentClients, error: recentClientsError } =
    await supabase
      .from("organizations")
      .select("id, name, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

  if (recentClientsError) {
    console.error("Admin dashboard recent clients failed:", {
      code: recentClientsError.code,
      message: recentClientsError.message,
    });
  }

  const { data: recentProjects, error: recentProjectsError } =
    await supabase
      .from("projects")
      .select("id, organization_id, name, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

  if (recentProjectsError) {
    console.error("Admin dashboard recent projects failed:", {
      code: recentProjectsError.code,
      message: recentProjectsError.message,
    });
  }

  const clients = recentClients ?? [];
  const projects = recentProjects ?? [];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080808]">
      {/* ======================================================
          BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[20%] top-[-12%] h-[700px] w-[700px] rounded-full bg-[#f26a2e]/[0.09] blur-[180px]" />

        <div className="absolute right-[-25%] top-[28%] h-[650px] w-[650px] rounded-full bg-[#f26a2e]/[0.035] blur-[190px]" />

        <div className="absolute bottom-[-350px] left-[35%] h-[600px] w-[900px] rounded-full bg-white/[0.025] blur-[190px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)
            `,
            backgroundSize: "64px 64px",
            maskImage:
              "linear-gradient(to bottom, black, transparent 92%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black, transparent 92%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        {/* ====================================================
            HERO
        ==================================================== */}

        <header className="relative overflow-hidden rounded-[1.8rem] border border-white/[0.09] bg-gradient-to-br from-[#151210] via-[#101010] to-[#0c0c0c] px-6 py-7 shadow-[0_25px_80px_rgba(0,0,0,0.28)] sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-[#f26a2e]/[0.11] blur-[100px]" />

          <div className="pointer-events-none absolute right-[12%] top-0 h-full w-px bg-gradient-to-b from-transparent via-[#f26a2e]/15 to-transparent" />

          <div className="relative flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#f26a2e]/25 bg-[#f26a2e]/[0.08]">
                  <ShieldCheck
                    size={13}
                    strokeWidth={1.8}
                    className="text-[#f26a2e]"
                  />
                </div>

                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.21em] text-[#f26a2e]">
                  Drylake Administration
                </p>
              </div>

              <h1 className="mt-6 text-4xl font-medium tracking-[-0.055em] sm:text-5xl">
                Dashboard
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-6 text-white/55">
                Operational overview of clients, projects,
                documents and billing across the Drylake platform.
              </p>
            </div>

            <div className="flex w-fit items-center gap-2.5 rounded-full border border-[#f26a2e]/25 bg-[#f26a2e]/[0.07] px-4 py-2.5 shadow-[0_0_30px_rgba(242,106,46,0.04)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f26a2e] opacity-25" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#f26a2e]" />
              </span>

              <span className="text-[0.56rem] font-semibold uppercase tracking-[0.15em] text-[#f58a59]">
                Platform operational
              </span>
            </div>
          </div>
        </header>

        {/* ====================================================
            METRICS
        ==================================================== */}

        <section className="mt-5">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <MetricCard
              label="Clients"
              value={clientCount}
              icon={<Building2 size={18} />}
              href="/admin/clients"
            />

            <MetricCard
              label="Projects"
              value={projectCount}
              icon={<FolderKanban size={18} />}
            />

            <MetricCard
              label="Invoices"
              value={invoiceCount}
              icon={<Receipt size={18} />}
            />

            <MetricCard
              label="Documents"
              value={documentCount}
              icon={<FileText size={18} />}
            />
          </div>
        </section>

        {/* ====================================================
            WORKSPACE
        ==================================================== */}

        <section className="mt-5 grid gap-5 xl:grid-cols-2">
          {/* Clients */}

          <div className="overflow-hidden rounded-[1.7rem] border border-white/[0.09] bg-[#101010] shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.015] px-5 py-5 sm:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <Building2
                    size={14}
                    className="text-[#f26a2e]"
                  />

                  <h2 className="text-sm font-medium text-white">
                    Recent clients
                  </h2>
                </div>

                <p className="mt-1.5 text-xs text-white/42">
                  Latest client organisations
                </p>
              </div>

              <Link
                href="/admin/clients"
                className="group flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-xs font-medium text-white/65 transition hover:border-[#f26a2e]/20 hover:text-white"
              >
                View all

                <ArrowRight
                  size={13}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </div>

            {clients.length > 0 ? (
              <div>
                {clients.map((client) => (
                  <Link
                    key={client.id}
                    href={`/admin/clients/${client.id}`}
                    className="group relative flex items-center justify-between border-b border-white/[0.07] px-5 py-5 transition last:border-b-0 hover:bg-white/[0.025] sm:px-6"
                  >
                    <div className="absolute bottom-0 left-0 top-0 w-[2px] bg-[#f26a2e] opacity-0 transition group-hover:opacity-100" />

                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#f26a2e]/15 bg-[#f26a2e]/[0.055]">
                        <Building2
                          size={17}
                          strokeWidth={1.7}
                          className="text-[#f26a2e]"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white sm:text-[0.95rem]">
                          {client.name}
                        </p>

                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

                          <p className="text-[0.58rem] font-medium uppercase tracking-[0.13em] text-white/40">
                            {client.status}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.015]">
                      <ArrowRight
                        size={14}
                        className="text-white/30 transition group-hover:translate-x-0.5 group-hover:text-[#f26a2e]"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No clients"
                description="Client organisations will appear here."
              />
            )}
          </div>

          {/* Projects */}

          <div className="overflow-hidden rounded-[1.7rem] border border-white/[0.09] bg-[#101010] shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.015] px-5 py-5 sm:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <FolderKanban
                    size={14}
                    className="text-[#f26a2e]"
                  />

                  <h2 className="text-sm font-medium text-white">
                    Recent projects
                  </h2>
                </div>

                <p className="mt-1.5 text-xs text-white/42">
                  Latest delivery work
                </p>
              </div>

              <span className="rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 text-[0.5rem] font-semibold uppercase tracking-[0.14em] text-white/30">
                Workspace
              </span>
            </div>

            {projects.length > 0 ? (
              <div>
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/admin/projects/${project.id}`}
                    className="group relative flex items-center justify-between border-b border-white/[0.07] px-5 py-5 transition last:border-b-0 hover:bg-white/[0.025] sm:px-6"
                  >
                    <div className="absolute bottom-0 left-0 top-0 w-[2px] bg-[#f26a2e] opacity-0 transition group-hover:opacity-100" />

                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#f26a2e]/15 bg-[#f26a2e]/[0.055]">
                        <FolderKanban
                          size={17}
                          strokeWidth={1.7}
                          className="text-[#f26a2e]"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white sm:text-[0.95rem]">
                          {project.name}
                        </p>

                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

                          <p className="text-[0.58rem] font-medium uppercase tracking-[0.13em] text-white/40">
                            {project.status.replaceAll("_", " ")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.015]">
                      <ArrowRight
                        size={14}
                        className="text-white/30 transition group-hover:translate-x-0.5 group-hover:text-[#f26a2e]"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No projects"
                description="Recently created projects will appear here."
              />
            )}
          </div>
        </section>

        {/* ====================================================
            PLATFORM STATUS
        ==================================================== */}

        <section className="relative mt-5 overflow-hidden rounded-[1.7rem] border border-white/[0.09] bg-gradient-to-r from-[#111111] to-[#0d0d0d] p-6 sm:p-7">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#f26a2e]/[0.07] blur-[80px]" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#f26a2e]/20 bg-[#f26a2e]/[0.065]">
                <Sparkles
                  size={16}
                  className="text-[#f26a2e]"
                />
              </div>

              <div>
                <p className="text-sm font-medium text-white">
                  Drylake platform
                </p>

                <p className="mt-2 max-w-2xl text-xs leading-5 text-white/45">
                  Client management, project delivery and billing
                  infrastructure are connected to the Drylake
                  administration environment.
                </p>
              </div>
            </div>

            <div className="flex w-fit shrink-0 items-center gap-2 rounded-full border border-[#f26a2e]/18 bg-[#f26a2e]/[0.05] px-3 py-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

              <span className="text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-[#f58a59]">
                Connected
              </span>
            </div>
          </div>
        </section>

        <footer className="mt-10 border-t border-white/[0.07] py-7 text-[0.62rem] text-white/30">
          © {new Date().getFullYear()} Drylake Pty Ltd · Internal
          administration environment
        </footer>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  href?: string;
}) {
  const content = (
    <div className="relative min-h-[150px] overflow-hidden rounded-[1.45rem] border border-white/[0.09] bg-[#111111] p-4 shadow-[0_15px_40px_rgba(0,0,0,0.15)] transition duration-200 group-hover:border-[#f26a2e]/20 group-hover:bg-[#131313] sm:min-h-[175px] sm:p-5">
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#f26a2e]/[0.06] blur-[45px]" />

      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f26a2e]/20 bg-[#f26a2e]/[0.07] text-[#f26a2e]">
            {icon}
          </div>

          <span className="text-right text-[0.48rem] font-semibold uppercase tracking-[0.14em] text-white/35 sm:text-[0.52rem]">
            {label}
          </span>
        </div>

        <p className="mt-6 text-3xl font-medium tracking-[-0.045em] text-white sm:mt-8 sm:text-4xl">
          {value}
        </p>

        <p className="mt-1 text-[0.68rem] text-white/38 sm:text-xs">
          Total {label.toLowerCase()}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group block">
        {content}
      </Link>
    );
  }

  return <div className="group">{content}</div>;
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-6 py-10">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f26a2e]/20 bg-[#f26a2e]/[0.06]">
        <div className="h-2 w-2 rounded-full bg-[#f26a2e]" />
      </div>

      <p className="mt-4 text-sm font-medium text-white">
        {title}
      </p>

      <p className="mt-2 text-xs text-white/42">
        {description}
      </p>
    </div>
  );
}