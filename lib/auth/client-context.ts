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
  resolveClientOrganization,
  usableWorkspaces,
} from "@/lib/auth/access";
import {
  type CompletableInvitation,
  completableInvitations,
} from "@/lib/clients/invitation-completion";
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
      /* ACTIVE workspaces among the user's memberships, for the switcher. */
      workspaces: ClientOption[];
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

async function resolveWorkspace(): Promise<ClientWorkspace> {
  const { userId, orgId } = await auth();

  if (!userId) {
    return { state: "signed-out" };
  }

  try {
    const memberOf = await membershipOrgIds(userId);
    const ids = orgId && !memberOf.includes(orgId) ? [...memberOf, orgId] : memberOf;
    const rows = await organizationsForClerkIds(ids);
    const resolution = resolveClientOrganization({
      activeOrgId: orgId,
      membershipOrgIds: memberOf,
      organizations: rows,
    });

    const pending =
      resolution.kind === "no-membership" || resolution.kind === "not-linked"
        ? await pendingClientInvitations(userId)
        : [];

    let rls: RlsOutcome | null = null;
    let supabase: SupabaseClient | null = null;

    if (resolution.kind === "ready") {
      const verified = await verifyThroughRls(resolution.organization);
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
          supabase: supabase as SupabaseClient,
          workspaces: usableWorkspaces(rows, memberOf),
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

/* Memoised per request: every component and the page share one resolution. */
export const getClientWorkspace = cache(resolveWorkspace);
