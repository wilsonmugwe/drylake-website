import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 5000;

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
  // 3. Read form
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
  const rawBody = formData.get("body");
  const rawVisibleToClient = formData.get("visibleToClient");

  // ---------------------------------------------------------
  // 4. Validate title
  // ---------------------------------------------------------

  if (typeof rawTitle !== "string") {
    return NextResponse.json(
      { error: "Update title is required." },
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
          "Update title must be between 2 and 120 characters.",
      },
      { status: 400 }
    );
  }

  if (/[\u0000-\u001F\u007F]/.test(title)) {
    return NextResponse.json(
      { error: "Update title contains invalid characters." },
      { status: 400 }
    );
  }

  // ---------------------------------------------------------
  // 5. Validate body
  //
  // Newlines are allowed in the update body.
  // We reject dangerous control characters while preserving
  // normal formatting such as \n and \t.
  // ---------------------------------------------------------

  if (typeof rawBody !== "string") {
    return NextResponse.json(
      { error: "Update content is required." },
      { status: 400 }
    );
  }

  const body = rawBody.trim();

  if (
    body.length < 2 ||
    body.length > MAX_BODY_LENGTH
  ) {
    return NextResponse.json(
      {
        error:
          "Update content must be between 2 and 5000 characters.",
      },
      { status: 400 }
    );
  }

  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(body)) {
    return NextResponse.json(
      { error: "Update content contains invalid characters." },
      { status: 400 }
    );
  }

  // ---------------------------------------------------------
  // 6. Client visibility
  //
  // HTML checkbox:
  // checked   -> "true"
  // unchecked -> null
  // ---------------------------------------------------------

  const visibleToClient = rawVisibleToClient === "true";

  // ---------------------------------------------------------
  // 7. Verify project
  // ---------------------------------------------------------

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, organization_id, name, status")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    console.error("Project update project lookup failed:", {
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
  // 8. Verify parent organisation
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
    console.error("Project update organisation lookup failed:", {
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
          "Updates cannot be published for an inactive organisation.",
      },
      { status: 409 }
    );
  }

  // ---------------------------------------------------------
  // 9. Create update
  //
  // If visible to the client, published_at is set now.
  // Internal-only updates remain unpublished.
  // ---------------------------------------------------------

  const publishedAt = visibleToClient
    ? new Date().toISOString()
    : null;

  const {
    data: projectUpdate,
    error: insertError,
  } = await supabase
    .from("project_updates")
    .insert({
      project_id: project.id,
      title,
      body,
      visible_to_client: visibleToClient,
      published_at: publishedAt,
      created_by_clerk_user_id: userId,
    })
    .select(
      "id, project_id, title, visible_to_client, published_at, created_at"
    )
    .single();

  if (insertError || !projectUpdate) {
    console.error("Project update creation failed:", {
      code: insertError?.code,
      message: insertError?.message,
    });

    return NextResponse.json(
      { error: "Unable to create project update." },
      { status: 500 }
    );
  }

  // ---------------------------------------------------------
  // 10. Audit event
  // ---------------------------------------------------------

  const { error: auditError } = await supabase
    .from("audit_logs")
    .insert({
      actor_clerk_user_id: userId,
      action: "PROJECT_UPDATE_CREATED",
      entity_type: "project_update",
      entity_id: projectUpdate.id,
      metadata: {
        organization_id: organization.id,
        organization_name: organization.name,
        project_id: project.id,
        project_name: project.name,
        update_title: projectUpdate.title,
        visible_to_client: projectUpdate.visible_to_client,
      },
    });

  if (auditError) {
    console.error("Project update audit failed:", {
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