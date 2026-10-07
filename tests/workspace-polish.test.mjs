/*
 * Drylake Experience Polish, Workstream W (Workspace + Admin), polish brief sections 15-25.
 *
 * (1) Grouped Workspace navigation exposes only REAL destinations: existing routes, or
 *     section ids the views actually render.
 * (2) Deep links: stable ids, focus moves to the heading on arrival, Back/Forward and
 *     refresh handled, clear of the sticky bar, reduced motion respected.
 * (3) Mobile navigation: grouped disclosure sheet on the shared modal-drawer contract.
 * (4) Product environment: one background primitive, two variants, background only.
 * (5) Admin: same family, grouped nav, a real dialog with a focus trap, permissions intact.
 * (6) Navigation never stands in for authorization.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  ANCHOR_STASH_SCRIPT,
  anchorFromHash,
  isSamePageDestination,
  splitDestination,
} from "../components/client/section-anchor.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

const nav = code("components/client/ClientNav.tsx");

/* `export const NAME: NavSection[] = [ { id: "x", label: "y" }, ... ];` -> [{id, label}] */
function sections(name) {
  const block = nav.match(new RegExp(`export const ${name}: NavSection\\[\\] = \\[([\\s\\S]*?)\\];`));
  assert.ok(block, name);
  return [...block[1].matchAll(/\{ id: "([^"]+)", label: "([^"]+)" \}/g)].map((m) => ({ id: m[1], label: m[2] }));
}

/* Does the view render this id (a Panel anchor or an element id)? */
const renders = (file, id) => new RegExp(`(anchor|id)="${id}"`).test(code(file));

