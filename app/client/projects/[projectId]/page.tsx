import { notFound, redirect } from "next/navigation";

import ClientProjectView from "@/components/client/ClientProjectView";
import ClientWorkspaceGate from "@/components/client/ClientWorkspaceGate";
import { getClientWorkspace } from "@/lib/auth/client-context";
import { signInUrl } from "@/lib/auth/guards";
import { isUuid } from "@/lib/validation/uuid";

export const metadata = {
  title: "Project | Client Portal",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type ClientProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ClientProjectPage({
  params,
}: ClientProjectPageProps) {
  const { projectId } = await params;
  const returnTo = isUuid(projectId) ? `/client/projects/${projectId}` : "/client";

  // The ONE authoritative workspace resolution (same as /client). Organisation comes from
  // Clerk membership, never from the URL; activation returns the user to this project.
  const workspace = await getClientWorkspace();

  if (workspace.state === "signed-out") {
    redirect(signInUrl(returnTo));
  }

  if (workspace.state !== "ready") {
    return <ClientWorkspaceGate workspace={workspace} returnTo={returnTo} />;
  }

  // A malformed ID can never match a row: 404 before the query, not a database error.
  if (!isUuid(projectId)) {
    notFound();
  }

  // RLS-scoped client that verified this organisation with the user's token.
  const { supabase, organization } = workspace;

  // ---------------------------------------------------------
  // Project
  //
  // We explicitly constrain by organisation_id even though
  // RLS provides the primary tenant-isolation boundary.
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
        target_end_date
      `
    )
    .eq("id", projectId)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (projectError) {
    console.error("Client project lookup failed:", {
      code: projectError.code,
      message: projectError.message,
    });

    throw new Error("Unable to load project.");
  }

  if (!project) {
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
          completed_at
        `
      )
      .eq("project_id", project.id)
      .order("position", { ascending: true });

  if (milestonesError) {
    console.error("Client milestones failed:", {
      code: milestonesError.code,
      message: milestonesError.message,
    });
  }

  // ---------------------------------------------------------
  // Published client updates only.
  //
  // The query intentionally applies the visibility conditions
  // in addition to the database RLS policy.
  // ---------------------------------------------------------

  const { data: updates, error: updatesError } =
    await supabase
      .from("project_updates")
      .select(
        `
          id,
          title,
          body,
          published_at,
          created_at
        `
      )
      .eq("project_id", project.id)
      .eq("visible_to_client", true)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false });

  if (updatesError) {
    console.error("Client project updates failed:", {
      code: updatesError.code,
      message: updatesError.message,
    });
  }

  // ---------------------------------------------------------
  // Client-visible documents for this project only.
  //
  // Same scoping as the download route: project_id of an
  // org-verified project + visible_to_client, on top of RLS.
  // ---------------------------------------------------------

  const { data: documents, error: documentsError } =
    await supabase
      .from("documents")
      .select("id, name, mime_type, size_bytes, created_at")
      .eq("project_id", project.id)
      .eq("visible_to_client", true)
      .order("created_at", { ascending: false });

  if (documentsError) {
    console.error("Client project documents failed:", {
      code: documentsError.code,
      message: documentsError.message,
    });
  }

  const milestoneList = milestones ?? [];
  const updateList = updates ?? [];

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

  return (
    <ClientProjectView
      organizationName={organization.name}
      project={{
        name: project.name,
        status: project.status,
        progress: displayedProgress,
        startDate: project.start_date,
        targetEndDate: project.target_end_date,
      }}
      milestones={
        milestonesError
          ? { ok: false }
          : {
              ok: true,
              data: milestoneList.map((milestone) => ({
                id: milestone.id,
                title: milestone.title,
                description: milestone.description,
                status: milestone.status,
                dueDate: milestone.due_date,
                completedAt: milestone.completed_at,
              })),
            }
      }
      updates={
        updatesError
          ? { ok: false }
          : {
              ok: true,
              data: updateList.map((update) => ({
                id: update.id,
                title: update.title,
                body: update.body,
                publishedAt: update.published_at,
              })),
            }
      }
      documents={
        documentsError
          ? { ok: false }
          : {
              ok: true,
              data: (documents ?? []).map((document) => ({
                id: document.id,
                name: document.name,
                projectName: null,
                mimeType: document.mime_type,
                sizeBytes:
                  document.size_bytes === null
                    ? null
                    : Number(document.size_bytes),
                createdAt: document.created_at,
              })),
            }
      }
    />
  );
}
