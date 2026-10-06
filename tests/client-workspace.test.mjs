/*
 * PR "client portal: one workspace resolver, automatic linking, native contact".
 *
 * (1) decideClientWorkspace(): the ONE decision every portal surface renders from.
 * (2) completableInvitations(): signed-in invitation completion (onboarding, never
 *     authorization).
 * (3) Static sweeps proving the wiring: one resolver everywhere, content never sends a
 *     ready client to a setup screen, organisation-scoped queries, no mailto: in the
 *     portal, and the native contact form posting to the existing /api/contact backend.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  decideClientWorkspace,
  isClientVisibleInvoice,
  resolveClientOrganization,
} from "../lib/auth/access.ts";
import { clientMatchesQuery, clientOptionLabel } from "../lib/clients/display.ts";
import {
  completableInvitations,
  isAlreadyMemberError,
} from "../lib/clients/invitation-completion.ts";
import { ilikeExact, parseRequiredContactName } from "../lib/clients/validation.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

function walk(dir, predicate, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);

    if (statSync(full).isDirectory()) {
      walk(full, predicate, out);
    } else if (predicate(full)) {
      out.push(relative(ROOT, full).replaceAll("\\", "/"));
    }
  }

  return out;
}

const CLIENT_A = { id: "11111111-1111-4111-8111-111111111111", clerk_org_id: "org_a", name: "Client A", status: "ACTIVE" };
const CLIENT_B = { id: "22222222-2222-4222-8222-222222222222", clerk_org_id: "org_b", name: "Client B", status: "ACTIVE" };
const PAUSED = { id: "33333333-3333-4333-8333-333333333333", clerk_org_id: "org_p", name: "Paused", status: "INACTIVE" };
const CLOSED = { id: "44444444-4444-4444-8444-444444444444", clerk_org_id: "org_c", name: "Closed", status: "ARCHIVED" };

const OPTION_A = { clerkOrgId: "org_a", organizationId: CLIENT_A.id, name: "Client A" };

function decide({ activeOrgId = null, memberOf = [], rows = [CLIENT_A, CLIENT_B], pending = [], rls = null }) {
  return decideClientWorkspace({
    resolution: resolveClientOrganization({
      activeOrgId,
      membershipOrgIds: memberOf,
      organizations: rows,
    }),
    pendingInvitations: pending,
    rls,
  });
}

describe("workspace resolution: invitation and membership", () => {
  it("a member whose session has the org active, accepted by RLS, is ready", () => {
    const result = decide({ activeOrgId: "org_a", memberOf: ["org_a"], rls: "found" });

    assert.equal(result.state, "ready");
    assert.equal(result.organization.id, CLIENT_A.id);
  });

  it("a member who has not activated the org yet is pending activation, not 'no organisation'", () => {
    const result = decide({ memberOf: ["org_a"] });

    assert.deepEqual(result, {
      state: "access-pending",
      reason: "activate-membership",
      options: [OPTION_A],
    });
  });

  it("a signed-in account with an unredeemed Drylake invitation is completed, not told 'no workspace'", () => {
    const result = decide({ memberOf: [], pending: [OPTION_A] });

    assert.equal(result.state, "access-pending");
    assert.equal(result.reason, "accept-invitation");
    assert.deepEqual(result.options, [OPTION_A]);
  });

  it("no membership and no invitation is genuinely no-organisation", () => {
    assert.deepEqual(decide({ memberOf: [] }), { state: "no-organisation" });
  });

  it("several workspaces and none active asks the user to choose", () => {
    const result = decide({ memberOf: ["org_a", "org_b"] });

    assert.equal(result.state, "access-pending");
    assert.equal(result.reason, "choose-membership");
    assert.equal(result.options.length, 2);
  });

  it("a Clerk org with no Drylake row is pending linking", () => {
    const result = decide({ activeOrgId: "org_x", memberOf: ["org_x"], rows: [] });

    assert.deepEqual(result, { state: "access-pending", reason: "not-linked", options: [] });
  });
});

describe("workspace resolution: fail closed and lifecycle", () => {
  it("missing or rejected token (request error) fails closed", () => {
    const result = decide({ activeOrgId: "org_a", memberOf: ["org_a"], rls: "request-error" });

    assert.deepEqual(result, { state: "lookup-failed" });
  });

  it("an unverified ready resolution (no RLS outcome) fails closed", () => {
    const result = decide({ activeOrgId: "org_a", memberOf: ["org_a"], rls: null });

    assert.deepEqual(result, { state: "lookup-failed" });
  });

  it("RLS returning no row is never ready", () => {
    const result = decide({ activeOrgId: "org_a", memberOf: ["org_a"], rls: "rls-empty" });

    assert.equal(result.state, "access-pending");
    assert.equal(result.reason, "authorization-pending");
  });

  it("an INACTIVE client is inaccessible", () => {
    const result = decide({ activeOrgId: "org_p", memberOf: ["org_p"], rows: [PAUSED], rls: "found" });

    assert.deepEqual(result, { state: "blocked", status: "INACTIVE", organizationName: "Paused" });
  });

  it("an ARCHIVED client is inaccessible", () => {
    const result = decide({ activeOrgId: "org_c", memberOf: ["org_c"], rows: [CLOSED], rls: "found" });

    assert.deepEqual(result, { state: "blocked", status: "ARCHIVED", organizationName: "Closed" });
  });

  it("membership beats a pending invitation, and a blocked membership is not bypassed by one", () => {
    const blocked = decide({ activeOrgId: "org_p", memberOf: ["org_p"], rows: [PAUSED], pending: [OPTION_A] });

    assert.equal(blocked.state, "blocked");
  });
});

describe("tenant isolation: Client A never resolves to Client B", () => {
  it("a Client A member gets Client A even when Client B's row is passed in", () => {
    const result = decide({ activeOrgId: "org_a", memberOf: ["org_a"], rows: [CLIENT_B, CLIENT_A], rls: "found" });

    assert.equal(result.organization.id, CLIENT_A.id);
  });

  it("a session claiming Client B's org without membership never reaches Client B data", () => {
    // auth().orgId is Clerk-signed, but even a forged id only resolves through rows the
    // membership list contains; here Client B is the only row and the user is A's member.
    const result = decide({ activeOrgId: null, memberOf: ["org_a"], rows: [CLIENT_B] });

    assert.notEqual(result.state, "ready");
  });

  it("client project and invoice pages scope every read to the resolved organisation", () => {
    for (const file of ["app/client/projects/[projectId]/page.tsx", "app/client/billing/[invoiceId]/page.tsx"]) {
      const source = code(file);

      assert.match(source, /\.eq\(\s*["']organization_id["'],\s*organization\.id\s*\)/, file);
      assert.match(source, /=\s*workspace;/, `${file} must take organization from the resolver`);
      assert.ok(!/params[\s\S]{0,120}organization/i.test(source.replace(/organizationName/g, "")), file);
    }
  });
});

describe("invitation completion is onboarding, never email-only authorization", () => {
  const NOW = Date.UTC(2026, 9, 6);
  const invite = (over = {}) => ({
    id: "orginv_1234567890",
    clerkOrgId: "org_a",
    emailAddress: "Alex@Example.com ",
    status: "pending",
    role: "org:member",
    expiresAt: NOW + 86_400_000,
    ...over,
  });
  const run = (invitations, verifiedAddresses = ["alex@example.com"], organizations = [CLIENT_A, PAUSED]) =>
    completableInvitations({ invitations, organizations, verifiedAddresses, now: NOW });

  it("completes a pending client invitation to a verified address for an ACTIVE client", () => {
    assert.deepEqual(run([invite()]), [
      { invitationId: "orginv_1234567890", clerkOrgId: "org_a", organizationId: CLIENT_A.id, name: "Client A" },
    ]);
  });

  it("a verified email with no Drylake invitation grants nothing", () => {
    assert.deepEqual(run([]), []);
  });

  it("an unverified address cannot complete an invitation", () => {
    assert.deepEqual(run([invite()], []), []);
    assert.deepEqual(run([invite()], ["someone@else.com"]), []);
  });

  it("expired, revoked, accepted or admin-role invitations are ignored", () => {
    assert.deepEqual(run([invite({ expiresAt: NOW - 1 })]), []);
    assert.deepEqual(run([invite({ status: "revoked" })]), []);
    assert.deepEqual(run([invite({ status: "accepted" })]), []);
    assert.deepEqual(run([invite({ role: "org:admin" })]), []);
  });

  it("invitations for unmapped or non-ACTIVE clients are ignored", () => {
    assert.deepEqual(run([invite({ clerkOrgId: "org_unknown" })]), []);
    assert.deepEqual(run([invite({ clerkOrgId: "org_p" })]), []);
  });

  it("duplicate invitations to one org complete once", () => {
    assert.equal(run([invite(), invite({ id: "orginv_abcdefghij" })]).length, 1);
  });

  it("already-a-member is treated as done (idempotent)", () => {
    assert.ok(isAlreadyMemberError("already_a_member_in_organization"));
    assert.ok(!isAlreadyMemberError("resource_not_found"));
  });

  it("the completion route takes no input from the browser", () => {
    const source = code("app/api/client/invitations/complete/route.ts");

    assert.ok(!/request\.(json|formData|text)\(/.test(source));
    assert.match(source, /pendingClientInvitations\(userId\)/);
    assert.match(source, /isSameOrigin\(request\)/);
    assert.match(source, /CLIENT_INVITATION_ACCEPTED/);
  });
});

describe("one authoritative resolver; content never regresses access", () => {
  const portalPages = walk(join(ROOT, "app/client"), (file) => file.endsWith("page.tsx"));

  it("finds the portal pages", () => assert.ok(portalPages.length >= 4));

  for (const page of portalPages) {
    it(`${page}: access screens only before the ready branch`, () => {
      const source = code(page);
      const readyAt = source.search(/=\s*workspace;/);

      assert.ok(readyAt > 0, `${page} must destructure the ready workspace`);

      const afterReady = source.slice(readyAt);

      assert.ok(!/ClientWorkspaceGate/.test(afterReady), `${page}: gate after ready`);
      assert.ok(!/access-pending|no-organisation|billing-unavailable/.test(afterReady), `${page}: access state after ready`);
    });
  }

  it("the dashboard shows a project empty state, not a setup screen", () => {
    assert.match(read("components/client/ClientDashboardView.tsx"), /No active projects yet\./);
    assert.match(read("components/client/ClientBillingView.tsx"), /No invoices yet\./);
  });

  it("'being set up' copy is gone from the access states", () => {
    assert.ok(!/being set up/i.test(read("components/client/ClientAccessState.tsx")));
  });

  it("the resolver is the only place that decides readiness, and it checks RLS", () => {
    const source = code("lib/auth/client-context.ts");

    assert.match(source, /export const getClientWorkspace = cache\(/);
    assert.match(source, /decideClientWorkspace\(/);
    assert.match(source, /createServerSupabaseClient\(\)/);
    assert.match(source, /state: "lookup-failed"/);
  });

  it("the RLS client fails closed without a Clerk token", () => {
    assert.match(code("lib/supabase/server.ts"), /throw new Error\("Missing Clerk session token for Supabase"\)/);
  });
});

describe("projects and invoices reach the portal through the organisation alone", () => {
  it("admin project creation stores the verified client's organisation id", () => {
    const source = code("app/api/admin/clients/[organizationId]/projects/route.ts");

    assert.match(source, /organization_id:\s*organization\.id/);
    assert.match(source, /organization\.status\s*!==\s*"ACTIVE"/);
    assert.match(source, /isPlatformAdmin\(\)/);
  });

  it("the admin picks a client by name and contact email, never an id", () => {
    assert.equal(clientOptionLabel({ name: "Acme", contactEmail: "alex@acme.com.au" }), "Acme — alex@acme.com.au");
    assert.equal(clientOptionLabel({ name: "Acme", contactEmail: null }), "Acme");
    assert.ok(clientMatchesQuery({ name: "Acme", contactEmail: "alex@acme.com.au" }, "ALEX@"));
    assert.ok(clientMatchesQuery({ name: "Acme", contactEmail: null }, "acm"));
    assert.ok(!clientMatchesQuery({ name: "Acme", contactEmail: "alex@acme.com.au" }, "beta"));
    assert.match(read("app/admin/projects/new/page.tsx"), /billing_email/);
  });

  it("issued, client-visible invoices are listed by organisation; drafts never", () => {
    assert.ok(isClientVisibleInvoice({ status: "OPEN", visible_to_client: true }));
    assert.ok(!isClientVisibleInvoice({ status: "DRAFT", visible_to_client: true }));
    assert.ok(!isClientVisibleInvoice({ status: "OPEN", visible_to_client: false }));

    const billing = code("app/client/billing/page.tsx");

    assert.match(billing, /\.eq\("organization_id", organization\.id\)/);
    assert.match(billing, /\.eq\("visible_to_client", true\)/);
    assert.match(billing, /\.neq\("status", "DRAFT"\)/);
  });
});

describe("client onboarding is email-driven, nobody handles an organisation id", () => {
  it("contact name and email are required, and the invitation is automatic", () => {
    const route = code("app/api/admin/clients/route.ts");

    assert.match(route, /parseRequiredContactName\(/);
    assert.match(route, /parseRequiredEmail\(/);
    assert.ok(!/sendInvite|wantsInvite/.test(route), "invitation must not be optional");
    assert.match(route, /createClientInvitation\(/);
    assert.match(route, /clerk_org_id: clerkOrgId/);
    assert.ok(!/sendInvite/.test(read("components/admin/AdminClientCreateForm.tsx")));
  });

  it("duplicate client names are refused with an exact, wildcard-safe match", () => {
    assert.equal(ilikeExact("50% Off_Co"), "50\\% Off\\_Co");
    assert.match(code("app/api/admin/clients/route.ts"), /\.ilike\("name", ilikeExact\(name\.value\)\)/);
  });

  it("parseRequiredContactName rejects empty input", () => {
    assert.equal(parseRequiredContactName("  ").ok, false);
    assert.deepEqual(parseRequiredContactName(" Alex  Citizen "), { ok: true, value: "Alex Citizen" });
  });
});

describe("native contact replaces mailto: in the client portal", () => {
  const portalFiles = [
    ...walk(join(ROOT, "components/client"), (file) => /\.(tsx|ts)$/.test(file)),
    ...walk(join(ROOT, "app/client"), (file) => /\.(tsx|ts)$/.test(file)),
    ...walk(join(ROOT, "app/portal"), (file) => /\.(tsx|ts)$/.test(file)),
  ];

  it("no portal file contains a mailto: link", () => {
    const offenders = portalFiles.filter((file) => /mailto:/i.test(code(file)));

    assert.deepEqual(offenders, []);
  });

  it("access states offer Start a conversation as the primary action", () => {
    const source = read("components/client/ClientAccessState.tsx");

    assert.match(source, /<MessageDrylake variant="cta"/);
    assert.match(read("components/client/MessageDrylake.tsx"), /START_CONVERSATION = "Start a conversation"/);
  });

  it("the form submits through the existing /api/contact backend", () => {
    assert.match(code("components/client/MessageDrylake.tsx"), /submitEnquiry\(/);
    assert.match(code("lib/contact/submit-enquiry.ts"), /fetchImpl\(\s*["']\/api\/contact["']/);

    const route = code("app/api/contact/route.ts");

    assert.match(route, /verifyTurnstile\(/);
    assert.match(route, /deliverContactEnquiry\(/);
    assert.match(route, /portal: await getPortalContext\(\)/);
  });
});
