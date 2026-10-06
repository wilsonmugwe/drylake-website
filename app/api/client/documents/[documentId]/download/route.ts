import { NextResponse } from "next/server";

import { getClientWorkspace } from "@/lib/auth/client-context";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

export const dynamic = "force-dynamic";

const BUCKET = "client-documents";
const SIGNED_URL_LIFETIME_SECONDS = 60;

type RouteContext = {
  params: Promise<{
    documentId: string;
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
        "Cache-Control": "private, no-store, max-age=0",
      },
    }
  );
}

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  // ---------------------------------------------------------
  // 1. The ONE authoritative workspace resolution (same as the portal pages).
  //
  // INACTIVE / ARCHIVED clients, users with no client workspace, and sessions whose
  // Clerk token Supabase RLS did not accept are all refused before any document lookup.
  // ---------------------------------------------------------

  const workspace = await getClientWorkspace();

  if (workspace.state === "signed-out") {
    return errorResponse("Unauthorized", 401);
  }

  if (workspace.state === "lookup-failed") {
    return errorResponse("Unable to access document", 500);
  }

  if (workspace.state !== "ready") {
    return errorResponse("No active client workspace", 403);
  }

  const { documentId } = await params;

  // A malformed ID can never match a row: 404 before the query, not a database error.
  if (!isUuid(documentId)) {
    return errorResponse("Document not found", 404);
  }

  // ---------------------------------------------------------
  // 2. Authorization client
  //
  // The RLS-scoped client that carries the user's Clerk session token and just
  // verified the organisation. The service-role client MUST NOT be used for this query.
  // ---------------------------------------------------------

  const clientSupabase = workspace.supabase;
  const organization = workspace.organization;

  // ---------------------------------------------------------
  // 3. Retrieve document through RLS
  //
  // RLS is the primary tenant boundary.
  // visible_to_client is also explicitly required.
  // ---------------------------------------------------------

  const { data: document, error: documentError } =
    await clientSupabase
      .from("documents")
      .select(
        `
          id,
          project_id,
          name,
          storage_path,
          mime_type,
          visible_to_client
        `
      )
      .eq("id", documentId)
      .eq("visible_to_client", true)
      .maybeSingle();

  if (documentError) {
    console.error(
      "Document authorization lookup failed:",
      {
        code: documentError.code,
        message: documentError.message,
      }
    );

    return errorResponse(
      "Unable to access document",
      500
    );
  }

  // Use 404 so another tenant cannot determine whether the
  // supplied document UUID actually exists.
  if (!document) {
    return errorResponse(
      "Document not found",
      404
    );
  }

  // ---------------------------------------------------------
  // 4. Explicit project → organisation verification
  //
  // This is defense in depth in addition to documents RLS.
  // ---------------------------------------------------------

  const { data: project, error: projectError } =
    await clientSupabase
      .from("projects")
      .select("id, organization_id")
      .eq("id", document.project_id)
      .eq("organization_id", organization.id)
      .maybeSingle();

  if (projectError) {
    console.error(
      "Document project authorization failed:",
      {
        code: projectError.code,
        message: projectError.message,
      }
    );

    return errorResponse(
      "Unable to access document",
      500
    );
  }

  if (!project) {
    return errorResponse(
      "Document not found",
      404
    );
  }

  // ---------------------------------------------------------
  // 5. Create signed URL
  //
  // Authorization has already succeeded through the user's
  // RLS-scoped client.
  //
  // The server-only service-role client is used ONLY to sign
  // the private storage object.
  // ---------------------------------------------------------

  const adminSupabase =
    createAdminSupabaseClient();

  const { data: signedData, error: signedUrlError } =
    await adminSupabase.storage
      .from(BUCKET)
      .createSignedUrl(
        document.storage_path,
        SIGNED_URL_LIFETIME_SECONDS,
        {
          download: document.name,
        }
      );

  if (
    signedUrlError ||
    !signedData?.signedUrl
  ) {
    console.error(
      "Signed document URL creation failed:",
      {
        name: signedUrlError?.name,
        message: signedUrlError?.message,
      }
    );

    return errorResponse(
      "Unable to access document",
      500
    );
  }

  // Never log signedData.signedUrl.
  return NextResponse.redirect(
    signedData.signedUrl,
    {
      status: 302,
      headers: {
        "Cache-Control":
          "private, no-store, max-age=0",
      },
    }
  );
}