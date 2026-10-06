import { notFound, redirect } from "next/navigation";

import ClientProjectView from "@/components/client/ClientProjectView";
import ClientWorkspaceGate from "@/components/client/ClientWorkspaceGate";
import { getClientWorkspace } from "@/lib/auth/client-context";
import { signInUrl } from "@/lib/auth/guards";
import { logRouteTiming, startRequestTiming, timed } from "@/lib/perf/request-timing";
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

function logQueryError(
  label: string,
  error: { code?: string; message?: string } | null
) {
  if (error) {
    console.error(label, { code: error.code, message: error.message });
  }
}

export default async function ClientProjectPage({
  params,
}: ClientProjectPageProps) {
  startRequestTiming();

  const { projectId } = await params;
  const returnTo = isUuid(projectId) ? `/client/projects/${projectId}` : "/client";

  // The ONE authoritative workspace resolution (same as /client). Organisation comes from
  // Clerk membership, never from the URL; activation returns the user to this project.
  const workspace = await getClientWorkspace();

  if (workspace.state === "signed-out") {
    redirect(signInUrl(returnTo));
  }

  if (workspace.state !== "ready") {
    logRouteTiming("/client/projects/[projectId]", workspace.state);

    return <ClientWorkspaceGate workspace={workspace} returnTo={returnTo} />;
  }

  // A malformed ID can never match a row: 404 before the query, not a database error.
  if (!isUuid(projectId)) {
    notFound();
  }

  // RLS-scoped client that verified this organisation with the user's token.
  const { supabase, organization } = workspace;

  // ---------------------------------------------------------
  // One parallel wave instead of four sequential round trips.
  //
  // Every query runs through RLS with the user's token. The
  // project query carries the explicit organisation constraint;
  // milestones, updates and documents are keyed by the same
  // project ID. Nothing is rendered unless the project row comes
  // back for THIS organisation (checked below), so a project ID
  // from another tenant still ends in notFound() with nothing
  // shown, exactly as when the queries ran one after another.
  // ---------------------------------------------------------

  const [projectResult, milestonesResult, updatesResult, documentsResult] =
    await timed("content", () =>
      Promise.all([
        supabase
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
          .maybeSingle(),

        supabase
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
          .eq("project_id", projectId)
          .order("position", { ascending: true }),

        // Published client updates only: visibility conditions on top of RLS.
        supabase
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
          .eq("project_id", projectId)
          .eq("visible_to_client", true)
          .not("published_at", "is", null)
          .order("published_at", { ascending: false }),

        // Same scoping as the download route: project_id + visible_to_client, on top of RLS.
        supabase
          .from("documents")
          .select("id, name, mime_type, size_bytes, created_at")
          .eq("project_id", projectId)
          .eq("visible_to_client", true)
          .order("created_at", { ascending: false }),
      ])
    );

  const { data: project, error: projectError } = projectResult;

  if (projectError) {
    console.error("Client project lookup failed:", {
      code: projectError.code,
      message: projectError.message,
    });

    throw new Error("Unable to load project.");
  }

  // Missing, hidden or another tenant's project: nothing below is ever rendered.
  if (!project || project.organization_id !== organization.id) {
    notFound();
  }

  const { data: milestones, error: milestonesError } = milestonesResult;
  const { data: updates, error: updatesError } = updatesResult;
  const { data: documents, error: documentsError } = documentsResult;

  logQueryError("Client milestones failed:", milestonesError);
  logQueryError("Client project updates failed:", updatesError);
  logQueryError("Client project documents failed:", documentsError);

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

  logRouteTiming("/client/projects/[projectId]", workspace.state);

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
