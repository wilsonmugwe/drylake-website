import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Clients",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
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

  // ---------------------------------------------------------
  // Load organisations
  // ---------------------------------------------------------

  const supabase = createAdminSupabaseClient();

  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("id, clerk_org_id, name, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Admin client list failed:", {
      code: error.code,
      message: error.message,
    });
  }

  const organizationList = organizations ?? [];
  const activeCount = organizationList.filter(
    (organization) => organization.status === "ACTIVE"
  ).length;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[18%] top-[4%] h-[700px] w-[700px] rounded-full bg-[#f26a2e]/[0.055] blur-[170px]" />

        <div className="absolute -right-[15%] top-[25%] h-[600px] w-[600px] rounded-full bg-[#f26a2e]/[0.02] blur-[170px]" />

        <div className="absolute bottom-[-350px] left-1/2 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-white/[0.02] blur-[160px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)
            `,
            backgroundSize: "72px 72px",
            maskImage:
              "linear-gradient(to bottom, black, transparent 92%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black, transparent 92%)",
          }}
        />

        <div className="absolute left-[6%] top-[20%] h-[340px] w-px bg-gradient-to-b from-transparent via-[#f26a2e]/20 to-transparent" />

        <div className="absolute left-1/2 top-0 h-px w-[70%] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* =====================================================
          PAGE
      ===================================================== */}

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-5 sm:px-8 lg:px-12">
        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="flex items-center justify-between border-b border-white/[0.08] py-7">
          <Link
            href="/admin"
            className="group flex items-center gap-2.5 text-sm text-white/45 transition-colors hover:text-white"
          >
            <ArrowLeft
              size={15}
              className="transition-transform duration-200 group-hover:-translate-x-1"
            />

            <span>Admin</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#f26a2e]/15 bg-[#f26a2e]/[0.05]">
              <ShieldCheck
                size={13}
                strokeWidth={1.8}
                className="text-[#f26a2e]"
              />
            </div>

            <p className="hidden text-[0.62rem] font-medium uppercase tracking-[0.2em] text-white/35 sm:block">
              Platform Admin
            </p>
          </div>
        </header>

        {/* ===================================================
            HERO
        =================================================== */}

        <section className="pb-12 pt-14 sm:pb-14 sm:pt-16">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2.5 rounded-full border border-[#f26a2e]/15 bg-[#f26a2e]/[0.05] px-3.5 py-2">
                <Building2
                  size={13}
                  strokeWidth={1.8}
                  className="text-[#f26a2e]"
                />

                <span className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#f26a2e]">
                  Client Management
                </span>
              </div>

              <h1 className="mt-7 text-5xl font-medium tracking-[-0.055em] sm:text-6xl">
                Clients
              </h1>

              <p className="mt-5 max-w-xl text-[0.95rem] leading-7 text-white/45">
                Manage the organisations connected to the Drylake client
                platform, their access and operational workspaces.
              </p>
            </div>

            <Link
              href="/admin/clients/new"
              className="group inline-flex w-fit items-center justify-center gap-2.5 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold !text-black transition duration-300 hover:bg-neutral-200"
            >
              <Plus
                size={16}
                className="transition-transform duration-200 group-hover:rotate-90"
              />

              Create Client
            </Link>
          </div>
        </section>

        {/* ===================================================
            SUMMARY
        =================================================== */}

        {!error && (
          <section className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.4rem] border border-white/[0.08] bg-white/[0.018] px-5 py-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <Building2
                  size={17}
                  strokeWidth={1.7}
                  className="text-[#f26a2e]"
                />

                <span className="text-[0.55rem] uppercase tracking-[0.15em] text-white/20">
                  Total
                </span>
              </div>

              <p className="mt-5 text-2xl font-medium tracking-[-0.03em]">
                {organizationList.length}
              </p>

              <p className="mt-1 text-xs text-white/30">
                Client organisations
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-white/[0.08] bg-white/[0.018] px-5 py-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <ShieldCheck
                  size={17}
                  strokeWidth={1.7}
                  className="text-[#f26a2e]"
                />

                <span className="text-[0.55rem] uppercase tracking-[0.15em] text-white/20">
                  Active
                </span>
              </div>

              <p className="mt-5 text-2xl font-medium tracking-[-0.03em]">
                {activeCount}
              </p>

              <p className="mt-1 text-xs text-white/30">
                Active organisations
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-white/[0.08] bg-white/[0.018] px-5 py-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <Users
                  size={17}
                  strokeWidth={1.7}
                  className="text-[#f26a2e]"
                />

                <span className="text-[0.55rem] uppercase tracking-[0.15em] text-white/20">
                  Access
                </span>
              </div>

              <p className="mt-5 text-sm font-medium">
                Clerk
              </p>

              <p className="mt-1 text-xs text-white/30">
                Organisation identity provider
              </p>
            </div>
          </section>
        )}

        {/* ===================================================
            ERROR
        =================================================== */}

        {error ? (
          <section className="rounded-[1.75rem] border border-red-500/15 bg-red-500/[0.035] p-7 sm:p-8">
            <Building2
              size={21}
              strokeWidth={1.7}
              className="text-red-400"
            />

            <h2 className="mt-5 text-xl font-medium">
              Unable to load clients
            </h2>

            <p className="mt-3 max-w-lg text-sm leading-6 text-white/40">
              The administration database connection could not retrieve
              organisations.
            </p>
          </section>
        ) : organizationList.length > 0 ? (
          /* =================================================
              ORGANISATIONS
          ================================================= */

          <section className="overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[#0a0a0a]/75 shadow-[0_30px_90px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            {/* Header */}

            <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5 sm:px-7">
              <div>
                <p className="text-sm font-medium">
                  Client organisations
                </p>

                <p className="mt-1 text-xs text-white/30">
                  Select an organisation to manage its workspace
                </p>
              </div>

              <span className="rounded-full border border-white/[0.07] bg-white/[0.02] px-3 py-1.5 text-[0.58rem] font-medium uppercase tracking-[0.14em] text-white/30">
                {organizationList.length}{" "}
                {organizationList.length === 1
                  ? "organisation"
                  : "organisations"}
              </span>
            </div>

            {/* Rows */}

            <div>
              {organizationList.map((organization, index) => {
                const isActive = organization.status === "ACTIVE";

                return (
                  <Link
                    key={organization.id}
                    href={`/admin/clients/${organization.id}`}
                    className="group relative flex items-center justify-between gap-5 border-b border-white/[0.07] px-6 py-5 transition duration-300 last:border-b-0 hover:bg-white/[0.025] sm:px-7"
                  >
                    {/* Hover accent */}

                    <div className="absolute bottom-0 left-0 top-0 w-px bg-[#f26a2e] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                    <div className="flex min-w-0 items-center gap-4">
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] transition duration-300 group-hover:border-[#f26a2e]/20 group-hover:bg-[#f26a2e]/[0.04]">
                        <Building2
                          size={17}
                          strokeWidth={1.7}
                          className="text-[#f26a2e]"
                        />

                        {isActive && (
                          <div className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-[#0a0a0a]">
                            <div className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <p className="truncate text-sm font-medium text-white transition-colors group-hover:text-[#f26a2e] sm:text-base">
                            {organization.name}
                          </p>

                          <span className="hidden text-[0.55rem] text-white/15 sm:inline">
                            #{String(index + 1).padStart(2, "0")}
                          </span>
                        </div>

                        <p className="mt-1.5 max-w-[260px] truncate font-mono text-[0.68rem] text-white/25 sm:max-w-md">
                          {organization.clerk_org_id}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-4">
                      <span
                        className={
                          isActive
                            ? "rounded-full border border-[#f26a2e]/15 bg-[#f26a2e]/[0.04] px-2.5 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.13em] text-[#f26a2e]"
                            : "rounded-full border border-white/[0.07] px-2.5 py-1 text-[0.55rem] font-medium uppercase tracking-[0.13em] text-white/30"
                        }
                      >
                        {organization.status}
                      </span>

                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.06] transition duration-300 group-hover:border-white/[0.12] group-hover:bg-white/[0.03]">
                        <ChevronRight
                          size={14}
                          className="text-white/25 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-white/60"
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : (
          /* =================================================
              EMPTY
          ================================================= */

          <section className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-white/[0.018] p-8 sm:p-10">
            <div className="pointer-events-none absolute right-[-100px] top-[-100px] h-[300px] w-[300px] rounded-full bg-[#f26a2e]/[0.04] blur-[100px]" />

            <div className="relative">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#f26a2e]/15 bg-[#f26a2e]/[0.05]">
                <Building2
                  size={19}
                  strokeWidth={1.7}
                  className="text-[#f26a2e]"
                />
              </div>

              <h2 className="mt-6 text-2xl font-medium tracking-[-0.03em]">
                No client organisations
              </h2>

              <p className="mt-3 max-w-lg text-sm leading-6 text-white/40">
                Client organisations created for the Drylake platform will
                appear here.
              </p>

              <Link
                href="/admin/clients/new"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold !text-black transition hover:bg-neutral-200"
              >
                <Plus size={15} />

                Create your first client
              </Link>
            </div>
          </section>
        )}

        {/* ===================================================
            FOOTER
        =================================================== */}

        <footer className="mt-auto flex flex-col gap-3 border-t border-white/[0.07] py-7 pt-12 text-[0.65rem] text-white/20 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Drylake Pty Ltd</span>

          <div className="flex items-center gap-5">
            <span>Client administration</span>

            <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />

            <span>Restricted access</span>
          </div>
        </footer>
      </div>
    </main>
  );
}