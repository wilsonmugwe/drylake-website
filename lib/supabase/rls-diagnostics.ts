import "server-only";

import { auth } from "@clerk/nextjs/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  describeClerkSupabaseToken,
  type OrganizationLookupOutcome,
} from "@/lib/supabase/token-shape";

/*
 * Logged once when the client portal's RLS-scoped organisation read fails after the
 * service-role resolver said the workspace is ready. Answers, in one log line, which link
 * of Clerk session -> getToken() -> Supabase JWT -> current_clerk_org_id() -> RLS broke.
 *
 * Logs categories and booleans only: no token, user id, email or organisation id.
 */
export async function logClientOrganizationRlsMiss(params: {
  supabase: SupabaseClient;
  outcome: Exclude<OrganizationLookupOutcome, "found">;
  error: { code?: string | null } | null;
}): Promise<void> {
  const { orgId, getToken } = await auth();

  let shape = describeClerkSupabaseToken(null, orgId);

  try {
    shape = describeClerkSupabaseToken(await getToken(), orgId);
  } catch {
    // getToken failed: shape stays "tokenPresent: false", which is the finding.
  }

  /*
   * What the DATABASE resolves from this exact request's JWT. Only works if
   * current_clerk_org_id() is exposed to the API (public schema, EXECUTE granted);
   * otherwise the error code says so and the token shape still narrows the cause.
   */
  let dbOrgClaim: "matches-session" | "differs" | "null" | "unavailable" = "unavailable";
  let dbOrgClaimErrorCode: string | null = null;

  try {
    const { data, error } = await params.supabase.rpc("current_clerk_org_id");

    if (error) {
      dbOrgClaimErrorCode = error.code ?? "unknown";
    } else if (data === null || data === undefined || data === "") {
      dbOrgClaim = "null";
    } else {
      dbOrgClaim = data === orgId ? "matches-session" : "differs";
    }
  } catch {
    dbOrgClaimErrorCode = "exception";
  }

  console.error("client.org_rls_miss", {
    outcome: params.outcome,
    postgrestCode: params.error?.code ?? null,
    sessionHasOrg: Boolean(orgId),
    token: shape,
    dbOrgClaim,
    dbOrgClaimErrorCode,
  });
}
