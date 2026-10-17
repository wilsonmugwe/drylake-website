/*
 * Exposed Ground homepage (D54, stage 2, 2026-10-17). Pins what must survive later changes:
 * composition and section ids, the LCP rule, no new client JavaScript, the CTA honesty rule,
 * the One System tile used unchanged, the real product screen, honest copy, and the word budget
 * source (lib/home/copy.ts). The rendered word count is checked in tests/e2e (home words).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";

import * as COPY from "../lib/home/copy.ts";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");
const HOME_FILES = readdirSync(new URL("../components/home/", import.meta.url)).map((f) => `components/home/${f}`);

test("the hero headline paints on the first frame: no animation class on the h1 (LCP)", () => {
  const hero = code("components/home/HomeHero.tsx");
  const h1 = hero.slice(hero.indexOf("<h1"), hero.indexOf("</h1>"));
  assert.ok(h1.length > 0);
  assert.doesNotMatch(h1, /eg-rise|animate|InView|motion|opacity/);
  // Word boundaries between the poster lines, for search and AI extractors.
  assert.match(h1, /\{line\}\{" "\}/);
});

test("every homepage section is a server component (the tile's island is the only client code)", () => {
  for (const f of HOME_FILES) {
    assert.doesNotMatch(read(f), /["']use client["']/, f);
  }
});

test("both primary CTAs carry the free-consultation note beside them (ACL s18, checklist C1)", () => {
  for (const f of ["components/home/HomeHero.tsx", "components/home/HomeClose.tsx"]) {
    const src = code(f);
    assert.match(src, /<PrimaryCta[^>]*href=\{PRIMARY_CTA\.href\}/, f);
    assert.match(src, /\{PRIMARY_CTA_NOTE\}/, f);
  }
});

test("the closing section keeps the message route to the contact form", () => {
  assert.match(code("components/home/HomeClose.tsx"), /href=\{CONTACT_PATH\}/);
});

test("the One System tile is used exactly as before (component untouched, placement only)", () => {
  const stage = code("components/home/HomeSystem.tsx");
  assert.match(stage, /<LakeBedInteractive\s+caption=/);
  assert.match(stage, /<LakeBed \/>/);
  assert.match(stage, /<LakeBedInteractive variant="phone">/);
  assert.match(stage, /<LakeBed variant="phone" \/>/);
  assert.match(stage, /Quotes, invoices, scheduling, enquiries: held together by copy, paste and email\./);
});

test("the product screen is a real Workspace capture, not a mock, and says it uses sample data", () => {
  assert.ok(existsSync(new URL("../public/redesign/workspace-overview.png", import.meta.url)));
  const png = readFileSync(new URL("../public/redesign/workspace-overview.png", import.meta.url));
  assert.equal(png.readUInt32BE(16), 1600, "1600 px wide");
  assert.match(COPY.HOME_WORKSPACE.caption, /sample data/i);
  assert.match(COPY.HOME_WORKSPACE.imageAlt, /sample data/i);
  assert.match(read("docs/brand/asset-register.md"), /workspace-overview\.png/);
});

test("every copy string is rendered by a homepage component", () => {
  const src = HOME_FILES.map(code).join("\n");
  for (const name of ["HOME_HERO", "HOME_SYSTEM", "HOME_SERVICE_ROWS", "HOME_CRACKS", "HOME_APPROACH_LINES", "HOME_WORKSPACE", "HOME_FOUNDERS", "HOME_QUESTIONS", "HOME_CLOSE"]) {
    assert.ok(src.includes(name), `${name} is used`);
  }
});

test("homepage copy is honest and portfolio-clean", () => {
  const all = JSON.stringify(COPY);
  assert.ok(!all.includes("—"), "no em dashes");
  for (const banned of [/\bguarantee/i, /\b\d+%/, /clients? (love|trust)/i, /award/i, /\bbest\b/i, /\binc(luding)?[ -]GST\b/i]) {
    assert.ok(!banned.test(all), `no ${banned}`);
  }
  assert.ok(!/<img[^>]*(founder|wilson|benedict)/i.test(HOME_FILES.map(read).join("\n")), "no founder photographs");
});

test("the word budget lives in one place: the homepage copy module is short", () => {
  const words = JSON.stringify(COPY).replace(/[{}\[\]":,]/g, " ").split(/\s+/).filter((w) => /[a-z]/i.test(w));
  assert.ok(words.length < 330, `lib/home/copy.ts holds ${words.length} words (keys included)`);
});
