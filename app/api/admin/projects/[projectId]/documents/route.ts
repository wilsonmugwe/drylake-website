import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hasExpectedSignature } from "@/lib/validation/file-signature";
import { isUuid } from "@/lib/validation/uuid";

export const dynamic = "force-dynamic";

const BUCKET = "client-documents";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const MAX_NAME_LENGTH = 160;

const ALLOWED_FILES = new Map([
  ["application/pdf", "pdf"],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "docx",
  ],
  ["image/png", "png"],
]);

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

function errorResponse(
  message: string,
  status: number
) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function cleanDisplayName(value: string) {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanOriginalFileName(value: string) {
  const baseName =
    value.split(/[\\/]/).pop() ?? "document";

  return baseName
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getExtension(value: string) {
  const index = value.lastIndexOf(".");

  if (index === -1) {
    return "";
  }

  return value.slice(index + 1).toLowerCase();
}

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  // ---------------------------------------------------------
  // 1. Authentication
  // ---------------------------------------------------------

  const { userId } = await auth();

  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  // ---------------------------------------------------------
  // 2. Platform-admin authorization
  // ---------------------------------------------------------

  const platformAdmin = await isPlatformAdmin();

  if (!platformAdmin) {
    return errorResponse("Forbidden", 403);
  }

  const { projectId } = await params;

  // A malformed ID can never match a row: 404 before the query, not a database error.
  if (!isUuid(projectId)) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!projectId) {
    return errorResponse("Invalid project.", 400);
  }

  const supabase = createAdminSupabaseClient();

  // ---------------------------------------------------------
  // 3. Verify project
  // ---------------------------------------------------------

  const { data: project, error: projectError } =
    await supabase
      .from("projects")
      .select("id, organization_id, name")
      .eq("id", projectId)
      .maybeSingle();

  if (projectError) {
    console.error("Document project lookup failed:", {
      code: projectError.code,
      message: projectError.message,
    });

    return errorResponse(
      "Unable to verify project.",
      500
    );
  }

  if (!project) {
    return errorResponse("Project not found.", 404);
  }

  // ---------------------------------------------------------
  // 4. Verify organisation
  // ---------------------------------------------------------

  const { data: organization, error: organizationError } =
    await supabase
      .from("organizations")
      .select("id, name, status")
      .eq("id", project.organization_id)
      .maybeSingle();

  if (organizationError) {
    console.error("Document organisation lookup failed:", {
      code: organizationError.code,
      message: organizationError.message,
    });

    return errorResponse(
      "Unable to verify client organisation.",
      500
    );
  }

  if (!organization) {
    return errorResponse(
      "Client organisation not found.",
      404
    );
  }

  if (organization.status !== "ACTIVE") {
    return errorResponse(
      "Documents cannot be uploaded for an inactive organisation.",
      409
    );
  }

  // ---------------------------------------------------------
  // 5. Parse multipart form
  // ---------------------------------------------------------

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return errorResponse(
      "Invalid upload request.",
      400
    );
  }

  const rawFile = formData.get("file");
  const rawName = formData.get("name");
  const rawVisibleToClient =
    formData.get("visibleToClient");

  if (!(rawFile instanceof File)) {
    return errorResponse(
      "A document is required.",
      400
    );
  }

  // ---------------------------------------------------------
  // 6. File size
  // ---------------------------------------------------------

  if (rawFile.size <= 0) {
    return errorResponse(
      "The selected file is empty.",
      400
    );
  }

  if (rawFile.size > MAX_FILE_SIZE) {
    return errorResponse(
      "The document exceeds the 10 MB upload limit.",
      413
    );
  }

  // ---------------------------------------------------------
  // 7. MIME type + extension validation
  //
  // Browser-provided MIME data alone is not sufficient.
  // We require the expected MIME/extension pair.
  // ---------------------------------------------------------

  const expectedExtension =
    ALLOWED_FILES.get(rawFile.type);

  if (!expectedExtension) {
    return errorResponse(
      "Only PDF, DOCX and PNG documents are allowed.",
      415
    );
  }

  const originalFileName =
    cleanOriginalFileName(rawFile.name);

  const suppliedExtension =
    getExtension(originalFileName);

  if (suppliedExtension !== expectedExtension) {
    return errorResponse(
      "The file extension does not match its declared file type.",
      415
    );
  }

  // ---------------------------------------------------------
  // 8. Display name
  // ---------------------------------------------------------

  const requestedName =
    typeof rawName === "string"
      ? cleanDisplayName(rawName)
      : "";

  const displayName =
    requestedName || originalFileName;

  if (
    displayName.length < 1 ||
    displayName.length > MAX_NAME_LENGTH
  ) {
    return errorResponse(
      "Document name must be between 1 and 160 characters.",
      400
    );
  }

  const visibleToClient =
    rawVisibleToClient === "true";

  // ---------------------------------------------------------
  // 9. Generate server-controlled storage path
  //
  // Never use the user-supplied filename as the storage key.
  //
  // organisation UUID / project UUID / random UUID.extension
  // ---------------------------------------------------------

  const storageObjectId = crypto.randomUUID();

  const storagePath =
    `${organization.id}/` +
    `${project.id}/` +
    `${storageObjectId}.${expectedExtension}`;

  // ---------------------------------------------------------
  // 10. Convert file
  // ---------------------------------------------------------

  let fileBytes: ArrayBuffer;

  try {
    fileBytes = await rawFile.arrayBuffer();
  } catch {
    return errorResponse(
      "Unable to process document.",
      400
    );
  }

  // The MIME type and extension are labels the uploader chose; the bytes must agree,
  // because clients download this file from the portal as that type.
  if (!hasExpectedSignature(expectedExtension, new Uint8Array(fileBytes, 0, Math.min(16, fileBytes.byteLength)))) {
    return errorResponse(
      "The file contents do not match its declared file type.",
      415
    );
  }

  // ---------------------------------------------------------
  // 11. Upload to private bucket
  // ---------------------------------------------------------

  const { error: storageError } =
    await supabase.storage
      .from(BUCKET)
      .upload(
        storagePath,
        fileBytes,
        {
          contentType: rawFile.type,
          upsert: false,
          cacheControl: "3600",
        }
      );

  if (storageError) {
    console.error("Private document upload failed:", {
      name: storageError.name,
      message: storageError.message,
    });

    return errorResponse(
      "Unable to store document.",
      500
    );
  }

  // ---------------------------------------------------------
  // 12. Insert metadata
  // ---------------------------------------------------------

  const { data: document, error: documentError } =
    await supabase
      .from("documents")
      .insert({
        project_id: project.id,
        name: displayName,
        storage_path: storagePath,
        mime_type: rawFile.type,
        size_bytes: rawFile.size,
        visible_to_client: visibleToClient,
        uploaded_by_clerk_user_id: userId,
      })
      .select(
        `
          id,
          project_id,
          name,
          storage_path,
          mime_type,
          size_bytes,
          visible_to_client,
          created_at
        `
      )
      .single();

  // ---------------------------------------------------------
  // 13. Roll back storage if metadata creation fails
  // ---------------------------------------------------------

  if (documentError || !document) {
    console.error("Document metadata creation failed:", {
      code: documentError?.code,
      message: documentError?.message,
    });

    const { error: rollbackError } =
      await supabase.storage
        .from(BUCKET)
        .remove([storagePath]);

    if (rollbackError) {
      console.error(
        "Document storage rollback failed:",
        {
          name: rollbackError.name,
          message: rollbackError.message,
        }
      );
    }

    return errorResponse(
      "Unable to create document record.",
      500
    );
  }

  // ---------------------------------------------------------
  // 14. Audit event
  //
  // Do not log file bytes or signed URLs.
  // ---------------------------------------------------------

  const { error: auditError } =
    await supabase
      .from("audit_logs")
      .insert({
        actor_clerk_user_id: userId,
        action: "DOCUMENT_UPLOADED",
        entity_type: "document",
        entity_id: document.id,
        metadata: {
          organization_id: organization.id,
          organization_name: organization.name,
          project_id: project.id,
          project_name: project.name,
          document_name: document.name,
          mime_type: document.mime_type,
          size_bytes: document.size_bytes,
          visible_to_client:
            document.visible_to_client,
        },
      });

  if (auditError) {
    console.error("Document upload audit failed:", {
      code: auditError.code,
      message: auditError.message,
    });
  }

  // ---------------------------------------------------------
  // 15. Return to project
  // ---------------------------------------------------------

  return NextResponse.redirect(
    new URL(
      `/admin/projects/${project.id}`,
      request.url
    ),
    303
  );
}