describe("Workspace navigation: grouped, real destinations only", () => {
  const overview = sections("OVERVIEW_SECTIONS");
  const billing = sections("BILLING_SECTIONS");
  const project = sections("PROJECT_SECTIONS");

  it("Overview subdivisions", () => {
    assert.deepEqual(
      overview.map((s) => s.id),
      ["needs-attention", "projects", "recent-activity", "documents"]
    );
  });

  it("Billing subdivisions", () => {
    assert.deepEqual(billing.map((s) => s.id), ["to-pay", "invoice-history", "paying-online"]);
  });

  it("an open project exposes its own sections", () => {
    assert.deepEqual(project.map((s) => s.id), ["project-status", "milestones", "updates", "project-documents"]);
  });

  it("every Overview section id is rendered by the dashboard", () => {
    for (const { id } of overview) assert.ok(renders("components/client/ClientDashboardView.tsx", id), id);
  });

  it("every Billing section id is rendered by the billing view", () => {
    for (const { id } of billing) assert.ok(renders("components/client/ClientBillingView.tsx", id), id);
  });

  it("every project section id is rendered by the project view", () => {
    for (const { id } of project) assert.ok(renders("components/client/ClientProjectView.tsx", id), id);
  });

  it("each Needs-your-attention variant carries the anchor (error, calm, list)", () => {
    const view = code("components/client/ClientDashboardView.tsx");
    assert.equal((view.match(/id="needs-attention"/g) ?? []).length, 3);
  });

  it("invoice history always renders once invoices load, with an honest empty state", () => {
    const view = code("components/client/ClientBillingView.tsx");
    assert.match(view, /\{invoices\.ok \? \(\s*<Panel\s+labelledBy="history-heading"\s+anchor="invoice-history"/);
    assert.match(view, /No paid invoices yet\./);
  });

  it("group links point at routes that exist", () => {
    const hrefs = [...nav.matchAll(/href: "(\/client[^"]*)"/g)].map((m) => m[1]);
    assert.deepEqual(hrefs, ["/client", "/client/billing"]);
    for (const href of hrefs) assert.ok(existsSync(join(ROOT, "app", href, "page.tsx")), href);
  });

  it("no entry for a capability the Workspace does not have", () => {
    const labels = [...nav.matchAll(/label: "([^"]+)"/g)].map((m) => m[1]);
    for (const absent of ["Members", "Settings", "Agreements", "Shared files", "Deliverables", "Payments"]) {
      assert.ok(!labels.includes(absent), `${absent} has no page or section in the Workspace`);
    }
  });

  it("project sections are offered only while a project is open", () => {
    assert.match(nav, /export function projectPathFrom/);
    assert.match(nav, /\^\\\/client\\\/projects\\\/\[\^\/#\?\]\+\$/);
    assert.match(nav, /item\.key === "overview" && projectPath \?/);
  });

  it("the rail lists every group's sections; the drawer makes each group a disclosure", () => {
    assert.match(nav, /const open = size === "rail" \|\| expanded === item\.key;/);
    assert.match(nav, /aria-expanded=\{open\}\s+aria-controls=\{listId\}/);
    assert.match(nav, /useState<ClientSection \| null>\(active\)/, "the current group starts open");
  });

  it("sub-links are real links (keyboard and new-tab safe)", () => {
    assert.match(nav, /<Link href=\{href\} onClick=\{onClick\} className=\{`cp-nav-sub/);
    assert.match(nav, /event\.metaKey \|\| event\.ctrlKey \|\| event\.shiftKey \|\| event\.altKey \|\| event\.button !== 0/);
  });

  it("touch targets: 44px groups and drawer sub-links, 32px rail sub-links (desktop pointer, above WCAG 2.5.8's 24px)", () => {
    assert.match(nav, /size === "drawer" \? "min-h-11" : "min-h-8"/);
    assert.match(nav, /flex min-h-11 min-w-0 flex-1 items-center/);
    assert.match(nav, /className="flex w-12 shrink-0 items-center justify-center/);
  });
});

describe("Workspace deep links", () => {
  it("anchorFromHash accepts plain ids only", () => {
    assert.equal(anchorFromHash("#to-pay"), "to-pay");
    assert.equal(anchorFromHash("recent-activity"), "recent-activity");
    assert.equal(anchorFromHash(""), null);
    assert.equal(anchorFromHash(null), null);
    assert.equal(anchorFromHash("#<img src=x>"), null);
    assert.equal(anchorFromHash("#%E0%A4%A"), null);
    assert.equal(anchorFromHash("#Projects"), null);
  });

  it("splitDestination and isSamePageDestination", () => {
    assert.deepEqual(splitDestination("/client/billing#to-pay"), { path: "/client/billing", anchor: "to-pay" });
    assert.deepEqual(splitDestination("/client"), { path: "/client", anchor: null });
    assert.equal(isSamePageDestination("/client#projects", "/client"), true);
    assert.equal(isSamePageDestination("/client#projects", "/client/billing"), false);
    assert.equal(isSamePageDestination("/client", "/client"), false);
  });

  const anchors = code("components/client/WorkspaceAnchors.tsx");

  it("the shell mounts the arrival handler once (it survives client navigation)", () => {
    assert.match(code("components/client/ClientShell.tsx"), /<WorkspaceAnchors \/>/);
  });

  it("focus dropped by a settling stream is restored once, never stolen back", () => {
    assert.match(anchors, /for \(const delay of \[60, 250\]\)/);
    assert.match(anchors, /document\.activeElement === document\.body \|\| document\.activeElement === null/);
  });

  it("arrival focuses the section heading without a second scroll", () => {
    assert.match(anchors, /target\.setAttribute\("tabindex", "-1"\)/);
    assert.match(anchors, /target\.focus\(\{ preventScroll: true \}\)/);
    assert.match(anchors, /section\.querySelector<HTMLElement>\("h2, h3"\)/);
  });

  it("scroll respects reduced motion", () => {
    assert.match(anchors, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
    assert.match(anchors, /behavior: smooth \? "smooth" : "instant"/);
    assert.match(anchors, /land\(found, smooth && !prefersReducedMotion\(\)\)/);
  });

  it("refresh, cross-page arrival, Back/Forward and typed hashes are all handled", () => {
    assert.match(anchors, /const id = stashed \?\? anchorFromHash\(window\.location\.hash\);[\s\S]*?\}, \[pathname\]\);/);
    assert.match(anchors, /addEventListener\("popstate", onHistory\)/);
    assert.match(anchors, /addEventListener\("hashchange", onHistory\)/);
  });

  it("waits for a streaming page (laid out, skeleton gone) and falls back to the page heading", () => {
    assert.match(anchors, /new MutationObserver/);
    assert.match(anchors, /element\.getClientRects\(\)\.length > 0/);
    assert.match(anchors, /!document\.querySelector\("#portal-main \.cp-skeleton"\)/);
    assert.match(anchors, /landOnPage\(\);/);
  });

  /* Runs the real inline script against a stand-in location/history. */
  function runStash(hash) {
    const calls = [];
    const win = {};
    const location = { hash, pathname: "/client", search: "?a=1" };
    const history = { state: { n: 1 }, replaceState: (...args) => calls.push(args) };
    new Function("window", "location", "history", ANCHOR_STASH_SCRIPT)(win, location, history);
    return { win, calls };
  }

  it("a load-time section hash is stashed before the router hydrates (Next 16 cache leak)", () => {
    const { win, calls } = runStash("#recent-activity");
    assert.equal(win.__dlAnchor, "recent-activity");
    assert.deepEqual(calls, [[{ n: 1 }, "", "/client?a=1"]]);
  });

  it("the stash script survives React's text escaping (no & < > \" ' characters)", () => {
    assert.ok(!/[&<>"']/.test(ANCHOR_STASH_SCRIPT));
  });

  it("anything that is not a plain section id is left alone", () => {
    for (const hash of ["", "#", "#Projects", "#a b", "#<img>", "#portal-main1".replace("1", "!")]) {
      const { win, calls } = runStash(hash);
      assert.equal(win.__dlAnchor, undefined, hash);
      assert.equal(calls.length, 0, hash);
    }
  });

  it("the shell renders the stash script first, and the arrival handler restores the hash", () => {
    const shell = code("components/client/ClientShell.tsx");
    assert.match(shell, /<script>\{ANCHOR_STASH_SCRIPT\}<\/script>/);
    assert.ok(!/dangerouslySetInnerHTML/.test(shell), "no raw HTML API");
    assert.ok(shell.indexOf("<script>{ANCHOR_STASH_SCRIPT}") < shell.indexOf("<ClientMobileNav"));
    assert.match(anchors, /const stashed = anchorFromHash\(window\.__dlAnchor\);/);
    assert.match(anchors, /window\.history\.replaceState\(\s*window\.history\.state,/);
  });

  it("same-page links record history and wait for the drawer to release the scroll lock", () => {
    assert.match(anchors, /window\.history\.pushState\(null, "", `#\$\{id\}`\)/);
    assert.match(anchors, /requestAnimationFrame\(\(\) => \{\s*requestAnimationFrame\(\(\) => revealSection\(id, \{ smooth: true \}\)\);/);
    assert.match(nav, /onNavigate\?\.\(\);\s*if \(isSamePageDestination\(href, pathname\)\) \{\s*event\.preventDefault\(\);\s*goToSection/);
  });

  it("targets clear the sticky mobile bar, and the arrival mark stops under reduced motion", () => {
    const css = read("app/globals.css");
    assert.match(css, /\.cp-anchor \{\s*scroll-margin-top: 5\.25rem;/);
    assert.match(css, /prefers-reduced-motion: reduce\) \{[\s\S]*?\.cp-anchor\[data-arrived\],\s*\.cp-chevron \{\s*animation: none;/);
    assert.match(anchors, /if \(!prefersReducedMotion\(\)\) \{\s*section\.setAttribute\("data-arrived", ""\)/);
  });

  it("panels expose their anchor as the section id", () => {
    const ui = code("components/client/portal-ui.tsx");
    assert.match(ui, /<section\s+id=\{anchor\}\s+aria-labelledby=\{labelledBy\}/);
  });
});

describe("Workspace mobile navigation: a grouped sheet", () => {
  const rail = code("components/client/ClientRail.tsx");

  it("rises from the bottom edge (one-handed) and floats on tablets", () => {
    assert.match(rail, /cp-drawer absolute inset-x-0 bottom-0 flex max-h-\[88svh\]/);
    assert.match(rail, /sm:bottom-4 sm:right-4 sm:w-\[24rem\]/);
  });

  it("navigation comes first in the sheet and closes it on use", () => {
    const sheet = rail.slice(rail.indexOf('id="workspace-drawer"'));
    assert.ok(sheet.indexOf('size="drawer" onNavigate={close}') < sheet.indexOf("<WorkspaceCard"));
  });

  it("the sheet motion is a short rise, removed under reduced motion", () => {
    const css = read("app/globals.css");
    assert.match(css, /@keyframes cp-slide-in \{\s*from \{\s*transform: translateY\(28px\);/);
  });
});

describe("product environment: one primitive, background only", () => {
  const env = code("components/shell/ProductEnvironment.tsx");
  const css = read("app/globals.css");
  const block = css
    .slice(css.indexOf(".dl-env {"), css.indexOf("DRYLAKE CLIENT PORTAL"))
    .replace(/\/\*[\s\S]*?\*\//g, "");

  it("is a server component with no script, hidden from assistive tech", () => {
    assert.ok(!/"use client"/.test(read("components/shell/ProductEnvironment.tsx")));
    assert.match(env, /aria-hidden="true"/);
    assert.match(env, /focusable="false"/);
  });

  it("draws the tile's own geometry and takes the ochre from the brand constant", () => {
    assert.match(env, /import \{ TILE_OCHRE, TILE_OCHRE_PLATE, TILE_PLATES \} from "@\/components\/brand\/DrylakeMark"/);
    assert.match(env, /"--dl-env-accent": TILE_OCHRE/);
  });

  it("never takes pointer events, never animates, never loads an asset", () => {
    assert.match(block, /\.dl-env \{[\s\S]*?pointer-events: none;/);
    assert.ok(!/animation|@keyframes|transition/.test(block), "no motion in the environment");
    assert.ok(!/url\(/.test(block), "no image request");
  });

  it("is quiet: every ink line stays at or under 20% alpha", () => {
    const alphas = [...block.matchAll(/rgb\(var\(--dl-env-ink\) \/ (0\.\d+)\)/g)].map((m) => Number(m[1]));
    assert.ok(alphas.length > 5);
    for (const alpha of alphas) assert.ok(alpha <= 0.2, `alpha ${alpha}`);
  });

  it("the Workspace and Admin use the same primitive, each with its variant, behind content", () => {
    const shell = code("components/client/ClientShell.tsx");
    assert.match(shell, /relative isolate flex min-w-0 flex-1 flex-col">\s*<ProductEnvironment variant="workspace" \/>/);
    assert.match(shell, /<main id="portal-main" tabIndex=\{-1\} className="relative z-\[1\]/);

    const admin = code("app/admin/layout.tsx");
    assert.match(admin, /<ProductEnvironment variant="admin" \/>\s*<div className="relative z-\[1\]">\{children\}<\/div>/);
  });

  it("is hidden in print", () => {
    assert.match(block, /@media print \{\s*\.dl-env \{\s*display: none;/);
  });
});

describe("Admin shell: same family, permissions untouched", () => {
  const layout = code("app/admin/layout.tsx");
  const sidebar = code("components/admin/AdminSidebar.tsx");
  const mobile = code("components/admin/AdminMobileNav.tsx");
  const adminNav = code("components/admin/admin-nav.ts");

  it("the layout still signs in and checks platform admin before rendering anything", () => {
    assert.match(layout, /if \(!userId\) \{\s*redirect\("\/sign-in\?redirect_url=\/admin"\);/);
    assert.match(layout, /if \(!platformAdmin\) \{\s*redirect\("\/client"\);/);
    assert.ok(layout.indexOf("isPlatformAdmin()") < layout.indexOf("<ProductEnvironment"));
  });

  it("one admin nav list, every entry an existing admin route", () => {
    const hrefs = [...adminNav.matchAll(/href: "(\/admin[^"]*)"/g)].map((m) => m[1]);
    assert.deepEqual(hrefs, ["/admin", "/admin/clients", "/admin/projects", "/admin/documents", "/admin/invoices", "/admin/payments"]);
    for (const href of hrefs) assert.ok(existsSync(join(ROOT, "app", href, "page.tsx")), href);
    for (const file of [sidebar, mobile]) assert.match(file, /ADMIN_NAV_GROUPS\.map/);
  });

  it("the current page is announced", () => {
    for (const file of [sidebar, mobile]) assert.match(file, /aria-current=\{selected \? "page" : undefined\}/);
  });

  it("the admin mobile drawer is a real dialog with the shared focus trap", () => {
    assert.match(mobile, /useModalDrawer\(\)/);
    assert.match(mobile, /aria-haspopup="dialog"\s+aria-expanded=\{open\}\s+aria-controls="admin-drawer"/);
    assert.match(mobile, /id="admin-drawer"\s+role="dialog"\s+aria-modal="true"\s+aria-label="Admin navigation"\s+onKeyDown=\{onKeyDown\}/);
    assert.match(mobile, /data-autofocus\s+aria-label="Close admin navigation"/);
    assert.match(mobile, /className="admin-scrim[^"]*" onClick=\{close\}/);
    assert.match(read("app/globals.css"), /prefers-reduced-motion: reduce\) \{\s*\.admin-scrim,\s*\.admin-drawer \{\s*animation: none;/);
  });

  it("no low-contrast rail text (was white/25 and white/35)", () => {
    for (const file of [sidebar, mobile]) assert.ok(!/text-white\/(2|3)\d\b/.test(file));
  });
});

describe("navigation never replaces authorization", () => {
  const presentational = [
    "components/client/ClientNav.tsx",
    "components/client/ClientRail.tsx",
    "components/client/ClientShell.tsx",
    "components/client/WorkspaceAnchors.tsx",
    "components/client/section-anchor.ts",
    "components/shell/ProductEnvironment.tsx",
    "components/shell/useModalDrawer.ts",
    "components/admin/admin-nav.ts",
    "components/admin/AdminSidebar.tsx",
    "components/admin/AdminMobileNav.tsx",
  ];

  for (const file of presentational) {
    it(`${file} reads no auth, data or payment module`, () => {
      assert.ok(!/@\/lib\/(auth|supabase|stripe|invoices)/.test(code(file)), file);
    });
  }

  it("the Workspace layout still resolves the workspace and shows navigation only when ready", () => {
    const layout = code("app/client/layout.tsx");
    assert.match(layout, /const workspace = await getClientWorkspace\(\);/);
    assert.match(layout, /showNav=\{ready\}/);
    assert.match(code("components/client/ClientRail.tsx"), /if \(!showNav\) \{\s*return null;/);
  });
});
