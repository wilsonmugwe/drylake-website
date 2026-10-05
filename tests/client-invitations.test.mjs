/*
 * Client portal invitation helpers (lib/clients/invitations.ts).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CLIENT_INVITATION_ROLE,
  clerkErrorCode,
  effectiveInvitationStatus,
  findPendingInvitation,
  invitationErrorMessage,
  invitationLandingTarget,
  invitationRedirectUrl,
  isClerkInvitationId,
  sortInvitations,
} from "../lib/clients/invitations.ts";

const NOW = 1_800_000_000_000;

describe("role", () => {
  it("invites client users as plain members, never admins", () => {
    assert.equal(CLIENT_INVITATION_ROLE, "org:member");
  });
});

describe("isClerkInvitationId", () => {
  it("accepts Clerk invitation ids only", () => {
    assert.equal(isClerkInvitationId("orginv_2abcDEF123xyz"), true);
    assert.equal(isClerkInvitationId("org_2abcDEF123xyz"), false);
    assert.equal(isClerkInvitationId("orginv_../../x"), false);
    assert.equal(isClerkInvitationId(undefined), false);
  });
});

describe("effectiveInvitationStatus", () => {
  it("keeps terminal states", () => {
    assert.equal(effectiveInvitationStatus("accepted", NOW - 1, NOW), "accepted");
    assert.equal(effectiveInvitationStatus("revoked", null, NOW), "revoked");
  });

  it("treats a pending invitation past expiry as expired", () => {
    assert.equal(effectiveInvitationStatus("pending", NOW - 1, NOW), "expired");
    assert.equal(effectiveInvitationStatus("pending", NOW + 1000, NOW), "pending");
  });
});

describe("findPendingInvitation / sortInvitations", () => {
  const invitations = [
    { id: "a", emailAddress: "old@x.com", status: "revoked", createdAt: 3, expiresAt: null },
    { id: "b", emailAddress: "Alex@X.com", status: "pending", createdAt: 1, expiresAt: NOW },
    { id: "c", emailAddress: "alex@x.com", status: "accepted", createdAt: 2, expiresAt: null },
  ];

  it("matches pending invitations case-insensitively", () => {
    assert.equal(findPendingInvitation(invitations, "ALEX@x.com").id, "b");
    assert.equal(findPendingInvitation(invitations, "old@x.com"), null);
  });

  it("puts pending first, then newest", () => {
    assert.deepEqual(sortInvitations(invitations).map((i) => i.id), ["b", "a", "c"]);
  });
});

describe("invitation landing", () => {
  it("builds the redirect URL on the app origin", () => {
    assert.equal(
      invitationRedirectUrl("https://drylake.com.au"),
      "https://drylake.com.au/portal/accept-invitation"
    );
  });

  it("forwards a new invitee to sign-up with the ticket", () => {
    assert.equal(
      invitationLandingTarget({ ticket: "tkt_abcdefghijk", status: "sign_up" }),
      "/sign-up?__clerk_ticket=tkt_abcdefghijk&__clerk_status=sign_up"
    );
  });

  it("forwards an existing user to sign-in with the ticket", () => {
    assert.match(
      invitationLandingTarget({ ticket: "tkt_abcdefghijk", status: "sign_in" }),
      /^\/sign-in\?__clerk_ticket=tkt_abcdefghijk&__clerk_status=sign_in$/
    );
  });

  it("falls back to /portal for complete, missing or malformed input", () => {
    assert.equal(invitationLandingTarget({ ticket: "tkt_abcdefghijk", status: "complete" }), "/portal");
    assert.equal(invitationLandingTarget({ ticket: null, status: "sign_up" }), "/portal");
    assert.equal(invitationLandingTarget({ ticket: "<script>", status: "sign_up" }), "/portal");
    assert.equal(invitationLandingTarget({ ticket: "tkt_abcdefghijk", status: "evil" }), "/portal");
  });

  it("never produces an off-site redirect", () => {
    for (const status of ["sign_in", "sign_up", "complete", "x"]) {
      const target = invitationLandingTarget({ ticket: "//evil.example/abcdefghij", status });
      assert.ok(target.startsWith("/") && !target.startsWith("//"), target);
    }
  });
});

describe("Clerk error mapping", () => {
  it("reads errors[0].code without Clerk types", () => {
    assert.equal(clerkErrorCode({ errors: [{ code: "duplicate_record" }] }), "duplicate_record");
    assert.equal(clerkErrorCode(new Error("x")), null);
    assert.equal(clerkErrorCode(null), null);
  });

  it("gives a safe message for every code", () => {
    assert.match(invitationErrorMessage("already_a_member_in_organization"), /already a member/);
    assert.match(invitationErrorMessage(null), /Unable to send/);
    assert.ok(!invitationErrorMessage("anything").includes("—"));
  });
});
