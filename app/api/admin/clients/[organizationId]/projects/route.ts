import {
  auth,
} from "@clerk/nextjs/server";

import {
  NextResponse,
} from "next/server";

import {
  isPlatformAdmin,
} from "@/lib/auth/platform-admin";

import {
  createAdminSupabaseClient,
} from "@/lib/supabase/admin";

import {
  isUuid,
} from "@/lib/validation/uuid";

const ALLOWED_STATUSES =
  new Set([
    "PLANNING",
    "ACTIVE",
    "ON_HOLD",
  ]);

const MAX_PROJECT_NAME_LENGTH =
  120;

type RouteContext = {
  params: Promise<{
    organizationId: string;
  }>;
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,

      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}

function isValidDate(
  value: string
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return false;
  }

  const date =
    new Date(
      `${value}T00:00:00Z`
    );

  return (
    !Number.isNaN(
      date.getTime()
    ) &&
    date
      .toISOString()
      .slice(0, 10) ===
      value
  );
}

/*
 * POST: create a project for an ACTIVE client (form fields name, status, startDate,
 * targetEndDate). Admin only, and cross-tenant by design: the organisation comes from the
 * path and is re-read, and its status checked, before the insert. Answers JSON (401 when
 * signed out) because the admin form posts with fetch.
 */
export async function POST(
  request: Request,
  context: RouteContext
) {
  // ---------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------

  const { userId } =
    await auth();

  if (!userId) {
    return jsonResponse(
      {
        error:
          "Your session has expired. Please sign in again.",
      },
      401
    );
  }

  // ---------------------------------------------------------
  // Platform admin
  // ---------------------------------------------------------

  const platformAdmin =
    await isPlatformAdmin();

  if (!platformAdmin) {
    return jsonResponse(
      {
        error:
          "You do not have permission to create projects.",
      },
      403
    );
  }

  const {
    organizationId,
  } = await context.params;

  if (
    !isUuid(organizationId)
  ) {
    return jsonResponse(
      {
        error:
          "Client organisation not found.",
      },
      404
    );
  }

  // ---------------------------------------------------------
  // Form
  // ---------------------------------------------------------

  let formData: FormData;

  try {
    formData =
      await request.formData();
  } catch {
    return jsonResponse(
      {
        error:
          "Invalid form submission.",
      },
      400
    );
  }

  const rawName =
    formData.get("name");

  const rawStatus =
    formData.get("status");

  const rawStartDate =
    formData.get("startDate");

  const rawTargetEndDate =
    formData.get(
      "targetEndDate"
    );

  // ---------------------------------------------------------
  // Name
  // ---------------------------------------------------------

  if (
    typeof rawName !==
    "string"
  ) {
    return jsonResponse(
      {
        error:
          "Project name is required.",
      },
      400
    );
  }

  const name =
    rawName
      .replace(/\s+/g, " ")
      .trim();

  if (
    name.length < 2 ||
    name.length >
      MAX_PROJECT_NAME_LENGTH
  ) {
    return jsonResponse(
      {
        error:
          "Project name must be between 2 and 120 characters.",
      },
      400
    );
  }

  if (
    /[\u0000-\u001F\u007F]/.test(
      name
    )
  ) {
    return jsonResponse(
      {
        error:
          "Project name contains invalid characters.",
      },
      400
    );
  }

  // ---------------------------------------------------------
  // Status
  // ---------------------------------------------------------

  if (
    typeof rawStatus !==
      "string" ||
    !ALLOWED_STATUSES.has(
      rawStatus
    )
  ) {
    return jsonResponse(
      {
        error:
          "Invalid project status.",
      },
      400
    );
  }

  // ---------------------------------------------------------
  // Dates
  // ---------------------------------------------------------

  const startDate =
    typeof rawStartDate ===
      "string" &&
    rawStartDate.trim()
      ? rawStartDate.trim()
      : null;

  const targetEndDate =
    typeof rawTargetEndDate ===
      "string" &&
    rawTargetEndDate.trim()
      ? rawTargetEndDate.trim()
      : null;

  if (
    startDate &&
    !isValidDate(startDate)
  ) {
    return jsonResponse(
      {
        error:
          "Enter a valid start date.",
      },
      400
    );
  }

  if (
    targetEndDate &&
    !isValidDate(
      targetEndDate
    )
  ) {
    return jsonResponse(
      {
        error:
          "Enter a valid target end date.",
      },
      400
    );
  }

  if (
    startDate &&
    targetEndDate &&
    targetEndDate <
      startDate
  ) {
    return jsonResponse(
      {
        error:
          "Target end date cannot be before the start date.",
      },
      400
    );
  }

  const supabase =
    createAdminSupabaseClient();

  // ---------------------------------------------------------
  // Organisation
  // ---------------------------------------------------------

  const {
    data: organization,
    error:
      organizationError,
  } = await supabase
    .from("organizations")
    .select(
      `
        id,
        name,
        status
      `
    )
    .eq(
      "id",
      organizationId
    )
    .maybeSingle();

  if (organizationError) {
    console.error(
      "Project organisation lookup failed:",
      {
        code:
          organizationError.code,

        message:
          organizationError.message,
      }
    );

    return jsonResponse(
      {
        error:
          "Unable to verify client organisation.",
      },
      500
    );
  }

  if (!organization) {
    return jsonResponse(
      {
        error:
          "Client organisation not found.",
      },
      404
    );
  }

  if (
    organization.status !==
    "ACTIVE"
  ) {
    return jsonResponse(
      {
        error:
          "Projects cannot be created for an inactive organisation.",
      },
      409
    );
  }

  // ---------------------------------------------------------
  // Create project
  // ---------------------------------------------------------

  const {
    data: project,
    error: projectError,
  } = await supabase
    .from("projects")
    .insert({
      organization_id:
        organization.id,

      name,

      status:
        rawStatus,

      start_date:
        startDate,

      target_end_date:
        targetEndDate,

      progress_override:
        null,
    })
    .select(
      `
        id,
        organization_id,
        name,
        status,
        start_date,
        target_end_date
      `
    )
    .single();

  if (
    projectError ||
    !project
  ) {
    console.error(
      "Admin project creation failed:",
      {
        code:
          projectError?.code,

        message:
          projectError?.message,
      }
    );

    return jsonResponse(
      {
        error:
          "Unable to create project. Please try again.",
      },
      500
    );
  }

  // ---------------------------------------------------------
  // Audit
  // ---------------------------------------------------------

  const {
    error: auditError,
  } = await supabase
    .from("audit_logs")
    .insert({
      actor_clerk_user_id:
        userId,

      action:
        "PROJECT_CREATED",

      entity_type:
        "project",

      entity_id:
        project.id,

      metadata: {
        organization_id:
          organization.id,

        organization_name:
          organization.name,

        project_name:
          project.name,

        project_status:
          project.status,
      },
    });

  if (auditError) {
    console.error(
      "Project creation audit log failed:",
      {
        code:
          auditError.code,

        message:
          auditError.message,
      }
    );
  }

  return jsonResponse({
    success: true,

    projectId:
      project.id,

    organizationId:
      organization.id,
  });
}