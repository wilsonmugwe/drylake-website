/*
 * Mobile homepage refinement (2026-10-07). Pins the decisions of this PR:
 *   HERO     phones get their own composition (ConvergeMark) while tablet and desktop keep the
 *            approved lake-bed tile; "on workarounds." is brighter below lg and unchanged on desktop;
 *            every phone-only rule lives inside max-width 639px.
 *   MOTION   the systems story has a rest between its two movements and a slower second one;
 *            every new animation is finite and stops under reduced motion.
 *   FOUNDERS no initials mark and no placeholder portrait.
 *   FAQ      desktop split: heading third, accordion two thirds, as its own band.
 * node:test, source-level like the rest of tests/. No new dependencies.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");
const CSS = read("app/public-site.css");

const section = (start, end) => {
  const from = CSS.indexOf(start);
  assert.ok(from >= 0, start);
  return CSS.slice(from, CSS.indexOf(end, from));
};

describe("HERO: a phone composition, desktop untouched", () => {
  const hero = code("components/sections/Hero.tsx");

  it("phones show ConvergeMark; the lake-bed tile and caption are hidden only below 640 px", () => {
    assert.match(hero, /<div className="hz-first-art sm:hidden">\s*<ConvergeMark \/>/);
    assert.match(hero, /<figure className="lb-figure hidden sm:block">\s*<div className="lb-tile">\s*<LakeBed \/>/);
  });

  it("'on workarounds.' is bright on phones and tablets, and exactly as approved from lg", () => {
    const third = hero.match(/<span className="block ([^"]*)">on workarounds\.<\/span>/)?.[1] ?? "";
    const base = Number(third.match(/(?:^|\s)text-white\/(\d+)/)?.[1]);
    assert.ok(base >= 70, `base opacity ${base}`);
    assert.match(third, /\blg:text-white\/45\b/);
  });

  it("every phone composition rule is scoped below 640 px", () => {
    const block = section("/* ------------------------------------------------- phone composition ---- */", "/* ------------------------------------------------------------- converge ---- */");
    const outside = block.replace(/@media \(max-width: 639px\)(?: and \(max-height: 700px\))? \{[\s\S]*?\n\}/g, "");
    assert.ok(!/\{/.test(outside), `rule outside a phone media query: ${outside}`);
    assert.match(block, /\.hz-first \{[^}]*min-height: calc\(100svh - var\(--nav-h\) - 20px\)/);
  });

  it("the actions sit outside the first-screen group, so they start below it on phones", () => {
    // Up to the actions' outer wrapper (two <div>s before the PrimaryCta), every div is closed.
    const inner = hero.lastIndexOf("<div", hero.indexOf("<PrimaryCta"));
    const actions = hero.lastIndexOf("<div", inner - 1);
    const first = hero.slice(hero.indexOf('<div className="hz-first">'), actions);
    assert.ok(first.includes("<h1") && first.includes("type-lede"));
    const depth = (first.match(/<div\b/g) ?? []).length - (first.match(/<\/div>/g) ?? []).length;
    assert.equal(depth, 0, "the actions' wrapper opens after .hz-first closes");
  });

  it("ConvergeMark: server-only, decorative, fixed aspect ratio, brand geometry imported", () => {
    const src = read("components/visuals/ConvergeMark.tsx");
    assert.ok(!src.startsWith('"use client"'));
    assert.match(src, /aria-hidden="true"/);
    assert.match(src, /aspectRatio: `\$\{VIEW_W\} \/ \$\{VIEW_H\}`/);
    assert.match(src, /TILE_PLATES/);
    assert.match(src, /TILE_OCHRE_PLATE \? TILE_OCHRE/);
    assert.ok(!/#C2703D/i.test(src), "ochre imported, never retyped");
    assert.ok(!/<img\b|<Image\b|next\/image/.test(src));
  });

  it("the converge motion is finite, drawn from the finished state, and stops under reduced motion", () => {
    const block = section("/* ------------------------------------------------------------- converge ---- */", "/* ------------------------------------------------------------- lake bed ---- */");
    assert.ok(!/infinite/.test(block));
    assert.match(block, /\.cv-path \{[^}]*stroke-dashoffset: 0;/);
    const rm = CSS.slice(CSS.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    for (const name of [".cv-path", ".cv-node"]) assert.ok(rm.includes(name), name);
  });
});

