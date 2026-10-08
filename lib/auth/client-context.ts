import "server-only";

import { cache } from "react";
import { auth, clerkClient } from "@clerk/nextjs/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  type ClientOption,
  type ClientOrganizationRow,
  type PendingReason,
  type RlsOutcome,
  decideClientWorkspace,
  establishedResolution,
  resolveClientOrganization,
  usableWorkspaces,
} from "@/lib/auth/access";
import {
  type CompletableInvitation,
  completableInvitations,
} from "@/lib/clients/invitation-completion";
import { markResolverPath, timed } from "@/lib/perf/request-timing";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logClientOrganizationRlsMiss } from "@/lib/supabase/rls-diagnostics";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { classifyOrganizationLookup } from "@/lib/supabase/token-shape";

/* A client user belongs to a handful of orgs at most; one page is plenty. */
const PAGE_SIZE = 100;

/*
 * The ONE authoritative client workspace for this request. See decideClientWorkspace()
 * in lib/auth/access.ts for the meaning of every state.
 *
 * `ready` carries the RLS-scoped Supabase client that verified the organisation, so the
 * page loads content with the exact client whose token was just accepted. Projects,
 * invoices, documents and updates are content: their absence never changes the state.
 *
 * The workspace switcher list is NOT part of this result: it needs the Clerk Backend API
 * and is only UI. It comes from getSwitchableWorkspaces(), which never gates access.
 */
export type ClientWorkspace =
  | { state: "signed-out" }
  | { state: "lookup-failed"; userId: string }
  | { state: "no-organisation"; userId: string }
  | { state: "blocked"; userId: string; status: string; organizationName: string }
  | { state: "access-pending"; userId: string; reason: PendingReason; options: ClientOption[] }
  | {
      state: "ready";
      userId: string;
      organization: ClientOrganizationRow;
      supabase: SupabaseClient;
      /* Which resolver path produced this result (timing logs only). */
      path: "established" | "full";
    };

export type NotReadyWorkspace = Exclude<ClientWorkspace, { state: "ready" | "signed-out" }>;

class LookupError extends Error {}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

async function membershipOrgIds(userId: string): Promise<string[]> {
  const clerk = await clerkClient();
  const memberships = await clerk.users.getOrganizationMembershipList({
    userId,
    limit: PAGE_SIZE,
  });

  return memberships.data.map((membership) => membership.organization.id);
}

/*
 * Service role maps Clerk-verified org ids to client rows (id, name, status) ONLY. The ids
 * come from Clerk (signed session + Backend API), never from the browser. Client DATA is
 * always read through the RLS-scoped client.
 * @throws LookupError on any Supabase error, so callers fail closed.
 */
export async function organizationsForClerkIds(
  clerkOrgIds: readonly string[]
): Promise<ClientOrganizationRow[]> {
  if (clerkOrgIds.length === 0) {
    return [];
  }

  const { data, error } = await createAdminSupabaseClient()
    .from("organizations")
    .select("id, clerk_org_id, name, status")
    .in("clerk_org_id", [...clerkOrgIds]);

  if (error) {
    console.error("Client organisation mapping failed:", {
      code: error.code,
      message: error.message,
    });

    throw new LookupError("Unable to resolve client organisation.");
  }

  return data ?? [];
}

/*
 * Pending Drylake invitations this account can complete (see
 * lib/clients/invitation-completion.ts). Used only when the user has no usable membership.
 * @throws on a Clerk or Supabase failure.
 */
export async function pendingClientInvitations(
  userId: string
): Promise<CompletableInvitation[]> {
  const clerk = await clerkClient();
  const [invitations, user] = await Promise.all([
    clerk.users.getOrganizationInvitationList({ userId, status: "pending", limit: PAGE_SIZE }),
    clerk.users.getUser(userId),
  ]);

  if (invitations.data.length === 0) {
    return [];
  }

  const verifiedAddresses = user.emailAddresses
    .filter((address) => address.verification?.status === "verified")
    .map((address) => address.emailAddress);

  const rows = await organizationsForClerkIds(
    [...new Set(invitations.data.map((invitation) => invitation.organizationId))]
  );

  return completableInvitations({
    invitations: invitations.data.map((invitation) => ({
      id: invitation.id,
      clerkOrgId: invitation.organizationId,
      emailAddress: invitation.emailAddress,
      status: invitation.status,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    })),
    organizations: rows,
    verifiedAddresses,
    now: Date.now(),
  });
}

/* Re-read the resolved organisation through RLS with the user's Clerk token. */
async function verifyThroughRls(
  organization: ClientOrganizationRow
): Promise<{ outcome: RlsOutcome; supabase: SupabaseClient }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", organization.id)
    .eq("clerk_org_id", organization.clerk_org_id as string)
    .eq("status", "ACTIVE")
    .maybeSingle();

  const outcome = classifyOrganizationLookup(error, data);

  if (outcome !== "found") {
    // One diagnostic line: which link of Clerk token -> Supabase -> RLS broke.
    await logClientOrganizationRlsMiss({ supabase, outcome, error });
  }

  return { outcome, supabase };
}

