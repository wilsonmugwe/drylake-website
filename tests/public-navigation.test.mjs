/*
 * PR "Drylake Public Website Visual Redesign" (2026-10-07): navigation semantics, the
 * scroll/sign-out root-cause fixes, and the rule that the redesign changed presentation,
 * not the approved homepage copy. Runs under `npm test` (node:test), no new dependencies.
 *
 * Viewport positions (does /contact open at the top?) cannot be proven by a unit test; the
 * PR records the browser checks. These tests pin the decisions and wiring that make them true.
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  CLIENT_LOGIN,
  PRIMARY_CTA,
  PRIMARY_NAV,
  SIGN_OUT_REDIRECT_URL,
  isPlainLeftClick,
  parseHref,
  resolveNavClick,
} from "../lib/navigation/site-nav.ts";
import { faqs } from "../lib/faqs.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

/* Section components the homepage actually renders, in import order. */

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(relative(ROOT, full).replaceAll("\\", "/"));
  }
  return out;
}

describe("navigation decisions (resolveNavClick)", () => {
  it("a different page is a normal navigation", () => {
    assert.deepEqual(resolveNavClick({ href: "/contact", currentPath: "/", currentHash: "" }), { kind: "navigate" });
    assert.deepEqual(resolveNavClick({ href: "/", currentPath: "/sign-in", currentHash: "" }), { kind: "navigate" });
    assert.deepEqual(resolveNavClick({ href: "/#about", currentPath: "/services", currentHash: "" }), { kind: "navigate" });
  });

  it("Bug 2: About clicked again with #about already in the URL still scrolls, without a duplicate history entry", () => {
    assert.deepEqual(resolveNavClick({ href: "/#about", currentPath: "/", currentHash: "about" }), {
      kind: "scroll-section",
      id: "about",
      pushUrl: null,
    });
  });

  it("a section link from another section pushes one history entry and scrolls", () => {
    assert.deepEqual(resolveNavClick({ href: "/#about", currentPath: "/", currentHash: "approach" }), {
      kind: "scroll-section",
      id: "about",
      pushUrl: "/#about",
    });
  });

  it("brand / Back to Drylake on the homepage: top, and a stale hash is removed", () => {
    assert.deepEqual(resolveNavClick({ href: "/", currentPath: "/", currentHash: "about" }), { kind: "scroll-top", replaceUrl: "/" });
    assert.deepEqual(resolveNavClick({ href: "/", currentPath: "/", currentHash: "" }), { kind: "scroll-top", replaceUrl: null });
  });

  it("Start a conversation while already on /contact goes to the top", () => {
    assert.deepEqual(resolveNavClick({ href: "/contact", currentPath: "/contact", currentHash: "" }), { kind: "scroll-top", replaceUrl: null });
  });

  it("parses hrefs and leaves modified clicks to the browser", () => {
    assert.deepEqual(parseHref("/#approach"), { path: "/", hash: "approach" });
    assert.deepEqual(parseHref("#faq"), { path: "/", hash: "faq" });
    assert.deepEqual(parseHref("/contact"), { path: "/contact", hash: "" });

    const base = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false };
    assert.equal(isPlainLeftClick(base), true);
    assert.equal(isPlainLeftClick({ ...base, metaKey: true }), false);
    assert.equal(isPlainLeftClick({ ...base, ctrlKey: true }), false);
    assert.equal(isPlainLeftClick({ ...base, button: 1 }), false);
  });
});

describe("navigation labels and destinations", () => {
  // Exposed Ground navigation (D54, Ben 2026-10-17): Services, Solutions, Approach, BRONNIE, About.
  it("is exactly the approved Exposed Ground set, in order, on existing destinations plus /bronnie", () => {
    assert.deepEqual(
      PRIMARY_NAV.map((item) => [item.label, item.href]),
      [
        ["Services", "/services"],
        ["Solutions", "/solutions"],
        ["Approach", "/#approach"],
        ["BRONNIE", "/bronnie"],
        ["About", "/about"],
      ]
    );
    assert.deepEqual([CLIENT_LOGIN.label, CLIENT_LOGIN.href], ["Client Login", "/portal"]);
    assert.deepEqual([PRIMARY_CTA.label, PRIMARY_CTA.href], ["Start Free Consultation", "/consultation"]);
  });

  it("every homepage section target exists exactly once", () => {
    // superseded by tests/home-exposed-ground.test.mjs (Exposed Ground homepage, D54, 2026-10-17)
    const home = ["HomeHero", "HomeSystem", "HomeServices", "HomeCracks", "HomeProof", "HomeClose"]
      .map((f) => code(`components/home/${f}.tsx`)).join("\n");
    for (const id of ["solutions", "approach", "faq", "about"]) {
      assert.equal((home.match(new RegExp(`id="${id}"`, "g")) ?? []).length, 1, id);
    }
  });

  it("the header: one brand control, all links through SiteLink, Start a conversation kept", () => {
    const navbar = code("components/layout/NavbarClient.tsx");
    const lockup = read("components/brand/BrandHomeLink.tsx");

    // No em dash in an accessible name (visitor-facing string rule).
    assert.match(lockup, /aria-label="Drylake home"/);
    assert.match(lockup, /href=\{HOME_PATH\}/);
    assert.match(navbar, /<BrandHomeLink \/>/);
    assert.match(navbar, /PRIMARY_NAV\.map/);
    assert.match(navbar, /<PrimaryCta href=\{PRIMARY_CTA\.href\}/);
    assert.ok(!/from "next\/link"/.test(navbar), "header links go through SiteLink");
  });

  it("the mobile menu is a real dialog with the full set of destinations", () => {
    const menu = code("components/layout/MobileMenu.tsx");

    assert.match(menu, /role="dialog"/);
    assert.match(menu, /aria-modal="true"/);
    assert.match(menu, /event\.key === "Escape"/);
    assert.match(menu, /event\.key !== "Tab"/);
    assert.match(menu, /root\.style\.overflow = "hidden"/);
    assert.match(menu, /root\.style\.overflow = previousOverflow/);
    assert.match(menu, /PRIMARY_NAV\.map/);
    assert.match(menu, /<ClientAccessLink\b/);
    assert.match(menu, /PRIMARY_CTA\.href/);
    assert.match(code("components/navigation/ClientAccessLink.tsx"), /CLIENT_LOGIN\.href/);
    assert.match(code("components/layout/NavbarClient.tsx"), /<ClientAccessLink\b/);
    // Menu destinations release the scroll lock before SiteLink scrolls (measured 59 px short otherwise).
    assert.match(menu, /onNavigate=\{handleNavigate\}/);
    assert.ok(!/onNavigate=\{onNavigate\}/.test(menu));
    assert.match(menu, /document\.documentElement\.style\.overflow = previousOverflowRef\.current;\s*onNavigate\(\);/);
  });
});