describe("MOTION: the systems story rests between its two movements", () => {
  const vars = Object.fromEntries(
    [...section(".hz-sys {", "}").matchAll(/--(\w): clamp\(0, ([^;]+), 1\);/g)].map(([, name, expr]) => [name, expr]),
  );

  it("arranging ends before connecting starts, with a readable rest between them", () => {
    const travelEnd = Number(vars.k.match(/\/ ([\d.]+)/)[1]);
    const connectStart = Number(vars.q.match(/- ([\d.]+)\)/)[1]);
    assert.ok(connectStart - travelEnd >= 0.1, `rest ${connectStart - travelEnd}`);
  });

  it("the second movement spans at least half of the story (it was a quarter, overlapping the first)", () => {
    const connectStart = Number(vars.q.match(/- ([\d.]+)\)/)[1]);
    const hubEnd = Number(vars.h.match(/- ([\d.]+)\)/)[1]) + Number(vars.h.match(/\/ ([\d.]+)/)[1]);
    assert.ok(hubEnd - connectStart >= 0.5, `${hubEnd - connectStart}`);
    assert.ok(Math.abs(hubEnd - 1) < 1e-9);
  });

  it("the readout changes line only after each movement, not during it", () => {
    const end0 = Number(CSS.match(/\.hz-readout-0 \{\s*opacity: clamp\(0, \(([\d.]+) - var/)[1]);
    const start2 = Number(CSS.match(/\.hz-readout-2 \{\s*opacity: clamp\(0, \(var\(--p, 1\) - ([\d.]+)\)/)[1]);
    assert.ok(end0 <= 0.34 && start2 >= 0.8);
  });

  it("phones run the story while the stage is on screen (it used to finish half below the fold)", () => {
    const tag = code("components/sections/Integrations.tsx").match(/<ScrollProgress[^>]*>/)[0];
    const n = (k) => Number(tag.match(new RegExp(`${k}=\\{(-?[\\d.]+)\\}`))[1]);
    assert.ok(n("passStart") <= 0.35, "starts as the stage rises into view");
    assert.ok(n("end") <= -0.5, "a longer phone range");
    assert.ok(n("finish") >= 0.75 && n("finish") <= 0.85);
  });
});

describe("FOUNDERS: names and roles, no initials", () => {
  it("no initials, no plate portrait, no placeholder avatar", () => {
    const src = code("components/sections/Founders.tsx");
    assert.ok(!/initials|PlatePortrait|"BW"|"WM"|>BW<|>WM<|avatar/i.test(src));
    assert.match(src, /Benedict Wambugu/);
    assert.match(src, /Wilson Mugwe/);
  });
});

describe("FAQ: a wide editorial split on desktop", () => {
  it("heading in a third, accordion in two thirds", () => {
    const faq = code("components/sections/FAQ.tsx");
    assert.match(faq, /id="faq" className="grid[^"]*lg:grid-cols-12/);
    assert.match(faq, /<div className="lg:col-span-4">/);
    assert.match(faq, /<div className="border-t border-white\/14 lg:col-span-8">/);
    assert.match(faq, /min-h-\[52px\]/, "44 px+ tap targets kept");
  });

  it("the homepage FAQ is its own full-width band under the call to action", () => {
    const cta = code("components/sections/ContactCTA.tsx");
    assert.match(cta, /\{aside && <div className="mt-12 border-t[^"]*lg:mt-\(--section-y\)[^"]*">\{aside\}<\/div>\}/);
    assert.ok(!/lg:col-span-5 lg:col-start-8/.test(cta), "no narrow side panel");
  });
});
