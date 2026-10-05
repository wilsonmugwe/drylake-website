import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquareText, ShieldCheck } from "lucide-react";

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
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <Link
            href={`/admin/projects/${project.id}`}
            className="flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            Project
          </Link>

          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-[#f26a2e]" />

            <span className="text-xs uppercase tracking-[0.18em] text-white/35">
              Platform Admin
            </span>
          </div>
        </header>

        <section className="py-14 sm:py-16">
          <MessageSquareText size={24} className="text-[#f26a2e]" />

          <p className="mt-7 text-xs font-medium uppercase tracking-[0.2em] text-[#f26a2e]">
            {organization.name}
          </p>

          <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
            New project update
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-6 text-white/45">
            Publish an update for {project.name}. Client-visible
            updates will later appear in the client portal.
          </p>
        </section>

        <form
          action={`/api/admin/projects/${project.id}/updates`}
          method="POST"
          className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-6 sm:p-8"
        >
          <div>
            <label
              htmlFor="title"
              className="text-sm font-medium text-white/80"
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
              className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/30"
            />
          </div>

          <div className="mt-6">
            <label
              htmlFor="body"
              className="text-sm font-medium text-white/80"
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
              className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/20 focus:border-white/30"
            />
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
            <input
              id="visibleToClient"
              name="visibleToClient"
              type="checkbox"
              value="true"
              defaultChecked
              className="mt-1"
            />

            <div>
              <label
                htmlFor="visibleToClient"
                className="text-sm font-medium text-white/80"
              >
                Visible to client
              </label>

              <p className="mt-1 text-xs leading-5 text-white/35">
                When enabled, this update can be displayed to authorised
                members of this client organisation.
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <button
              type="submit"
              className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90"
            >
              Publish update
            </button>

            <Link
              href={`/admin/projects/${project.id}`}
              className="rounded-xl border border-white/10 px-5 py-3 text-sm text-white/50 transition hover:border-white/20 hover:text-white"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}