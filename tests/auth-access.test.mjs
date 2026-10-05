/*
 * Client workspace resolution from Clerk membership (lib/auth/access.ts) and the
 * unauthenticated-response decision (lib/auth/request-kind.ts).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canAccessOrganization,
  isClientVisibleDocument,
  isClientVisibleInvoice,
  isClientVisibleUpdate,
  isOfferedOption,
  resolveClientOrganization,
  usableWorkspaces,
} from "../lib/auth/access.ts";
import { isDocumentNavigation, safeReturnPath } from "../lib/auth/request-kind.ts";

const ACME = { id: "11111111-1111-4111-8111-111111111111", clerk_org_id: "org_acme", name: "Acme", status: "ACTIVE" };
const BETA = { id: "22222222-2222-4222-8222-222222222222", clerk_org_id: "org_beta", name: "Beta", status: "ACTIVE" };
const PAUSED = { id: "33333333-3333-4333-8333-333333333333", clerk_org_id: "org_paused", name: "Paused", status: "INACTIVE" };
const CLOSED = { id: "44444444-4444-4444-8444-444444444444", clerk_org_id: "org_closed", name: "Closed", status: "ARCHIVED" };

function headers(map) {
  return { get: (name) => map[name.toLowerCase()] ?? null };
}

describe("resolveClientOrganization", () => {
  it("ready when the active org maps to an ACTIVE client", () => {
    const result = resolveClientOrganization({
      activeOrgId: "org_acme",
      membershipOrgIds: null,
      organizations: [ACME],
    });

    assert.equal(result.kind, "ready");
    assert.equal(result.organization.id, ACME.id);
  });

  it("activates the single membership when no org is active (post-invitation)", () => {
    const result = resolveClientOrganization({
      activeOrgId: null,
      membershipOrgIds: ["org_acme"],
      organizations: [ACME],
    });

    assert.deepEqual(result, {
      kind: "activate",
      option: { clerkOrgId: "org_acme", organizationId: ACME.id, name: "Acme" },
    });
  });

  it("asks the user to choose between several memberships", () => {
    const result = resolveClientOrganization({
      activeOrgId: null,
      membershipOrgIds: ["org_beta", "org_acme"],
      organizations: [BETA, ACME],
    });

    assert.equal(result.kind, "choose");
    assert.deepEqual(result.options.map((o) => o.name), ["Acme", "Beta"]);
  });

  it("blocks an INACTIVE client with a clear status", () => {
    const result = resolveClientOrganization({
      activeOrgId: "org_paused",
      membershipOrgIds: ["org_paused"],
      organizations: [PAUSED],
    });

    assert.deepEqual(result, { kind: "blocked", status: "INACTIVE", organizationName: "Paused" });
  });

  it("blocks an ARCHIVED client, preferring the most final state when nothing is active", () => {
    const result = resolveClientOrganization({
      activeOrgId: null,
      membershipOrgIds: ["org_paused", "org_closed"],
      organizations: [PAUSED, CLOSED],
    });

    assert.equal(result.kind, "blocked");
    assert.equal(result.status, "ARCHIVED");
  });

  it("moves the user to another usable workspace if the active one was paused", () => {
    const result = resolveClientOrganization({
      activeOrgId: "org_paused",
      membershipOrgIds: ["org_paused", "org_acme"],
      organizations: [PAUSED, ACME],
    });

    assert.equal(result.kind, "activate");
    assert.equal(result.option.clerkOrgId, "org_acme");
  });

  it("not-linked when memberships exist but none is a Drylake client", () => {
    const result = resolveClientOrganization({
      activeOrgId: "org_random",
      membershipOrgIds: ["org_random"],
      organizations: [],
    });

    assert.deepEqual(result, { kind: "not-linked" });
  });

  it("no-membership for a signed-in user with no org at all", () => {
    assert.deepEqual(
      resolveClientOrganization({ activeOrgId: null, membershipOrgIds: [], organizations: [] }),
      { kind: "no-membership" }
    );
  });

  it("ignores a client row with no Clerk org linked", () => {
    const unlinked = { ...ACME, clerk_org_id: null };

    assert.deepEqual(
      resolveClientOrganization({ activeOrgId: null, membershipOrgIds: [], organizations: [unlinked] }),
      { kind: "no-membership" }
    );
  });
});

describe("usableWorkspaces", () => {
  it("lists ACTIVE memberships only, sorted by name", () => {
    const list = usableWorkspaces([BETA, PAUSED, ACME, CLOSED], ["org_beta", "org_acme", "org_paused", "org_closed"]);

    assert.deepEqual(list.map((w) => w.name), ["Acme", "Beta"]);
  });
});

describe("visibility rules", () => {
  it("never shows DRAFT or hidden invoices", () => {
    assert.equal(isClientVisibleInvoice({ status: "OPEN", visible_to_client: true }), true);
    assert.equal(isClientVisibleInvoice({ status: "DRAFT", visible_to_client: true }), false);
    assert.equal(isClientVisibleInvoice({ status: "OPEN", visible_to_client: false }), false);
    assert.equal(isClientVisibleInvoice({ status: "OPEN", visible_to_client: null }), false);
  });

  it("documents need visible_to_client, updates also need published_at", () => {
    assert.equal(isClientVisibleDocument({ visible_to_client: true }), true);
    assert.equal(isClientVisibleDocument({ visible_to_client: false }), false);
    assert.equal(isClientVisibleUpdate({ visible_to_client: true, published_at: "2026-10-01T00:00:00Z" }), true);
    assert.equal(isClientVisibleUpdate({ visible_to_client: true, published_at: null }), false);
  });
});

describe("isOfferedOption", () => {
  it("only honours options the server offered", () => {
    const choose = resolveClientOrganization({
      activeOrgId: null,
      membershipOrgIds: ["org_beta", "org_acme"],
      organizations: [BETA, ACME],
    });

    assert.equal(isOfferedOption(choose, "org_acme"), true);
    assert.equal(isOfferedOption(choose, "org_closed"), false);
    assert.equal(isOfferedOption({ kind: "no-membership" }, "org_acme"), false);
  });
});

describe("request-kind", () => {
  it("treats a native form post as a navigation", () => {
    assert.equal(isDocumentNavigation(headers({ "sec-fetch-mode": "navigate" })), true);
    assert.equal(isDocumentNavigation(headers({ accept: "text/html,application/xhtml+xml" })), true);
  });

  it("treats fetch and scripts as API callers (401 JSON)", () => {
    assert.equal(isDocumentNavigation(headers({ "sec-fetch-mode": "cors", accept: "text/html" })), false);
    assert.equal(isDocumentNavigation(headers({ accept: "application/json" })), false);
    assert.equal(isDocumentNavigation(headers({})), false);
  });

  it("only allows same-origin relative return paths", () => {
    assert.equal(safeReturnPath("/admin/clients"), "/admin/clients");
    assert.equal(safeReturnPath("//evil.example"), "/portal");
    assert.equal(safeReturnPath("/\\evil.example"), "/portal");
    assert.equal(safeReturnPath("https://evil.example", "/admin"), "/admin");
  });
});

describe("canAccessOrganization", () => {
  it("requires a ready resolution for that exact organisation", () => {
    const ready = { kind: "ready", organization: ACME };

    assert.equal(canAccessOrganization(ready, ACME.id), true);
    assert.equal(canAccessOrganization(ready, BETA.id), false);
    assert.equal(canAccessOrganization({ kind: "blocked", status: "INACTIVE", organizationName: "x" }, ACME.id), false);
  });
});
