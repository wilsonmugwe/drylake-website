/*
 * Final website refinement (2026-10-08). Pins the hero and homepage decisions of this PR:
 *   MESSAGE   the h1 is static and first; on phones the proposition follows it, then the five
 *             lake-bed plates assemble, then the actions, in document order.
 *   TILES     the phone assembly reuses the desktop plates and labels (no new tiles, no new words),
 *             its fragmented state fits its reserved square, the timeline is finite, waits until it
 *             is on screen, and leaves nothing in effect once done (reduced motion = final state).
 *   GEOMETRY  the field's lit cracks are no longer signal orange; orange stays on the nodes.
 *   COPY      the "no technical brief" reassurance is not repeated in every homepage section;
 *             each problem links to its entry on /solutions.
 * node:test, source-level like the rest of tests/. No new dependencies.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  LAKEBED_PHONE_OFFSETS,
  LAKEBED_PHONE_VIEW,
  LAKEBED_PLATES,
  viewPct,
} from "../components/visuals/lakebed-geometry.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");
const CSS = read("app/public-site.css");
const rule = (selector) => {
  const at = CSS.indexOf(`${selector} {`);
  assert.ok(at >= 0, selector);
  return CSS.slice(at, CSS.indexOf("}", at));
};

describe("MESSAGE first, then explanation, tiles, CTA (phones)", () => {
  const hero = code("components/sections/Hero.tsx");

  it("phone order: h1, proposition, the assembling plates, then the actions", () => {
    const at = (needle) => {
      const i = hero.indexOf(needle);
      assert.ok(i >= 0, needle);
      return i;
    };
    const order = [at("<h1"), at("type-lede"), at('<InView className="hz-assemble sm:hidden"'), at("<PrimaryCta")];
    assert.deepEqual([...order].sort((a, b) => a - b), order);
    assert.match(hero, /<InView className="hz-assemble sm:hidden"[^>]*>\s*<LakeBedInteractive variant="phone">\s*<LakeBed variant="phone" \/>\s*<\/LakeBedInteractive>\s*<\/InView>/);
  });

  it("tablet and desktop keep the approved lake-bed tile and caption", () => {
    assert.match(hero, /<figure className="lb-figure hidden sm:block">\s*<LakeBedInteractive[\s\S]*?>\s*<LakeBed \/>/);
    // The tile box and figcaption now come from the interaction island (final corrections 2026-10-13).
    assert.match(read("components/visuals/LakeBedInteractive.tsx"), /"lb-tile lb-ix relative"[\s\S]*<figcaption className="lb-caption/);
  });

  it("the CTA is never delayed by script: plain markup in the hero, no animation class", () => {
    const cta = hero.slice(hero.indexOf("<PrimaryCta"), hero.indexOf("</PrimaryCta>"));
    assert.ok(!/dl-|lb-|animate-|opacity-0|hidden/.test(cta), cta);
  });

  it("'workarounds' keeps its weight: no dimmer than 60% white at any width", () => {
    const third = hero.match(/<span className="block ([^"]*)">on workarounds\.<\/span>/)?.[1] ?? "";
    for (const [, value] of third.matchAll(/text-white\/(\d+)/g)) assert.ok(Number(value) >= 60, third);
  });

  it("the retired phone still (ConvergeMark) is gone, with its styles", () => {
    assert.ok(!existsSync(join(ROOT, "components/visuals/ConvergeMark.tsx")));
    assert.ok(!/ConvergeMark/.test(hero));
    assert.ok(!/\.cv-/.test(CSS));
  });
});

describe("TILES: the same five plates, composed for a phone", () => {
  it("one label per plate, shared with desktop (no new tiles or words)", () => {
    assert.equal(LAKEBED_PHONE_OFFSETS.length, LAKEBED_PLATES.length);
    const lake = code("components/visuals/LakeBed.tsx");
    assert.ok(!/label:\s*"/.test(lake), "labels come from LAKEBED_PLATES only");
  });

  it("the fragmented state stays inside the reserved square (no overflow while assembling)", () => {
    const { min, size } = LAKEBED_PHONE_VIEW;
    for (const { dx, dy, r } of LAKEBED_PHONE_OFFSETS) {
      // The tile spans 4..96; allow ~2 units for the small rotation.
      assert.ok(4 + dx - 2 >= min && 96 + dx + 2 <= min + size, `x ${dx}`);
      assert.ok(4 + dy - 2 >= min && 96 + dy + 2 <= min + size, `y ${dy}`);
      assert.ok(Math.abs(r) <= 6, "restrained rotation");
    }
    assert.equal(viewPct(min, LAKEBED_PHONE_VIEW), 0);
    assert.equal(viewPct(min + size, LAKEBED_PHONE_VIEW), 100);
  });

  it("the label ride matches the phone view box (one tile unit = 100 / size cqw)", () => {
    const unit = Number(CSS.match(/@keyframes lb-label-ride \{[^}]*calc\(var\(--dx\) \* ([\d.]+)cqw\)/)[1]);
    assert.ok(Math.abs(unit - 100 / LAKEBED_PHONE_VIEW.size) < 0.01, `${unit}`);
  });

  it("calm and finite: no loop, no overshoot, every fill backwards (nothing held once done)", () => {
    const block = CSS.slice(CSS.indexOf(".lb-phone {"), CSS.indexOf("@keyframes lb-label-ride"));
    assert.ok(!/infinite/.test(block));
    const easing = block.match(/--lb-calm: cubic-bezier\(([^)]+)\)/)[1].split(",").map(Number);
    assert.ok(easing[1] >= 0 && easing[1] <= 1 && easing[3] >= 0 && easing[3] <= 1, "no bounce");
    const animations = [...block.matchAll(/animation:\s*([^;]+);/g)].map(([, value]) => value);
    assert.ok(animations.length >= 6);
    for (const value of animations) assert.ok(!/\bboth\b|\bforwards\b/.test(value), value);
  });

  it("waits until on screen: paused while InView marks it below the fold", () => {
    assert.match(CSS, /\[data-inview="false"\] \.lb-phone,\s*\[data-inview="false"\] \.lb-phone \* \{\s*animation-play-state: paused;/);
  });

  it("reduced motion renders the finished composition (the shared .lb-* rule turns every animation off)", () => {
    const rm = CSS.slice(CSS.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    for (const name of [".lb-plate", ".lb-fill", ".lb-link", ".lb-node", ".lb-label"]) assert.ok(rm.includes(name), name);
  });

  it("readable labels: at least 11 px on the smallest phone", () => {
    const min = (selector) => Number(rule(selector).match(/font-size: clamp\((\d+)px/)[1]);
    assert.ok(min(".lb-phone .lb-label") >= 12);
    assert.ok(min(".lb-phone .lb-label-ochre") >= 11);
  });
});

describe("GEOMETRY whispers: orange is an accent, not a line through the type", () => {
  it("the field's lit cracks are not signal orange; the nodes are", () => {
    assert.ok(!/stroke: var\(--signal\)/.test(rule(".lf-link")));
    assert.match(rule(".lf-node"), /fill: var\(--signal\)/);
  });
});

describe("COPY: each idea in its place", () => {
  it("'no technical brief' is said by the call to action and the FAQ question about it, not every section", () => {
    const home = ["components/sections/Problems.tsx", "components/sections/ContactCTA.tsx", "lib/faqs.ts"].map(code).join("\n");
    const hits = (home + code("components/sections/Approach.tsx")).match(/technical (brief|solution|specification)/gi) ?? [];
    assert.ok(hits.length <= 2, hits.join(", "));
  });

  it("every homepage problem links to a real anchor on /solutions", () => {
    const problems = code("components/sections/Problems.tsx");
    const ids = new Set([...read("lib/discovery/problems.ts").matchAll(/id: "([a-z-]+)"/g)].map(([, id]) => id));
    const anchors = [...problems.matchAll(/anchor: "([a-z-]+)"/g)].map(([, id]) => id);
    assert.equal(anchors.length, 4);
    for (const id of anchors) assert.ok(ids.has(id), id);
    assert.match(problems, /href=\{`\/solutions#\$\{problem\.anchor\}`\}/);
    assert.match(problems, /href="\/solutions"/);
  });
});
