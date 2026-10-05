import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  ShieldCheck,
  Upload,
} from "lucide-react";

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
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:px-12">
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

        <section className="py-12 sm:py-16">
          <FileText
            size={24}
            className="text-[#f26a2e]"
          />

          <p className="mt-7 text-xs font-medium uppercase tracking-[0.2em] text-[#f26a2e]">
            {organization.name}
          </p>

          <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
            Upload Document
          </h1>

          <p className="mt-4 text-sm leading-6 text-white/45">
            Add a private document to {project.name}.
          </p>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-6 sm:p-8">
          {organization.status !== "ACTIVE" ? (
            <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
              <p className="text-sm text-amber-200">
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
                className="text-sm font-medium text-white/80"
              >
                Document
              </label>

              <div className="mt-2 rounded-[1.25rem] border border-dashed border-white/15 bg-black/30 p-6">
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
                  className="mt-5 block w-full text-sm text-white/50 file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-black"
                />

                <p className="mt-4 text-xs leading-5 text-white/30">
                  PDF, DOCX or PNG. Maximum file size: 10 MB.
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="name"
                className="text-sm font-medium text-white/80"
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
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/30"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
              <input
                type="checkbox"
                name="visibleToClient"
                value="true"
                defaultChecked
                className="mt-1 h-4 w-4"
              />

              <span>
                <span className="block text-sm font-medium text-white/80">
                  Visible to client
                </span>

                <span className="mt-1 block text-xs leading-5 text-white/35">
                  Allow authorised members of this client organisation
                  to view and download this document.
                </span>
              </span>
            </label>

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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold !text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Upload size={16} />
                Upload Document
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}