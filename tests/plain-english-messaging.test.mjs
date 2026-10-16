/*
 * Plain-English messaging, value examples and privacy (2026-10-13).
 *
 * Why: people who visited the site could not say what Drylake does. The hero now says it, five
 * services are named in everyday words, and time/cost figures make the value concrete. Figures
 * are ILLUSTRATIVE CALCULATIONS (lib/value-examples.ts), so this file recomputes every one from
 * its stated assumptions and bans the phrasings that would turn an example into a promise.
 * The street address on the Privacy Policy was a residence; this file fails if any street
 * address reappears in source or, when a build exists, in the served HTML.
 * Run: npm test
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { BUSINESS_PROBLEMS } from "../lib/discovery/problems.ts";
import { SERVICES } from "../lib/discovery/services.ts";
import { faqs } from "../lib/faqs.ts";
import { computeFigure, VALUE_EXAMPLE_NOTE, VALUE_EXAMPLES } from "../lib/value-examples.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (file) => readFileSync(join(ROOT, file), "utf8");

function walk(dir, exts) {
  const out = [];
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return out;
  for (const entry of readdirSync(abs)) {
    const rel = join(dir, entry);
    const full = join(ROOT, rel);
    if (statSync(full).isDirectory()) out.push(...walk(rel, exts));
    else if (exts.some((ext) => entry.endsWith(ext))) out.push(rel);
  }
  return out;
}

/* Visitor-facing source: public pages, public sections, the copy data files. Portal/admin excluded. */
const PUBLIC_COPY = [
  ...walk("components/sections", [".tsx"]),
  "components/layout/Footer.tsx",
  "app/page.tsx",
  "app/about/page.tsx",
  "app/contact/page.tsx",
  "app/perth/page.tsx",
  "app/services/page.tsx",
  "app/services/[slug]/page.tsx",
  "app/solutions/page.tsx",
  "lib/discovery/services.ts",
  "lib/discovery/problems.ts",
  "lib/discovery/entity.ts",
  "lib/faqs.ts",
  "lib/seo-pages.ts",
  "lib/value-examples.ts",
];

describe("value examples are calculations, not results", () => {
  const examples = Object.values(VALUE_EXAMPLES);

  it("every figure is recomputed from its own assumptions", () => {
    for (const example of examples) {
      assert.ok(example.text.includes(example.figure), `${example.id}: text must contain the figure`);
      const expected = computeFigure(example.inputs);
      const stated = Number(example.figure.replace(/[$,]/g, "").match(/[\d.]+/)[0]);
      assert.equal(stated, expected, `${example.id}: figure ${stated} != computed ${expected}`);
    }
  });

  it("the brief's worked numbers hold", () => {
    assert.equal(computeFigure(VALUE_EXAMPLES.copying.inputs), 10); // 30 min x 20 days
    assert.equal(computeFigure(VALUE_EXAMPLES.reminders.inputs), 5); // 15 min x 20 days
    assert.equal(computeFigure(VALUE_EXAMPLES.staffCost.inputs), 10_400); // 5 h x 52 x $40
    assert.equal(computeFigure(VALUE_EXAMPLES.enquiries.inputs), 5); // 20 x 3 min x 5 days
    assert.equal(computeFigure(VALUE_EXAMPLES.doubleEntry.inputs), 80); // 20 min x 240 days
  });

  it("each example is conditional and states assumptions; staff cost is labelled as staff time", () => {
    for (const example of examples) {
      assert.match(example.text, /^If /, `${example.id} must start "If ..."`);
      assert.ok(example.assumptions.length > 10, `${example.id}: assumptions missing`);
    }
    assert.match(VALUE_EXAMPLES.staffCost.assumptions, /not guaranteed cash savings/);
    assert.match(VALUE_EXAMPLE_NOTE, /not results/);
  });

  it("no public copy turns an example into a promise", () => {
    const banned = [
      /\bwe (will )?save (you|every)/i,
      /\byou will save\b/i,
      /\bguarantee(d|s)? (savings|results|rankings|sales|return)/i,
      /\b\d{1,3}\s?% (faster|less|more|accurate|saving|reduction)/i,
      /\bincrease (your )?(revenue|sales) by\b/i,
      /\b(fully|completely) automat(e|ed|es) (every|all)\b/i,
      /\breduce (your )?staff(ing)?\b/i,
    ];
    for (const file of PUBLIC_COPY) {
      const source = read(file);
      for (const pattern of banned) assert.doesNotMatch(source, pattern, `${file}: ${pattern}`);
    }
  });

  it("every service page names a valid example", () => {
    for (const service of SERVICES) {
      assert.ok(VALUE_EXAMPLES[service.valueExample], `${service.slug}: unknown example ${service.valueExample}`);
    }
    assert.match(read("app/services/[slug]/page.tsx"), /VALUE_EXAMPLES\[service\.valueExample\]/);
  });
});

