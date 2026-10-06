/*
 * PR "client portal: UX redesign + established-client fast path".
 *
 * (1) establishedResolution(): the one-query fast path can only ever produce a result the
 *     full resolution would also produce, and never another tenant's organisation.
 * (2) Resolver wiring: the fast path uses no Clerk Backend API, no service role and no
 *     invitation recovery; everything else falls back to the unchanged full path.
 * (3) Timing instrumentation: the log payload cannot carry ids, emails or real paths.
 * (4) Navigation: persistent frame, per-route skeletons, error/not-found boundaries,
 *     parallel project queries.
 * (5) Design consistency: no dark surfaces left in portal content, every cp- class exists.
 * (6) Authorization did not move: views stay presentational, no service role in pages.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  decideClientWorkspace,
  establishedResolution,
  resolveClientOrganization,
} from "../lib/auth/access.ts";
import { PORTAL_ROUTES, TIMING_PHASES, buildTimingPayload } from "../lib/perf/portal-timing.ts";

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

/* Body of a top-level function declaration, up to the next top-level declaration. */
function functionBody(source, name) {
  const start = source.search(new RegExp(`(async\\s+)?function\\s+${name}\\s*\\(`));
  assert.ok(start >= 0, `function ${name} not found`);
  const rest = source.slice(start + 1);
  const next = rest.search(/\n(export\s+)?(async\s+)?function\s|\nexport\s+const\s/);

  return next === -1 ? rest : rest.slice(0, next);
}

const CLIENT_A = { id: "11111111-1111-4111-8111-111111111111", clerk_org_id: "org_a", name: "Client A", status: "ACTIVE" };
const CLIENT_B = { id: "22222222-2222-4222-8222-222222222222", clerk_org_id: "org_b", name: "Client B", status: "ACTIVE" };
const PAUSED_A = { ...CLIENT_A, status: "INACTIVE" };
const ARCHIVED_A = { ...CLIENT_A, status: "ARCHIVED" };

describe("established-client fast path (pure decision)", () => {
  it("an active org read back through RLS as ACTIVE is ready", () => {
    assert.deepEqual(establishedResolution({ activeOrgId: "org_a", rlsRow: CLIENT_A }), {
      kind: "ready",
      organization: CLIENT_A,
    });
  });

  it("no active org, or no row from RLS, means the full path runs", () => {
    assert.equal(establishedResolution({ activeOrgId: null, rlsRow: CLIENT_A }), null);
    assert.equal(establishedResolution({ activeOrgId: undefined, rlsRow: CLIENT_A }), null);
    assert.equal(establishedResolution({ activeOrgId: "", rlsRow: CLIENT_A }), null);
    assert.equal(establishedResolution({ activeOrgId: "org_a", rlsRow: null }), null);
  });

  it("tenant isolation: a row for a different org than the session's is never ready", () => {
    assert.equal(establishedResolution({ activeOrgId: "org_a", rlsRow: CLIENT_B }), null);
    assert.equal(
      establishedResolution({ activeOrgId: "org_a", rlsRow: { ...CLIENT_A, clerk_org_id: null } }),
      null
    );
  });

  it("paused and archived clients are never ready on the fast path", () => {
    assert.equal(establishedResolution({ activeOrgId: "org_a", rlsRow: PAUSED_A }), null);
    assert.equal(establishedResolution({ activeOrgId: "org_a", rlsRow: ARCHIVED_A }), null);
    assert.equal(establishedResolution({ activeOrgId: "org_a", rlsRow: { ...CLIENT_A, status: "active" } }), null);
  });

  it("whenever the fast path says ready, the full path says ready for the same org", () => {
    const rows = [CLIENT_A, CLIENT_B, PAUSED_A, ARCHIVED_A];
    const orgs = [null, "org_a", "org_b", "org_x"];
    const memberships = [[], ["org_a"], ["org_b"], ["org_a", "org_b"]];
    let readyCases = 0;

    for (const activeOrgId of orgs) {
      for (const rlsRow of [null, ...rows]) {
        const fast = establishedResolution({ activeOrgId, rlsRow });

        if (!fast) continue;

        readyCases += 1;

        for (const memberOf of memberships) {
          const full = decideClientWorkspace({
            resolution: resolveClientOrganization({
              activeOrgId,
              membershipOrgIds: memberOf,
              // The service-role mapping sees the same row RLS returned.
              organizations: [rlsRow, ...rows.filter((row) => row.clerk_org_id !== rlsRow.clerk_org_id)],
            }),
            pendingInvitations: [],
            rls: "found",
          });

          assert.equal(full.state, "ready", `${activeOrgId} / ${memberOf}`);
          assert.equal(full.organization.id, fast.organization.id);
        }
      }
    }

    assert.ok(readyCases > 0);
  });
});

