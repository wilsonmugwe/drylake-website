/*
 * PR 3 "Drylake Mobile Experience & Responsive Polish" (2026-10-07): pins the responsive
 * decisions so a later change cannot quietly bring back desktop spacing on phones, a 100vh
 * trap, a notch overlap or a late-painting headline.
 *   - one source of vertical rhythm: --section-y / --section-y-compact / --page-top / --block-gap,
 *     with the desktop (lg) values unchanged, used by every homepage chapter and inner page;
 *   - no 100vh / h-screen / min-h-screen on public surfaces (svh/dvh or inset only);
 *   - viewport-fit=cover, and the fixed header, the mobile menu and the body read the safe areas;
 *   - the hero headline has no entrance animation, so it paints at full opacity on frame one;
 *   - the primary CTA reads "Start a conversation" everywhere, from the single source;
 *   - FAQ toggles on inner pages are 44 px tap targets.
 * The browser width matrix (320-1440, Chromium + WebKit) lives outside the repo (PR body);
 * these are the source-level guards. node:test, no new dependencies.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { PRIMARY_CTA } from "../lib/navigation/site-nav.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const code = (rel) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

function walk(dir) {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const rel = join(dir, name);
    return statSync(join(ROOT, rel)).isDirectory() ? walk(rel) : [rel];
  });
}

const CSS = code("app/public-site.css");

/* Every public route's own files plus the shared public components. Workspace (app/client,
   components/client) and Admin are PR 4 / Wilson territory and keep their own rules. */
const PUBLIC_FILES = [
  ...walk("components/sections"),
  ...walk("components/layout"),
  ...walk("components/visuals"),
  ...walk("components/seo"),
  "app/page.tsx",
  "app/about/page.tsx",
  "app/contact/page.tsx",
  "app/perth/page.tsx",
  "app/privacy/page.tsx",
  "app/services/page.tsx",
  "app/services/[slug]/page.tsx",
  "app/solutions/page.tsx",
  "app/sign-in/[[...sign-in]]/page.tsx",
  "app/sign-up/[[...sign-up]]/page.tsx",
].filter((file) => /\.(tsx|ts)$/.test(file));

/* Rule bodies for a selector, e.g. rules(".site-header") -> every "{...}" written for it. */
function rules(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...CSS.matchAll(new RegExp(`(?:^|\\n|,)\\s*${escaped}\\s*\\{([^}]*)\\}`, "g"))].map((m) => m[1]);
}

describe("vertical rhythm tokens", () => {
  it("defines the four tokens on :root with phone, sm and lg values", () => {
    for (const token of ["--section-y", "--section-y-compact", "--page-top", "--block-gap"]) {
      assert.match(CSS, new RegExp(`:root\\s*\\{[^}]*${token}:`), `${token} on :root`);
    }
    const sm = CSS.match(/@media \(min-width: 640px\)\s*\{\s*:root\s*\{([^}]*)\}/)?.[1] ?? "";
    const lg = CSS.match(/@media \(min-width: 1024px\)\s*\{\s*:root\s*\{([^}]*)\}/)?.[1] ?? "";
    assert.match(sm, /--section-y:/);
    // Experience polish: desktop chapters 9rem to 6rem, intro-to-content 6rem to 3.5rem
    // (the ~290 px seams were the "slide" feeling); inner-page sections keep 6rem.
    assert.match(lg, /--section-y:\s*6rem/);
    assert.match(lg, /--block-gap:\s*3\.5rem/);
    assert.match(lg, /--section-y-compact:\s*6rem/);
  });

  it("keeps phones tighter than desktop", () => {
    const phone = CSS.match(/--section-y:\s*([\d.]+)rem/)?.[1];
    assert.ok(Number(phone) <= 4, `phone --section-y ${phone}rem`);
  });

  it("every homepage chapter takes its padding from --section-y", () => {
    // Experience polish: AppliedAI is gone; the FAQ is a block inside ContactCTA, not a chapter.
    const sections = ["Problems", "Integrations", "WhatWeDo", "Founders", "Approach", "Production", "ContactCTA", "Solutions"];
    for (const name of sections) {
      const source = code(`components/sections/${name}.tsx`);
      assert.match(source, /p[ty]-\(--section-y\)/, `${name} uses --section-y`);
      assert.ok(!/p[ty]-20 sm:p[ty]-28 lg:p[ty]-36/.test(source), `${name}: old stacked desktop padding`);
    }
  });

  it("inner pages start under the header from --page-top", () => {
    // /about opens with Founders variant="page", which carries the --page-top offset.
    assert.match(code("app/about/page.tsx"), /<Founders variant="page" \/>/);
    assert.match(code("components/sections/Founders.tsx"), /pt-\(--page-top\)/);
    for (const file of ["app/contact/page.tsx", "app/perth/page.tsx", "app/privacy/page.tsx", "app/services/page.tsx", "app/services/[slug]/page.tsx", "app/solutions/page.tsx"]) {
      assert.match(code(file), /pt-\(--page-top\)/, file);
    }
  });
});

