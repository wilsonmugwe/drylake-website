/*
 * PR 5 "Drylake UX, Navigation & Performance" regression guards.
 * Findings and numbers: docs/performance/2026-10-07-auth-navigation.md.
 *
 * (1) Client Login is a document navigation: public pages carry no Clerk JS (PR #31), so a
 *     next/link RSC fetch with an expired session token is read as signed out and detours
 *     through /sign-in. A plain <a> lets clerkMiddleware refresh the token with a handshake.
 * (2) The platform-admin lookup is memoised per request: layout + page share one query.
 * (3) Request-path hygiene: the proxy reads auth only for private pages, /portal reads only
 *     the admin flag, public pages are never force-dynamic, client resolution stays memoised.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

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

describe("Client Login reaches the workspace without the sign-in detour", () => {
  const link = code("components/navigation/ClientAccessLink.tsx");

  it("is a plain anchor to /portal (document request), not next/link", () => {
    assert.match(link, /<a\s+href=\{CLIENT_LOGIN\.href\}/);
    assert.ok(!/from "next\/link"|SiteLink|<Link\b/.test(link), "no client-side (RSC) navigation");
    assert.ok(!/prefetch/.test(link), "nothing prefetches /portal through the proxy");
  });

  it("still closes the mobile menu on click and loads no Clerk code", () => {
    assert.match(link, /onClick=\{\(\) => onNavigate\?\.\(\)\}/);
    assert.ok(!/@clerk/.test(link));
  });

  it("the header and the mobile menu both use it", () => {
    assert.match(code("components/layout/NavbarClient.tsx"), /<ClientAccessLink\b/);
    assert.match(code("components/layout/MobileMenu.tsx"), /<ClientAccessLink\b/);
  });
});

describe("one platform-admin lookup per request", () => {
  const source = code("lib/auth/platform-admin.ts");

  it("isPlatformAdmin is memoised with React cache()", () => {
    assert.match(source, /import \{ cache \} from "react"/);
    assert.match(source, /export const isPlatformAdmin = cache\(lookupPlatformAdmin\)/);
    assert.equal((source.match(/\.from\("platform_admins"\)/g) ?? []).length, 1);
  });

  it("the lookup is still keyed only on this request's Clerk session", () => {
    assert.match(source, /const \{ userId \} = await auth\(\);/);
    assert.match(source, /\.eq\("clerk_user_id", userId\)/);
    assert.match(source, /if \(!userId\) \{\s*return false;/);
    assert.match(source, /if \(error\) \{[\s\S]*?return false;/, "fails closed");
  });

  it("the admin layout and the page gate both go through the memoised lookup", () => {
    assert.match(code("app/admin/layout.tsx"), /await isPlatformAdmin\(\)/);
    assert.match(code("lib/auth/guards.ts"), /await isPlatformAdmin\(\)/);
    for (const file of [...walk(join(ROOT, "app"), (f) => /\.tsx?$/.test(f)), ...walk(join(ROOT, "lib"), (f) => /\.ts$/.test(f))]) {
      if (file === "lib/auth/platform-admin.ts") continue;
      assert.ok(!/from\("platform_admins"\)/.test(code(file)), `${file} queries platform_admins directly`);
    }
  });
});

describe("request-path hygiene", () => {
  it("the proxy reads auth only after deciding the request is a private page", () => {
    const proxy = code("proxy.ts");
    const gate = proxy.indexOf("if (!isPrivatePage(request) || isPublicPortalPage(request))");
    const authAt = proxy.indexOf("await auth()");

    assert.ok(gate > 0 && authAt > gate);
    assert.equal((proxy.match(/await auth\(\)/g) ?? []).length, 1);
  });

  it("/portal only routes: one auth read, the admin flag, no data query", () => {
    const portal = code("app/portal/page.tsx");

    assert.equal((portal.match(/await auth\(\)/g) ?? []).length, 1);
    assert.match(portal, /await isPlatformAdmin\(\)/);
    assert.ok(!/\.from\(|createAdminSupabaseClient|createServerSupabaseClient|clerkClient/.test(portal));
  });

  it("public pages are never force-dynamic", () => {
    const pages = walk(join(ROOT, "app"), (f) => /page\.tsx$/.test(f)).filter(
      (f) => !/^app\/(admin|client|portal|api|sign-in|sign-up)\//.test(f)
    );

    assert.ok(pages.length >= 8, `found ${pages.length} public pages`);
    for (const page of pages) {
      assert.ok(!/force-dynamic/.test(code(page)), `${page} must stay static`);
      assert.ok(!/@clerk\/nextjs\/server|headers\(\)|cookies\(\)/.test(code(page)), `${page} reads request state`);
    }
  });

  it("client workspace resolution and the switcher stay memoised per request", () => {
    const source = code("lib/auth/client-context.ts");

    assert.match(source, /export const getClientWorkspace = cache\(resolveWorkspace\)/);
    assert.match(source, /export const getSwitchableWorkspaces = cache\(resolveSwitchableWorkspaces\)/);
  });

  it("the client dashboard loads its project-keyed content in one parallel wave", () => {
    const page = code("app/client/page.tsx");
    const wave = page.match(/await Promise\.all\(\[([\s\S]*?)\]\);/);

    assert.ok(wave);
    for (const table of ["milestones", "project_updates", "documents", "invoices"]) {
      assert.match(wave[1], new RegExp(`from\\("${table}"\\)`));
    }
  });
});
