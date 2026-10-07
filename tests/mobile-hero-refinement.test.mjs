/*
 * Mobile homepage refinement (2026-10-07). Pins the decisions of this PR:
 *   HERO     (superseded 2026-10-08: tests/final-refinement-hero.test.mjs)
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

// HERO: superseded by the final refinement (2026-10-08); see tests/final-refinement-hero.test.mjs.

describe("MOTION: the systems story rests between its two movements", () => {
  const vars = Object.fromEntries(
    [...section(".hz-sys {", "}").matchAll(/--(\w): clamp\(0, ([^;]+), 1\);/g)].map(([, name, expr]) => [name, expr]),
  );

  it("arranging ends before connecting starts, with a readable rest between them", () => {
    // --k is clamp(0, (p - start) / span, 1): travel ends at start + span.
    const travelEnd = Number(vars.k.match(/- ([\d.]+)\)/)[1]) + Number(vars.k.match(/\/ ([\d.]+)/)[1]);
    const connectStart = Number(vars.q.match(/- ([\d.]+)\)/)[1]);
    assert.ok(connectStart - travelEnd >= 0.1, `rest ${connectStart - travelEnd}`);
  });

  it("the second movement spans close to half of the story (it was a quarter, overlapping the first)", () => {
    const connectStart = Number(vars.q.match(/- ([\d.]+)\)/)[1]);
    const hubEnd = Number(vars.h.match(/- ([\d.]+)\)/)[1]) + Number(vars.h.match(/\/ ([\d.]+)/)[1]);
    assert.ok(hubEnd - connectStart >= 0.45, `${hubEnd - connectStart}`);
    assert.ok(Math.abs(hubEnd - 1) < 1e-9);
  });

  it("the readout changes line only after each movement, not during it", () => {
    const end0 = Number(CSS.match(/\.hz-readout-0 \{\s*opacity: clamp\(0, \(([\d.]+) - var/)[1]);
    const start2 = Number(CSS.match(/\.hz-readout-2 \{\s*opacity: clamp\(0, \(var\(--p, 1\) - ([\d.]+)\)/)[1]);
    const travelEnd = Number(vars.k.match(/- ([\d.]+)\)/)[1]) + Number(vars.k.match(/\/ ([\d.]+)/)[1]);
    assert.ok(end0 <= travelEnd && start2 >= 0.8, `${end0} ${travelEnd} ${start2}`);
  });

  it("phones run the story over a longer range and resolve while the stage is on screen (final refinement)", () => {
    const tag = code("components/sections/Integrations.tsx").match(/<ScrollProgress[^>]*>/)[0];
    const n = (k) => Number(tag.match(new RegExp(`${k}=\\{(-?[\\d.]+)\\}`))[1]);
    const range = n("passStart") - n("end");
    assert.ok(range >= 0.8, `phone range ${range} viewport heights (was 0.9)`);
    assert.ok(range * n("finish") > 0.9 * 0.8 - 1e-9, "the story itself plays over more scroll than before (0.72)");
    assert.ok(n("passStart") - range * n("finish") >= -0.2, "resolved while the stage is still on screen");
    assert.ok(n("finish") <= 0.75, "then holds connected");
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
