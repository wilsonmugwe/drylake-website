import Link from "next/link";
import {
  ArrowRight,
  Building2,
  FileText,
  FolderKanban,
  Receipt,
  ShieldCheck,
} from "lucide-react";

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
  const supabase = createAdminSupabaseClient();

  // ==========================================================
  // DASHBOARD COUNTS
  // ==========================================================

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

  // ==========================================================
  // RECENT CLIENTS
  // ==========================================================

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

  // ==========================================================
  // RECENT PROJECTS
  // ==========================================================

  const { data: recentProjects, error: recentProjectsError } =
    await supabase
      .from("projects")
      .select(
        "id, organization_id, name, status, created_at"
      )
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
    <main className="relative min-h-screen overflow-hidden bg-[#050505]">
      {/* ======================================================
          BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[20%] top-[-10%] h-[700px] w-[700px] rounded-full bg-[#f26a2e]/[0.055] blur-[170px]" />

        <div className="absolute right-[-20%] top-[20%] h-[600px] w-[600px] rounded-full bg-[#f26a2e]/[0.018] blur-[180px]" />

        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)
            `,
            backgroundSize: "72px 72px",
            maskImage:
              "linear-gradient(to bottom, black, transparent 90%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black, transparent 90%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="flex flex-col gap-6 border-b border-white/[0.07] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck
                size={13}
                className="text-[#f26a2e]"
              />

              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-[#f26a2e]">
                Drylake Administration
              </p>
            </div>

            <h1 className="mt-4 text-3xl font-medium tracking-[-0.045em] sm:text-4xl">
              Dashboard
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-white/35">
              Operational overview of Drylake clients, projects,
              documents and billing.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[#f26a2e]/15 bg-[#f26a2e]/[0.04] px-3 py-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

            <span className="text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-[#f26a2e]">
              Platform operational
            </span>
          </div>
        </header>

        {/* ====================================================
            METRICS
        ==================================================== */}

        <section className="mt-8">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Clients"
              value={clientCount}
              icon={<Building2 size={17} />}
              href="/admin/clients"
            />

            <MetricCard
              label="Projects"
              value={projectCount}
              icon={<FolderKanban size={17} />}
            />

            <MetricCard
              label="Invoices"
              value={invoiceCount}
              icon={<Receipt size={17} />}
            />

            <MetricCard
              label="Documents"
              value={documentCount}
              icon={<FileText size={17} />}
            />
          </div>
        </section>

        {/* ====================================================
            WORKSPACE
        ==================================================== */}

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          {/* Recent clients */}

          <div className="overflow-hidden rounded-[1.6rem] border border-white/[0.08] bg-[#0a0a0a]/80">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5">
              <div>
                <h2 className="text-sm font-medium">
                  Recent clients
                </h2>

                <p className="mt-1 text-xs text-white/25">
                  Latest client organisations
                </p>
              </div>

              <Link
                href="/admin/clients"
                className="group flex items-center gap-2 text-xs text-white/30 transition hover:text-white"
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
                    className="group flex items-center justify-between border-b border-white/[0.06] px-6 py-5 transition last:border-b-0 hover:bg-white/[0.02]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02]">
                        <Building2
                          size={15}
                          className="text-[#f26a2e]"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {client.name}
                        </p>

                        <p className="mt-1 text-[0.6rem] uppercase tracking-[0.12em] text-white/25">
                          {client.status}
                        </p>
                      </div>
                    </div>

                    <ArrowRight
                      size={14}
                      className="shrink-0 text-white/15 transition group-hover:translate-x-0.5 group-hover:text-white/50"
                    />
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

          {/* Recent projects */}

          <div className="overflow-hidden rounded-[1.6rem] border border-white/[0.08] bg-[#0a0a0a]/80">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5">
              <div>
                <h2 className="text-sm font-medium">
                  Recent projects
                </h2>

                <p className="mt-1 text-xs text-white/25">
                  Latest delivery work
                </p>
              </div>

              <span className="text-[0.52rem] uppercase tracking-[0.14em] text-white/15">
                Workspace
              </span>
            </div>

            {projects.length > 0 ? (
              <div>
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/admin/projects/${project.id}`}
                    className="group flex items-center justify-between border-b border-white/[0.06] px-6 py-5 transition last:border-b-0 hover:bg-white/[0.02]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02]">
                        <FolderKanban
                          size={15}
                          className="text-[#f26a2e]"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {project.name}
                        </p>

                        <p className="mt-1 text-[0.6rem] uppercase tracking-[0.12em] text-white/25">
                          {project.status.replaceAll("_", " ")}
                        </p>
                      </div>
                    </div>

                    <ArrowRight
                      size={14}
                      className="shrink-0 text-white/15 transition group-hover:translate-x-0.5 group-hover:text-white/50"
                    />
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
            SYSTEM STATUS
        ==================================================== */}

        <section className="mt-6 rounded-[1.6rem] border border-white/[0.08] bg-white/[0.015] p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">
                Drylake platform
              </p>

              <p className="mt-2 max-w-2xl text-xs leading-5 text-white/30">
                Client management, project delivery and billing
                infrastructure are connected to the Drylake
                administration environment.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

              <span className="text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-[#f26a2e]">
                Connected
              </span>
            </div>
          </div>
        </section>

        <footer className="mt-12 border-t border-white/[0.06] py-7 text-[0.62rem] text-white/15">
          © {new Date().getFullYear()} Drylake Pty Ltd · Internal
          administration environment
        </footer>
      </div>
    </main>
  );
}

// ============================================================
// METRIC CARD
// ============================================================

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
    <div className="relative overflow-hidden rounded-[1.45rem] border border-white/[0.08] bg-white/[0.018] p-5 transition duration-300 group-hover:border-white/[0.14] group-hover:bg-white/[0.025]">
      <div className="absolute right-[-50px] top-[-50px] h-[130px] w-[130px] rounded-full bg-[#f26a2e]/[0.03] blur-[50px]" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] text-[#f26a2e]">
            {icon}
          </div>

          <span className="text-[0.5rem] uppercase tracking-[0.15em] text-white/20">
            {label}
          </span>
        </div>

        <p className="mt-7 text-3xl font-medium tracking-[-0.04em]">
          {value}
        </p>

        <p className="mt-1 text-xs text-white/25">
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

// ============================================================
// EMPTY STATE
// ============================================================

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-6 py-10">
      <div className="h-2 w-2 rounded-full bg-[#f26a2e]" />

      <p className="mt-4 text-sm font-medium">
        {title}
      </p>

      <p className="mt-2 text-xs text-white/30">
        {description}
      </p>
    </div>
  );
}