describe("header prefetch budget", () => {
  // WHY: Next prefetches every in-view <Link>, the header is always in view, and a prefetch pulls the
  // destination route client chunks into the homepage network budget (tests/e2e/performance.spec.ts,
  // 200 KB). Measured on a production build: /solutions cost 43 KB (motion), /perth cost 8.4 KB, which
  // pushed the homepage to 205,298 bytes. Secondary destinations opt out; the click still navigates.
  it("secondary header destinations do not prefetch on every page view", () => {
    const optedOut = PRIMARY_NAV.filter((item) => item.prefetch === false).map((item) => item.href);

    // Perth left the header (D54); BRONNIE and About are secondary destinations, opted out too.
    assert.deepEqual(optedOut, ["/solutions", "/bronnie", "/about"]);
  });
});

describe("scroll and sign-out root causes", () => {
  it("Bug 1/3/4: <html> opts into Next's smooth-scroll suspension during navigation", () => {
    assert.match(code("app/layout.tsx"), /<html lang="en-AU" data-scroll-behavior="smooth">/);
    assert.match(read("app/globals.css"), /html \{\s*scroll-behavior: smooth;/);
  });

  it("Bug 4: sign-out always lands on / (provider default and every explicit call)", () => {
    assert.equal(SIGN_OUT_REDIRECT_URL, "/");
    assert.match(code("components/auth/ClerkScope.tsx"), /<ClerkProvider afterSignOutUrl=\{SIGN_OUT_REDIRECT_URL\}>/);

    const calls = walk(join(ROOT, "components"))
      .concat(walk(join(ROOT, "app")))
      .flatMap((file) => [...code(file).matchAll(/signOut\(([^)]*)\)/g)].map((m) => [file, m[1]]));

    assert.ok(calls.length >= 3);
    for (const [file, args] of calls) {
      assert.match(args, /redirectUrl: SIGN_OUT_REDIRECT_URL/, file);
    }
  });

  it("Bug 3: every Back to Drylake / home link on the auth and system screens is a SiteLink", () => {
    for (const file of ["app/sign-in/[[...sign-in]]/page.tsx", "app/sign-up/[[...sign-up]]/page.tsx", "components/system/SystemScreen.tsx"]) {
      const source = code(file);
      assert.ok(!/<Link\s+href="\/"/.test(source), `${file} still uses <Link href="/">`);
      assert.match(source, /<SiteLink\s+href="\/"/, file);
    }
  });

  it("no timer-based scroll hacks in the navigation code", () => {
    for (const file of ["components/navigation/SiteLink.tsx", "components/layout/NavbarClient.tsx", "components/layout/MobileMenu.tsx", "lib/navigation/site-nav.ts"]) {
      assert.ok(!/setTimeout|setInterval/.test(code(file)), file);
    }
  });

  it("section targets clear the fixed header via CSS scroll-margin", () => {
    assert.match(read("app/public-site.css"), /main \[id\] \{\s*scroll-margin-top: calc\(var\(--nav-h\) \+ 8px\);/);
  });

  it("decorative motion stops under prefers-reduced-motion", () => {
    const css = read("app/public-site.css");
    const block = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    for (const name of [".dl-signal", ".dl-draw-load", ".dl-workaround", ".mobile-menu"]) {
      assert.ok(block.includes(name), name);
    }
  });
});

describe("the redesign kept the approved homepage copy", () => {
  // The pre-D54 homepage copy list (APPROVED) was retired with that homepage on 2026-10-17; the
  // new homepage copy is lib/home/copy.ts, pinned by tests/home-exposed-ground.test.mjs.

  it("every approved string is still on the homepage", () => {
    // superseded by tests/home-exposed-ground.test.mjs (Exposed Ground homepage, D54, 2026-10-17)
    // The pre-D54 homepage copy freeze is retired with that homepage; the new copy is frozen in
    // lib/home/copy.ts and every string is asserted to render.
    assert.ok(read("lib/home/copy.ts").includes("HOME_HERO"));
  });

  it("the FAQ still renders the shared FAQ data (same as the FAQPage schema)", () => {
    // superseded by tests/home-exposed-ground.test.mjs (Exposed Ground homepage, D54, 2026-10-17)
    assert.match(read("components/home/HomeClose.tsx"), /faqs\.map\(/);
    assert.match(read("app/page.tsx"), /faqNode\("\/", faqs\)/);
    assert.equal(faqs.length, 5);
  });

  it("each Approach stage text is still rendered once", () => {
    assert.equal((code("components/sections/Approach.tsx").match(/\{stage\.text\}/g) ?? []).length, 1);
  });
});
