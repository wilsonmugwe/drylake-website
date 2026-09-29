import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  const { userId, orgId } = await auth();

  // User must be authenticated.
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  // A client must have an active organisation.
  if (!orgId) {
    return NextResponse.json(
      { error: "No active organisation" },
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const { documentId } = await params;

  if (!documentId) {
    return NextResponse.json(
      { error: "Invalid document" },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const supabase = createServerSupabaseClient();

  /*
   * SECURITY:
   *
   * We deliberately do not supply organization_id.
   *
   * Supabase/PostgreSQL RLS determines whether the active
   * Clerk organisation is permitted to see this document.
   *
   * Therefore knowing another client's document UUID should
   * not be enough to retrieve it.
   */
  const { data: document, error: documentError } =
    await supabase
      .from("documents")
      .select(
        "id, name, storage_path, mime_type, visible_to_client"
      )
      .eq("id", documentId)
      .eq("visible_to_client", true)
      .maybeSingle();

  if (documentError) {
    console.error("Document lookup failed:", {
      code: documentError.code,
      message: documentError.message,
    });

    return NextResponse.json(
      { error: "Unable to access document" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  /*
   * Use 404 rather than revealing whether another
   * organisation's document exists.
   */
  if (!document) {
    return NextResponse.json(
      { error: "Document not found" },
      {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  /*
   * Generate a temporary signed URL.
   * The URL expires after 60 seconds.
   */
  const { data: signedData, error: signedUrlError } =
    await supabase.storage
      .from("client-documents")
      .createSignedUrl(document.storage_path, 60, {
        download: document.name,
      });

  if (signedUrlError || !signedData?.signedUrl) {
    console.error("Signed document URL creation failed:", {
      code: signedUrlError?.name,
      message: signedUrlError?.message,
    });

    return NextResponse.json(
      { error: "Unable to access document" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  /*
   * Never log the signed URL.
   * Treat it as temporary access credentials.
   */
  return NextResponse.redirect(signedData.signedUrl, {
    status: 302,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}