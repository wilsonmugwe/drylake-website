/*
 * PR 7, production experience QA (2026-10-07). Contracts for what the browser suite cannot
 * reach without real Clerk sessions (signed-in client, admin and wrong-role flows), the
 * Workspace's pure helpers not covered elsewhere, and the safety rails of the e2e suite itself.
 *
 * Signed-in behaviour is proven here by ORDER, not just presence: a guard that runs after the
 * first service-role query protects nothing. tests/tenant-isolation.test.mjs checks presence.
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { dirname, join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  balanceByCurrency,
  isOpenProjectStatus,
  isPayable,
  orderProjects,
} from "../components/client/workspace-derive.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

/*
 * admin-nav.ts imports lucide-react icons, which cannot load under the react-server condition
 * `npm test` uses. The icons are irrelevant to the routing rules, so load the module with them
 * replaced by placeholders.
 */
const { ADMIN_NAV_GROUPS, isAdminNavActive } = await import(
  `data:text/javascript,${encodeURIComponent(
    stripTypeScriptTypes(
      read("components/admin/admin-nav.ts").replace(
        /import \{([\s\S]*?)\} from "lucide-react";/,
        (_, names) =>
          `const ${names
            .split(",")
            .map((n) => n.replace(/\btype\b/, "").trim())
            .filter((n) => n && n !== "LucideIcon")
            .map((n) => `${n} = 1`)
            .join(", ")};`
      )
    )
  )}`
);

function walk(dir, predicate, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, predicate, out);
    else if (predicate(full)) out.push(relative(ROOT, full).replaceAll("\\", "/"));
  }
  return out;
}

