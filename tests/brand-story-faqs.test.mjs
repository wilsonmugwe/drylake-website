/*
 * Brand story + FAQs (2026-10-16). Pins:
 *   FAQ DATA   every required question by id; unique ids; four categories; homepage subset of 5.
 *   HONESTY    no fabricated clients/results/ratings/certifications, no "guarantee", no fixed
 *              timelines, no promise of IP ownership, no published price.
 *   JSON-LD    FAQPage on /faq and the homepage equals the visible Q&A (same source array).
 *   SURFACES   /faq in the sitemap source, footer, llms.txt, llms-full.txt; share card exists.
 *   COPY       no em dashes in visitor-facing strings; brand story on /about and homepage; the
 *              homepage hero still says websites, software and automation.
 *   WEIGHT     new content is server components (no "use client", no new client imports).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  APPROACH_UNDERSTAND_FIRST,
  BRAND_STORY_PARAGRAPHS,
  BRAND_STORY_SHORT,
  BRAND_STORY_STEPS,
  PHILOSOPHY,
  TAGLINE,
} from "../lib/brand-story.ts";
import { PUBLIC_PAGES } from "../lib/discovery/entity.ts";
import { llmsFullText, llmsText } from "../lib/discovery/llms.ts";
import { faqNode } from "../lib/discovery/structured-data.ts";
import { FAQ_CATEGORIES, FAQ_ITEMS, HOMEPAGE_FAQ_IDS, REQUIRED_FAQ_IDS, faqs } from "../lib/faqs.ts";
import { FOOTER_COLUMNS } from "../lib/navigation/services-menu.ts";
import { PAGE_SEO } from "../lib/seo-pages.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");

const EM_DASH = "—";

describe("FAQ data", () => {
  it("covers every required question by id, with no duplicates", () => {
    const ids = FAQ_ITEMS.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length, "unique ids");
    for (const id of REQUIRED_FAQ_IDS) assert.ok(ids.includes(id), `missing FAQ ${id}`);
    assert.equal(new Set(FAQ_ITEMS.map((item) => item.question)).size, FAQ_ITEMS.length, "unique questions");
  });

  it("groups every item into one of the four categories, all non-empty", () => {
    assert.deepEqual(FAQ_CATEGORIES.map((c) => c.id), ["services", "pricing-delivery", "security-privacy", "collaboration"]);
    for (const category of FAQ_CATEGORIES) {
      assert.ok(FAQ_ITEMS.some((item) => item.category === category.id), category.id);
    }
    for (const item of FAQ_ITEMS) assert.ok(FAQ_CATEGORIES.some((c) => c.id === item.category), item.id);
  });

  it("keeps the five most important questions on the homepage, drawn from the same source", () => {
    assert.equal(faqs.length, 5);
    assert.equal(HOMEPAGE_FAQ_IDS.length, 5);
    for (const [index, id] of HOMEPAGE_FAQ_IDS.entries()) {
      const item = FAQ_ITEMS.find((entry) => entry.id === id);
      assert.deepEqual(faqs[index], { question: item.question, answer: item.answer });
    }
  });

  it("states the consultation rules the booking system enforces", () => {
    const answer = FAQ_ITEMS.find((item) => item.id === "price-consultation").answer;
    for (const fact of ["free", "30 minutes", "Monday, Tuesday or Friday", "9:00 am and 5:00 pm Perth time", "Microsoft Teams or phone", "2 hours"]) {
      assert.ok(answer.includes(fact), fact);
    }
  });
});

describe("FAQ honesty", () => {
  const text = FAQ_ITEMS.map((item) => `${item.question} ${item.answer}`).join("\n");

  it("makes no forbidden claim", () => {
    for (const pattern of [
      /guarantee/i,
      /\bwarrant(y|ies)\b/i,
      /\btrusted by\b/i,
      /\bour clients\b/i,
      /\bcase stud/i,
      /\d+\s*(stars?|reviews?|ratings?)/i,
      /\b(ISO|SOC)\s?[0-9]/i,
      /certified/i,
      /accredited/i,
      /award/i,
      /\$\s?\d/,
      /\bA?UD\s?\d/,
    ]) {
      assert.doesNotMatch(text, pattern, String(pattern));
    }
    // A stated duration is allowed only for the booking window (28 days ahead), never for a project.
    const projectText = FAQ_ITEMS.filter((item) => item.id !== "price-consultation").map((i) => i.answer).join("\n");
    assert.doesNotMatch(projectText, /\b\d+\s*(business\s+)?(days?|weeks?|months?)\b/i);
  });

  it("does not promise the client owns the work", () => {
    assert.doesNotMatch(text, /you (will )?own|you keep (all )?(the )?(ownership|rights|IP)|full ownership|own (all|the) (code|ip|work)/i);
    const ownership = FAQ_ITEMS.find((item) => item.id === "price-ownership").answer;
    assert.match(ownership, /proposal and agreement/);
    assert.match(ownership, /do not assume/);
  });

  it("gives no fixed timeline and says the proposal states it", () => {
    const length = FAQ_ITEMS.find((item) => item.id === "price-length").answer;
    assert.match(length, /depends on the scope/);
    assert.match(length, /proposal/);
  });

  it("describes BRONNIE as in development, not production-ready, pilots by discussion", () => {
    const answer = FAQ_ITEMS.find((item) => item.id === "collab-bronnie").answer;
    for (const fact of ["in development", "customer operations", "enquiry handling", "routing", "appointment coordination", "not production-ready", "by discussion"]) {
      assert.ok(answer.includes(fact), fact);
    }
  });

  it("points proposals at /collaborate only while that route exists (PR #86), else the contact page", () => {
    const routeExists = existsSync(join(ROOT, "app/collaborate/page.tsx"));
    const mentions = /\/collaborate/.test(text);
    const submit = FAQ_ITEMS.find((item) => item.id === "collab-submit").answer;
    if (routeExists) {
      assert.match(submit, /drylake\.com\.au\/collaborate/);
      assert.match(submit, /not a formal partnership/);
    } else {
      assert.equal(mentions, false);
      assert.match(submit, /contact page/);
    }
  });

  it("makes only verifiable security claims", () => {
    const security = FAQ_ITEMS.filter((item) => item.category === "security-privacy").map((i) => i.answer).join("\n");
    assert.match(security, /TLS/);
    assert.doesNotMatch(security, /military|bank-grade|unhackable|100% secure|SOC|ISO|penetration|pen test|insured|breach-proof|AU-hosted|Australian data/i);
  });
});

describe("FAQ structured data", () => {
  it("the /faq page builds FAQPage JSON-LD from the same array it renders", () => {
    const page = code("app/faq/page.tsx");
    assert.match(page, /faqNode\(SEO\.path, FAQ_ITEMS\)/);
    assert.match(page, /FAQ_ITEMS\.filter\(\(item\) => item\.category === category\.id\)/);
    assert.match(page, /\{item\.question\}/);
    assert.match(page, /\{item\.answer\}/);
  });

  it("JSON-LD equals the visible Q&A, in order, for the page", () => {
    const node = faqNode("/faq", FAQ_ITEMS);
    assert.equal(node["@type"], "FAQPage");
    assert.deepEqual(
      node.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]),
      FAQ_ITEMS.map((item) => [item.question, item.answer]),
    );
  });

  it("renders as native details/summary, server side", () => {
    const page = code("app/faq/page.tsx");
    assert.match(page, /<details /);
    assert.match(page, /<summary /);
    assert.doesNotMatch(read("app/faq/page.tsx"), /"use client"/);
  });

  it("FAQPage markup exists only on the homepage, /faq and service pages", () => {
    assert.match(code("app/page.tsx"), /faqNode\("\/", faqs\)/);
    for (const rel of ["app/about/page.tsx", "app/contact/page.tsx", "app/consultation/page.tsx", "app/privacy/page.tsx", "app/terms/page.tsx"]) {
      assert.doesNotMatch(code(rel), /faqNode/, rel);
    }
  });
});

describe("/faq discoverability", () => {
  it("is in the sitemap source with its own search copy and share card", () => {
    assert.ok(PUBLIC_PAGES.some((page) => page.path === "/faq"));
    assert.equal(PAGE_SEO.faq.path, "/faq");
    assert.ok(statSync(join(ROOT, "public/og/faq.png")).size > 1000);
  });

  it("is linked from the footer Company column", () => {
    const company = FOOTER_COLUMNS.find((column) => column.title === "Company");
    assert.ok(company.links.some((link) => link.href === "/faq"));
  });

  it("is listed in llms.txt and every answer appears in llms-full.txt", () => {
    assert.match(llmsText(), /\(https:\/\/drylake\.com\.au\/faq\)/);
    const full = llmsFullText();
    for (const item of FAQ_ITEMS) {
      assert.ok(full.includes(`Q: ${item.question}`), item.id);
      assert.ok(full.includes(`A: ${item.answer}`), item.id);
    }
  });
});

describe("brand story", () => {
  it("uses the owner-approved philosophy and tagline verbatim", () => {
    assert.equal(PHILOSOPHY, "Strip it back. Find the cracks. Build back better.");
    assert.equal(TAGLINE, "See what lies beneath. Build what comes next.");
  });

  it("explains the name, the metaphor, understanding first and the approach", () => {
    const story = BRAND_STORY_PARAGRAPHS.join(" ");
    for (const fact of ["lake dries", "ground underneath", "cracks", "hidden inefficiencies", "disconnected systems", "repetitive processes", "outdated technology", "temporary workarounds", "understanding comes before recommending", "not add complexity"]) {
      assert.ok(story.toLowerCase().includes(fact.toLowerCase()), fact);
    }
    assert.equal(BRAND_STORY_STEPS.length, 3);
  });

  it("appears on /about (full) and the homepage (short, below the hero), once each", () => {
    const about = code("app/about/page.tsx");
    assert.equal((about.match(/<BrandStory/g) ?? []).length, 1);
    assert.match(about, /<BrandStory variant="page" \/>/);

    const home = code("app/page.tsx");
    assert.equal((home.match(/<BrandStory/g) ?? []).length, 1);
    assert.ok(home.indexOf("<Hero />") < home.indexOf("<BrandStory />"));
    assert.ok(home.indexOf("<BrandStory />") < home.indexOf("<Approach />"));
  });

  it("leaves the homepage hero saying websites, software and automation", () => {
    const hero = code("components/sections/Hero.tsx");
    assert.match(hero, /We build websites, business software and automation tools/);
    assert.doesNotMatch(hero, /BrandStory|called Drylake/i);
  });

  it("ties the Approach to understanding first, without touching its pinned lede", () => {
    assert.match(code("components/sections/Approach.tsx"), /APPROACH_UNDERSTAND_FIRST/);
    assert.match(APPROACH_UNDERSTAND_FIRST, /understanding the problem/);
  });

  it("does not change the founders' facts", () => {
    const founders = read("components/sections/Founders.tsx");
    assert.match(founders, /name: "Benedict Wambugu"/);
    assert.match(founders, /name: "Wilson Mugwe"/);
  });
});

describe("decorative texture", () => {
  const svg = read("components/brand/DryLakebedTexture.tsx");

  it("is aria-hidden, static and small", () => {
    assert.match(svg, /aria-hidden="true"/);
    assert.match(svg, /focusable="false"/);
    assert.doesNotMatch(svg, /animate|@keyframes|<image|\.jpg|\.png|\.webp|use client/);
    assert.ok(Buffer.byteLength(svg) < 3500, "inline SVG source stays under ~3 KB");
  });
});

describe("no client JS added", () => {
  it("the client FAQ accordion takes its items as props and never imports the large FAQ module", () => {
    const faq = code("components/sections/FAQ.tsx");
    assert.doesNotMatch(faq, /from "@\/lib\/faqs"/);
    assert.match(faq, /items\.map\(/);
    assert.match(code("app/page.tsx"), /<FAQ items=\{faqs\} \/>/);
  });

  it("new sections are server components", () => {
    for (const rel of ["components/sections/BrandStory.tsx", "components/brand/DryLakebedTexture.tsx", "app/faq/page.tsx"]) {
      assert.doesNotMatch(read(rel), /["']use client["']/, rel);
    }
  });
});

describe("no em dashes in visitor-facing strings", () => {
  it("FAQ, brand story and search copy contain none", () => {
    const strings = [
      ...FAQ_ITEMS.flatMap((item) => [item.question, item.answer]),
      ...FAQ_CATEGORIES.flatMap((c) => [c.title, c.intro]),
      ...BRAND_STORY_PARAGRAPHS,
      ...BRAND_STORY_STEPS.flatMap((s) => [s.title, s.text]),
      BRAND_STORY_SHORT,
      PHILOSOPHY,
      TAGLINE,
      APPROACH_UNDERSTAND_FIRST,
      PAGE_SEO.faq.title,
      PAGE_SEO.faq.description,
      PAGE_SEO.faq.shareDescription,
      PAGE_SEO.faq.imageAlt,
    ];
    for (const s of strings) assert.ok(!s.includes(EM_DASH), s);
  });

  it("the new components and page contain none outside comments", () => {
    for (const rel of ["components/sections/BrandStory.tsx", "components/brand/DryLakebedTexture.tsx", "app/faq/page.tsx"]) {
      assert.ok(!code(rel).includes(EM_DASH), rel);
    }
  });
});
