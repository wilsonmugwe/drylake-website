import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  FolderKanban,
  ShieldCheck,
} from "lucide-react";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

export const metadata = {
  title: "Create Project | Drylake Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type NewProjectPageProps = {
  params: Promise<{
    organizationId: string;
  }>;
};

export default async function NewProjectPage({
  params,
}: NewProjectPageProps) {
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

  // A malformed ID can never match a row: 404 before the query, not a database error.
  if (!isUuid(organizationId)) {
    notFound();
  }

  // ---------------------------------------------------------
  // Load organisation
  // ---------------------------------------------------------

  const supabase = createAdminSupabaseClient();

  const { data: organization, error } = await supabase
    .from("organizations")
    .select("id, name, status")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    console.error("Create project organisation lookup failed:", {
      code: error.code,
      message: error.message,
    });

    throw new Error("Unable to load client organisation.");
  }

  if (!organization) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:px-12">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <Link
            href={`/admin/clients/${organization.id}`}
            className="flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} />
            {organization.name}
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

        {/* Heading */}
        <section className="py-14 sm:py-16">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.025]">
            <FolderKanban
              size={19}
              className="text-[#f26a2e]"
            />
          </div>

          <p className="mt-7 text-xs font-medium uppercase tracking-[0.2em] text-[#f26a2e]">
            {organization.name}
          </p>

          <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
            Create Project
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/50">
            Create a project for this client. Progress will initially be
            calculated automatically from project milestones.
          </p>
        </section>

        {/* Form */}
        <form
          action={`/api/admin/clients/${organization.id}/projects`}
          method="POST"
          className="space-y-8 rounded-[2rem] border border-white/10 bg-white/[0.025] p-6 sm:p-8"
        >
          {/* Project name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-white"
            >
              Project name
            </label>

            <p className="mt-1 text-sm text-white/40">
              A clear internal and client-facing name for the project.
            </p>

            <input
              id="name"
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={120}
              autoComplete="off"
              placeholder="Website Redesign"
              className="mt-4 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-white/30"
            />
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-white"
            >
              Initial status
            </label>

            <p className="mt-1 text-sm text-white/40">
              You can change the project status later.
            </p>

            <select
              id="status"
              name="status"
              defaultValue="PLANNING"
              className="mt-4 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/30"
            >
              <option value="PLANNING">Planning</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On hold</option>
            </select>
          </div>

          {/* Dates */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="startDate"
                className="flex items-center gap-2 text-sm font-medium text-white"
              >
                <CalendarDays
                  size={15}
                  className="text-white/40"
                />
                Start date
              </label>

              <p className="mt-1 text-sm text-white/40">
                Optional.
              </p>

              <input
                id="startDate"
                name="startDate"
                type="date"
                className="mt-4 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/30"
              />
            </div>

            <div>
              <label
                htmlFor="targetEndDate"
                className="flex items-center gap-2 text-sm font-medium text-white"
              >
                <CalendarDays
                  size={15}
                  className="text-white/40"
                />
                Target end date
              </label>

              <p className="mt-1 text-sm text-white/40">
                Optional.
              </p>

              <input
                id="targetEndDate"
                name="targetEndDate"
                type="date"
                className="mt-4 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/30"
              />
            </div>
          </div>

          {/* Progress explanation */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-5">
            <p className="text-sm font-medium text-white">
              Project progress
            </p>

            <p className="mt-2 text-sm leading-6 text-white/40">
              Progress starts in automatic mode. Once milestones are
              added, Drylake will calculate project progress from
              milestone completion. An administrator can override the
              calculated value later if required.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-7 sm:flex-row sm:justify-end">
            <Link
              href={`/admin/clients/${organization.id}`}
              className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium text-white/60 transition hover:text-white"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold !text-black transition hover:bg-white/90"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}