/*
 * Final corrections (2026-10-13). Pins:
 *   COPY      the approved h1 and lede, with no AI in either; the primary CTA reads "Get Started
 *             for Free" and every surface carrying it says what is free (the enquiry, not the build).
 *   LABELS    the lake-bed plates read Enquiries and Tasks (not Customers and Jobs), caption too.
 *             Homepage clarity (2026-10-10): Quotes, Invoices, Scheduling, One system, Enquiries,
 *             and each plate opens a same-page card (pinned in tests/homepage-clarity.test.mjs).
 *   INTERACT  each plate is a real button (hover, focus, tap) that lights its own cracks and
 *             shows a short explanation; the picture stays server-rendered and unchanged at rest.
 * Layout at 1366x768 / 1440x900 (CTA in the first viewport) is checked in tests/e2e/public-site.spec.ts.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  LAKEBED_CONNECTIONS,
  LAKEBED_POPOVERS,
  LAKEBED_LINK_PLATES,
  LAKEBED_PLATES,
} from "../components/visuals/lakebed-geometry.ts";
import { PRIMARY_CTA, PRIMARY_CTA_NOTE } from "../lib/navigation/site-nav.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");
const flat = (s) => s.replace(/\{" "\}/g, " ").replace(/\s+/g, " ");

describe("COPY", () => {
  const hero = flat(code("components/sections/Hero.tsx"));
  const h1 = hero.slice(hero.indexOf("<h1"), hero.indexOf("</h1>"));

  it("the h1 is the approved line, dimmed phrase kept", () => {
    assert.match(h1, /Technology that makes <span[^>]*>running your business easier\.<\/span>/);
  });

  it("the lede is the approved paragraph", () => {
    assert.match(hero, /We build websites, business software and automation tools that save time, reduce manual work and help your business run smoothly\./);
  });

  it("no AI in the hero messaging", () => {
    const lede = hero.slice(hero.indexOf("type-lede"), hero.indexOf("</p>", hero.indexOf("type-lede")));
    for (const text of [h1, lede]) assert.doesNotMatch(text, /\bAI\b|artificial intelligence/i);
  });

  it("the primary CTA reads Get Started for Free and keeps /contact", () => {
    assert.deepEqual([PRIMARY_CTA.label, PRIMARY_CTA.href], ["Get Started for Free", "/contact"]);
    assert.doesNotMatch(PRIMARY_CTA_NOTE, /—/);
    assert.match(PRIMARY_CTA_NOTE, /free/i);
    assert.match(PRIMARY_CTA_NOTE, /quoted before work starts/);
  });

  it("every body CTA saying Get Started for Free has the free-enquiry note right after it", () => {
    for (const file of ["components/sections/Hero.tsx", "components/sections/ContactCTA.tsx", "app/perth/page.tsx", "app/services/[slug]/page.tsx"]) {
      const src = code(file);
      assert.doesNotMatch(src, /Discuss your project\s*<\/PrimaryCta>/, file);
      const at = src.indexOf("Get Started for Free");
      assert.ok(at > 0, file);
      const after = src.slice(at, at + 900);
      assert.match(after, /\{PRIMARY_CTA_NOTE\}/, `${file}: note missing beside the CTA`);
    }
  });
});

describe("LABELS", () => {
  it("plates read Quotes, Invoices, Scheduling, One system, Enquiries", () => {
    assert.deepEqual(LAKEBED_PLATES.map((p) => p.label), ["Quotes", "Invoices", "Scheduling", "One system", "Enquiries"]);
  });

  it("the caption names the same parts", () => {
    const hero = flat(code("components/sections/Hero.tsx"));
    assert.match(hero, /Quotes, invoices, scheduling, enquiries: held together by copy, paste and email\./);
    assert.doesNotMatch(hero, /customers, jobs/i);
  });
});

describe("INTERACT", () => {
  it("every crack names the two plates it runs between, and each plate owns at least one", () => {
    assert.equal(LAKEBED_LINK_PLATES.length, LAKEBED_CONNECTIONS.length);
    for (const pair of LAKEBED_LINK_PLATES) {
      assert.equal(pair.length, 2);
      for (const p of pair) assert.ok(p >= 0 && p < LAKEBED_PLATES.length);
    }
    for (let i = 0; i < LAKEBED_PLATES.length; i += 1) assert.ok(LAKEBED_LINK_PLATES.some((pair) => pair.includes(i)), `plate ${i}`);
  });

  it("one short problem and one way we help per plate, plain English, no em dash", () => {
    assert.equal(LAKEBED_POPOVERS.length, LAKEBED_PLATES.length);
    for (const { problem, help } of LAKEBED_POPOVERS) {
      for (const text of [problem, help]) {
        assert.ok(text.length <= 90, text);
        assert.doesNotMatch(text, /—|\bAI\b/);
      }
    }
  });

  it("LakeBed stays a server component and tags plates, labels and cracks for CSS", () => {
    const src = read("components/visuals/LakeBed.tsx");
    assert.doesNotMatch(src, /"use client"/);
    assert.match(src, /className="lb-plate" data-plate=\{i\}/);
    assert.match(src, /data-plates=\{LAKEBED_LINK_PLATES\[i\]\.join\(" "\)\}/);
    assert.match(src, /data-plate=\{i\}\s*style=/);
  });

  it("the interaction island uses real buttons with hover, focus and a native popover per plate", () => {
    const src = read("components/visuals/LakeBedInteractive.tsx");
    assert.match(src, /^"use client";/);
    assert.match(src, /<button[\s\S]*type="button"/);
    for (const handler of ["onPointerEnter", "onPointerLeave", "onFocus", "onBlur"]) assert.match(src, new RegExp(handler));
    // Click, click-again, outside click, Escape and one-at-a-time come from popover="auto".
    assert.match(src, /popoverTarget=\{cardId\}/);
    assert.match(src, /popover="auto"/);
    assert.match(src, /aria-expanded=\{open === i\}/);
  });

  it("the hero passes the server-rendered picture into the island, both variants", () => {
    const hero = code("components/sections/Hero.tsx");
    assert.match(hero, /<LakeBedInteractive[\s\S]*?>\s*<LakeBed \/>\s*<\/LakeBedInteractive>/);
    assert.match(hero, /<LakeBedInteractive variant="phone">\s*<LakeBed variant="phone" \/>\s*<\/LakeBedInteractive>/);
  });

  it("CSS highlights only with opacity, filter and stroke-width, and has a visible focus ring", () => {
    const css = read("app/public-site.css");
    const at = css.indexOf("LAKE BED INTERACTION");
    // The card (.lb-pop) animates in; the picture itself never moves, so only the picture is checked.
    const block = css.slice(at, css.indexOf("reduced motion ----", at)).replace(/[^{}]*\.lb-pop[^{}]*\{[^}]*\}/g, "");
    assert.doesNotMatch(block, /transform:(?!\s*translate\(-50%, -50%\))/);
    assert.match(block, /\.lb-hit:focus-visible \.lb-hit-mark \{\s*outline: 2px solid/);
    for (let i = 0; i < LAKEBED_PLATES.length; i += 1) assert.match(block, new RegExp(`\\.lb-ix\\[data-active="${i}"\\]`));
  });
});