describe("viewport and iPhone safe areas", () => {
  it("exports a viewport with viewport-fit=cover", () => {
    const layout = code("app/layout.tsx");
    assert.match(layout, /export const viewport: Viewport/);
    assert.match(layout, /viewportFit: "cover"/);
    assert.match(layout, /width: "device-width"/);
  });

  it("the fixed header grows by the top inset and clears side notches", () => {
    const header = rules(".site-header").join("\n");
    assert.match(header, /height:\s*calc\(var\(--nav-h\) \+ var\(--safe-top\)\)/);
    assert.match(header, /padding-top:\s*var\(--safe-top\)/);
    assert.match(header, /padding-inline:\s*var\(--safe-left\) var\(--safe-right\)/);
    assert.match(rules(".header-offset").join(""), /var\(--safe-top\)/);
  });

  it("the mobile menu clears the notch, the side insets and the home indicator", () => {
    const menu = rules(".mobile-menu").join("\n");
    assert.match(menu, /padding:\s*var\(--safe-top\) var\(--safe-right\) var\(--safe-bottom\) var\(--safe-left\)/);
    assert.match(menu, /inset:\s*0/);
  });

  it("the body is inset from side notches in landscape", () => {
    const body = rules("body").join("\n");
    assert.match(body, /padding-left:\s*var\(--safe-left\)/);
    assert.match(body, /padding-right:\s*var\(--safe-right\)/);
  });

  it("the safe-area tokens fall back to 0 off iPhone", () => {
    for (const side of ["top", "right", "bottom", "left"]) {
      assert.match(CSS, new RegExp(`--safe-${side}: env\\(safe-area-inset-${side}, 0px\\)`));
    }
  });
});

describe("no viewport-height traps", () => {
  it("no 100vh, h-screen or min-h-screen on public surfaces (svh / dvh / inset instead)", () => {
    const offenders = [];
    for (const file of [...PUBLIC_FILES, "app/public-site.css"]) {
      const source = file.endsWith(".css") ? CSS : code(file);
      for (const match of source.matchAll(/\b100vh\b|\bh-screen\b|\bmin-h-screen\b|\bh-\[100vh\]|\bmin-h-\[100vh\]/g)) {
        offenders.push(`${relative(ROOT, join(ROOT, file))}: ${match[0]}`);
      }
    }
    assert.deepEqual(offenders, []);
  });

  it("the hero is as tall as its content: no full-screen slide (experience polish)", () => {
    assert.ok(!/min-h-\[100svh\]|min-h-\[100dvh\]|h-\[100svh\]/.test(code("components/sections/Hero.tsx")));
    // The landscape-phone rule from PR 3 stays as a guard.
    assert.match(CSS, /@media \(max-height: 500px\) and \(orientation: landscape\)\s*\{\s*\.hz-hero > div\s*\{\s*min-height:\s*0;/);
  });

  it("body copy is not inflated by Safari on rotation", () => {
    assert.match(CSS, /-webkit-text-size-adjust:\s*100%/);
  });
});

describe("hero headline paints on the first frame (LCP)", () => {
  const hero = code("components/sections/Hero.tsx");
  const h1 = hero.match(/<h1\b[\s\S]*?<\/h1>/)?.[0] ?? "";

  it("the h1 exists once and carries the copy", () => {
    assert.ok(h1);
    assert.match(h1, /Technology that makes[\s\S]*running your business easier\./);
  });

  it("no headline line has an entrance animation, a delay or a hidden start state", () => {
    assert.ok(!/dl-[\w-]*(load|view)|animate-|opacity-0|--d"/.test(h1), "h1 lines start visible and in place");
  });

  it("no CSS rule targets the hero headline lines with opacity", () => {
    assert.ok(!/\.hz-display[^{]*\{[^}]*opacity/.test(CSS));
  });
});

describe("primary call to action casing", () => {
  it("the single source reads 'Start Free Consultation' (the brief's wording, 2026-10-13)", () => {
    assert.equal(PRIMARY_CTA.label, "Start Free Consultation");
  });

  it("no visitor-facing 'Start a Conversation' (title case) remains on public surfaces", () => {
    const offenders = PUBLIC_FILES.filter((file) => /Start a Conversation/.test(code(file)));
    assert.deepEqual(offenders, []);
  });
});

describe("tap targets on inner pages", () => {
  it("service-page FAQ toggles are at least 44 px tall", () => {
    assert.match(code("app/services/[slug]/page.tsx"), /<summary className="[^"]*min-h-\[44px\]/);
  });

  it("Perth FAQ toggles are at least 44 px tall", () => {
    assert.match(code("app/perth/page.tsx"), /<summary className="[^"]*min-h-\[44px\]/);
  });

  it("mobile labels keep a readable floor", () => {
    const globals = code("app/globals.css");
    const phone = globals.match(/@media \(max-width: 640px\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
    const section = Number(phone.match(/\.section-label\s*\{[^}]*font-size:\s*([\d.]+)rem/)?.[1]);
    const tech = Number(phone.match(/\.tech-label\s*\{[^}]*font-size:\s*([\d.]+)rem/)?.[1]);
    assert.ok(section >= 0.64, `section-label ${section}rem`);
    assert.ok(tech >= 0.6, `tech-label ${tech}rem`);
  });
});
