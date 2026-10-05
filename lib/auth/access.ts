/*
 * Client tenant-access decisions. PURE: no Clerk, Supabase or Next imports, so every
 * branch is unit-tested (tests/auth-access.test.mjs, tests/tenant-isolation.test.mjs).
 *
 * The one rule: a user reaches a Drylake client organisation only through Clerk
 * organisation MEMBERSHIP, mapped to organizations.clerk_org_id. Email addresses never
 * grant access. Every input here comes from Clerk (the session's active org id, which
 * Clerk signs, and the Backend API membership list), never from the browser.
 */

import { isClientOperational } from "../clients/status.ts";

export type ClientOrganizationRow = {
  id: string;
  clerk_org_id: string | null;
  name: string;
  status: string;
};

export type ClientOption = {
  clerkOrgId: string;
  organizationId: string;
  name: string;
};

export type ClientResolution =
  /* Active Clerk org maps to an ACTIVE Drylake client: load the workspace. */
  | { kind: "ready"; organization: ClientOrganizationRow }
  /* Exactly one usable membership, not yet the session's active org: activate it. */
  | { kind: "activate"; option: ClientOption }
  /* Several usable memberships and none active: let the user choose. */
  | { kind: "choose"; options: ClientOption[] }
  /* Membership exists but the client is INACTIVE / ARCHIVED (or another non-active state). */
  | { kind: "blocked"; status: string; organizationName: string }
  /* Memberships exist, but none maps to a Drylake client organisation. */
  | { kind: "not-linked" }
  /* Signed in with no organisation membership at all. */
  | { kind: "no-membership" };

export type ResolveInput = {
  /* auth().orgId: the session's active organisation (Clerk-signed). */
  activeOrgId: string | null | undefined;
  /* Clerk org ids from the Backend API membership list; null when it was not fetched. */
  membershipOrgIds: readonly string[] | null;
  /* organizations rows looked up by those Clerk ids (service role, server-side). */
  organizations: readonly ClientOrganizationRow[];
};

function toOption(row: ClientOrganizationRow): ClientOption {
  return {
    clerkOrgId: row.clerk_org_id as string,
    organizationId: row.id,
    name: row.name,
  };
}

/* Severity order when every mapped client is unusable: tell them the most final state. */
function blockedRank(status: string): number {
  if (status === "ARCHIVED") return 0;
  if (status === "INACTIVE") return 1;
  return 2;
}

export function resolveClientOrganization(input: ResolveInput): ClientResolution {
  const activeOrgId = input.activeOrgId || null;

  /*
   * Membership set. The active org is a membership by construction (Clerk only lets a
   * session activate an org the user belongs to), so it is always included.
   */
  const memberOf = new Set<string>(input.membershipOrgIds ?? []);

  if (activeOrgId) {
    memberOf.add(activeOrgId);
  }

  /*
   * Only rows whose clerk_org_id is in the membership set are ever considered, even if
   * the caller passed extra rows. This is the tenant boundary for the resolver.
   */
  const mapped = input.organizations.filter(
    (row) => typeof row.clerk_org_id === "string" && memberOf.has(row.clerk_org_id)
  );

  const activeRow = activeOrgId
    ? mapped.find((row) => row.clerk_org_id === activeOrgId) ?? null
    : null;

  if (activeRow && isClientOperational(activeRow.status)) {
    return { kind: "ready", organization: activeRow };
  }

  const usable = mapped
    .filter((row) => isClientOperational(row.status))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(toOption);

  if (usable.length === 1) {
    return { kind: "activate", option: usable[0] };
  }

  if (usable.length > 1) {
    return { kind: "choose", options: usable };
  }

  // Nothing usable. Prefer explaining the active org's state, else the worst mapped one.
  const blockedRow =
    activeRow ??
    [...mapped].sort((a, b) => blockedRank(a.status) - blockedRank(b.status))[0] ??
    null;

  if (blockedRow) {
    return {
      kind: "blocked",
      status: blockedRow.status,
      organizationName: blockedRow.name,
    };
  }

  return memberOf.size > 0 ? { kind: "not-linked" } : { kind: "no-membership" };
}

/*
 * ACTIVE client workspaces among the user's memberships, for the workspace switcher.
 * Rows outside the membership list are ignored even if passed in.
 */
export function usableWorkspaces(
  organizations: readonly ClientOrganizationRow[],
  membershipOrgIds: readonly string[]
): ClientOption[] {
  const memberOf = new Set(membershipOrgIds);

  return organizations
    .filter(
      (row) =>
        typeof row.clerk_org_id === "string" &&
        memberOf.has(row.clerk_org_id) &&
        isClientOperational(row.status)
    )
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(toOption);
}

/* True only when the resolved workspace IS this organisation. */
export function canAccessOrganization(
  resolution: ClientResolution,
  organizationId: unknown
): boolean {
  return (
    resolution.kind === "ready" &&
    typeof organizationId === "string" &&
    resolution.organization.id === organizationId
  );
}

/* An option chosen in the browser is honoured only if the server offered it. */
export function isOfferedOption(
  resolution: ClientResolution,
  clerkOrgId: unknown
): boolean {
  if (typeof clerkOrgId !== "string") {
    return false;
  }

  if (resolution.kind === "activate") {
    return resolution.option.clerkOrgId === clerkOrgId;
  }

  if (resolution.kind === "choose") {
    return resolution.options.some((option) => option.clerkOrgId === clerkOrgId);
  }

  return false;
}

/* Client-visible record rules, shared by pages and tests. */
export function isClientVisibleInvoice(invoice: {
  status?: string | null;
  visible_to_client?: boolean | null;
}): boolean {
  return invoice.visible_to_client === true && invoice.status !== "DRAFT";
}

export function isClientVisibleDocument(document: {
  visible_to_client?: boolean | null;
}): boolean {
  return document.visible_to_client === true;
}

export function isClientVisibleUpdate(update: {
  visible_to_client?: boolean | null;
  published_at?: string | null;
}): boolean {
  return update.visible_to_client === true && Boolean(update.published_at);
}
