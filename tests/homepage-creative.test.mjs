/*
 * PR 2 "Drylake Homepage Creative Direction" (2026-10-07): pins the decisions that make the
 * Horizon homepage safe to keep changing.
 *   - nav targets (#solutions, #approach, #about) and the chapter ids still exist, once each;
 *   - the hero is type, not imagery (no <img>, <Image>, <picture>, background url);
 *   - every "Start a conversation" on the homepage and footer is the canonical PrimaryCta;
 *   - service rows link only to routes that exist;
 *   - every motion has a reduced-motion / no-JS resting state;
 *   - no em dash and no invented proof in the changed files;
 *   - the diagrams draw the canonical wordmark, never "Drylake" as plain diagram text.
 * node:test, source-level like the rest of tests/. No new dependencies.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { SERVICES } from "../lib/discovery/services.ts";
import { PROBLEM_FRAGMENTS, SYSTEM_NODES } from "../components/visuals/horizon-geometry.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");

const PAGE = read("app/page.tsx");
const HOME_SECTIONS = [...PAGE.matchAll(/from "@\/components\/sections\/(\w+)"/g)].map((m) => `components/sections/${m[1]}.tsx`);

const CHANGED = [
  "app/page.tsx",
  "components/sections/Hero.tsx",
  "components/sections/Problems.tsx",
  "components/sections/Integrations.tsx",
  "components/sections/WhatWeDo.tsx",
  "components/sections/Production.tsx",
  "components/sections/Founders.tsx",
  "components/sections/FAQ.tsx",
  "components/sections/ContactCTA.tsx",
  "components/layout/Footer.tsx",
  "components/visuals/LakeBed.tsx",
  "components/visuals/lakebed-geometry.ts",
  "components/visuals/FragmentField.tsx",
  "components/visuals/SystemsStage.tsx",
  "components/visuals/horizon-geometry.ts",
  "app/public-site.css",
  "components/motion/ScrollProgress.tsx",
];

describe("homepage composition", () => {
  it("renders the chapters in the designed order", () => {
    const body = PAGE.slice(PAGE.indexOf("<main"), PAGE.indexOf("</main>"));
    const order = [...body.matchAll(/<([A-Z]\w+)\b/g)].map((m) => m[1]);
    // Experience polish: no AI chapter; the FAQ sits inside the closing conversation.
    assert.deepEqual(order, [
      "Hero", "Problems", "Integrations", "WhatWeDo", "Production",
      "Founders", "Approach", "ContactCTA", "FAQ",
    ]);
    assert.match(body, /<ContactCTA aside=\{<FAQ \/>\} \/>/);
  });

  it("keeps every section id the navigation and the page use, exactly once", () => {
    const all = HOME_SECTIONS.map(code).join("\n");
    for (const id of ["problems", "solutions", "approach", "faq"]) {
      assert.equal((all.match(new RegExp(`id="${id}"`, "g")) ?? []).length, 1, id);
    }
    // Founders renders id="about" on the homepage and id="founders" at the top of /about.
    assert.match(code("components/sections/Founders.tsx"), /id=\{page \? "founders" : "about"\}/);
  });

  it("main clips without becoming a scroll container (pinned chapters need sticky)", () => {
    assert.match(PAGE, /<main id="main-content"[^>]*className="overflow-clip/);
    for (const file of ["components/sections/Problems.tsx", "components/sections/Integrations.tsx"]) {
      assert.match(code(file), /<section[^>]*overflow-clip/, file);
      assert.ok(!/<section[^>]*overflow-hidden/.test(code(file)), file);
    }
  });

  it("keeps the FAQPage schema and the FAQ section on the homepage", () => {
    assert.match(PAGE, /faqNode\("\/", faqs\)/);
    assert.match(PAGE, /<FAQ \/>/);
  });
});

describe("the hero is drawn, not photographed", () => {
  const hero = ["components/sections/Hero.tsx", "components/visuals/LakeBed.tsx"].map(code).join("\n");

  it("has no image of any kind (only in-document SVG references such as url(#lb-tile))", () => {
    assert.ok(!/<img\b|<Image\b|<picture\b|next\/image|backgroundImage|url\((?!#)/.test(hero));
  });

  it("holds the headline as a server-rendered h1 that paints in place (no entrance animation)", () => {
    const source = code("components/sections/Hero.tsx");
    assert.ok(!source.startsWith('"use client"'), "Hero stays a server component");
    assert.equal((source.match(/<h1\b/g) ?? []).length, 1);
    assert.match(source, /Technology that makes[\s\S]*running your business easier\./);
    // No entrance animation on the headline at all (PR 3: the delayed line was the LCP element).
    assert.ok(!/<h1[^>]*dl-fade/.test(source));
  });
});

describe("calls to action", () => {
  it("every 'Get Started for Free' on the homepage and footer is a PrimaryCta", () => {
    for (const file of [...HOME_SECTIONS, "components/layout/Footer.tsx"]) {
      const source = code(file);
      for (const match of source.matchAll(/Get Started for Free/g)) {
        const after = source.slice(match.index + match[0].length, match.index + match[0].length + 40);
        // PR 3: the ending's eyebrow label shares the CTA's sentence case; it is a heading label,
        // not an action, so it may sit in a .section-label paragraph.
        const before = source.slice(Math.max(0, match.index - 240), match.index);
        const eyebrow = /className="section-label[^"]*"[^<]*>(?:(?!<\/p>)[\s\S])*$/.test(before) && /^\s*<\/p>/.test(after);
        assert.ok(eyebrow || /^\s*<\/PrimaryCta>/.test(after), `${file}: "Get Started for Free" outside PrimaryCta`);
      }
    }
    assert.match(code("components/sections/ContactCTA.tsx"), /Have a problem[\s\S]*worth fixing\?/);
  });
});

describe("service rows", () => {
  const source = code("components/sections/WhatWeDo.tsx");
  const hrefs = [...source.matchAll(/href(?:: |=)"([^"]+)"/g)].map((m) => m[1]);

  it("are the five services in plain words, websites first, with no em dash in the labels", () => {
    const names = [...source.matchAll(/name: "([^"]+)"/g)].map((m) => m[1]);
    // Plain-English messaging (2026-10-13): visitors could not tell Drylake builds websites.
    assert.deepEqual(names, ["Websites", "Custom Software & Apps", "Business Automation", "Connecting Your Systems", "AI for Business"]);
    assert.ok(names.every((name) => !name.includes("\u2014")));
  });

  it("link only to routes that exist", () => {
    const slugs = new Set(SERVICES.map((service) => service.slug));
    assert.ok(hrefs.length >= 7, hrefs.join(", "));
    for (const href of hrefs) {
      const service = href.match(/^\/services\/([\w-]+)$/);
      if (service) {
        assert.ok(slugs.has(service[1]), href);
      } else {
        assert.ok(existsSync(join(ROOT, "app", href, "page.tsx")), href);
      }
    }
  });

  it("never rely on hover: focus-visible mirrors every hover cue", () => {
    const css = read("app/public-site.css");
    assert.match(css, /@media \(hover: hover\)[\s\S]*\.hz-row:hover \.hz-row-line/);
    assert.match(css, /\.hz-row:focus-visible \.hz-row-line/);
    assert.match(css, /\.hz-row:focus-visible \{\s*outline: var\(--focus-ring-width\) solid var\(--focus-ring\)/);
  });
});

describe("motion has a readable resting state", () => {
  it("ScrollProgress renders a server value and never attaches under reduced motion", () => {
    const sp = code("components/motion/ScrollProgress.tsx");
    assert.match(sp, /prefers-reduced-motion: reduce\)"\)\.matches\)\s*\{\s*return;/);
    assert.match(sp, /style=\{\{ "--p": rest \}/);
    assert.match(code("components/sections/Problems.tsx"), /<ScrollProgress rest=\{0\}/);
    assert.match(code("components/sections/Integrations.tsx"), /<ScrollProgress rest=\{1\}/);
  });

  it("the hero ships no client JavaScript (server components, CSS-only timeline)", () => {
    for (const file of ["components/sections/Hero.tsx", "components/visuals/LakeBed.tsx"]) {
      assert.ok(!read(file).startsWith('"use client"'), file);
      assert.ok(!/useEffect|useState|addEventListener/.test(code(file)), file);
    }
  });

  it("app/public-site.css stops its load animations under reduced motion", () => {
    const css = read("app/public-site.css");
    const rm = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    for (const name of [".lb-plate", ".lb-fill", ".lb-link", ".lb-label", ".lb-note", ".hz-row-name"]) {
      assert.ok(rm.includes(name), name);
    }
  });

  it("each story visual has a text caption, so nothing is conveyed only by motion", () => {
    assert.match(code("components/visuals/FragmentField.tsx"), /<figcaption/);
    assert.match(code("components/sections/Integrations.tsx"), /<figcaption/);
    // Hero caption is rendered by the interaction island (final corrections 2026-10-13).
    assert.match(code("components/visuals/LakeBedInteractive.tsx"), /<figcaption/);
    for (const file of ["components/visuals/FragmentField.tsx", "components/visuals/SystemsStage.tsx", "components/visuals/LakeBed.tsx"]) {
      assert.match(code(file), /aria-hidden="true"/, file);
    }
  });
});

describe("Horizon geometry", () => {
  it("uses the fragments and systems named in the brief", () => {
    assert.deepEqual(
      PROBLEM_FRAGMENTS.map((f) => f.label).sort(),
      ["CRM", "PDF", "copy → paste", "customer data", "email", "follow-up", "invoice", "manual approval", "payments", "spreadsheet.xlsx", "staff", "website"].sort()
    );
    assert.deepEqual(
      SYSTEM_NODES.map((n) => n.label),
      ["Website", "Customer details", "Emails", "Customers", "Bookkeeping", "Documents", "Payments", "Team"]
    );
    for (const node of SYSTEM_NODES) {
      for (const v of [node.d.fx, node.d.fy, node.m.fx, node.m.fy, node.d.sx, node.m.sx]) {
        assert.ok(v > 0 && v < 100, `${node.label} ${v}`);
      }
    }
  });
});

describe("brand and honesty", () => {
  it("diagrams draw the canonical wordmark, never 'Drylake' as diagram text", () => {
    assert.match(code("components/visuals/SystemsStage.tsx"), /<DrylakeWordmark lockup[^>]*label=\{null\}/);
    assert.match(code("components/layout/Footer.tsx"), /aria-hidden="true"[^>]*>\s*<DrylakeWordmark[^>]*label=\{null\}/);
    for (const file of CHANGED.filter((f) => f.endsWith(".tsx"))) {
      assert.ok(!/>\s*Drylake\s*</.test(code(file)), file);
    }
  });

  it("no em dash anywhere in the changed files", () => {
    for (const file of CHANGED) assert.ok(!read(file).includes("—"), file);
  });

  it("no invented proof (clients, testimonials, ratings, counts) in the changed files", () => {
    const INVENTED =
      /testimonial|case stud|our clients|trusted by|\bawards?\b|award-winning|\brated\b|star rating|customer reviews|\d+\s*%|\d+\+?\s+(clients|projects|businesses|customers|years)/i;
    // Visitor-facing markup only (ScrollProgress holds an IntersectionObserver "25%" margin).
    for (const file of CHANGED.filter((f) => /^components\/(sections|layout|visuals)\/.*\.tsx$/.test(f))) {
      const match = code(file).match(INVENTED);
      assert.equal(match, null, `${file}: ${match?.[0]}`);
    }
  });

  it("founder facts are unchanged", () => {
    const founders = read("components/sections/Founders.tsx");
    assert.match(founders, /Master of Project Management/);
    assert.ok(!/\(IT\)/.test(founders));
  });
});
