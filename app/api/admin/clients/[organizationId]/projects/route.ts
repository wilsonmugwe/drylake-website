import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

const ALLOWED_STATUSES = new Set([
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
]);

const MAX_PROJECT_NAME_LENGTH = 120;

type RouteContext = {
  params: Promise<{
    organizationId: string;
  }>;
};

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
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
      new URL("/sign-in?redirect_url=/admin/clients", request.url),
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

  const { organizationId } = await context.params;

  // A malformed ID can never match a row: 404 before the query, not a database error.
  if (!isUuid(organizationId)) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  // ---------------------------------------------------------
  // 3. Read form data
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

  const rawName = formData.get("name");
  const rawStatus = formData.get("status");
  const rawStartDate = formData.get("startDate");
  const rawTargetEndDate = formData.get("targetEndDate");

  // ---------------------------------------------------------
  // 4. Validate project name
  // ---------------------------------------------------------

  if (typeof rawName !== "string") {
    return NextResponse.json(
      { error: "Project name is required." },
      { status: 400 }
    );
  }

  const name = rawName.replace(/\s+/g, " ").trim();

  if (
    name.length < 2 ||
    name.length > MAX_PROJECT_NAME_LENGTH
  ) {
    return NextResponse.json(
      {
        error:
          "Project name must be between 2 and 120 characters.",
      },
      { status: 400 }
    );
  }

  if (/[\u0000-\u001F\u007F]/.test(name)) {
    return NextResponse.json(
      { error: "Project name contains invalid characters." },
      { status: 400 }
    );
  }

  // ---------------------------------------------------------
  // 5. Validate status
  // ---------------------------------------------------------

  if (
    typeof rawStatus !== "string" ||
    !ALLOWED_STATUSES.has(rawStatus)
  ) {
    return NextResponse.json(
      { error: "Invalid project status." },
      { status: 400 }
    );
  }

  // ---------------------------------------------------------
  // 6. Validate dates
  // ---------------------------------------------------------

  const startDate =
    typeof rawStartDate === "string" &&
    rawStartDate.trim() !== ""
      ? rawStartDate.trim()
      : null;

  const targetEndDate =
    typeof rawTargetEndDate === "string" &&
    rawTargetEndDate.trim() !== ""
      ? rawTargetEndDate.trim()
      : null;

  if (startDate && !isValidDate(startDate)) {
    return NextResponse.json(
      { error: "Invalid start date." },
      { status: 400 }
    );
  }

  if (targetEndDate && !isValidDate(targetEndDate)) {
    return NextResponse.json(
      { error: "Invalid target end date." },
      { status: 400 }
    );
  }

  if (
    startDate &&
    targetEndDate &&
    targetEndDate < startDate
  ) {
    return NextResponse.json(
      {
        error:
          "Target end date cannot be before the start date.",
      },
      { status: 400 }
    );
  }

  const supabase = createAdminSupabaseClient();

  // ---------------------------------------------------------
  // 7. Verify organisation exists
  //
  // Never trust organizationId simply because it came from
  // our own form URL.
  // ---------------------------------------------------------

  const {
    data: organization,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .select("id, name, status")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError) {
    console.error("Project organisation lookup failed:", {
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
          "Projects cannot be created for an inactive organisation.",
      },
      { status: 409 }
    );
  }

  // ---------------------------------------------------------
  // 8. Create project
  //
  // progress_override deliberately stays NULL.
  // ---------------------------------------------------------

  const {
    data: project,
    error: projectError,
  } = await supabase
    .from("projects")
    .insert({
      organization_id: organization.id,
      name,
      status: rawStatus,
      start_date: startDate,
      target_end_date: targetEndDate,
      progress_override: null,
    })
    .select(
      "id, organization_id, name, status, start_date, target_end_date"
    )
    .single();

  if (projectError || !project) {
    console.error("Admin project creation failed:", {
      code: projectError?.code,
      message: projectError?.message,
    });

    return NextResponse.json(
      { error: "Unable to create project." },
      { status: 500 }
    );
  }

  // ---------------------------------------------------------
  // 9. Audit event
  // ---------------------------------------------------------

  const { error: auditError } = await supabase
    .from("audit_logs")
    .insert({
      actor_clerk_user_id: userId,
      action: "PROJECT_CREATED",
      entity_type: "project",
      entity_id: project.id,
      metadata: {
        organization_id: organization.id,
        organization_name: organization.name,
        project_name: project.name,
        project_status: project.status,
      },
    });

  if (auditError) {
    console.error("Project creation audit log failed:", {
      code: auditError.code,
      message: auditError.message,
    });
  }

  // ---------------------------------------------------------
  // 10. Redirect back to client
  // ---------------------------------------------------------

  return NextResponse.redirect(
    new URL(
      `/admin/clients/${organization.id}`,
      request.url
    ),
    303
  );
}