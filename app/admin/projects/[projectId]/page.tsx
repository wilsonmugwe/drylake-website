import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  FileText,
  Plus,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

export const metadata = {
  title: "Project | Drylake Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) return "Not set";

  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string | null) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatFileSize(sizeBytes: number | null) {
  if (
    sizeBytes === null ||
    !Number.isFinite(sizeBytes) ||
    sizeBytes < 0
  ) {
    return "Unknown size";
  }

  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (sizeBytes >= 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`;
  }

  return `${sizeBytes} B`;
}

function formatFileType(mimeType: string | null) {
  switch (mimeType) {
    case "application/pdf":
      return "PDF";

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "DOCX";

    case "image/png":
      return "PNG";

    default:
      return "File";
  }
}

export default async function AdminProjectPage({
  params,
}: ProjectPageProps) {
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

  // Service-role/admin access is only created after the
  // explicit platform-admin authorization check above.
  const supabase = createAdminSupabaseClient();

  // ---------------------------------------------------------
  // Project
  // ---------------------------------------------------------

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(
      `
        id,
        organization_id,
        name,
        status,
        progress_override,
        start_date,
        target_end_date,
        created_at
      `
    )
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    console.error("Admin project lookup failed:", {
      code: projectError.code,
      message: projectError.message,
    });

    throw new Error("Unable to load project.");
  }

  if (!project) {
    notFound();
  }

  // ---------------------------------------------------------
  // Parent organisation
  // ---------------------------------------------------------

  const { data: organization, error: organizationError } =
    await supabase
      .from("organizations")
      .select("id, name, status")
      .eq("id", project.organization_id)
      .maybeSingle();

  if (organizationError) {
    console.error("Project organisation lookup failed:", {
      code: organizationError.code,
      message: organizationError.message,
    });

    throw new Error("Unable to load project organisation.");
  }

  if (!organization) {
    notFound();
  }

  // ---------------------------------------------------------
  // Milestones
  // ---------------------------------------------------------

  const { data: milestones, error: milestonesError } =
    await supabase
      .from("milestones")
      .select(
        `
          id,
          title,
          description,
          status,
          position,
          due_date,
          completed_at,
          created_at
        `
      )
      .eq("project_id", project.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

  if (milestonesError) {
    console.error("Admin project milestones failed:", {
      code: milestonesError.code,
      message: milestonesError.message,
    });
  }

  // ---------------------------------------------------------
  // Project updates
  //
  // Admin sees published and internal/unpublished updates.
  // ---------------------------------------------------------

  const { data: updates, error: updatesError } = await supabase
    .from("project_updates")
    .select(
      `
        id,
        title,
        body,
        visible_to_client,
        published_at,
        created_at
      `
    )
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  if (updatesError) {
    console.error("Admin project updates failed:", {
      code: updatesError.code,
      message: updatesError.message,
    });
  }

  // ---------------------------------------------------------
  // Documents
  //
  // Admin intentionally sees ALL documents for this project.
  // Do not filter visible_to_client here.
  // ---------------------------------------------------------

  const { data: documents, error: documentsError } =
    await supabase
      .from("documents")
      .select(
        `
          id,
          name,
          mime_type,
          size_bytes,
          visible_to_client,
          created_at
        `
      )
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });

  if (documentsError) {
    console.error("Admin project documents failed:", {
      code: documentsError.code,
      message: documentsError.message,
    });
  }

  const milestoneList = milestones ?? [];
  const updateList = updates ?? [];
  const documentList = documents ?? [];

  // ---------------------------------------------------------
  // Automatic progress
  // ---------------------------------------------------------

  const completedMilestones = milestoneList.filter(
    (milestone) => milestone.status === "COMPLETED"
  ).length;

  const automaticProgress =
    milestoneList.length > 0
      ? Math.round(
          (completedMilestones / milestoneList.length) * 100
        )
      : 0;

  const displayedProgress =
    project.progress_override !== null
      ? project.progress_override
      : automaticProgress;

  const progressMode =
    project.progress_override !== null
      ? "Manual override"
      : "Automatic";

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
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

        {/* Project heading */}
        <section className="flex flex-col gap-8 py-14 sm:flex-row sm:items-end sm:justify-between sm:py-16">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#f26a2e]">
              {organization.name}
            </p>

            <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
              {project.name}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-white/10 px-3 py-1 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-white/50">
                {project.status.replaceAll("_", " ")}
              </span>

              <span className="text-xs text-white/30">
                {progressMode} progress
              </span>
            </div>
          </div>

          {/* Admin actions */}
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/admin/projects/${project.id}/updates/new`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-white/70 transition hover:border-white/20 hover:text-white"
            >
              <Plus size={16} />
              Add Update
            </Link>

            <Link
              href={`/admin/projects/${project.id}/documents/new`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-white/70 transition hover:border-white/20 hover:text-white"
            >
              <Upload size={16} />
              Upload Document
            </Link>

            <Link
              href={`/admin/projects/${project.id}/milestones/new`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold !text-black transition-colors hover:bg-white/90"
            >
              <Plus size={16} />
              Add Milestone
            </Link>
          </div>
        </section>

        {/* Overview */}
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-white/35">
              Progress
            </p>

            <div className="mt-5 flex items-end gap-2">
              <p className="text-4xl font-medium">
                {displayedProgress}%
              </p>

              <p className="pb-1 text-xs text-white/35">
                {progressMode}
              </p>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#f26a2e] transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, displayedProgress)
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6">
            <CalendarDays
              size={19}
              className="text-[#f26a2e]"
            />

            <p className="mt-5 text-xs uppercase tracking-[0.16em] text-white/35">
              Start Date
            </p>

            <p className="mt-2 text-lg font-medium">
              {formatDate(project.start_date)}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6">
            <Clock3
              size={19}
              className="text-[#f26a2e]"
            />

            <p className="mt-5 text-xs uppercase tracking-[0.16em] text-white/35">
              Target Completion
            </p>

            <p className="mt-2 text-lg font-medium">
              {formatDate(project.target_end_date)}
            </p>
          </div>
        </section>

        {/* Milestones */}
        <section className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025]">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 sm:px-8">
            <div>
              <h2 className="font-medium">
                Milestones
              </h2>

              <p className="mt-1 text-xs text-white/35">
                Project delivery checkpoints
              </p>
            </div>

            <span className="text-xs uppercase tracking-[0.15em] text-white/30">
              {completedMilestones}/{milestoneList.length} completed
            </span>
          </div>

          {milestonesError ? (
            <div className="px-6 py-8 sm:px-8">
              <p className="text-sm text-red-400">
                Unable to load milestones.
              </p>
            </div>
          ) : milestoneList.length > 0 ? (
            <div>
              {milestoneList.map((milestone) => {
                const completed =
                  milestone.status === "COMPLETED";

                return (
                  <div
                    key={milestone.id}
                    className="flex flex-col gap-5 border-b border-white/10 px-6 py-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:px-8"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      {completed ? (
                        <CheckCircle2
                          size={19}
                          className="shrink-0 text-[#f26a2e]"
                        />
                      ) : (
                        <Circle
                          size={19}
                          className="shrink-0 text-white/25"
                        />
                      )}

                      <div className="min-w-0">
                        <p className="font-medium">
                          {milestone.title}
                        </p>

                        {milestone.description ? (
                          <p className="mt-1 max-w-2xl text-xs leading-5 text-white/40">
                            {milestone.description}
                          </p>
                        ) : null}

                        <p className="mt-1 text-xs text-white/30">
                          {milestone.due_date
                            ? `Due ${formatDate(
                                milestone.due_date
                              )}`
                            : "No due date"}
                        </p>
                      </div>
                    </div>

                    <form
                      action={`/api/admin/milestones/${milestone.id}/status`}
                      method="POST"
                      className="flex shrink-0 items-center gap-2"
                    >
                      <select
                        name="status"
                        defaultValue={milestone.status}
                        aria-label={`Status for ${milestone.title}`}
                        className="rounded-xl border border-white/10 bg-black px-3 py-2 text-xs uppercase tracking-[0.08em] text-white/60 outline-none transition focus:border-white/30"
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

                      <button
                        type="submit"
                        className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/60 transition hover:border-white/20 hover:text-white"
                      >
                        Save
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-10 sm:px-8">
              <Circle
                size={22}
                className="text-[#f26a2e]"
              />

              <h3 className="mt-5 text-lg font-medium">
                No milestones yet
              </h3>

              <p className="mt-2 max-w-lg text-sm leading-6 text-white/40">
                Add milestones to break the project into measurable
                delivery checkpoints. Project progress will be
                calculated automatically as milestones are completed.
              </p>

              <Link
                href={`/admin/projects/${project.id}/milestones/new`}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/70 transition hover:border-white/20 hover:text-white"
              >
                <Plus size={15} />
                Add first milestone
              </Link>
            </div>
          )}
        </section>

        {/* Project Updates */}
        <section className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025]">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 sm:px-8">
            <div>
              <h2 className="font-medium">
                Project Updates
              </h2>

              <p className="mt-1 text-xs text-white/35">
                Updates published or prepared for this project
              </p>
            </div>

            <Link
              href={`/admin/projects/${project.id}/updates/new`}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-white/60 transition hover:border-white/20 hover:text-white"
            >
              <Plus size={14} />
              Add Update
            </Link>
          </div>

          {updatesError ? (
            <div className="px-6 py-8 sm:px-8">
              <p className="text-sm text-red-400">
                Unable to load project updates.
              </p>
            </div>
          ) : updateList.length > 0 ? (
            <div>
              {updateList.map((update) => (
                <article
                  key={update.id}
                  className="border-b border-white/10 px-6 py-6 last:border-b-0 sm:px-8"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-medium">
                        {update.title}
                      </h3>

                      <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-white/45">
                        {update.body}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.1em] ${
                          update.visible_to_client
                            ? "border-[#f26a2e]/30 text-[#f26a2e]"
                            : "border-white/10 text-white/35"
                        }`}
                      >
                        {update.visible_to_client
                          ? "Visible to client"
                          : "Internal"}
                      </span>

                      <span className="text-xs text-white/25">
                        {formatDateTime(
                          update.published_at ??
                            update.created_at
                        )}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-6 py-10 sm:px-8">
              <h3 className="text-lg font-medium">
                No project updates yet
              </h3>

              <p className="mt-2 text-sm text-white/40">
                Publish an update when there is progress to share.
              </p>

              <Link
                href={`/admin/projects/${project.id}/updates/new`}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/70 transition hover:border-white/20 hover:text-white"
              >
                <Plus size={15} />
                Add first update
              </Link>
            </div>
          )}
        </section>

        {/* Documents */}
        <section className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025]">
          <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div>
              <h2 className="font-medium">
                Documents
              </h2>

              <p className="mt-1 text-xs text-white/35">
                Files managed by Drylake for this project
              </p>
            </div>

            <Link
              href={`/admin/projects/${project.id}/documents/new`}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-white/60 transition hover:border-white/20 hover:text-white"
            >
              <Upload size={14} />
              Upload Document
            </Link>
          </div>

          {documentsError ? (
            <div className="px-6 py-8 sm:px-8">
              <p className="text-sm text-red-400">
                Unable to load documents.
              </p>
            </div>
          ) : documentList.length > 0 ? (
            <div>
              {documentList.map((document) => (
                <div
                  key={document.id}
                  className="flex flex-col gap-5 border-b border-white/10 px-6 py-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:px-8"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                      <FileText
                        size={18}
                        className="text-[#f26a2e]"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {document.name}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/30">
                        <span>
                          {formatFileType(document.mime_type)}
                        </span>

                        <span>
                          {formatFileSize(document.size_bytes)}
                        </span>

                        <span>
                          Uploaded{" "}
                          {formatDateTime(document.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`w-fit shrink-0 rounded-full border px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.1em] ${
                      document.visible_to_client
                        ? "border-[#f26a2e]/30 text-[#f26a2e]"
                        : "border-white/10 text-white/35"
                    }`}
                  >
                    {document.visible_to_client
                      ? "Visible to client"
                      : "Internal"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-10 sm:px-8">
              <FileText
                size={22}
                className="text-[#f26a2e]"
              />

              <h3 className="mt-5 text-lg font-medium">
                No documents yet
              </h3>

              <p className="mt-2 max-w-lg text-sm leading-6 text-white/40">
                Upload project documents and choose whether each file
                should be visible to the client.
              </p>

              <Link
                href={`/admin/projects/${project.id}/documents/new`}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/70 transition hover:border-white/20 hover:text-white"
              >
                <Upload size={15} />
                Upload first document
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}