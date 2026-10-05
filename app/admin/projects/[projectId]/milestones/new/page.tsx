import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import AdminDateInput from "@/components/admin/AdminDateInput";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
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

const inputClassName =
  "mt-3 min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#f26a2e] focus:ring-4 focus:ring-[#f26a2e]/10 disabled:cursor-not-allowed disabled:bg-neutral-100";

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
    <main className="min-h-screen p-5 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/admin/projects/${project.id}`}
          className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to project
        </Link>

        <AdminPageHeader
          eyebrow={organization.name}
          title="Add Milestone"
          description={`Add a delivery checkpoint to ${project.name}.`}
        />

        {/* Form */}
        <section className="mt-7 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          {organization.status !== "ACTIVE" ? (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm leading-6 text-amber-800">
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
                className="block text-sm font-semibold text-neutral-900"
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
                className={inputClassName}
              />
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-semibold text-neutral-900"
              >
                Status
              </label>

              <select
                id="status"
                name="status"
                defaultValue="NOT_STARTED"
                className={inputClassName}
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

            {/* Due date (optional, submitted as YYYY-MM-DD under "dueDate") */}
            <AdminDateInput
              id="dueDate"
              name="dueDate"
              label="Due date"
            />

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 pt-7 sm:flex-row sm:justify-end">
              <Link
                href={`/admin/projects/${project.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={organization.status !== "ACTIVE"}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
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
