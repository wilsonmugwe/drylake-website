/*
 * Clerk -> Supabase token diagnostics (lib/supabase/token-shape.ts).
 * Guards the "Portal access pending" defect: the portal must be able to tell a token
 * Supabase runs as anon (no role claim) or without the org claim from a real
 * "no workspace", and must never put the token or identifiers in a log.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyOrganizationLookup,
  describeClerkSupabaseToken,
} from "../lib/supabase/token-shape.ts";

const NOW = 1_800_000_000;

function jwt(payload) {
  const part = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "RS256", typ: "JWT" })}.${part(payload)}.c2lnbmF0dXJl`;
}

function without(object, key) {
  return Object.fromEntries(Object.entries(object).filter(([name]) => name !== key));
}

const V2_OK = {
  sub: "user_secret_123",
  email: "client@example.com",
  role: "authenticated",
  v: 2,
  o: { id: "org_acme", rol: "member", slg: "acme" },
  exp: NOW + 60,
};

describe("describeClerkSupabaseToken", () => {
  it("v2 token with role and o.id matching the session", () => {
    assert.deepEqual(describeClerkSupabaseToken(jwt(V2_OK), "org_acme", NOW), {
      tokenPresent: true,
      decodable: true,
      roleClaim: "authenticated",
      orgClaimSource: "o.id",
      orgClaimMatchesSession: true,
      sessionTokenVersion: 2,
      expired: false,
    });
  });

  it("flags a token without the role claim (PostgREST runs it as anon)", () => {
    const noRole = without(V2_OK, "role");
    const shape = describeClerkSupabaseToken(jwt(noRole), "org_acme", NOW);
    assert.equal(shape.roleClaim, "missing");
    assert.equal(shape.orgClaimMatchesSession, true);
  });

  it("categorises unexpected role values without echoing them", () => {
    assert.equal(describeClerkSupabaseToken(jwt({ ...V2_OK, role: "anon" }), "org_acme", NOW).roleClaim, "anon");
    assert.equal(describeClerkSupabaseToken(jwt({ ...V2_OK, role: "service_role" }), "org_acme", NOW).roleClaim, "other");
  });

  it("reads the v1 org_id claim", () => {
    const rest = without(V2_OK, "o");
    const shape = describeClerkSupabaseToken(jwt({ ...rest, v: 1, org_id: "org_acme" }), "org_acme", NOW);
    assert.equal(shape.orgClaimSource, "org_id");
    assert.equal(shape.orgClaimMatchesSession, true);
  });

  it("detects a token whose org differs from the session org", () => {
    const shape = describeClerkSupabaseToken(jwt({ ...V2_OK, o: { id: "org_other" } }), "org_acme", NOW);
    assert.equal(shape.orgClaimMatchesSession, false);
  });

  it("detects a token with no org claim", () => {
    const rest = without(V2_OK, "o");
    const shape = describeClerkSupabaseToken(jwt(rest), "org_acme", NOW);
    assert.equal(shape.orgClaimSource, "none");
    assert.equal(shape.orgClaimMatchesSession, false);
  });

  it("never matches when the session has no org", () => {
    assert.equal(describeClerkSupabaseToken(jwt(V2_OK), null, NOW).orgClaimMatchesSession, false);
    assert.equal(describeClerkSupabaseToken(jwt(V2_OK), "", NOW).orgClaimMatchesSession, false);
  });

  it("reports expiry", () => {
    assert.equal(describeClerkSupabaseToken(jwt({ ...V2_OK, exp: NOW - 1 }), "org_acme", NOW).expired, true);
    const noExp = without(V2_OK, "exp");
    assert.equal(describeClerkSupabaseToken(jwt(noExp), "org_acme", NOW).expired, null);
  });

  it("handles a missing or malformed token", () => {
    assert.equal(describeClerkSupabaseToken(null, "org_acme", NOW).tokenPresent, false);
    assert.equal(describeClerkSupabaseToken("", "org_acme", NOW).tokenPresent, false);
    const garbage = describeClerkSupabaseToken("not-a-jwt", "org_acme", NOW);
    assert.equal(garbage.tokenPresent, true);
    assert.equal(garbage.decodable, false);
    const badJson = describeClerkSupabaseToken("a.%%%.c", "org_acme", NOW);
    assert.equal(badJson.decodable, false);
  });

  it("never returns the token, subject, email, org id or signature", () => {
    const token = jwt(V2_OK);
    const serialized = JSON.stringify(describeClerkSupabaseToken(token, "org_acme", NOW));
    for (const secret of [token, "user_secret_123", "client@example.com", "org_acme", "acme", "c2lnbmF0dXJl"]) {
      assert.equal(serialized.includes(secret), false, `leaked ${secret}`);
    }
  });
});

describe("classifyOrganizationLookup", () => {
  it("found when RLS returns the row", () => {
    assert.equal(classifyOrganizationLookup(null, { id: "x" }), "found");
  });

  it("rls-empty when the read succeeds with no row (access pending)", () => {
    assert.equal(classifyOrganizationLookup(null, null), "rls-empty");
    assert.equal(classifyOrganizationLookup(undefined, undefined), "rls-empty");
  });

  it("request-error when Supabase rejects the request, even if a row is present", () => {
    assert.equal(classifyOrganizationLookup({ code: "PGRST301" }, null), "request-error");
    assert.equal(classifyOrganizationLookup({ code: "42501" }, { id: "x" }), "request-error");
  });
});
