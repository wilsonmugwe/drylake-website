/*
 * Experience polish, public site (2026-10-07, brief sections 1-14 and 21-25). Pins the decisions
 * so the next change cannot quietly undo them:
 *   PUBLIC  the new hero (lake bed) renders the core proposition, server-only, LCP-safe; the AI
 *           chapter is gone from the homepage while AI stays a service everywhere discovery looks;
 *           problem, systems, production, founders, CTA and footer content all remain.
 *   ABOUT   "Small team. Direct access." is the h1 and Benedict and Wilson follow it directly,
 *           with their titles and facts unchanged; no drama-only spacing.
 *   MOTION  every story has a reduced-motion resting state; the two scroll stories resolve early
 *           (finish < 1) and the lake bed's timeline is finite.
 * node:test, source-level like the rest of tests/. No new dependencies.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  LAKEBED_CONNECTIONS,
  LAKEBED_JUNCTIONS,
  LAKEBED_PLATES,
  LAKEBED_WORKAROUNDS,
  lakebedPct,
} from "../components/visuals/lakebed-geometry.ts";
import { faqs } from "../lib/faqs.ts";
import { llmsFullText, llmsText } from "../lib/discovery/llms.ts";
import { SERVICES } from "../lib/discovery/services.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");
const CSS = read("app/public-site.css");
const PAGE = code("app/page.tsx");

const CHANGED = [
  "app/page.tsx",
  "app/about/page.tsx",
  "app/public-site.css",
  "components/sections/Hero.tsx",
  "components/sections/Problems.tsx",
  "components/sections/Integrations.tsx",
  "components/sections/WhatWeDo.tsx",
  "components/sections/Production.tsx",
  "components/sections/Founders.tsx",
  "components/sections/Approach.tsx",
  "components/sections/FAQ.tsx",
  "components/sections/ContactCTA.tsx",
  "components/layout/Footer.tsx",
  "components/visuals/LakeBed.tsx",
  "components/visuals/LakeField.tsx",
  "components/visuals/lakebed-geometry.ts",
  "components/visuals/horizon-geometry.ts",
  "components/visuals/SystemsStage.tsx",
  "components/motion/ScrollProgress.tsx",
];

describe("PUBLIC: the hero", () => {
  const hero = code("components/sections/Hero.tsx");
  const h1 = hero.match(/<h1\b[\s\S]*?<\/h1>/)?.[0] ?? "";

  it("keeps the core proposition as the one h1, painted in place (no entrance animation)", () => {
    assert.equal((hero.match(/<h1\b/g) ?? []).length, 1);
    assert.match(h1, /Technology that makes[\s\S]*running your business easier\./);
    assert.ok(!/dl-|lb-|animate-|opacity-0|--d"/.test(h1));
  });

  it("is the new lake-bed concept, not the old horizon ruler", () => {
    assert.match(hero, /<LakeBed \/>/);
    assert.ok(!existsSync(join(ROOT, "components/visuals/HorizonField.tsx")));
    assert.ok(!/HorizonField|hz-tick|hz-horizon/.test(hero + CSS));
  });

  it("says what Drylake does in an owner's words, next to a free primary action", () => {
    assert.match(hero, /We build websites, business software and automation tools that save time,\s+reduce manual work and help your business run smoothly\./);
    assert.match(hero, /<PrimaryCta href="\/contact"[^>]*>\s*Get Started for Free\s*<\/PrimaryCta>/);
    assert.match(hero, /caption=\{[\s\S]*Until they work together\./);
  });

  it("draws the resolved Drylake mark from the tile's own plates and ochre", () => {
    const lake = code("components/visuals/LakeBed.tsx");
    assert.match(lake, /TILE_PLATES\.map/);
    assert.match(lake, /TILE_OCHRE_PLATE \? TILE_OCHRE/);
    // Source-level (the .tsx module is JSX): one lake-bed plate per tile plate.
    const plates = read("components/brand/DrylakeMark.tsx").match(/TILE_PLATES = \[([\s\S]*?)\] as const/)[1].match(/"M/g).length;
    assert.equal(LAKEBED_PLATES.length, plates);
    assert.equal(LAKEBED_PLATES[3].label, "One system"); // the ochre plate
    assert.ok(!/#C2703D/i.test(lake), "ochre imported, never retyped");
  });

  it("geometry stays inside the picture", () => {
    for (const p of LAKEBED_PLATES) {
      assert.ok(p.lx > 4 && p.lx < 96 && p.ly > 4 && p.ly < 96, p.label);
      assert.ok(Math.abs(p.dx) <= 8 && Math.abs(p.dy) <= 8, `${p.label} drifts too far`);
    }
    for (const n of LAKEBED_WORKAROUNDS) assert.ok(n.x > 4 && n.x < 96 && n.y > 4 && n.y < 96, n.text);
    for (const [x, y] of LAKEBED_JUNCTIONS) assert.ok(x > 4 && x < 96 && y > 4 && y < 96);
    assert.ok(LAKEBED_CONNECTIONS.every((d) => /^M[\d.\s L]+$/.test(d)));
    assert.equal(lakebedPct(-6), 0);
    assert.equal(lakebedPct(106), 100);
  });

  it("the lake bed is the composition: a full-bleed field behind the type, no left/right split", () => {
    assert.match(hero, /<LakeField \/>/);
    assert.ok(!/lg:grid-cols-12/.test(hero), "no column split in the hero");
    const field = code("components/visuals/LakeField.tsx");
    assert.match(field, /preserveAspectRatio="xMidYMid slice"/);
    assert.match(field, /aria-hidden="true"/);
  });

  it("is a server component with a finite CSS timeline and no client JavaScript", () => {
    for (const file of ["components/sections/Hero.tsx", "components/visuals/LakeBed.tsx", "components/visuals/LakeField.tsx"]) {
      assert.ok(!read(file).startsWith('"use client"'), file);
    }
    const lb = CSS.slice(CSS.indexOf("/* ------------------------------------------------------------- lake bed ---- */"));
    const block = lb.slice(0, lb.indexOf("/* --------------------------------------------------------- problem field ---- */"));
    assert.ok(block.length > 200);
    assert.ok(!/infinite/.test(block), "no looping animation");
    assert.ok(!/\.hz-display[^{]*\{[^}]*opacity/.test(CSS), "no opacity rule on the headline");
  });

  it("is no longer a full-screen slide", () => {
    assert.ok(!/min-h-\[100svh\]/.test(hero));
  });

  it("never claims imagery it does not have (no photos, people or client work)", () => {
    const lake = code("components/visuals/LakeBed.tsx") + hero;
    assert.ok(!/<img\b|<Image\b|<picture\b|next\/image/.test(lake));
    assert.ok(!/client|testimonial|case stud/i.test(LAKEBED_PLATES.map((p) => p.label).join(" ")));
  });
});

