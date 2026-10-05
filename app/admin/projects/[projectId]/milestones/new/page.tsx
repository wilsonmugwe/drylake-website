import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Flag,
  ShieldCheck,
} from "lucide-react";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

export const metadata = {
  title: "Add Milestone | Drylake Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type NewMilestonePageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function NewMilestonePage({
  params,
}: NewMilestonePageProps) {
  // ---------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------

  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/admin");
  }

  // ---------------------------------------------------------
  // Platform-admin authorization
  // ---------------------------------------------------------

  const platformAdmin = await isPlatformAdmin();

  if (!platformAdmin) {
    redirect("/client");
  }

  const { projectId } = await params;

  // A malformed ID can never match a row: 404 before the query, not a database error.
  if (!isUuid(projectId)) {
    notFound();
  }
  const supabase = createAdminSupabaseClient();

  // ---------------------------------------------------------
  // Load project
  // ---------------------------------------------------------

  const { data: project, error: projectError } =
    await supabase
      .from("projects")
      .select("id, organization_id, name, status")
      .eq("id", projectId)
      .maybeSingle();

  if (projectError) {
    console.error("New milestone project lookup failed:", {
      code: projectError.code,
      message: projectError.message,
    });

    throw new Error("Unable to load project.");
  }

  if (!project) {
    notFound();
  }

  // ---------------------------------------------------------
  // Load organisation
  // ---------------------------------------------------------

  const {
    data: organization,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .select("id, name, status")
    .eq("id", project.organization_id)
    .maybeSingle();

  if (organizationError) {
    console.error("New milestone organisation lookup failed:", {
      code: organizationError.code,
      message: organizationError.message,
    });

    throw new Error("Unable to load client organisation.");
  }

  if (!organization) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:px-12">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <Link
            href={`/admin/projects/${project.id}`}
            className="inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to project
          </Link>

          <div className="flex items-center gap-2">
            <ShieldCheck
              size={14}
              className="text-[#f26a2e]"
            />

            <span className="text-xs uppercase tracking-[0.16em] text-white/35">
              Platform Admin
            </span>
          </div>
        </header>

        {/* Heading */}
        <section className="py-12 sm:py-16">
          <Flag
            size={24}
            className="text-[#f26a2e]"
          />

          <p className="mt-7 text-xs font-medium uppercase tracking-[0.2em] text-[#f26a2e]">
            {organization.name}
          </p>

          <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
            Add Milestone
          </h1>

          <p className="mt-4 text-sm leading-6 text-white/45">
            Add a delivery checkpoint to {project.name}.
          </p>
        </section>

        {/* Form */}
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-6 sm:p-8">
          {organization.status !== "ACTIVE" ? (
            <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
              <p className="text-sm text-amber-200">
                This client organisation is not active. New milestones
                cannot be created until the organisation is active.
              </p>
            </div>
          ) : null}

          <form
            action={`/api/admin/projects/${project.id}/milestones`}
            method="POST"
            className="space-y-7"
          >
            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="text-sm font-medium text-white/80"
              >
                Milestone title
              </label>

              <input
                id="title"
                name="title"
                type="text"
                required
                minLength={2}
                maxLength={120}
                autoComplete="off"
                placeholder="e.g. Discovery & Requirements"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/30"
              />
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="status"
                className="text-sm font-medium text-white/80"
              >
                Status
              </label>

              <select
                id="status"
                name="status"
                defaultValue="NOT_STARTED"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white/70 outline-none transition focus:border-white/30"
              >
                <option value="NOT_STARTED">
                  Not started
                </option>

                <option value="IN_PROGRESS">
                  In progress
                </option>

                <option value="COMPLETED">
                  Completed
                </option>
              </select>
            </div>

            {/* Due date */}
            <div>
              <label
                htmlFor="dueDate"
                className="text-sm font-medium text-white/80"
              >
                Due date
              </label>

              <input
                id="dueDate"
                name="dueDate"
                type="date"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
              />

              <p className="mt-2 text-xs text-white/30">
                Optional.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-7 sm:flex-row sm:justify-end">
              <Link
                href={`/admin/projects/${project.id}`}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-white/60 transition hover:border-white/20 hover:text-white"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={organization.status !== "ACTIVE"}
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold !text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Create Milestone
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}