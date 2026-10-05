import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { isDocumentNavigation } from "@/lib/auth/request-kind";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

const ALLOWED_STATUSES = new Set([
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
]);

type RouteContext = {
  params: Promise<{
    milestoneId: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  // ---------------------------------------------------------
  // 1. Authentication
  // ---------------------------------------------------------

  const { userId } = await auth();

  if (!userId) {
    // Native form post -> back to sign-in; fetch/script -> 401 JSON. Never data.
    return isDocumentNavigation(request.headers)
      ? NextResponse.redirect(
          new URL("/sign-in?redirect_url=/admin", request.url),
          303
        )
      : NextResponse.json(
          { error: "Unauthorized" },
          { status: 401, headers: { "Cache-Control": "no-store" } }
        );
  }

  // ---------------------------------------------------------
  // 2. Platform-admin authorization
  // ---------------------------------------------------------

  const platformAdmin = await isPlatformAdmin();

  if (!platformAdmin) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const { milestoneId } = await context.params;

  // A malformed ID can never match a row: 404 before the query, not a database error.
  if (!isUuid(milestoneId)) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  const supabase = createAdminSupabaseClient();

  // ---------------------------------------------------------
  // 3. Read and validate submitted status
  // ---------------------------------------------------------

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form submission." },
      { status: 400 }
    );
  }

  const rawStatus = formData.get("status");

  if (
    typeof rawStatus !== "string" ||
    !ALLOWED_STATUSES.has(rawStatus)
  ) {
    return NextResponse.json(
      { error: "Invalid milestone status." },
      { status: 400 }
    );
  }

  // ---------------------------------------------------------
  // 4. Load milestone
  // ---------------------------------------------------------

  const { data: milestone, error: milestoneError } =
    await supabase
      .from("milestones")
      .select(
        `
          id,
          project_id,
          title,
          status,
          completed_at
        `
      )
      .eq("id", milestoneId)
      .maybeSingle();

  if (milestoneError) {
    console.error("Milestone status lookup failed:", {
      code: milestoneError.code,
      message: milestoneError.message,
    });

    return NextResponse.json(
      { error: "Unable to load milestone." },
      { status: 500 }
    );
  }

  if (!milestone) {
    return NextResponse.json(
      { error: "Milestone not found." },
      { status: 404 }
    );
  }

  // ---------------------------------------------------------
  // 5. Verify parent project
  // ---------------------------------------------------------

  const { data: project, error: projectError } =
    await supabase
      .from("projects")
      .select("id, organization_id, name")
      .eq("id", milestone.project_id)
      .maybeSingle();

  if (projectError) {
    console.error("Milestone project lookup failed:", {
      code: projectError.code,
      message: projectError.message,
    });

    return NextResponse.json(
      { error: "Unable to verify milestone project." },
      { status: 500 }
    );
  }

  if (!project) {
    return NextResponse.json(
      { error: "Project not found." },
      { status: 404 }
    );
  }

  // ---------------------------------------------------------
  // 6. Verify parent organisation
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
    console.error(
      "Milestone status organisation lookup failed:",
      {
        code: organizationError.code,
        message: organizationError.message,
      }
    );

    return NextResponse.json(
      { error: "Unable to verify client organisation." },
      { status: 500 }
    );
  }

  if (!organization) {
    return NextResponse.json(
      { error: "Client organisation not found." },
      { status: 404 }
    );
  }

  if (organization.status !== "ACTIVE") {
    return NextResponse.json(
      {
        error:
          "Milestones cannot be changed for an inactive organisation.",
      },
      { status: 409 }
    );
  }

  // ---------------------------------------------------------
  // 7. Nothing to update if status is unchanged
  // ---------------------------------------------------------

  if (milestone.status === rawStatus) {
    return NextResponse.redirect(
      new URL(`/admin/projects/${project.id}`, request.url),
      303
    );
  }

  const previousStatus = milestone.status;

  // ---------------------------------------------------------
  // 8. Maintain completed_at
  //
  // COMPLETED:
  //   record when completion occurred.
  //
  // Anything else:
  //   milestone is no longer complete, so clear timestamp.
  // ---------------------------------------------------------

  const completedAt =
    rawStatus === "COMPLETED"
      ? new Date().toISOString()
      : null;

  // ---------------------------------------------------------
  // 9. Update milestone
  // ---------------------------------------------------------

  const {
    data: updatedMilestone,
    error: updateError,
  } = await supabase
    .from("milestones")
    .update({
      status: rawStatus,
      completed_at: completedAt,
    })
    .eq("id", milestone.id)
    .select(
      `
        id,
        project_id,
        title,
        status,
        completed_at
      `
    )
    .single();

  if (updateError || !updatedMilestone) {
    console.error("Milestone status update failed:", {
      code: updateError?.code,
      message: updateError?.message,
    });

    return NextResponse.json(
      { error: "Unable to update milestone status." },
      { status: 500 }
    );
  }

  // ---------------------------------------------------------
  // 10. Audit status change
  // ---------------------------------------------------------

  const { error: auditError } = await supabase
    .from("audit_logs")
    .insert({
      actor_clerk_user_id: userId,
      action: "MILESTONE_STATUS_CHANGED",
      entity_type: "milestone",
      entity_id: updatedMilestone.id,
      metadata: {
        organization_id: organization.id,
        organization_name: organization.name,
        project_id: project.id,
        project_name: project.name,
        milestone_title: updatedMilestone.title,
        previous_status: previousStatus,
        new_status: updatedMilestone.status,
        completed_at: updatedMilestone.completed_at,
      },
    });

  if (auditError) {
    console.error("Milestone status audit failed:", {
      code: auditError.code,
      message: auditError.message,
    });
  }

  // ---------------------------------------------------------
  // 11. Return to project
  // ---------------------------------------------------------

  return NextResponse.redirect(
    new URL(`/admin/projects/${project.id}`, request.url),
    303
  );
}