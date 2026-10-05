import "server-only";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { isDocumentNavigation, safeReturnPath } from "@/lib/auth/request-kind";
import { signInUrl } from "@/lib/auth/guards";

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

export function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export function jsonError(message: string, status: number, code?: string) {
  return jsonResponse({ success: false, error: message, ...(code ? { code } : {}) }, status);
}

/*
 * API-route admin gate. Every app/api/admin/** handler calls this before reading input or
 * touching the service-role client.
 *
 *   signed out + browser form navigation -> 303 to sign-in (returning to `returnTo`)
 *   signed out + fetch / script          -> 401 JSON
 *   signed in, not a platform admin      -> 403 JSON
 */
export async function authorizeAdminApi(
  request: Request,
  returnTo = "/admin"
): Promise<{ ok: true; userId: string } | { ok: false; response: NextResponse }> {
  const { userId } = await auth();

  if (!userId) {
    if (isDocumentNavigation(request.headers)) {
      return {
        ok: false,
        response: NextResponse.redirect(
          new URL(signInUrl(safeReturnPath(returnTo, "/admin")), request.url),
          303
        ),
      };
    }

    return { ok: false, response: jsonError("Unauthorized", 401) };
  }

  if (!(await isPlatformAdmin())) {
    return { ok: false, response: jsonError("Forbidden", 403) };
  }

  return { ok: true, userId };
}
