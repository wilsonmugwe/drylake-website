import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

export const metadata = {
  title: "New Project Update | Drylake Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function NewProjectUpdatePage({
  params,
}: PageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/admin");
  }

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

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, organization_id, name")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    console.error("Project lookup failed:", {
      code: projectError.code,
      message: projectError.message,
    });

    throw new Error("Unable to load project.");
  }

  if (!project) {
    notFound();
  }

  const { data: organization, error: organizationError } =
    await supabase
      .from("organizations")
      .select("id, name, status")
      .eq("id", project.organization_id)
      .maybeSingle();

  if (organizationError) {
    console.error("Organisation lookup failed:", {
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
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/admin/projects/${project.id}`}
          className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Project
        </Link>

        <AdminPageHeader
          eyebrow={organization.name}
          title="New project update"
          description={`Publish an update for ${project.name}. Client-visible updates will later appear in Drylake Workspace.`}
        />

        <form
          action={`/api/admin/projects/${project.id}/updates`}
          method="POST"
          className="mt-7 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-semibold text-neutral-900"
            >
              Update title
            </label>

            <input
              id="title"
              name="title"
              type="text"
              required
              minLength={2}
              maxLength={120}
              placeholder="Development has commenced"
              className="mt-3 min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#f26a2e] focus:ring-4 focus:ring-[#f26a2e]/10 disabled:cursor-not-allowed disabled:bg-neutral-100"
            />
          </div>

          <div className="mt-6">
            <label
              htmlFor="body"
              className="block text-sm font-semibold text-neutral-900"
            >
              Update
            </label>

            <textarea
              id="body"
              name="body"
              required
              minLength={2}
              maxLength={5000}
              rows={8}
              placeholder="Provide the client with a concise update on the project's progress..."
              className="mt-3 w-full resize-y rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm leading-6 text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#f26a2e] focus:ring-4 focus:ring-[#f26a2e]/10 disabled:cursor-not-allowed disabled:bg-neutral-100"
            />
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <input
              id="visibleToClient"
              name="visibleToClient"
              type="checkbox"
              value="true"
              defaultChecked
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#f26a2e]"
            />

            <div>
              <label
                htmlFor="visibleToClient"
                className="text-sm font-semibold text-neutral-900"
              >
                Visible to client
              </label>

              <p className="mt-1 text-xs leading-5 text-neutral-500">
                When enabled, this update can be displayed to authorised
                members of this client organisation.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-neutral-200 pt-7 sm:flex-row sm:justify-end">
            <Link
              href={`/admin/projects/${project.id}`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
            >
              Publish update
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
