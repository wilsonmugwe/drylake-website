import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import ClientProjectView from "@/components/client/ClientProjectView";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/client");
  }

  if (!orgId) {
    redirect("/client");
  }

  const { projectId } = await params;

  // A malformed ID can never match a row: 404 before the query, not a database error.
  if (!isUuid(projectId)) {
    notFound();
  }
  const supabase = createServerSupabaseClient();

  // ---------------------------------------------------------
  // Organisation
  //
  // RLS also enforces that this organisation matches the
  // active Clerk organisation.
  // ---------------------------------------------------------

  const { data: organization, error: organizationError } =
    await supabase
      .from("organizations")
      .select("id, name, status")
      .eq("clerk_org_id", orgId)
      .eq("status", "ACTIVE")
      .maybeSingle();

  if (organizationError) {
    console.error("Client organisation lookup failed:", {
      code: organizationError.code,
      message: organizationError.message,
    });

    throw new Error("Unable to load client organisation.");
  }

  if (!organization) {
    notFound();
  }

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
