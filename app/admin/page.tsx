import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  FileText,
  FolderKanban,
  Receipt,
  ShieldCheck,
} from "lucide-react";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";

export const metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const { userId } = await auth();

  // ----------------------------------------------------------
  // AUTHENTICATION BOUNDARY
  //
  // The user must first have a valid Clerk session.
  // ----------------------------------------------------------

  if (!userId) {
    redirect("/sign-in?redirect_url=/admin");
  }

  // ----------------------------------------------------------
  // PLATFORM ADMIN AUTHORIZATION
  //
  // Authentication alone does not grant admin access.
  // isPlatformAdmin() checks the authenticated Clerk user ID
  // against the Supabase platform_admins table.
  // ----------------------------------------------------------

  const platformAdmin = await isPlatformAdmin();

  if (!platformAdmin) {
    redirect("/client");
  }

  // ----------------------------------------------------------
  // ADMIN DASHBOARD
  // ----------------------------------------------------------

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      {/* ======================================================
          BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Main orange ambient glow */}
        <div className="absolute -left-[18%] top-[5%] h-[700px] w-[700px] rounded-full bg-[#f26a2e]/[0.065] blur-[160px]" />

        {/* Secondary glow */}
        <div className="absolute -right-[15%] top-[20%] h-[600px] w-[600px] rounded-full bg-[#f26a2e]/[0.025] blur-[170px]" />

        {/* Bottom ambient glow */}
        <div className="absolute bottom-[-350px] left-1/2 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-white/[0.02] blur-[160px]" />

        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)
            `,
            backgroundSize: "72px 72px",
            maskImage:
              "linear-gradient(to bottom, black, transparent 90%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black, transparent 90%)",
          }}
        />

        {/* Decorative vertical line */}
        <div className="absolute left-[6%] top-[20%] h-[350px] w-px bg-gradient-to-b from-transparent via-[#f26a2e]/20 to-transparent" />

        {/* Top highlight */}
        <div className="absolute left-1/2 top-0 h-px w-[70%] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* ======================================================
          PAGE
      ====================================================== */}

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-5 sm:px-8 lg:px-12">
        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="flex items-center justify-between border-b border-white/[0.08] py-7">
          <Link
            href="/"
            className="group flex items-center gap-2.5 text-sm text-white/45 transition-colors hover:text-white"
          >
            <ArrowLeft
              size={15}
              className="transition-transform duration-200 group-hover:-translate-x-1"
            />

            <span>Back to Drylake</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#f26a2e]/15 bg-[#f26a2e]/[0.05]">
              <ShieldCheck
                size={13}
                strokeWidth={1.8}
                className="text-[#f26a2e]"
              />
            </div>

            <div className="hidden sm:block">
              <p className="text-[0.62rem] font-medium uppercase tracking-[0.2em] text-white/35">
                Platform Admin
              </p>
            </div>
          </div>
        </header>

        {/* ====================================================
            INTRODUCTION
        ==================================================== */}

        <section className="pb-14 pt-16 sm:pb-16 sm:pt-20">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-[#f26a2e]/15 bg-[#f26a2e]/[0.05] px-3.5 py-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#f26a2e] shadow-[0_0_10px_rgba(242,106,46,0.6)]" />

            <span className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#f26a2e]">
              Drylake Administration
            </span>
          </div>

          <h1 className="mt-7 max-w-3xl text-4xl font-medium leading-[1] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
            Welcome to
            <br />
            <span className="relative inline-block">
              Drylake Admin.

              <span className="absolute -bottom-3 left-0 h-px w-16 bg-gradient-to-r from-[#f26a2e] to-transparent" />
            </span>
          </h1>

          <p className="mt-9 max-w-2xl text-[0.95rem] leading-7 text-white/45">
            Manage client organisations, projects, documents, updates and
            billing from the Drylake administration workspace.
          </p>

          <div className="mt-7 flex items-center gap-3">
            <div className="relative flex h-2 w-2 items-center justify-center">
              <div className="absolute h-4 w-4 rounded-full bg-[#f26a2e]/10" />
              <div className="relative h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
            </div>

            <span className="text-xs text-white/30">
              Platform administrator session active
            </span>
          </div>
        </section>

        {/* ====================================================
            ADMIN MODULES
        ==================================================== */}

        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-sm font-medium text-white">
                Administration
              </p>

              <p className="mt-1 text-xs text-white/30">
                Manage the Drylake platform
              </p>
            </div>

            <span className="hidden text-[0.6rem] uppercase tracking-[0.18em] text-white/20 sm:block">
              Internal Workspace
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <AdminCard
              title="Clients"
              description="Manage client organisations and access."
              icon={<Building2 size={20} />}
              href="/admin/clients"
              status="Available"
            />

            <AdminCard
              title="Projects"
              description="Create projects and manage delivery."
              icon={<FolderKanban size={20} />}
              status="Coming soon"
            />

            <AdminCard
              title="Documents"
              description="Manage private client documents."
              icon={<FileText size={20} />}
              status="Coming soon"
            />

            <AdminCard
              title="Billing"
              description="Manage invoices and payment visibility."
              icon={<Receipt size={20} />}
              status="Coming soon"
            />
          </div>
        </section>

        {/* ====================================================
            SECURITY
        ==================================================== */}

        <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-white/[0.02]">
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#f26a2e]/15 bg-[#f26a2e]/[0.05]">
                <ShieldCheck
                  size={17}
                  strokeWidth={1.8}
                  className="text-[#f26a2e]"
                />
              </div>

              <div>
                <h2 className="text-sm font-medium text-white">
                  Platform administrator access
                </h2>

                <p className="mt-2 max-w-2xl text-xs leading-5 text-white/35">
                  This workspace is restricted to authorised Drylake platform
                  administrators. Client organisation roles do not grant access
                  to this area.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-full border border-[#f26a2e]/15 bg-[#f26a2e]/[0.04] px-3 py-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

              <span className="text-[0.58rem] font-medium uppercase tracking-[0.15em] text-[#f26a2e]">
                Authorised
              </span>
            </div>
          </div>
        </section>

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <footer className="mt-auto flex flex-col gap-3 border-t border-white/[0.07] py-7 pt-12 text-[0.65rem] text-white/20 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Drylake Pty Ltd</span>

          <div className="flex items-center gap-5">
            <span>Internal administration environment</span>

            <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />

            <span>Restricted access</span>
          </div>
        </footer>
      </div>
    </main>
  );
}

// ============================================================
// ADMIN MODULE CARD
// ============================================================

function AdminCard({
  title,
  description,
  icon,
  href,
  status,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  status: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] text-[#f26a2e]">
          {icon}
        </div>

        <span
          className={
            href
              ? "rounded-full border border-[#f26a2e]/15 bg-[#f26a2e]/[0.04] px-2 py-1 text-[0.52rem] font-medium uppercase tracking-[0.12em] text-[#f26a2e]"
              : "rounded-full border border-white/[0.06] px-2 py-1 text-[0.52rem] font-medium uppercase tracking-[0.12em] text-white/20"
          }
        >
          {status}
        </span>
      </div>

      <h2 className="mt-7 text-lg font-medium tracking-[-0.02em]">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-white/35">
        {description}
      </p>

      {href && (
        <div className="mt-6 flex items-center gap-2 text-xs text-white/30 transition-colors group-hover:text-white/60">
          Open module
          <span className="transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group block rounded-[1.6rem] border border-white/[0.08] bg-white/[0.02] p-6 transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-white/[0.035]"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-[1.6rem] border border-white/[0.07] bg-white/[0.015] p-6">
      {content}
    </div>
  );
}