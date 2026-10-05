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
  Upload,
} from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
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

  const secondaryButtonClassName =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50";

  const visibilityChipClassName = (visible: boolean) =>
    `inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.1em] ${
      visible
        ? "bg-orange-50 text-[#c2541f]"
        : "bg-neutral-100 text-neutral-600"
    }`;

  return (
    <main className="min-h-screen p-5 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-[1450px]">
        <Link
          href={`/admin/clients/${organization.id}`}
          className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {organization.name}
        </Link>

        <AdminPageHeader
          eyebrow={organization.name}
          title={project.name}
          description={`Status: ${project.status.replaceAll("_", " ").toLowerCase()} · ${progressMode} progress`}
          action={
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={`/admin/projects/${project.id}/updates/new`}
                className={secondaryButtonClassName}
              >
                <Plus size={16} aria-hidden="true" />
                Add Update
              </Link>

              <Link
                href={`/admin/projects/${project.id}/documents/new`}
                className={secondaryButtonClassName}
              >
                <Upload size={16} aria-hidden="true" />
                Upload Document
              </Link>

              <Link
                href={`/admin/projects/${project.id}/milestones/new`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                <Plus size={16} aria-hidden="true" />
                Add Milestone
              </Link>
            </div>
          }
        />

        {/* Overview */}
        <section className="mt-7 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Progress
            </p>

            <div className="mt-5 flex items-end gap-2">
              <p className="text-4xl font-semibold tracking-[-0.03em] text-neutral-950">
                {displayedProgress}%
              </p>

              <p className="pb-1 text-xs text-neutral-500">
                {progressMode}
              </p>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-neutral-100">
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

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <CalendarDays
              size={19}
              className="text-[#f26a2e]"
              aria-hidden="true"
            />

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Start Date
            </p>

            <p className="mt-2 text-lg font-semibold text-neutral-950">
              {formatDate(project.start_date)}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <Clock3
              size={19}
              className="text-[#f26a2e]"
              aria-hidden="true"
            />

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Target Completion
            </p>

            <p className="mt-2 text-lg font-semibold text-neutral-950">
              {formatDate(project.target_end_date)}
            </p>
          </div>
        </section>

        {/* Milestones */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-neutral-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="font-semibold text-neutral-950">
                Milestones
              </h2>

              <p className="mt-1 text-xs text-neutral-500">
                Project delivery checkpoints
              </p>
            </div>

            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">
              {completedMilestones}/{milestoneList.length} completed
            </span>
          </div>

          {milestonesError ? (
            <div className="p-5 sm:p-6">
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
                    className="flex flex-col gap-4 border-b border-neutral-100 px-5 py-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="flex min-w-0 items-start gap-4 sm:items-center">
                      {completed ? (
                        <CheckCircle2
                          size={19}
                          className="mt-0.5 shrink-0 text-[#f26a2e] sm:mt-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <Circle
                          size={19}
                          className="mt-0.5 shrink-0 text-neutral-300 sm:mt-0"
                          aria-hidden="true"
                        />
                      )}

                      <div className="min-w-0">
                        <p className="break-words font-semibold text-neutral-950">
                          {milestone.title}
                        </p>

                        {milestone.description ? (
                          <p className="mt-1 max-w-2xl text-xs leading-5 text-neutral-600">
                            {milestone.description}
                          </p>
                        ) : null}

                        <p className="mt-1 text-xs text-neutral-500">
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
                      className="flex w-full shrink-0 items-center gap-2 sm:w-auto"
                    >
                      <select
                        name="status"
                        defaultValue={milestone.status}
                        aria-label={`Status for ${milestone.title}`}
                        className="min-h-11 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-950 outline-none transition focus:border-[#f26a2e] focus:ring-4 focus:ring-[#f26a2e]/10 sm:flex-none"
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
                        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
                      >
                        Save
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-10 sm:px-6">
              <Circle
                size={22}
                className="text-[#f26a2e]"
                aria-hidden="true"
              />

              <h3 className="mt-5 text-lg font-semibold text-neutral-950">
                No milestones yet
              </h3>

              <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-600">
                Add milestones to break the project into measurable
                delivery checkpoints. Project progress will be
                calculated automatically as milestones are completed.
              </p>

              <Link
                href={`/admin/projects/${project.id}/milestones/new`}
                className={`mt-6 ${secondaryButtonClassName}`}
              >
                <Plus size={15} aria-hidden="true" />
                Add first milestone
              </Link>
            </div>
          )}
        </section>

        {/* Project Updates */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-neutral-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="font-semibold text-neutral-950">
                Project Updates
              </h2>

              <p className="mt-1 text-xs text-neutral-500">
                Updates published or prepared for this project
              </p>
            </div>

            <Link
              href={`/admin/projects/${project.id}/updates/new`}
              className={`w-fit ${secondaryButtonClassName}`}
            >
              <Plus size={14} aria-hidden="true" />
              Add Update
            </Link>
          </div>

          {updatesError ? (
            <div className="p-5 sm:p-6">
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Unable to load project updates.
              </p>
            </div>
          ) : updateList.length > 0 ? (
            <div>
              {updateList.map((update) => (
                <article
                  key={update.id}
                  className="border-b border-neutral-100 px-5 py-6 last:border-b-0 sm:px-6"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="break-words font-semibold text-neutral-950">
                        {update.title}
                      </h3>

                      <p className="mt-3 max-w-3xl whitespace-pre-wrap break-words text-sm leading-6 text-neutral-700">
                        {update.body}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                      <span
                        className={visibilityChipClassName(
                          Boolean(update.visible_to_client)
                        )}
                      >
                        {update.visible_to_client
                          ? "Visible to client"
                          : "Internal"}
                      </span>

                      <span className="text-xs text-neutral-500">
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
            <div className="px-5 py-10 sm:px-6">
              <h3 className="text-lg font-semibold text-neutral-950">
                No project updates yet
              </h3>

              <p className="mt-2 text-sm text-neutral-600">
                Publish an update when there is progress to share.
              </p>

              <Link
                href={`/admin/projects/${project.id}/updates/new`}
                className={`mt-6 ${secondaryButtonClassName}`}
              >
                <Plus size={15} aria-hidden="true" />
                Add first update
              </Link>
            </div>
          )}
        </section>

        {/* Documents */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-neutral-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="font-semibold text-neutral-950">
                Documents
              </h2>

              <p className="mt-1 text-xs text-neutral-500">
                Files managed by Drylake for this project
              </p>
            </div>

            <Link
              href={`/admin/projects/${project.id}/documents/new`}
              className={`w-fit ${secondaryButtonClassName}`}
            >
              <Upload size={14} aria-hidden="true" />
              Upload Document
            </Link>
          </div>

          {documentsError ? (
            <div className="p-5 sm:p-6">
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Unable to load documents.
              </p>
            </div>
          ) : documentList.length > 0 ? (
            <div>
              {documentList.map((document) => (
                <div
                  key={document.id}
                  className="flex flex-col gap-4 border-b border-neutral-100 px-5 py-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                      <FileText
                        size={18}
                        className="text-[#f26a2e]"
                        aria-hidden="true"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-neutral-950">
                        {document.name}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
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
                    className={visibilityChipClassName(
                      Boolean(document.visible_to_client)
                    )}
                  >
                    {document.visible_to_client
                      ? "Visible to client"
                      : "Internal"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 sm:px-6">
              <FileText
                size={22}
                className="text-[#f26a2e]"
                aria-hidden="true"
              />

              <h3 className="mt-5 text-lg font-semibold text-neutral-950">
                No documents yet
              </h3>

              <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-600">
                Upload project documents and choose whether each file
                should be visible to the client.
              </p>

              <Link
                href={`/admin/projects/${project.id}/documents/new`}
                className={`mt-6 ${secondaryButtonClassName}`}
              >
                <Upload size={15} aria-hidden="true" />
                Upload first document
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