describe("plain English", () => {
  it("the hero h1 says what Drylake builds, with the two brief CTAs", () => {
    const hero = read("components/sections/Hero.tsx");
    const h1 = hero.slice(hero.indexOf("<h1"), hero.indexOf("</h1>"));
    assert.match(h1, /Technology that makes[\s\S]*running your business easier\./);
    assert.match(hero, /\{PRIMARY_CTA\.label\}\s*<\/PrimaryCta>/);
    assert.match(hero, /href="\/#solutions"[\s\S]*See what we build/);
  });

  it("the problem chapter's heading is the outcome (homepage clarity 2026-10-10)", () => {
    assert.match(read("components/sections/Problems.tsx"), /Less paperwork\.[\s\S]*Less chasing\.[\s\S]*More time for your business\./);
  });

  it("What We Do lists all five services, each linking to its own page", () => {
    const source = read("components/sections/WhatWeDo.tsx");
    const hrefs = [...source.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(hrefs, [
      "/services/web-development",
      "/services/custom-software-development",
      "/services/business-automation",
      "/services/systems-integration",
      "/services/ai-automation",
    ]);
  });

  it("no empty marketing phrases on public surfaces", () => {
    const empty = /cutting-edge|innovative solutions?|digital excellence|unlock(ing)? (your )?potential|seamless(ly)? transform|empowering businesses|next-generation|digital transformation|scalable enterprise architecture/i;
    for (const file of PUBLIC_COPY) assert.doesNotMatch(read(file), empty, file);
  });

  it("no em dash in the changed copy", () => {
    for (const file of PUBLIC_COPY) assert.ok(!read(file).includes("—"), file);
  });

  it("the FAQ answers 'what does Drylake do' and says websites are built on their own", () => {
    assert.equal(faqs[0].question, "What does Drylake actually do?");
    assert.ok(faqs.some((faq) => /standalone business websites/.test(faq.answer)));
  });
});

describe("problems are in the owner's words and every link lands", () => {
  it("every homepage problem anchor exists on /solutions", () => {
    const ids = new Set(BUSINESS_PROBLEMS.map((item) => item.id));
    const anchors = [...read("components/sections/Problems.tsx").matchAll(/anchor: "([^"]+)"/g)].map((m) => m[1]);
    assert.equal(anchors.length, 4);
    for (const anchor of anchors) assert.ok(ids.has(anchor), anchor);
  });

  it("covers the brief's situations, including websites, portals and starting with AI", () => {
    const problems = BUSINESS_PROBLEMS.map((item) => item.problem).join("\n");
    for (const phrase of [
      "better website that customers can actually use",
      "bookings and jobs through emails and spreadsheets",
      "same reminders and messages",
      "systems don't work together",
      "log in and check their information",
      "use AI but don't know where to start",
    ]) assert.ok(problems.includes(phrase), phrase);
  });
});

describe("no street address on any public surface", () => {
  // Joondalup removed 2026-10-16: a suburb name is a service area (PR 5), not a street address.
  const STREET = /Davidson|\b6027\b|\b\d+\/\d+\s+\w+\s+(Terrace|Street|St|Road|Rd|Avenue|Ave|Drive|Dr)\b/i;

  it("source: app, components, lib, public text files", () => {
    const files = [
      ...walk("app", [".ts", ".tsx", ".txt", ".md"]),
      ...walk("components", [".ts", ".tsx"]),
      ...walk("lib", [".ts", ".tsx", ".txt"]),
      ...walk("public", [".txt", ".json", ".xml", ".svg", ".webmanifest"]),
    ];
    for (const file of files) assert.doesNotMatch(read(file), STREET, file);
  });

  it("the Privacy Policy gives a city-level location only", () => {
    const page = read("app/privacy/page.tsx");
    assert.match(page, /PUBLIC_LOCATION/);
    assert.match(read("lib/site.ts"), /PUBLIC_LOCATION = "Perth, Western Australia, Australia"/);
    assert.doesNotMatch(read("lib/site.ts"), /POSTAL_ADDRESS/);
  });

  it("built HTML, when a production build exists", (t) => {
    const built = ".next/server/app";
    if (!existsSync(join(ROOT, built))) return t.skip("no .next build in this checkout");
    const html = walk(built, [".html", ".rsc", ".body", ".meta"]);
    assert.ok(html.length > 0);
    for (const file of html) assert.doesNotMatch(read(file), STREET, file);
  });
});