/*
 * Fast path for an established client: ONE RLS query with the user's token, no Clerk
 * Backend API call and no service role. Returns null whenever the session is not a plain
 * "active org, mapped, ACTIVE, accepted by RLS" session, and the caller then runs the full
 * resolution unchanged (which also produces every diagnostic and not-ready state).
 */
async function establishedWorkspace(
  userId: string,
  orgId: string
): Promise<Extract<ClientWorkspace, { state: "ready" }> | null> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await timed("resolve.established_rls", () =>
      supabase
        .from("organizations")
        .select("id, clerk_org_id, name, status")
        .eq("clerk_org_id", orgId)
        .eq("status", "ACTIVE")
        .maybeSingle()
    );

    if (error || !data) {
      return null;
    }

    const resolution = establishedResolution({ activeOrgId: orgId, rlsRow: data });

    if (!resolution) {
      return null;
    }

    // Same decision function as the full path, with RLS already confirmed by the read.
    const decision = decideClientWorkspace({ resolution, pendingInvitations: [], rls: "found" });

    return decision.state === "ready"
      ? { state: "ready", userId, organization: decision.organization, supabase, path: "established" }
      : null;
  } catch {
    // Missing token or a network failure: let the full path decide (it fails closed).
    return null;
  }
}

async function fullResolution(userId: string, orgId: string | null | undefined): Promise<ClientWorkspace> {
  markResolverPath("full");

  try {
    const memberOf = await timed("resolve.clerk_memberships", () => membershipOrgIds(userId));
    const ids = orgId && !memberOf.includes(orgId) ? [...memberOf, orgId] : memberOf;
    const rows = await timed("resolve.org_mapping", () => organizationsForClerkIds(ids));
    const resolution = resolveClientOrganization({
      activeOrgId: orgId,
      membershipOrgIds: memberOf,
      organizations: rows,
    });

    // Invitation recovery runs ONLY when the session has no usable membership.
    const pending =
      resolution.kind === "no-membership" || resolution.kind === "not-linked"
        ? await timed("resolve.pending_invitations", () => pendingClientInvitations(userId))
        : [];

    let rls: RlsOutcome | null = null;
    let supabase: SupabaseClient | null = null;

    if (resolution.kind === "ready") {
      const verified = await timed("resolve.rls_verify", () =>
        verifyThroughRls(resolution.organization)
      );
      rls = verified.outcome;
      supabase = verified.supabase;
    }

    const decision = decideClientWorkspace({
      resolution,
      pendingInvitations: pending.map(({ clerkOrgId, organizationId, name }) => ({
        clerkOrgId,
        organizationId,
        name,
      })),
      rls,
    });

    switch (decision.state) {
      case "ready":
        return {
          state: "ready",
          userId,
          organization: decision.organization,
          // Non-null by construction: a ready decision needs the RLS outcome "found", which is
          // only ever set together with this client above.
          supabase: supabase as SupabaseClient,
          path: "full",
        };
      case "access-pending":
        return { state: "access-pending", userId, reason: decision.reason, options: decision.options };
      case "blocked":
        return {
          state: "blocked",
          userId,
          status: decision.status,
          organizationName: decision.organizationName,
        };
      case "no-organisation":
        return { state: "no-organisation", userId };
      case "lookup-failed":
        return { state: "lookup-failed", userId };
    }
  } catch (error) {
    // Clerk or Supabase failed: fail closed, never "pending", never another tenant.
    console.error("Client workspace resolution failed:", { message: errorMessage(error) });

    return { state: "lookup-failed", userId };
  }
}

async function resolveWorkspace(): Promise<ClientWorkspace> {
  const { userId, orgId } = await auth();

  if (!userId) {
    return { state: "signed-out" };
  }

  // Established client: the active org is set, so try the one-query path first.
  if (orgId) {
    const established = await establishedWorkspace(userId, orgId);

    if (established) {
      markResolverPath("established");

      return established;
    }
  }

  // Onboarding, switching, paused or misconfigured sessions: the full resolution.
  return fullResolution(userId, orgId);
}

/* Memoised per request: every component and the page share one resolution. */
export const getClientWorkspace = cache(resolveWorkspace);

/*
 * ACTIVE workspaces among the user's memberships, for the workspace switcher only. Never
 * used for authorization: selecting one goes through Clerk setActive, and the next request
 * re-resolves through getClientWorkspace(). A failure hides the switcher, nothing else.
 */
async function resolveSwitchableWorkspaces(): Promise<ClientOption[]> {
  const { userId } = await auth();

  if (!userId) {
    return [];
  }

  try {
    return await timed("switcher", async () => {
      const memberOf = await membershipOrgIds(userId);
      const rows = await organizationsForClerkIds(memberOf);

      return usableWorkspaces(rows, memberOf);
    });
  } catch (error) {
    console.error("Workspace switcher lookup failed:", { message: errorMessage(error) });

    return [];
  }
}

export const getSwitchableWorkspaces = cache(resolveSwitchableWorkspaces);
