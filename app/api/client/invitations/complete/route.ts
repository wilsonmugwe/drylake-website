import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/auth/audit";
import { pendingClientInvitations } from "@/lib/auth/client-context";
import { isAlreadyMemberError } from "@/lib/clients/invitation-completion";
import { CLIENT_INVITATION_ROLE, clerkErrorCode } from "@/lib/clients/invitations";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/*
 * Browser POSTs from our own pages only. Stricter than the proxy check: an absent Origin
 * header is refused too, because this route creates an organisation membership, the most
 * sensitive self-service action.
 */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

/*
 * POST /api/client/invitations/complete
 *
 * Completes the signed-in user's pending Drylake client invitation(s) by creating the
 * Clerk organisation membership the invitation link would have created. Takes no input:
 * the user comes from the Clerk session, the invitations from Clerk's Backend API, and
 * only invitations passing completableInvitations() are honoured (pending, client role,
 * a VERIFIED address on this account, an ACTIVE Drylake client). It grants no data
 * access by itself; the portal then resolves the workspace through membership and RLS.
 *
 * Idempotent: "already a member" counts as done, and a second call finds nothing pending.
 */
export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  if (!isSameOrigin(request)) {
    return json({ success: false, error: "Forbidden" }, 403);
  }

  let completable;

  try {
    completable = await pendingClientInvitations(userId);
  } catch (error) {
    console.error("Pending invitation lookup failed:", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return json({ success: false, error: "Unable to check your invitation." }, 502);
  }

  if (completable.length === 0) {
    return json({ success: false, error: "No pending invitation for this account." }, 404);
  }

  const clerk = await clerkClient();
  const supabase = createAdminSupabaseClient();
  const joined: string[] = [];

  for (const invitation of completable) {
    try {
      await clerk.organizations.createOrganizationMembership({
        organizationId: invitation.clerkOrgId,
        userId,
        role: CLIENT_INVITATION_ROLE,
      });
    } catch (error) {
      const code = clerkErrorCode(error);

      if (!isAlreadyMemberError(code)) {
        console.error("Invitation completion failed:", { code });
        continue;
      }
    }

    joined.push(invitation.clerkOrgId);

    // The invitation is now spent; revoke it so the old link cannot be replayed.
    try {
      await clerk.organizations.revokeOrganizationInvitation({
        organizationId: invitation.clerkOrgId,
        invitationId: invitation.invitationId,
      });
    } catch (error) {
      console.error("Revoking a completed invitation failed:", {
        code: clerkErrorCode(error),
      });
    }

    await writeAuditLog(supabase, {
      actorClerkUserId: userId,
      action: "CLIENT_INVITATION_ACCEPTED",
      entityType: "organization",
      entityId: invitation.organizationId,
      metadata: {
        organization_id: invitation.organizationId,
        clerk_org_id: invitation.clerkOrgId,
        invitation_id: invitation.invitationId,
        method: "signed-in-completion",
      },
    });
  }

  if (joined.length === 0) {
    return json({ success: false, error: "Unable to complete your invitation." }, 502);
  }

  // Only ids Clerk just confirmed this user belongs to; the browser activates one.
  return json({ success: true, clerkOrgIds: joined });
}
