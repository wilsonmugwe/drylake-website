/*
 * Tenant isolation: (1) the resolver never yields another tenant's workspace, and
 * (2) a static sweep proves every admin page / admin API route has its own authorization
 * check and every client surface authenticates before reading data.
 *
 * Known gaps in files owned by other workstreams are marked `todo`: they are reported on
 * every run but do not fail it. Remove an entry once that file gains its check (the
 * todo then passes and should be deleted).
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { resolveClientOrganization } from "../lib/auth/access.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const ACME = { id: "11111111-1111-4111-8111-111111111111", clerk_org_id: "org_acme", name: "Acme", status: "ACTIVE" };
const BETA = { id: "22222222-2222-4222-8222-222222222222", clerk_org_id: "org_beta", name: "Beta", status: "ACTIVE" };

describe("resolver never crosses tenants", () => {
  it("ignores rows for orgs the user is not a member of, even if passed in", () => {
    const withActive = resolveClientOrganization({
      activeOrgId: "org_acme",
      membershipOrgIds: ["org_acme"],
      organizations: [BETA, ACME],
    });

    assert.equal(withActive.kind, "ready");
    assert.equal(withActive.organization.id, ACME.id);

    const withoutActive = resolveClientOrganization({
      activeOrgId: null,
      membershipOrgIds: ["org_acme"],
      organizations: [BETA, ACME],
    });

    assert.equal(withoutActive.kind, "activate");
    assert.equal(withoutActive.option.clerkOrgId, "org_acme");
  });

  it("a user with no membership gets nothing, whatever rows exist", () => {
    const result = resolveClientOrganization({
      activeOrgId: null,
      membershipOrgIds: [],
      organizations: [ACME, BETA],
    });

    assert.deepEqual(result, { kind: "no-membership" });
  });

  it("access logic has no email-based path", () => {
    const source = readFileSync(join(ROOT, "lib/auth/access.ts"), "utf8");
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

    assert.ok(!/email/i.test(code), "lib/auth/access.ts must not reference email");
  });
});

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

const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

/* Pages that fetch nothing (loading skeletons) need no guard of their own. */
const isGuardablePage = (file) => file.endsWith("page.tsx");

const KNOWN_UNGUARDED_ADMIN_PAGES = new Map([
  // Empty: every admin page now calls requirePlatformAdmin() itself (fixed 2026-10-05).
]);

describe("every admin page authorizes itself", () => {
  const pages = walk(join(ROOT, "app/admin"), isGuardablePage);

  it("finds admin pages", () => assert.ok(pages.length > 5));

  for (const page of pages) {
    const known = KNOWN_UNGUARDED_ADMIN_PAGES.get(page);

    it(page, known ? { todo: `missing page-level guard: ${known}` } : {}, () => {
      const source = read(page);

      assert.ok(
        /requirePlatformAdmin\(|isPlatformAdmin\(\)/.test(source),
        `${page} must call requirePlatformAdmin() before any service-role query`
      );
    });
  }
});

describe("every admin API route authorizes itself", () => {
  const routes = walk(join(ROOT, "app/api/admin"), (file) => file.endsWith("route.ts"));

  it("finds admin routes", () => assert.ok(routes.length > 5));

  for (const route of routes) {
    it(route, () => {
      const source = read(route);

      assert.ok(
        /authorizeAdminApi\(|isPlatformAdmin\(\)/.test(source),
        `${route} must authorize the caller`
      );
      assert.ok(
        !/redirect\(\s*["'`]\/admin/.test(source) || /status:\s*40[13]/.test(source),
        `${route} must answer unauthorized callers with 401/403, not only a redirect`
      );
    });
  }
});

describe("client surfaces authenticate and scope by membership", () => {
  const files = [
    ...walk(join(ROOT, "app/client"), (file) => file.endsWith("page.tsx")),
    ...walk(join(ROOT, "app/api/client"), (file) => file.endsWith("route.ts")),
  ];

  for (const file of files) {
    it(file, () => {
      const source = read(file);

      assert.ok(
        /getClientAccess\(|await auth\(\)/.test(source),
        `${file} must resolve the caller from the Clerk session`
      );

      // The organisation comes from the session, never from the browser.
      assert.ok(
        !/searchParams[\s\S]{0,200}organization_id/.test(source),
        `${file} must not take an organisation id from the query string`
      );
    });
  }

  it("the download route uses the service role only to sign storage URLs", () => {
    const source = read("app/api/client/documents/[documentId]/download/route.ts");
    const adminUses = source.match(/adminSupabase\.[a-zA-Z]+/g) ?? [];

    assert.ok(adminUses.length > 0);
    assert.ok(adminUses.every((use) => use === "adminSupabase.storage"));
    assert.match(source, /createSignedUrl\(/);
    assert.match(source, /SIGNED_URL_LIFETIME_SECONDS = 60/);
    assert.match(source, /\.eq\("visible_to_client", true\)/);
  });
});
