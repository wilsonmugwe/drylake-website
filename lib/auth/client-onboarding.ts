import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  CLIENT_INVITATION_EXPIRY_DAYS,
  CLIENT_INVITATION_ROLE,
  clerkErrorCode,
  type InvitationStatus,
  type InvitationSummary,
  effectiveInvitationStatus,
  sortInvitations,
} from "@/lib/clients/invitations";

/*
 * Server-side Clerk operations for client onboarding. Callers MUST have passed the
 * platform-admin gate first; nothing here re-checks it.
 */

export type MappedOrganization = {
  id: string;
  name: string;
  status: string;
  clerk_org_id: string | null;
};

export type ClientMember = {
  userId: string | null;
  identifier: string;
  name: string | null;
  role: string;
  joinedAt: number;
};

const LIST_LIMIT = 100;

/*
 * Return the Clerk org id for a client row, creating and linking one if the row has none.
 *
 * Idempotent under concurrency: the link is written with `clerk_org_id IS NULL` as a
 * guard. If another request linked first, the Clerk org created here is deleted and the
 * winner's id is returned, so a row can never point at two orgs.
 */
export async function ensureClerkOrganization(
  supabase: SupabaseClient,
  organization: MappedOrganization
): Promise<string> {
  if (organization.clerk_org_id) {
    return organization.clerk_org_id;
  }

  const clerk = await clerkClient();

  // No createdBy: that would make the Drylake admin a member of the client's org.
  const created = await clerk.organizations.createOrganization({
    name: organization.name,
    privateMetadata: { drylake_organization_id: organization.id },
  });

  const { data: linked, error } = await supabase
    .from("organizations")
    .update({ clerk_org_id: created.id })
    .eq("id", organization.id)
    .is("clerk_org_id", null)
    .select("clerk_org_id")
    .maybeSingle();

  if (!error && linked?.clerk_org_id === created.id) {
    return created.id;
  }

  // Lost the race or the write failed: discard our org, then use whatever is linked.
  try {
    await clerk.organizations.deleteOrganization(created.id);
  } catch (rollbackError) {
    console.error("CRITICAL: orphan Clerk organisation could not be deleted.", {
      code: clerkErrorCode(rollbackError),
      name: rollbackError instanceof Error ? rollbackError.name : "Unknown",
    });
  }

  if (error) {
    console.error("Linking Clerk organisation failed:", {
      code: error.code,
      message: error.message,
    });

    throw new Error("Unable to link the client organisation.");
  }

  const { data: current } = await supabase
    .from("organizations")
    .select("clerk_org_id")
    .eq("id", organization.id)
    .maybeSingle();

  if (!current?.clerk_org_id) {
    throw new Error("Unable to link the client organisation.");
  }

  return current.clerk_org_id;
}

/* First page only (up to 100, no pagination): a client org has a handful of contacts. */
export async function listClientInvitations(
  clerkOrgId: string
): Promise<InvitationSummary[]> {
  const clerk = await clerkClient();
  const response = await clerk.organizations.getOrganizationInvitationList({
    organizationId: clerkOrgId,
    limit: LIST_LIMIT,
  });
  const now = Date.now();

  return sortInvitations(
    response.data.map((invitation) => ({
      id: invitation.id,
      emailAddress: invitation.emailAddress,
      status: effectiveInvitationStatus(invitation.status, invitation.expiresAt, now),
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt ?? null,
    }))
  );
}

/* First page only (up to 100, no pagination), same reasoning as the invitation list. */
export async function listClientMembers(clerkOrgId: string): Promise<ClientMember[]> {
  const clerk = await clerkClient();
  const response = await clerk.organizations.getOrganizationMembershipList({
    organizationId: clerkOrgId,
    limit: LIST_LIMIT,
  });

  return response.data.map((membership) => {
    const user = membership.publicUserData;
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ");

    return {
      userId: user?.userId ?? null,
      identifier: user?.identifier ?? "Unknown user",
      name: name || null,
      role: membership.role,
      joinedAt: membership.createdAt,
    };
  });
}

/**
 * Invites an email address to the client's Clerk org as a plain member, with the short
 * client expiry. redirectUrl must be built from the invitation origin helper so production
 * links always use the canonical domain.
 * @throws Clerk API errors; callers map the Clerk error code to an admin message.
 */
export async function createClientInvitation(params: {
  clerkOrgId: string;
  emailAddress: string;
  redirectUrl: string;
}): Promise<{ id: string }> {
  const clerk = await clerkClient();
  const invitation = await clerk.organizations.createOrganizationInvitation({
    organizationId: params.clerkOrgId,
    emailAddress: params.emailAddress,
    role: CLIENT_INVITATION_ROLE,
    expiresInDays: CLIENT_INVITATION_EXPIRY_DAYS,
    redirectUrl: params.redirectUrl,
  });

  return { id: invitation.id };
}

/**
 * Fetches the invitation through the client's own Clerk org id, so an invitation id that
 * belongs to another org is not found. A pending invitation past its expiry reads as expired.
 * @throws Clerk API errors, including resource_not_found.
 */
export async function getClientInvitation(
  clerkOrgId: string,
  invitationId: string
): Promise<{ id: string; emailAddress: string; organizationId: string; status: InvitationStatus }> {
  const clerk = await clerkClient();
  const invitation = await clerk.organizations.getOrganizationInvitation({
    organizationId: clerkOrgId,
    invitationId,
  });

  return {
    id: invitation.id,
    emailAddress: invitation.emailAddress,
    organizationId: invitation.organizationId,
    status: effectiveInvitationStatus(invitation.status, invitation.expiresAt, Date.now()),
  };
}

/** @throws Clerk API errors; callers decide whether a failure is fatal. */
export async function revokeClientInvitation(
  clerkOrgId: string,
  invitationId: string
): Promise<void> {
  const clerk = await clerkClient();

  await clerk.organizations.revokeOrganizationInvitation({
    organizationId: clerkOrgId,
    invitationId,
  });
}

/* Best effort: returns how many were revoked; individual failures are logged. */
export async function revokePendingClientInvitations(clerkOrgId: string): Promise<number> {
  const invitations = await listClientInvitations(clerkOrgId);
  let revoked = 0;

  for (const invitation of invitations) {
    if (invitation.status !== "pending") {
      continue;
    }

    try {
      await revokeClientInvitation(clerkOrgId, invitation.id);
      revoked += 1;
    } catch (error) {
      // Code and error class only: Clerk messages can echo the invited email address.
      console.error("Revoking a pending invitation failed:", {
        code: clerkErrorCode(error),
        name: error instanceof Error ? error.name : "Unknown Clerk error",
      });
    }
  }

  return revoked;
}
