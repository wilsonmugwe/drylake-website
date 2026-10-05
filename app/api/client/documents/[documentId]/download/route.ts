import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
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
  // 1. Clerk authentication
  // ---------------------------------------------------------

  const { userId, orgId } = await auth();

  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  if (!orgId) {
    return errorResponse(
      "No active organisation",
      403
    );
  }

  const { documentId } = await params;

  // A malformed ID can never match a row: 404 before the query, not a database error.
  if (!isUuid(documentId)) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!documentId) {
    return errorResponse(
      "Invalid document",
      400
    );
  }

  // ---------------------------------------------------------
  // 2. Authorization client
  //
  // This client carries the user's Clerk session token.
  // Supabase RLS decides whether this user can retrieve the
  // document metadata.
  //
  // The service-role client MUST NOT be used for this query.
  // ---------------------------------------------------------

  const clientSupabase =
    createServerSupabaseClient();

  const { data: organization, error: organizationError } =
    await clientSupabase
      .from("organizations")
      .select("id, status")
      .eq("clerk_org_id", orgId)
      .eq("status", "ACTIVE")
      .maybeSingle();

  if (organizationError) {
    console.error(
      "Document organisation authorization failed:",
      {
        code: organizationError.code,
        message: organizationError.message,
      }
    );

    return errorResponse(
      "Unable to access document",
      500
    );
  }

  if (!organization) {
    return errorResponse(
      "Document not found",
      404
    );
  }

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