/* Source with comments removed, so a guard mentioned in a comment does not count. */
function code(rel) {
  return read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

describe("proxy: signed-out requests for private pages never reach a page", () => {
  const proxy = code("proxy.ts");

  it("protects /admin, /client and /portal, including every nested route", () => {
    const matcher = proxy.match(/isPrivatePage = createRouteMatcher\(\[([\s\S]*?)\]\)/)?.[1] ?? "";
    for (const prefix of ["/admin(.*)", "/client(.*)", "/portal(.*)"]) {
      assert.ok(matcher.includes(`"${prefix}"`), `${prefix} is private`);
    }
  });

  it("the invitation landing is the only public exception", () => {
    const exceptions = proxy.match(/isPublicPortalPage = createRouteMatcher\(\[([\s\S]*?)\]\)/)?.[1] ?? "";
    assert.deepEqual(exceptions.match(/"[^"]+"/g), ['"/portal/accept-invitation"']);
  });

  it("the sign-in redirect carries the full path and query back", () => {
    assert.match(proxy, /signIn\.searchParams\.set\("redirect_url", `\$\{pathname\}\$\{search\}`\)/);
    assert.match(proxy, /if \(userId\) \{\s*return;\s*\}/);
  });

  it("the middleware runs for pages and every API route", () => {
    assert.match(proxy, /"\/\(api\|trpc\)\(\.\*\)"/);
  });
});

describe("admin pages authorise BEFORE their first service-role query", () => {
  const pages = walk(join(ROOT, "app/admin"), (file) => file.endsWith("page.tsx"));

  it("finds admin pages", () => assert.ok(pages.length > 10));

  for (const page of pages) {
    it(page, () => {
      const source = code(page);
      const firstQuery = source.indexOf("createAdminSupabaseClient(");
      if (firstQuery === -1) return; // reads nothing privileged

      const pageGate = source.indexOf("requirePlatformAdmin(");
      const inlineGate = source.indexOf("isPlatformAdmin()");
      const gate = [pageGate, inlineGate].filter((index) => index !== -1);

      assert.ok(gate.length > 0, `${page} has no platform-admin check`);
      assert.ok(Math.min(...gate) < firstQuery, `${page} queries with the service role before checking platform admin`);

      // The inline form must refuse non-admins, not just compute the flag.
      if (pageGate === -1 || pageGate > firstQuery) {
        assert.match(source, /if \(!\(?(await isPlatformAdmin\(\)|platformAdmin)\)?\)? \{\s*redirect\("\/client"\)/, `${page} redirects non-admins`);
        assert.match(source, /if \(!userId\) \{\s*redirect\(/, `${page} redirects signed-out callers`);
      }
    });
  }
});

describe("admin API routes authorise before reading input or the service role", () => {
  const routes = walk(join(ROOT, "app/api/admin"), (file) => file.endsWith("route.ts"));

  for (const route of routes) {
    it(route, () => {
      const source = code(route);
      const handlers = source.split(/export async function (?=GET|POST|PUT|PATCH|DELETE)/).slice(1);
      assert.ok(handlers.length > 0, `${route} exports a handler`);

      for (const handler of handlers) {
        const name = handler.slice(0, handler.indexOf("("));
        const gate = Math.min(
          ...[handler.indexOf("authorizeAdminApi("), handler.indexOf("isPlatformAdmin()")].filter((i) => i !== -1)
        );
        assert.ok(Number.isFinite(gate), `${route} ${name} authorises`);

        for (const sensitive of ["createAdminSupabaseClient(", "request.json(", "request.formData(", "clerkClient("]) {
          const index = handler.indexOf(sensitive);
          if (index !== -1) assert.ok(gate < index, `${route} ${name}: ${sensitive} before the auth gate`);
        }
      }
    });
  }
});

describe("admin form-post routes answer an expired session with sign-in, not a dead end", () => {
  // Defect found by the e2e suite 2026-10-07: Issue/Resend replied with a bare text 401 page.
  for (const action of ["issue", "resend"]) {
    it(`invoice ${action} uses the shared admin gate, returning to the invoice`, () => {
      const source = code(`app/api/admin/invoices/[invoiceId]/${action}/route.ts`);
      assert.match(source, /authorizeAdminApi\(\s*request,\s*returnTo\s*\)/);
      assert.match(source, /const returnTo = isUuid\(invoiceId\) \? `\/admin\/invoices\/\$\{invoiceId\}` : "\/admin\/invoices"/);
      assert.ok(!source.includes('noStore("Unauthorized"'), "no bare text 401");
      assert.ok(source.indexOf("authorizeAdminApi(") < source.indexOf("createAdminSupabaseClient("));
    });
  }
});

describe("client Workspace pages: session first, RLS client only", () => {
  const pages = walk(join(ROOT, "app/client"), (file) => file.endsWith("page.tsx"));

  it("finds the four Workspace pages", () => assert.equal(pages.length, 4));

  for (const page of pages) {
    it(page, () => {
      const source = code(page);

      assert.ok(!source.includes("createAdminSupabaseClient"), `${page} must never use the service role`);
      assert.ok(!source.includes("@/lib/supabase/admin"), `${page} must not import the service-role module`);
      assert.ok(!source.includes("createServerSupabaseClient"), `${page} takes its client from the workspace, not its own`);

      const resolve = source.indexOf("getClientWorkspace()");
      const firstQuery = source.search(/supabase\s*\.\s*from\(|supabase\s*\n\s*\.from\(/);
      assert.ok(resolve !== -1, `${page} resolves the workspace`);
      if (firstQuery !== -1) assert.ok(resolve < firstQuery, `${page} queries before resolving the session`);

      // The client used for data is the one the resolver created for this session (RLS applies).
      assert.match(source, /const \{[^}]*supabase[^}]*\} = (workspace|await getClientWorkspace\(\))/, `${page} uses the workspace's client`);

      // Signed-out callers go to sign-in carrying this page as the return path.
      // (signInUrl, or invoiceSignInPath for invoice links, which builds the same URL).
      assert.match(
        source,
        /state === "signed-out"\)[\s\S]{0,40}redirect\([\s\S]{0,120}(signInUrl|invoiceSignInPath)\(/,
        `${page} sends signed-out callers to sign-in`
      );
    });
  }

  it("the resolver hands pages the session-bound (RLS) Supabase client", () => {
    const resolver = code("lib/auth/client-context.ts");
    assert.match(resolver, /const supabase = createServerSupabaseClient\(\)/);
    assert.match(resolver, /state: "ready", userId, organization: decision\.organization, supabase/);
  });

  it("not-ready workspaces render a state screen, never data (ClientWorkspaceGate)", () => {
    for (const page of pages) {
      assert.match(code(page), /ClientWorkspaceGate/, `${page} gates not-ready workspaces`);
    }
  });
});

describe("Workspace pure helpers", () => {
  it("balanceByCurrency never adds different currencies together", () => {
    assert.deepEqual(
      balanceByCurrency([
        { currency: "AUD", totalCents: 1000 },
        { currency: "USD", totalCents: 500 },
        { currency: "AUD", totalCents: 250 },
      ]),
      [
        { currency: "AUD", cents: 1250 },
        { currency: "USD", cents: 500 },
      ]
    );
    assert.deepEqual(balanceByCurrency([]), []);
  });

  it("only OPEN and OVERDUE invoices are payable", () => {
    for (const status of ["OPEN", "OVERDUE"]) assert.equal(isPayable(status), true, status);
    for (const status of ["PAID", "DRAFT", "VOID", "CANCELLED", ""]) assert.equal(isPayable(status), false, status);
  });

  it("orderProjects lists open projects first and keeps the loader's order inside each group", () => {
    const projects = [
      { id: "a", status: "COMPLETED" },
      { id: "b", status: "IN_PROGRESS" },
      { id: "c", status: "CANCELLED" },
      { id: "d", status: "PLANNING" },
      { id: "e", status: "DELIVERED" },
    ];

    assert.deepEqual(orderProjects(projects).map((project) => project.id), ["b", "d", "a", "c", "e"]);
    assert.equal(isOpenProjectStatus("IN_PROGRESS"), true);
    assert.equal(isOpenProjectStatus("DELIVERED"), false);
    assert.equal(projects[0].id, "a", "input is not mutated");
  });
});

describe("Admin navigation", () => {
  it("every entry is an existing, self-guarded admin route", () => {
    for (const item of ADMIN_NAV_GROUPS.flatMap((group) => group.items)) {
      const page = `app${item.href}/page.tsx`;
      assert.ok(existsSync(join(ROOT, page)), `${item.href} has a page`);
    }
  });

  it("Dashboard is active only on /admin; sections are active on their subtree", () => {
    assert.equal(isAdminNavActive("/admin", "/admin"), true);
    assert.equal(isAdminNavActive("/admin/clients", "/admin"), false);
    assert.equal(isAdminNavActive("/admin/clients", "/admin/clients"), true);
    assert.equal(isAdminNavActive("/admin/clients/123/billing", "/admin/clients"), true);
    assert.equal(isAdminNavActive("/admin/clientsx", "/admin/clients"), false);
    assert.equal(isAdminNavActive(null, "/admin"), false);
  });
});

describe("the e2e suite cannot email anyone or write to production", () => {
  const config = code("playwright.config.ts");
  const specs = walk(join(ROOT, "tests/e2e"), (file) => file.endsWith(".ts"));

  it("the local server runs with the mailer disabled and Turnstile test keys", () => {
    assert.match(config, /RESEND_API_KEY: ""/);
    assert.match(config, /TURNSTILE_SECRET_KEY: TURNSTILE_TEST_SECRET_KEY/);
    assert.match(config, /TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA"/);
    assert.match(config, /NEXT_PUBLIC_TURNSTILE_SITE_KEY: TURNSTILE_TEST_SITE_KEY/);
  });

  it("a remote base URL excludes every @local test and starts no server", () => {
    assert.match(config, /grepInvert: REMOTE_BASE_URL \? \/@local\/ : undefined/);
    assert.match(config, /webServer: REMOTE_BASE_URL\s*\?\s*undefined/);
  });

  it("every test that submits the contact form or posts to it is @local", () => {
    const contact = read("tests/e2e/contact-form.spec.ts");
    const describes = [...contact.matchAll(/test\.describe\("([^"]+)"/g)].map((match) => match[1]);
    assert.ok(describes.length >= 3);
    for (const title of describes) assert.match(title, /@local/, `"${title}" must be @local`);
    assert.ok(!/^test\(/m.test(contact), "no top-level (untagged) test in the contact spec");

    for (const spec of specs.filter((file) => file !== "tests/e2e/contact-form.spec.ts")) {
      const source = read(spec);
      for (const match of source.matchAll(/test\("([^"]+)"[\s\S]{0,400}?\/api\/contact/g)) {
        assert.match(match[1], /@local/, `${spec}: "${match[1]}" posts to /api/contact`);
      }
    }
  });

  it("no spec hard-codes a production URL to request", () => {
    for (const spec of specs) {
      assert.ok(!/(get|post|goto)\(\s*["'`]https:\/\/drylake\.com\.au/.test(read(spec)), spec);
    }
  });
});

describe("dependency and script hygiene", () => {
  const pkg = JSON.parse(read("package.json"));

  it("npm test still runs only the fast node suite; the browser suite has its own script", () => {
    assert.equal(pkg.scripts.test, "node --conditions=react-server --test tests/*.test.mjs");
    assert.match(pkg.scripts["test:e2e"], /playwright test/);
  });

  it("no new runtime dependency arrives without a reviewed entry here (no heavy libraries)", () => {
    assert.deepEqual(Object.keys(pkg.dependencies).sort(), [
      // Reviewed 2026-10-16 (AI assistant PR): Claude on Amazon Bedrock Sydney, imported only by
      // lib/assistant/providers/bedrock-sydney.ts (server-only; tests/assistant-static.test.mjs).
      "@anthropic-ai/bedrock-sdk",
      "@clerk/nextjs",
      "@supabase/supabase-js",
      "@vercel/analytics",
      "clsx",
      "lucide-react",
      "motion",
      "next",
      // Reviewed 2026-10-08 (agent-readable PR): server-only HTML to Markdown for the
      // text/markdown negotiation route (app/api/markdown). Never shipped to the browser.
      "node-html-markdown",
      "node-html-parser",
      "react",
      "react-dom",
      "resend",
      "stripe",
      "tailwind-merge",
    ]);
  });

  it("Playwright is a dev dependency only", () => {
    assert.ok(pkg.devDependencies["@playwright/test"]);
    assert.ok(pkg.devDependencies["@axe-core/playwright"]);
    assert.ok(!pkg.dependencies["@playwright/test"]);
  });
});
