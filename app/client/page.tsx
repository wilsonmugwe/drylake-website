import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  Plus,
  ShieldCheck,
} from "lucide-react";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Clients | Drylake Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  const { userId } = await auth();

  // ----------------------------------------------------------
  // AUTHENTICATION
  // ----------------------------------------------------------

  if (!userId) {
    redirect("/sign-in?redirect_url=/admin/clients");
  }

  // ----------------------------------------------------------
  // PLATFORM ADMIN AUTHORIZATION
  // ----------------------------------------------------------

  const platformAdmin = await isPlatformAdmin();

  if (!platformAdmin) {
    redirect("/client");
  }

  // ----------------------------------------------------------
  // ADMIN DATABASE CONNECTION
  // ----------------------------------------------------------

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

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} />
            Admin
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

        {/* Page heading */}
        <section className="flex flex-col gap-6 py-14 sm:flex-row sm:items-end sm:justify-between sm:py-16">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#f26a2e]">
              Administration
            </p>

            <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
              Clients
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-white/50">
              Manage the organisations connected to the Drylake
              client platform.
            </p>
          </div>

          {/* Not functional yet */}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/35">
            <Plus size={16} />
            Create client — next
          </div>
        </section>

        {/* Error */}
        {error ? (
          <section className="rounded-[2rem] border border-red-500/20 bg-red-500/[0.04] p-7 sm:p-10">
            <Building2
              size={22}
              className="text-red-400"
            />

            <h2 className="mt-6 text-xl font-medium">
              Unable to load clients
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-white/45">
              The administration database connection could not
              retrieve client organisations.
            </p>
          </section>
        ) : organizations && organizations.length > 0 ? (
          /* Client list */
          <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025]">
            <div className="border-b border-white/10 px-6 py-5 sm:px-8">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                {organizations.length}{" "}
                {organizations.length === 1
                  ? "organisation"
                  : "organisations"}
              </p>
            </div>

            <div>
              {organizations.map((organization) => (
                <div
                  key={organization.id}
                  className="flex items-center justify-between gap-5 border-b border-white/10 px-6 py-5 last:border-b-0 sm:px-8"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.025]">
                      <Building2
                        size={18}
                        className="text-[#f26a2e]"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {organization.name}
                      </p>

                      <p className="mt-1 truncate text-xs text-white/30">
                        {organization.clerk_org_id}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-white/45">
                      {organization.status}
                    </span>

                    <ChevronRight
                      size={17}
                      className="text-white/25"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          /* Empty state */
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-8 sm:p-10">
            <Building2
              size={22}
              className="text-[#f26a2e]"
            />

            <h2 className="mt-6 text-2xl font-medium">
              No client organisations
            </h2>

            <p className="mt-3 max-w-lg text-sm leading-6 text-white/45">
              Client organisations created for the Drylake platform
              will appear here.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}