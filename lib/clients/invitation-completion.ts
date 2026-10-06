/*
 * Completing a Drylake client invitation for a user who signed in WITHOUT redeeming the
 * invitation link (signed up normally, used Google, or opened the link while already
 * signed in). PURE: no Clerk import; tests/client-workspace.test.mjs covers every rule.
 *
 * This is ONBOARDING, not authorization. Its only output is a Clerk organisation
 * membership, created server-side for an invitation a Drylake admin explicitly issued.
 * From then on access is decided exactly as for any member: Clerk membership -> active
 * Clerk org -> organizations.clerk_org_id -> Supabase RLS. Nothing here grants data access.
 *
 * An invitation is completable only when ALL hold:
 *   - Clerk reports it pending and it has not expired;
 *   - it carries the client role Drylake issues (never an admin role);
 *   - its address is one of the account's VERIFIED addresses (Clerk proved ownership,
 *     the same proof Clerk itself requires to accept an invitation);
 *   - it is for a Clerk org mapped to an ACTIVE Drylake client row.
 */

import { CLIENT_INVITATION_ROLE } from "./invitations.ts";
import { isClientOperational } from "./status.ts";

export type UserInvitationInput = {
  id: string;
  clerkOrgId: string;
  emailAddress: string;
  status: string | null | undefined;
  role: string | null | undefined;
  expiresAt: number | null | undefined;
};

export type MappedClientRow = {
  id: string;
  clerk_org_id: string | null;
  name: string;
  status: string;
};

export type CompletableInvitation = {
  invitationId: string;
  clerkOrgId: string;
  organizationId: string;
  name: string;
};

function normalize(address: string): string {
  return address.trim().toLowerCase();
}

export function completableInvitations(input: {
  invitations: readonly UserInvitationInput[];
  organizations: readonly MappedClientRow[];
  verifiedAddresses: readonly string[];
  now: number;
}): CompletableInvitation[] {
  const verified = new Set(input.verifiedAddresses.map(normalize).filter(Boolean));
  const seen = new Set<string>();
  const result: CompletableInvitation[] = [];

  for (const invitation of input.invitations) {
    if (invitation.status !== "pending") continue;
    if (invitation.role !== CLIENT_INVITATION_ROLE) continue;

    if (
      typeof invitation.expiresAt === "number" &&
      invitation.expiresAt > 0 &&
      invitation.expiresAt <= input.now
    ) {
      continue;
    }

    if (!verified.has(normalize(invitation.emailAddress))) continue;

    const row = input.organizations.find(
      (candidate) =>
        typeof candidate.clerk_org_id === "string" &&
        candidate.clerk_org_id === invitation.clerkOrgId
    );

    if (!row || !isClientOperational(row.status)) continue;
    if (seen.has(invitation.clerkOrgId)) continue;

    seen.add(invitation.clerkOrgId);
    result.push({
      invitationId: invitation.id,
      clerkOrgId: invitation.clerkOrgId,
      organizationId: row.id,
      name: row.name,
    });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

/* Clerk reports "already a member" with these codes: the outcome we wanted. */
export function isAlreadyMemberError(code: string | null): boolean {
  return (
    code === "already_a_member_in_organization" ||
    code === "organization_membership_already_exists"
  );
}
