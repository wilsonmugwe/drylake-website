import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const ALLOWED_STATUSES = new Set([
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
]);

const MAX_TITLE_LENGTH = 120;

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  // ---------------------------------------------------------
  // 1. Authentication
  // ---------------------------------------------------------

  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(
      new URL("/sign-in?redirect_url=/admin", request.url),
      303
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

  const { projectId } = await context.params;

  const supabase = createAdminSupabaseClient();

  // ---------------------------------------------------------
  // 3. Verify project
  // ---------------------------------------------------------

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, organization_id, name, status")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    console.error("Milestone project lookup failed:", {
      code: projectError.code,
      message: projectError.message,
    });

    return NextResponse.json(
      { error: "Unable to verify project." },
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
  // 4. Verify parent organisation
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
    console.error("Milestone organisation lookup failed:", {
      code: organizationError.code,
      message: organizationError.message,
    });

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
          "Milestones cannot be created for an inactive organisation.",
      },
      { status: 409 }
    );
  }

  // ---------------------------------------------------------
  // 5. Read form
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

  const rawTitle = formData.get("title");
  const rawStatus = formData.get("status");
  const rawDueDate = formData.get("dueDate");

  // ---------------------------------------------------------
  // 6. Validate title
  // ---------------------------------------------------------

  if (typeof rawTitle !== "string") {
    return NextResponse.json(
      { error: "Milestone title is required." },
      { status: 400 }
    );
  }

  const title = rawTitle.replace(/\s+/g, " ").trim();

  if (
    title.length < 2 ||
    title.length > MAX_TITLE_LENGTH
  ) {
    return NextResponse.json(
      {
        error:
          "Milestone title must be between 2 and 120 characters.",
      },
      { status: 400 }
    );
  }

  if (/[\u0000-\u001F\u007F]/.test(title)) {
    return NextResponse.json(
      {
        error:
          "Milestone title contains invalid characters.",
      },
      { status: 400 }
    );
  }

  // ---------------------------------------------------------
  // 7. Validate status
  // ---------------------------------------------------------

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
  // 8. Validate optional due date
  // ---------------------------------------------------------

  const dueDate =
    typeof rawDueDate === "string" &&
    rawDueDate.trim() !== ""
      ? rawDueDate.trim()
      : null;

  if (dueDate && !isValidDate(dueDate)) {
    return NextResponse.json(
      { error: "Invalid milestone due date." },
      { status: 400 }
    );
  }

  // ---------------------------------------------------------
  // 9. Determine next position
  // ---------------------------------------------------------

  const {
    data: lastMilestone,
    error: positionError,
  } = await supabase
    .from("milestones")
    .select("position")
    .eq("project_id", project.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (positionError) {
    console.error("Milestone position lookup failed:", {
      code: positionError.code,
      message: positionError.message,
    });

    return NextResponse.json(
      {
        error: "Unable to determine milestone position.",
      },
      { status: 500 }
    );
  }

  const nextPosition =
    typeof lastMilestone?.position === "number"
      ? lastMilestone.position + 1
      : 0;

  // ---------------------------------------------------------
  // 10. Determine completion timestamp
  // ---------------------------------------------------------

  const completedAt =
    rawStatus === "COMPLETED"
      ? new Date().toISOString()
      : null;

  // ---------------------------------------------------------
  // 11. Create milestone
  // ---------------------------------------------------------

  const {
    data: milestone,
    error: milestoneError,
  } = await supabase
    .from("milestones")
    .insert({
      project_id: project.id,
      title,
      status: rawStatus,
      due_date: dueDate,
      position: nextPosition,
      completed_at: completedAt,
    })
    .select(
      `
        id,
        project_id,
        title,
        status,
        due_date,
        position,
        completed_at
      `
    )
    .single();

  if (milestoneError || !milestone) {
    console.error("Admin milestone creation failed:", {
      code: milestoneError?.code,
      message: milestoneError?.message,
    });

    return NextResponse.json(
      { error: "Unable to create milestone." },
      { status: 500 }
    );
  }

  // ---------------------------------------------------------
  // 12. Audit event
  // ---------------------------------------------------------

  const { error: auditError } = await supabase
    .from("audit_logs")
    .insert({
      actor_clerk_user_id: userId,
      action: "MILESTONE_CREATED",
      entity_type: "milestone",
      entity_id: milestone.id,
      metadata: {
        organization_id: organization.id,
        organization_name: organization.name,
        project_id: project.id,
        project_name: project.name,
        milestone_title: milestone.title,
        milestone_status: milestone.status,
        milestone_position: milestone.position,
      },
    });

  if (auditError) {
    console.error("Milestone creation audit failed:", {
      code: auditError.code,
      message: auditError.message,
    });
  }

  // ---------------------------------------------------------
  // 13. Redirect back to project
  // ---------------------------------------------------------

  return NextResponse.redirect(
    new URL(`/admin/projects/${project.id}`, request.url),
    303
  );
}