describe("resolver wiring", () => {
  const source = code("lib/auth/client-context.ts");

  it("the fast path is one RLS query: no Clerk Backend API, no service role, no recovery", () => {
    const body = functionBody(source, "establishedWorkspace");

    assert.match(body, /createServerSupabaseClient\(\)/);
    assert.match(body, /\.eq\("clerk_org_id", orgId\)/);
    assert.match(body, /\.eq\("status", "ACTIVE"\)/);
    assert.match(body, /establishedResolution\(/);
    assert.match(body, /decideClientWorkspace\(/);
    assert.ok(!/clerkClient|createAdminSupabaseClient|pendingClientInvitations|membershipOrgIds|organizationsForClerkIds/.test(body));
  });

  it("the fast path runs only with an active org and otherwise falls back to the full path", () => {
    const body = functionBody(source, "resolveWorkspace");

    assert.match(body, /if \(orgId\) \{[\s\S]*establishedWorkspace\(userId, orgId\)/);
    assert.match(body, /return fullResolution\(userId, orgId\)/);
  });

  it("invitation recovery only runs when there is no usable membership", () => {
    const body = functionBody(source, "fullResolution");

    assert.match(
      body,
      /resolution\.kind === "no-membership" \|\| resolution\.kind === "not-linked"\s*\?\s*await timed\("resolve\.pending_invitations", \(\) => pendingClientInvitations\(userId\)\)/
    );
  });

  it("there is still exactly one memoised authoritative resolver", () => {
    assert.match(source, /export const getClientWorkspace = cache\(resolveWorkspace\)/);
    assert.equal(source.match(/export const getClientWorkspace/g).length, 1);
  });

  it("the switcher list is separate, memoised, and never part of the access decision", () => {
    assert.match(source, /export const getSwitchableWorkspaces = cache\(resolveSwitchableWorkspaces\)/);
    assert.ok(!/workspaces:\s*ClientOption\[\]/.test(source), "ready no longer carries the switcher list");

    const body = functionBody(source, "resolveSwitchableWorkspaces");
    assert.ok(!/decideClientWorkspace|getClientWorkspace/.test(body));
  });

  it("no portal page reads a switcher list off the workspace", () => {
    const files = [
      ...walk(join(ROOT, "app/client"), (file) => /\.tsx?$/.test(file)),
      ...walk(join(ROOT, "app/portal"), (file) => /\.tsx?$/.test(file)),
    ];

    for (const file of files) {
      assert.ok(!/workspace\.workspaces/.test(code(file)), file);
    }
  });
});

describe("timing instrumentation is safe to log", () => {
  const phases = Object.fromEntries(TIMING_PHASES.map((phase, index) => [phase, index * 10.4]));

  it("keeps only allowlisted phases, as rounded milliseconds", () => {
    const payload = buildTimingPayload({
      route: "/client",
      region: "iad1",
      path: "established",
      state: "ready",
      phases: { ...phases, "user@example.com": 5, "org_2abc": 7, content: "12" },
      totalMs: 123.6,
    });

    assert.deepEqual(Object.keys(payload).sort(), ["path", "phasesMs", "region", "route", "state", "totalMs"]);
    assert.deepEqual(Object.keys(payload.phasesMs).sort(), [...TIMING_PHASES].filter((p) => p !== "content").sort());
    assert.equal(payload.totalMs, 124);
    assert.equal(payload.phasesMs["resolve.clerk_memberships"], 10);
  });

  it("a real path (with an id) is not a route template and is never logged", () => {
    assert.equal(
      buildTimingPayload({
        route: "/client/projects/11111111-1111-4111-8111-111111111111",
        region: "iad1",
        path: "full",
        state: "ready",
        phases: {},
        totalMs: 1,
      }),
      null
    );
  });

  it("free-text state, path and region values are replaced, not passed through", () => {
    const payload = buildTimingPayload({
      route: "/client/billing",
      region: "org_2abc user@example.com",
      path: "org_2abc",
      state: "alex@example.com",
      phases: {},
      totalMs: -4,
    });

    assert.equal(payload.region, "other");
    assert.equal(payload.path, "none");
    assert.equal(payload.state, "unknown");
    assert.equal(payload.totalMs, 0);
    assert.ok(!/@|org_|[0-9a-f]{8}-[0-9a-f]{4}/i.test(JSON.stringify(payload)));
  });

  it("every portal page logs only its route template and the workspace state", () => {
    const pages = [
      ...walk(join(ROOT, "app/client"), (file) => file.endsWith("page.tsx")),
      "app/portal/workspaces/page.tsx",
    ];

    for (const page of pages) {
      const calls = code(page).match(/logRouteTiming\([\s\S]*?\)/g) ?? [];

      assert.ok(calls.length >= 2, `${page} logs both the gate and the ready render`);

      for (const call of calls) {
        const match = call.match(/logRouteTiming\(\s*"([^"]+)",\s*workspace\.state\s*\)/);

        assert.ok(match, `${page}: ${call}`);
        assert.ok(PORTAL_ROUTES.includes(match[1]), `${page}: unknown route ${match[1]}`);
      }
    }
  });

  it("the only log line goes through the allowlist builder", () => {
    const source = code("lib/perf/request-timing.ts");

    assert.match(source, /buildTimingPayload\(/);
    assert.equal(source.match(/console\.\w+\(/g).length, 1);
    assert.match(source, /console\.info\("client\.portal\.timing", payload\)/);
  });
});

describe("navigation feels immediate", () => {
  it("a persistent layout frames every /client route and resolves through the one resolver", () => {
    const layout = code("app/client/layout.tsx");

    assert.match(layout, /<ClientShell/);
    assert.match(layout, /getClientWorkspace\(\)/);
    assert.match(layout, /<Suspense fallback=\{null\}>\s*<WorkspaceSwitchLink \/>/);
    assert.match(layout, /showNav=\{ready\}/);
    assert.ok(!/\.from\(|createAdminSupabaseClient|supabase/.test(layout), "the layout loads no data");
  });

  for (const dir of ["app/client", "app/client/projects/[projectId]", "app/client/billing", "app/client/billing/[invoiceId]"]) {
    it(`${dir} has a loading skeleton`, () => {
      assert.match(code(`${dir}/loading.tsx`), /Skeleton \/>/);
    });
  }

  it("the portal has its own error and not-found boundaries", () => {
    const error = read("app/client/error.tsx");

    assert.match(error, /^"use client";/);
    assert.ok(!/error\.message|error\.stack/.test(code("app/client/error.tsx")), "never shows the error detail");
    assert.ok(existsSync(join(ROOT, "app/client/not-found.tsx")));
  });

  it("nav links give feedback the moment they are clicked", () => {
    const nav = code("components/client/ClientNav.tsx");

    assert.match(nav, /useLinkStatus\(\)/);
    assert.match(nav, /animate-spin/);
  });

  it("portal links keep the default prefetch (loading boundary only, no full dynamic render)", () => {
    const files = [
      ...walk(join(ROOT, "components/client"), (file) => file.endsWith(".tsx")),
      ...walk(join(ROOT, "app/client"), (file) => file.endsWith(".tsx")),
    ];

    for (const file of files) {
      assert.ok(!/prefetch=\{true\}/.test(code(file)), file);
    }
  });

  it("the project page loads project, milestones, updates and documents in one parallel wave", () => {
    const page = code("app/client/projects/[projectId]/page.tsx");
    const wave = page.match(/Promise\.all\(\[([\s\S]*?)\]\)/);

    assert.ok(wave, "Promise.all wave");
    for (const table of ["projects", "milestones", "project_updates", "documents"]) {
      assert.match(wave[1], new RegExp(`from\\("${table}"\\)`));
    }
    assert.match(page, /if \(!project \|\| project\.organization_id !== organization\.id\) \{\s*notFound\(\);/);
    assert.equal((page.match(/await supabase/g) ?? []).length, 0, "no sequential query left");
  });

  it("views render content only: the frame belongs to the layout", () => {
    for (const file of [
      "components/client/ClientDashboardView.tsx",
      "components/client/ClientProjectView.tsx",
      "components/client/ClientBillingView.tsx",
      "components/client/ClientInvoiceView.tsx",
      "components/client/ClientAccessState.tsx",
      "components/client/ClientWorkspaceGate.tsx",
    ]) {
      assert.ok(!/ClientShell/.test(code(file)), file);
    }
  });
});

describe("one design system across the portal", () => {
  const RAIL = new Set([
    "components/client/ClientNav.tsx",
    "components/client/ClientRail.tsx",
    "components/client/WorkspaceSwitchLink.tsx",
  ]);
  const content = [
    ...walk(join(ROOT, "components/client"), (file) => file.endsWith(".tsx")),
    ...walk(join(ROOT, "components/billing"), (file) => file.endsWith(".tsx")),
    ...walk(join(ROOT, "app/client"), (file) => file.endsWith(".tsx")),
    ...walk(join(ROOT, "app/portal"), (file) => file.endsWith(".tsx")),
  ].filter((file) => !RAIL.has(file));

  const DARK = [
    /bg-\[#0(50505|a0a0a|b0b0a)\]/,
    /\bbg-black\b/,
    /text-white\//,
    /signal-grid-dark|drylake-contours/,
    /\b(button-light|tech-label|section-label|signal-dot)\b/,
    /\bcp-(panel|stat|button-outline|nav-link)\b/,
  ];

  it("finds the portal content files", () => assert.ok(content.length >= 20));

  for (const file of content) {
    it(`${file}: no dark surface, old token or retired class`, () => {
      const source = code(file);

      for (const pattern of DARK) {
        assert.ok(!pattern.test(source), `${file} matches ${pattern}`);
      }
    });
  }

  it("the portal canvas is the Admin canvas", () => {
    const css = read("app/globals.css");
    const block = css.slice(css.indexOf("DRYLAKE CLIENT PORTAL"));

    assert.match(block, /--cp-canvas: #f4f4f1;/);
    assert.match(block, /html:has\(\.client-portal\) body \{\s*background: #f4f4f1;/);
    assert.ok(!/#050505/.test(block));
  });

  it("every cp- class used in the portal is defined", () => {
    const css = read("app/globals.css");
    const used = new Set();

    for (const file of [...content, ...RAIL]) {
      for (const match of read(file).matchAll(/\bcp-[a-z][a-z-]*/g)) {
        used.add(match[0]);
      }
    }

    assert.ok(used.size > 10);

    for (const name of used) {
      assert.ok(
        css.includes(`.${name}`) || css.includes(`@utility ${name}`),
        `${name} is used but not defined in app/globals.css`
      );
    }
  });
});

describe("styling did not move authorization", () => {
  it("presentational components never fetch or touch Supabase", () => {
    for (const file of walk(join(ROOT, "components/client"), (f) => /\.tsx?$/.test(f))) {
      const source = code(file);

      assert.ok(!/@\/lib\/supabase|createAdminSupabaseClient|createServerSupabaseClient/.test(source), file);

      if (file !== "components/client/WorkspaceSwitchLink.tsx") {
        assert.ok(!/getClientWorkspace|getSwitchableWorkspaces/.test(source), file);
      }
    }
  });

  it("the switcher link reads only the switcher list", () => {
    const source = code("components/client/WorkspaceSwitchLink.tsx");

    assert.match(source, /getSwitchableWorkspaces\(\)/);
    assert.ok(!/getClientWorkspace/.test(source));
  });

  it("client components never import server-only auth or data modules", () => {
    const files = [
      ...walk(join(ROOT, "components"), (f) => f.endsWith(".tsx")),
      ...walk(join(ROOT, "app/client"), (f) => f.endsWith(".tsx")),
    ].filter((file) => /^"use client";/.test(read(file)));

    assert.ok(files.length > 5);

    for (const file of files) {
      assert.ok(!/lib\/auth\/client-context|lib\/supabase|lib\/perf\/request-timing/.test(code(file)), file);
    }
  });

  it("no service role anywhere under /client", () => {
    for (const file of walk(join(ROOT, "app/client"), (f) => /\.tsx?$/.test(f))) {
      assert.ok(!/createAdminSupabaseClient|SUPABASE_SECRET_KEY/.test(read(file)), file);
    }
  });

  it("every portal page still resolves before it reads, and gates before the ready branch", () => {
    for (const page of walk(join(ROOT, "app/client"), (f) => f.endsWith("page.tsx"))) {
      const source = code(page);
      const resolvedAt = source.indexOf("await getClientWorkspace()");
      const firstQuery = source.indexOf(".from(");

      assert.ok(resolvedAt > 0, page);
      assert.ok(firstQuery > resolvedAt, `${page}: data is read only after resolution`);
    }
  });
});
