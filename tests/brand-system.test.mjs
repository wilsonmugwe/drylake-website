/*
 * PR "Drylake Brand System & Experience Foundations" (2026-10-07).
 *
 * Pins the brand-system decisions so they cannot drift:
 *   - ONE wordmark implementation (components/brand/DrylakeWordmark.tsx), geometry identical to
 *     the brand-kit SVG, the y always the tile ochre, and the ochre hex written in exactly one
 *     source file (TILE_OCHRE in components/brand/DrylakeMark.tsx).
 *   - The wordmark is what every brand slot renders (header, mobile menu, footer, auth, client
 *     Workspace rail, Admin, root error fallback).
 *   - Every public "Start a conversation" is the canonical white PrimaryCta, with WCAG contrast
 *     recomputed here from the CSS (not asserted from memory).
 *   - One focus ring token, reduced-motion coverage, no em dash in accessible names.
 * Source/behaviour tests under node:test, like the rest of tests/. No new dependencies.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

function walk(dir, pattern, out = []) {
  for (const entry of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${entry}`;
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, pattern, out);
    else if (pattern.test(entry)) out.push(rel);
  }
  return out;
}

const SOURCE = [...walk("app", /\.(tsx?|css)$/), ...walk("components", /\.(tsx?|css)$/), ...walk("lib", /\.tsx?$/)];
const PUBLIC_TSX = [
  ...walk("app", /\.tsx$/).filter((f) => !/^app\/(admin|client|portal|api)\//.test(f)),
  ...walk("components", /\.tsx$/).filter((f) => !/^components\/(admin|client|billing)\//.test(f)),
];

/* WCAG 2.x relative luminance + contrast ratio. */
function luminance(hex) {
  const [r, g, b] = hex
    .replace("#", "")
    .match(/../g)
    .map((h) => parseInt(h, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
function cssVar(css, name) {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(match, `${name} not found`);
  return match[1];
}

describe("the canonical Drylake wordmark", () => {
  const wordmark = read("components/brand/DrylakeWordmark.tsx");
  const kit = read("public/brand/drylake-wordmark-dark-bg.svg");

  it("uses the brand-kit geometry verbatim (letters path + the y stroke)", () => {
    const [letters, y] = [...kit.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(wordmark.includes(`"${letters}"`), "letters path differs from the brand kit");
    assert.ok(wordmark.includes(`"${y}"`), "y path differs from the brand kit");
    assert.match(kit, /stroke="#C2703D"/, "brand kit y is the tile ochre");
    assert.match(wordmark, /WORDMARK_VIEWBOX = "-8\.51 -85\.84 414\.22 129\.01"/);
  });

  it("paints the y with TILE_OCHRE and the letters with the surface ink", () => {
    assert.match(wordmark, /stroke=\{TILE_OCHRE\}/);
    assert.match(wordmark, /fill=\{BRAND_INK\[tone\]\}/);
    assert.match(wordmark, /import DrylakeMark, \{ BRAND_INK, TILE_OCHRE/);
    const mark = read("components/brand/DrylakeMark.tsx");
    assert.match(mark, /export const TILE_OCHRE = "#C2703D";/);
    assert.match(mark, /dark: "#ECEAE4"/);
    assert.match(mark, /light: "#17191E"/);
  });

  it("the ochre hex is written in exactly one source file", () => {
    const offenders = SOURCE.filter((f) => /#c2703d/i.test(read(f)));
    assert.deepEqual(offenders, ["components/brand/DrylakeMark.tsx"]);
  });

  it("the y geometry exists in exactly one component (no second orange y)", () => {
    const offenders = SOURCE.filter((f) => read(f).includes("141.63,-46.04"));
    assert.deepEqual(offenders, ["components/brand/DrylakeWordmark.tsx"]);
  });

  it("is named for assistive tech, or explicitly decorative inside a named link", () => {
    assert.match(wordmark, /label = "Drylake"/);
    assert.match(wordmark, /role: "img", "aria-label": label/);
    assert.match(wordmark, /"aria-hidden": true/);
  });
});

describe("every brand slot renders the canonical wordmark", () => {
  const slots = {
    "components/brand/BrandHomeLink.tsx": /<DrylakeWordmark\b/,
    "components/layout/Navbar.tsx": /<BrandHomeLink \/>/,
    "components/layout/MobileMenu.tsx": /<BrandHomeLink onNavigate=\{handleNavigate\} \/>/,
    "components/layout/Footer.tsx": /<BrandHomeLink size="footer" \/>/,
    "app/sign-in/[[...sign-in]]/page.tsx": /<DrylakeWordmark tone="dark"[\s\S]*<DrylakeWordmark tone="light"/,
    "app/sign-up/[[...sign-up]]/page.tsx": /<DrylakeWordmark tone="dark"[\s\S]*<DrylakeWordmark tone="light"/,
    "components/client/ClientRail.tsx": /<DrylakeWordmark lockup/,
    "components/admin/AdminSidebar.tsx": /<DrylakeWordmark lockup/,
    "components/admin/AdminMobileNav.tsx": /<DrylakeWordmark lockup/,
    "app/global-error.tsx": /<DrylakeWordmark\b/,
  };

  for (const [file, pattern] of Object.entries(slots)) {
    it(file, () => assert.match(code(file), pattern));
  }

  it("no brand slot falls back to a plain-text DRYLAKE / Drylake logotype", () => {
    for (const file of Object.keys(slots)) {
      assert.ok(!/>\s*DRYLAKE\s*</.test(code(file)), `${file} renders DRYLAKE as text`);
    }
    // The old raster wordmark image is no longer used in the footer.
    assert.ok(!read("components/layout/Footer.tsx").includes("drylake-wordmark-dark-bg.svg"));
  });
});

describe("the canonical primary CTA (white, dark text)", () => {
  it("every public link to the contact page from a CTA is a <PrimaryCta>", () => {
    const found = [];
    for (const file of PUBLIC_TSX) {
      for (const match of code(file).matchAll(/<(\w+)\b[^>]*\bhref=(?:"\/contact"|\{PRIMARY_CTA\.href\})/g)) {
        found.push(file);
        assert.equal(match[1], "PrimaryCta", `${file}: a contact CTA rendered as <${match[1]}>`);
      }
    }
    // Navbar, mobile menu, hero, closing CTA, service pages, Perth.
    for (const file of [
      "components/layout/Navbar.tsx",
      "components/layout/MobileMenu.tsx",
      "components/sections/Hero.tsx",
      "components/sections/ContactCTA.tsx",
      "app/services/[slug]/page.tsx",
      "app/perth/page.tsx",
    ]) {
      assert.ok(found.includes(file), `${file} lost its primary CTA`);
    }
  });

  it("no public component still paints the CTA orange (.btn-signal)", () => {
    const offenders = [...PUBLIC_TSX].filter((f) => /\bbtn-signal\b/.test(code(f)));
    assert.deepEqual(offenders, []);
  });

  it("keeps the site's label wording (\"Discuss your project\" since 2026-10-13)", () => {
    assert.match(code("components/sections/Hero.tsx"), /Discuss your project\s*<\/PrimaryCta>/);
    assert.match(code("components/sections/ContactCTA.tsx"), /Discuss your project\s*<\/PrimaryCta>/);
    assert.match(code("app/perth/page.tsx"), /Discuss your project\s*<\/PrimaryCta>/);
  });

  const css = read("app/public-site.css");
  const block = css.slice(css.indexOf(".btn-primary,"), css.indexOf(".btn-signal,"));

  it("is unlayered, so the public a { color: inherit } reset cannot repaint it", () => {
    assert.ok(!/@layer/.test(css), "public-site.css must stay unlayered");
    assert.match(block, /color: var\(--ink\);/);
    assert.match(block, /background: var\(--cta-bg\);/);
  });

  it("meets WCAG contrast in every state (text AAA, ring and edge >= 3:1)", () => {
    const ink = cssVar(css, "--ink");
    for (const state of ["--cta-bg", "--cta-bg-hover", "--cta-bg-active"]) {
      const bg = cssVar(block, state);
      assert.ok(contrast(ink, bg) >= 7, `${state} ${bg}: ${contrast(ink, bg).toFixed(2)}:1`);
    }
    assert.equal(cssVar(block, "--cta-bg").toLowerCase(), "#ffffff", "primary CTA is white");
    // White button edge on ink sections; ink hairline on light sections.
    assert.ok(contrast("#ffffff", ink) >= 3);
    assert.match(block, /\[data-surface="light"\] \{\s*--cta-edge: var\(--ink\);/);

    const ring = cssVar(read("app/globals.css"), "--focus-ring");
    for (const surface of ["#ffffff", "#f2f0e9", "#f4f4f1", ink, "#10100f"]) {
      assert.ok(contrast(ring, surface) >= 3, `focus ring on ${surface}: ${contrast(ring, surface).toFixed(2)}:1`);
    }
  });

  it("is never smaller than a 44 px target, and hover is gated to hover devices", () => {
    for (const [, px] of block.matchAll(/min-height: (\d+)px/g)) {
      assert.ok(Number(px) >= 44, `min-height ${px}px`);
    }
    assert.match(block, /@media \(hover: hover\)/);
    assert.match(block, /\.btn-primary:focus-visible \{\s*outline: var\(--focus-ring-width\) solid var\(--focus-ring\);/);
  });
});

describe("accessibility foundation", () => {
  const globals = read("app/globals.css");

  it("one focus ring token drives every focus-visible outline", () => {
    assert.match(globals, /--focus-ring: #[0-9a-f]{6};/);
    assert.match(globals, /select:focus-visible,\s*summary:focus-visible,[\s\S]*?outline: var\(--focus-ring-width\) solid var\(--focus-ring\);/);
    assert.ok(!/outline: 2px solid var\(--(orange|cp-orange)\)/.test(globals), "hard-coded focus outline left");
  });

  it("prefers-reduced-motion collapses the motion primitives and every animation", () => {
    const rm = globals.slice(globals.indexOf("@media (prefers-reduced-motion: reduce)"));
    assert.match(rm, /--duration-fast: 0ms;/);
    assert.match(rm, /animation-duration: 0\.01ms !important;/);
    assert.match(rm, /transition-duration: 0\.01ms !important;/);
    assert.match(rm, /scroll-behavior: auto/);

    const pub = read("app/public-site.css");
    const pubRm = pub.slice(pub.indexOf("@media (prefers-reduced-motion: reduce)"));
    assert.ok(pubRm.includes(".btn-primary:active"), "CTA press movement must stop");
  });

  it("design tokens live in Tailwind v4 @theme", () => {
    assert.match(globals, /@theme inline \{[\s\S]*--font-mono: var\(--font-geist-mono\)/);
    assert.match(globals, /@theme \{[\s\S]*--color-ink: #0b0b0a;[\s\S]*--color-mineral: #f2f0e9;/);
  });

  it("no accessible name, alt or title carries an em dash", () => {
    const offenders = [...walk("app", /\.tsx$/), ...walk("components", /\.tsx$/)].filter((f) =>
      /(aria-label|alt|title)=["{][^\n]*—/.test(read(f))
    );
    assert.deepEqual(offenders, []);
  });
});
