import "server-only";

import { auth, clerkClient } from "@clerk/nextjs/server";

import {
  type ClientOption,
  type ClientOrganizationRow,
  type ClientResolution,
  resolveClientOrganization,
  usableWorkspaces,
} from "@/lib/auth/access";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/* A client user belongs to a handful of orgs at most; one page is plenty. */
const MEMBERSHIP_PAGE_SIZE = 100;

export type ClientAccess =
  | { signedIn: false }
  | {
      signedIn: true;
      userId: string;
      resolution: ClientResolution;
      /* Usable (ACTIVE) workspaces from the membership list; null when not fetched. */
      workspaces: ClientOption[] | null;
    };

export class ClientAccessLookupError extends Error {}

async function membershipOrgIds(userId: string): Promise<string[]> {
  const clerk = await clerkClient();
  const memberships = await clerk.users.getOrganizationMembershipList({
    userId,
    limit: MEMBERSHIP_PAGE_SIZE,
  });

  return memberships.data.map((membership) => membership.organization.id);
}

async function organizationsForClerkIds(
  clerkOrgIds: readonly string[]
): Promise<ClientOrganizationRow[]> {
  if (clerkOrgIds.length === 0) {
    return [];
  }

  /*
   * Service role is used ONLY to map Clerk-verified org ids to client rows (id, name,
   * status), including non-active rows so the user can be told their workspace is
   * inactive. The ids come from Clerk (signed session claim + Backend API), never from
   * the browser. All client DATA is still read through the RLS-scoped client.
   */
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, clerk_org_id, name, status")
    .in("clerk_org_id", [...clerkOrgIds]);

  if (error) {
    console.error("Client organisation mapping failed:", {
      code: error.code,
      message: error.message,
    });

    throw new ClientAccessLookupError("Unable to resolve client organisation.");
  }

  return data ?? [];
}

/*
 * Resolve which Drylake client workspace the signed-in user may open.
 *
 * Fast path: the session's active org maps to an ACTIVE client -> ready, no Backend API
 * call. Otherwise (no active org, or it is unmapped or not active) the user's Clerk
 * memberships are listed so the portal can auto-activate a single workspace, offer a
 * choice, or explain why access is blocked. `includeMemberships` forces the list even on
 * the fast path (used to decide whether to show "Switch organisation").
 */
export async function getClientAccess(
  options: { includeMemberships?: boolean } = {}
): Promise<ClientAccess> {
  const { userId, orgId } = await auth();

  if (!userId) {
    return { signedIn: false };
  }

  if (orgId && !options.includeMemberships) {
    const rows = await organizationsForClerkIds([orgId]);
    const resolution = resolveClientOrganization({
      activeOrgId: orgId,
      membershipOrgIds: null,
      organizations: rows,
    });

    if (resolution.kind === "ready") {
      return { signedIn: true, userId, resolution, workspaces: null };
    }
  }

  let memberOf: string[];

  try {
    memberOf = await membershipOrgIds(userId);
  } catch (error) {
    console.error("Clerk membership lookup failed:", {
      message: error instanceof Error ? error.message : "Unknown Clerk error",
    });

    throw new ClientAccessLookupError("Unable to resolve client organisation.");
  }

  const ids = orgId && !memberOf.includes(orgId) ? [...memberOf, orgId] : memberOf;
  const rows = await organizationsForClerkIds(ids);
  const resolution = resolveClientOrganization({
    activeOrgId: orgId,
    membershipOrgIds: memberOf,
    organizations: rows,
  });

  return {
    signedIn: true,
    userId,
    resolution,
    workspaces: usableWorkspaces(rows, memberOf),
  };
}