describe("PUBLIC: homepage content", () => {
  it("the standalone AI chapter is gone from the homepage", () => {
    assert.ok(!existsSync(join(ROOT, "components/sections/AppliedAI.tsx")));
    assert.ok(!/AppliedAI|Applied AI/.test(PAGE));
  });

  it("AI stays a service: What We Do row, service page, llms files", () => {
    assert.match(code("components/sections/WhatWeDo.tsx"), /href: "\/services\/ai-automation"/);
    const ai = SERVICES.find((s) => s.slug === "ai-automation");
    assert.ok(ai, "ai-automation service exists");
    assert.ok(existsSync(join(ROOT, "app/services/[slug]/page.tsx")));
    assert.ok(llmsText().includes(ai.path), "llms.txt lists the AI service");
    assert.ok(llmsFullText().includes(ai.path), "llms-full.txt lists the AI service");
    assert.match(code("app/sitemap.ts"), /SERVICES|PUBLIC_PAGES/);
  });

  it("problem, systems, production, founders and the close all remain", () => {
    for (const name of ["Problems", "Integrations", "WhatWeDo", "Production", "Founders", "Approach", "ContactCTA"]) {
      assert.match(PAGE, new RegExp(`<${name}\\b`), name);
    }
    const production = code("components/sections/Production.tsx");
    for (const item of ["Secure login", "Who can see what", "Fewer mistakes", "Connected tools", "Keeping things running", "Backups and recovery"]) {
      assert.ok(production.includes(`name: "${item}"`), item);
    }
  });

  it("production is a list of layers, not boxes feeding a logo", () => {
    const production = code("components/sections/Production.tsx");
    assert.match(production, /<ol className="core-strata">/);
    assert.ok(!/<rect\b|TilePlates|<svg\b/.test(production));
  });

  it("the FAQ moved, it did not vanish: same data on the page and in FAQPage schema", () => {
    assert.match(PAGE, /faqNode\("\/", faqs\)/);
    assert.match(PAGE, /<ContactCTA aside=\{<FAQ \/>\} \/>/);
    const faq = code("components/sections/FAQ.tsx");
    assert.match(faq, /faqs\.map\(/);
    assert.match(faq, /\{faq\.question\}/);
    assert.match(faq, /\{faq\.answer\}/);
    assert.match(faq, /id="faq"/);
    assert.equal(faqs.length, 5);
  });

  it("the contact CTA keeps both direct lines and the canonical action", () => {
    const cta = code("components/sections/ContactCTA.tsx");
    assert.match(cta, /href=\{BUSINESS_PHONE\.href\}/);
    assert.match(cta, /mailto:hello@drylake\.com\.au/);
    assert.match(cta, /Get Started for Free\s*<\/PrimaryCta>/);
  });

  it("the footer keeps every corporate fact and every service link", () => {
    const footer = code("components/layout/Footer.tsx");
    for (const fact of ["ENTITY.legalName", "ENTITY.abn", "ENTITY.locality", "ENTITY.region", "new Date().getFullYear()"]) {
      assert.ok(footer.includes(fact), fact);
    }
    assert.match(footer, /SERVICES\.map\(/);
    assert.match(footer, /aria-label="Footer navigation"/);
  });
});

describe("ABOUT: founders first", () => {
  const about = code("app/about/page.tsx");
  const founders = code("components/sections/Founders.tsx");

  it("opens with the founders, whose heading is the page's h1", () => {
    const main = about.slice(about.indexOf("<main"));
    assert.match(main, /^<main[^>]*>\s*<Founders variant="page" \/>/);
    assert.ok(!/<h1\b/.test(about), "the h1 comes from Founders");
    assert.match(founders, /const Heading = page \? "h1" : "h2";/);
    assert.match(founders, /Small team\.[\s\S]*Direct access\./);
    assert.match(founders, /About \/ Founder-Led/);
  });

  it("names Benedict and Wilson with their real titles and facts", () => {
    const src = read("components/sections/Founders.tsx");
    assert.match(src, /name: "Benedict Wambugu"[\s\S]*role: "Co-founder & CEO"/);
    assert.match(src, /name: "Wilson Mugwe"[\s\S]*role: "Co-founder & Head of Technology"/);
    assert.match(src, /credential: "Master of Project Management"/);
    assert.ok(!/\(IT\)/.test(src));
    assert.match(src, /Bachelor of Computer Science, majoring in Software Engineering/);
  });

  it("heading levels never skip: names are h2 under the /about h1, h3 under the homepage h2", () => {
    assert.match(founders, /const NameTag = page \? "h2" : "h3";/);
    assert.match(founders, /<NameTag\b[^>]*>\s*\{founder\.name\}\s*<\/NameTag>/);
  });

  it("no photos (none are approved) and no generated faces", () => {
    assert.ok(!/<img\b|<Image\b|<picture\b|next\/image|\.jpg|\.png|\.webp/.test(founders));
  });

  it("each founder on /about carries its Person @id fragment", () => {
    assert.match(founders, /id=\{page \? founder\.name\.toLowerCase\(\)\.replace\(\/\\s\+\/g, "-"\) : undefined\}/);
    assert.match(read("lib/discovery/entity.ts"), /\/about#benedict-wambugu/);
  });

  it("no drama-only spacing: no viewport-height minimums on the page", () => {
    assert.ok(!/min-h-\[\d+(svh|vh|dvh)\]|sm:pt-44|lg:py-28/.test(about + founders));
  });

  it("keeps the company story, values and details below the founders", () => {
    for (const text of ["Built close to", "Tomorrow Starts Here.", "<CompanyDetails />", "<ServiceIndex", "<ContactCTA />"]) {
      assert.ok(about.includes(text), text);
    }
  });
});

describe("MOTION", () => {
  const problems = code("components/sections/Problems.tsx");
  const integrations = code("components/sections/Integrations.tsx");

  it("both scroll stories resolve early and hold (finish < 1)", () => {
    const finish = (src) => Number(src.match(/finish=\{([\d.]+)\}/)?.[1]);
    assert.ok(finish(problems) <= 0.5, "problems finish");
    // Mobile refinement 2026-10-07: the systems story was resolving too fast (finish 0.6); it now
    // resolves at 0.8 with a rest between its two movements (tests/mobile-hero-refinement).
    assert.ok(finish(integrations) <= 0.85, "systems finish");
    assert.match(code("components/motion/ScrollProgress.tsx"), /raw \/ finish/);
  });

  it("the problem sort starts as the field enters (no 58vh statements stretching the track)", () => {
    assert.ok(Number(problems.match(/start=\{([\d.]+)\}/)?.[1]) >= 0.85);
    assert.ok(Number(problems.match(/passStart=\{([\d.]+)\}/)?.[1]) >= 0.95);
    assert.ok(!/min-h-\[58vh\]/.test(problems));
  });

  it("the pinned systems track only exists when motion is allowed", () => {
    assert.ok(!/lg:h-\[250vh\]/.test(integrations));
    // 175vh (experience polish), 230vh (mobile refinement), 300vh (final refinement 2026-10-08: the
    // sequence read as too fast; each state now holds, in CSS only, never on reduced motion).
    assert.match(CSS, /@media \(min-width: 1024px\) and \(prefers-reduced-motion: no-preference\)\s*\{\s*\.hz-sys-track\s*\{\s*height:\s*300vh;/);
  });

  it("reduced motion stops every new animation and keeps readable resting states", () => {
    const rm = CSS.slice(CSS.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    for (const name of [".lb-plate", ".lb-fill", ".lb-link", ".lb-node", ".lb-label", ".lb-note"]) {
      assert.ok(rm.includes(name), name);
    }
    assert.match(code("components/motion/ScrollProgress.tsx"), /prefers-reduced-motion: reduce\)"\)\.matches\)\s*\{\s*return;/);
    // Production text is never hidden by its motion: the layers only move (transform), never fade.
    const pre = CSS.match(/\[data-inview="false"\] \.core-stratum \{([^}]*)\}/)?.[1] ?? "";
    assert.ok(!/opacity|visibility|display/.test(pre), pre);
  });

  it("motion is transform / opacity / fill / dash only on the new pieces (no layout properties)", () => {
    const keyframes = [...CSS.matchAll(/@keyframes lb-[\w-]+\s*\{([\s\S]*?)\n\}/g)].map((m) => m[1]).join("\n");
    assert.ok(keyframes.length > 50);
    assert.ok(!/\b(top|left|width|height|margin|padding)\s*:/.test(keyframes), keyframes);
  });
});

describe("honesty and copy rules in the changed files", () => {
  it("no em dash in any changed file", () => {
    for (const file of CHANGED) assert.ok(!read(file).includes("—"), file);
  });

  it("no GST wording and no invented proof in visitor-facing components", () => {
    const INVENTED =
      /testimonial|case stud|our clients|trusted by|\bawards?\b|award-winning|\brated\b|star rating|customer reviews|\d+\+?\s+(clients|projects|businesses|customers|years)/i;
    for (const file of CHANGED.filter((f) => /^components\/(sections|layout|visuals)\/.*\.tsx$/.test(f))) {
      const source = code(file);
      assert.equal(source.match(INVENTED), null, file);
      assert.ok(!/\bGST\b/.test(source), file);
    }
  });

  it("no homepage jargon an owner has to decode", () => {
    const home = ["Hero", "Problems", "Integrations", "WhatWeDo", "Production", "Founders", "Approach", "ContactCTA", "FAQ"]
      .map((n) => code(`components/sections/${n}.tsx`))
      .join("\n");
    assert.ok(!/\b(LLM|RAG|middleware|event-driven|agentic|synergy|cutting-edge|revolutionary|AI-powered)\b/i.test(home));
  });
});
