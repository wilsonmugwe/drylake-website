import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload } from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

export const metadata = {
  title: "Upload Document | Drylake Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type NewDocumentPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function NewDocumentPage({
  params,
}: NewDocumentPageProps) {
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
  // Project
  // ---------------------------------------------------------

  const { data: project, error: projectError } =
    await supabase
      .from("projects")
      .select("id, organization_id, name, status")
      .eq("id", projectId)
      .maybeSingle();

  if (projectError) {
    console.error("Document upload project lookup failed:", {
      code: projectError.code,
      message: projectError.message,
    });

    throw new Error("Unable to load project.");
  }

  if (!project) {
    notFound();
  }

  // ---------------------------------------------------------
  // Organisation
  // ---------------------------------------------------------

  const { data: organization, error: organizationError } =
    await supabase
      .from("organizations")
      .select("id, name, status")
      .eq("id", project.organization_id)
      .maybeSingle();

  if (organizationError) {
    console.error("Document upload organisation lookup failed:", {
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
          title="Upload Document"
          description={`Add a private document to ${project.name}.`}
        />

        <section className="mt-7 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          {organization.status !== "ACTIVE" ? (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm leading-6 text-amber-800">
                Documents cannot be uploaded while this client
                organisation is inactive.
              </p>
            </div>
          ) : null}

          <form
            action={`/api/admin/projects/${project.id}/documents`}
            method="POST"
            encType="multipart/form-data"
            className="space-y-7"
          >
            <div>
              <label
                htmlFor="file"
                className="block text-sm font-semibold text-neutral-900"
              >
                Document
              </label>

              <div className="mt-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 sm:p-6">
                <Upload
                  size={22}
                  className="text-[#f26a2e]"
                />

                <input
                  id="file"
                  name="file"
                  type="file"
                  required
                  accept=".pdf,.docx,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png"
                  className="mt-5 block w-full min-w-0 text-sm text-neutral-600 file:mr-4 file:min-h-11 file:cursor-pointer file:rounded-xl file:border-0 file:bg-neutral-950 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-neutral-800"
                />

                <p className="mt-4 text-xs leading-5 text-neutral-500">
                  PDF, DOCX or PNG. Maximum file size: 10 MB.
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-neutral-900"
              >
                Display name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                maxLength={160}
                autoComplete="off"
                placeholder="Optional, defaults to the file name"
                className="mt-3 min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#f26a2e] focus:ring-4 focus:ring-[#f26a2e]/10 disabled:cursor-not-allowed disabled:bg-neutral-100"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 transition hover:bg-neutral-100/70">
              <input
                type="checkbox"
                name="visibleToClient"
                value="true"
                defaultChecked
                className="mt-0.5 h-5 w-5 shrink-0 accent-[#f26a2e]"
              />

              <span>
                <span className="block text-sm font-semibold text-neutral-900">
                  Visible to client
                </span>

                <span className="mt-1 block text-xs leading-5 text-neutral-500">
                  Allow authorised members of this client organisation
                  to view and download this document.
                </span>
              </span>
            </label>

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
                <Upload size={16} aria-hidden="true" />
                Upload Document
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}