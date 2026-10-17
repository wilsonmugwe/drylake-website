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
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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
import { faqNode, founderNodes, organizationNode } from "../lib/discovery/structured-data.ts";
import { FOUNDERS } from "../lib/discovery/entity.ts";
import { QUOTE_FIRST } from "../lib/consultations/copy.ts";
import { SERVICES } from "../lib/discovery/services.ts";
import { LOCATION_PAGES, jaccard, locationShingles } from "../lib/service-area-pages.ts";
import { FAQ_CATEGORIES, FAQ_ITEMS, HOMEPAGE_FAQ_IDS, REQUIRED_FAQ_IDS, faqs } from "../lib/faqs.ts";
import { FOOTER_COLUMNS } from "../lib/navigation/services-menu.ts";
import { PAGE_SEO } from "../lib/seo-pages.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");

const EM_DASH = "—";

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" || entry.name === ".next" ? [] : listFiles(full);
    return /\.(ts|tsx|mjs|txt|json|md)$/.test(entry.name) ? [full] : [];
  });
}

describe("FAQ data", () => {
  it("covers every required question by id, with no duplicates", () => {
    const ids = FAQ_ITEMS.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length, "unique ids");
    for (const id of REQUIRED_FAQ_IDS) assert.ok(ids.includes(id), `missing FAQ ${id}`);
    assert.equal(new Set(FAQ_ITEMS.map((item) => item.question)).size, FAQ_ITEMS.length, "unique questions");
  });

  it("groups every item into one of the five categories, all non-empty", () => {
    assert.deepEqual(FAQ_CATEGORIES.map((c) => c.id), ["websites", "software", "ai-automation", "working-with-drylake", "security-privacy"]);
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
    const after = FAQ_ITEMS.find((item) => item.id === "web-after").answer;
    assert.match(after, /proposal and agreement/);
    assert.match(after, /do not assume/);
  });

  it("gives no fixed timeline and says the proposal states it", () => {
    const length = FAQ_ITEMS.find((item) => item.id === "web-time").answer;
    assert.match(length, /depends on the scope/);
    assert.match(length, /proposal/);
  });

  it("quotes first: never a price, and the approved quote-first wording on the cost answers", () => {
    for (const id of ["web-cost", "sw-cost", "start"]) {
      assert.ok(FAQ_ITEMS.find((item) => item.id === id).answer.includes(QUOTE_FIRST), id);
    }
  });

  it("makes no search-ranking promise", () => {
    const google = FAQ_ITEMS.find((item) => item.id === "web-google").answer;
    assert.match(google, /nobody can promise a ranking/);
    assert.doesNotMatch(text, /first page|page one|#1|top of google|rank(ing)? (higher|first)/i);
  });

  it("states the AI privacy position as an approach, not a promise", () => {
    const ai = FAQ_ITEMS.find((item) => item.id === "ai-privacy").answer;
    /* Owner brief 2026-10-16: qualified after auditing the data flows (assistant off in production,
       no other AI dependency); Australian hosting depends on provider and model. */
    assert.match(ai, /does not currently send your information to an AI service/);
    assert.match(ai, /Some providers offer Australian hosting for some models/);
    assert.doesNotMatch(ai, /always|never leaves|fully|100%/i);
  });

  it("describes BRONNIE with the owner sentence verbatim and claims nothing shipped", () => {
    const answer = FAQ_ITEMS.find((item) => item.id === "collab-bronnie").answer;
    assert.ok(answer.startsWith("BRONNIE is an AI-powered platform being developed by Drylake."));
    for (const fact of ["no BRONNIE feature is generally available", "multi-tenant", "customer operations", "enquiry handling", "routing", "appointment coordination", "by discussion"]) {
      assert.ok(answer.includes(fact), fact);
    }
    assert.doesNotMatch(answer, /launched|live now|paying customers|completed pilot|results|exclusive|owns the IP/i);
  });

  it("points proposals at /collaborate only while that route exists (PR #86), else the contact page", () => {
    const routeExists = existsSync(join(ROOT, "app/collaborate/page.tsx"));
    const mentions = /\/collaborate/.test(text);
    const submit = FAQ_ITEMS.find((item) => item.id === "collab-work").answer;
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
    assert.doesNotMatch(security, /military|bank-grade|unhackable|100% secure|\bSOC\b|\bISO\b|penetration|pen test|insured|breach-proof|AU-hosted|Australian data/i);
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

  // Exposed Ground (D54): FAQ moved out of the header into the footer's Help column.
  it("is linked from the footer Help column", () => {
    const help = FOOTER_COLUMNS.find((column) => column.title === "Help");
    assert.ok(help.links.some((link) => link.href === "/faq"));
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
    // superseded by tests/home-exposed-ground.test.mjs (Exposed Ground homepage, D54, 2026-10-17)
    const about = code("app/about/page.tsx");
    assert.equal((about.match(/<BrandStory/g) ?? []).length, 1);
    assert.match(about, /<BrandStory variant="page" \/>/);
    assert.match(code("components/home/HomeCracks.tsx"), /PHILOSOPHY_STEPS\.map/);
    assert.match(code("components/home/HomeClose.tsx"), /TAGLINE/);
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

  it("uses the owner-confirmed founder names, and only those, on every public surface", () => {
    const NAMES = ["Wilson Mugwe", "Benedict Wambugu"];
    const surfaces = {
      "Founders.tsx": read("components/sections/Founders.tsx"),
      "entity.ts": read("lib/discovery/entity.ts"),
      "llms.txt": llmsText(),
      "Person JSON-LD": JSON.stringify(founderNodes()),
    };
    for (const [surface, text] of Object.entries(surfaces)) {
      for (const name of NAMES) assert.ok(text.includes(name), `${surface} lacks ${name}`);
    }
    assert.deepEqual(founderNodes().map((n) => n.name), ["Benedict Wambugu", "Wilson Mugwe"]);
    assert.deepEqual(FOUNDERS.map((f) => f.name), ["Benedict Wambugu", "Wilson Mugwe"]);
    // The Organization node references founders by @id only, so a name cannot diverge there.
    assert.deepEqual(organizationNode().founder, FOUNDERS.map((f) => ({ "@id": f.id })));
    // The retired surname must not appear in any shipped source, public file or machine surface.
    const files = ["app", "components", "lib", "public", "scripts"].flatMap((dir) => listFiles(join(ROOT, dir)));
    for (const file of files) assert.doesNotMatch(readFileSync(file, "utf8"), /Gathii/i, file);
    assert.doesNotMatch(llmsFullText(), /Gathii/i);
  });

  it("references no portrait or photograph of either founder", () => {
    const surfaces = [read("components/sections/Founders.tsx"), read("app/about/page.tsx"), read("lib/discovery/entity.ts"), read("lib/discovery/structured-data.ts")].map((t) => t.replace(/\/\*[\s\S]*?\*\//g, ""));
    for (const text of surfaces) {
      assert.doesNotMatch(text, /<Image|<img|\.(jpe?g|webp|avif)\b|portrait|headshot/i);
    }
    for (const node of founderNodes()) assert.equal(node.image, undefined);
    assert.equal(readdirSync(join(ROOT, "public")).some((f) => /wilson|benedict|founder|portrait|headshot/i.test(f)), false);
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
    // superseded by tests/home-exposed-ground.test.mjs (Exposed Ground homepage, D54, 2026-10-17)
    const faq = code("components/home/HomeClose.tsx");
    assert.doesNotMatch(faq, /["']use client["']/, "homepage questions are server-rendered <details>");
    assert.match(faq, /<details\b/);
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

describe("FAQ quality (customer questions, no filler, no duplication)", () => {
  const WORDS = (text) => text.trim().split(/\s+/).length;

  it("answers are short summaries: 120 words or fewer (longer needs a dedicated section, see PR body)", () => {
    for (const item of FAQ_ITEMS) assert.ok(WORDS(item.answer) <= 120, `${item.id}: ${WORDS(item.answer)} words`);
  });

  it("every answer opens with a direct sentence", () => {
    for (const item of FAQ_ITEMS) assert.ok(item.answer.split(/(?<=[.?!])\s+/)[0].length < 260, item.id);
  });

  it("no answer is a near-duplicate (word 3-shingle Jaccard > 0.6) of a service-page or location-page FAQ answer", () => {
    const others = [
      ...SERVICES.flatMap((service) => service.faqs.map((faq) => [`service ${service.slug}`, faq.answer])),
      ...Object.entries(LOCATION_PAGES).flatMap(([slug, page]) => page.faqs.map((faq) => [`location ${slug}`, faq.answer])),
    ];
    for (const item of FAQ_ITEMS) {
      const a = locationShingles(item.answer);
      for (const [source, answer] of others) {
        const score = jaccard(a, locationShingles(answer));
        assert.ok(score <= 0.6, `${item.id} vs ${source}: ${score.toFixed(2)}`);
      }
    }
  });

  it("no two FAQ answers are near-duplicates of each other", () => {
    for (const [i, x] of FAQ_ITEMS.entries()) {
      for (const y of FAQ_ITEMS.slice(i + 1)) {
        assert.ok(jaccard(locationShingles(x.answer), locationShingles(y.answer)) <= 0.6, `${x.id} vs ${y.id}`);
      }
    }
  });

  it("every contextual link points at a real public route", () => {
    const routes = new Set(PUBLIC_PAGES.map((page) => page.path));
    for (const item of FAQ_ITEMS) {
      for (const link of item.links ?? []) {
        assert.ok(routes.has(link.href), `${item.id} links to unknown route ${link.href}`);
        assert.ok(!link.label.includes(EM_DASH));
      }
    }
  });

  it("commercial-intent questions link to their service page", () => {
    const want = {
      "web-cost": "/services/web-development",
      "sw-cost": "/services/custom-software-development",
      "sw-connect": "/services/systems-integration",
      "sw-admin": "/services/business-automation",
      "ai-help": "/services/ai-automation",
      "web-google": "/perth",
      "collab-bronnie": "/collaborate",
      "ai-privacy": "/security-privacy",
      "price-consultation": "/consultation",
    };
    for (const [id, href] of Object.entries(want)) {
      assert.ok(FAQ_ITEMS.find((item) => item.id === id).links.some((link) => link.href === href), `${id} -> ${href}`);
    }
  });

  it("never names a street address or says Drylake is based in Joondalup", () => {
    const text = FAQ_ITEMS.map((item) => item.answer).join(" ");
    assert.doesNotMatch(text, /joondalup/i);
    assert.doesNotMatch(text, /\b\d+\s+[A-Z][a-z]+\s+(Street|St|Road|Rd|Avenue|Ave|Drive|Dr)\b/);
  });
});

describe("/faq search copy", () => {
  it("has a unique title (65 chars max) and a 140 to 160 character description, self canonical", () => {
    assert.ok(PAGE_SEO.faq.title.length <= 65, String(PAGE_SEO.faq.title.length));
    assert.ok(PAGE_SEO.faq.description.length >= 140 && PAGE_SEO.faq.description.length <= 160, String(PAGE_SEO.faq.description.length));
    for (const [key, entry] of Object.entries(PAGE_SEO).filter(([key]) => key !== "faq")) {
      assert.notEqual(entry.title, PAGE_SEO.faq.title, key);
      assert.notEqual(entry.description, PAGE_SEO.faq.description, key);
    }
    assert.equal(PAGE_SEO.faq.path, "/faq");
  });

  it("emits BreadcrumbList and FAQPage JSON-LD with required properties", () => {
    assert.match(code("app/faq/page.tsx"), /breadcrumbNode\(SEO\.path, CRUMBS\)/);
    const node = JSON.parse(JSON.stringify(faqNode("/faq", FAQ_ITEMS)));
    assert.equal(node["@type"], "FAQPage");
    for (const q of node.mainEntity) {
      assert.equal(q["@type"], "Question");
      assert.ok(q.name && q.acceptedAnswer["@type"] === "Answer" && q.acceptedAnswer.text);
    }
  });

  it("llms-full.txt carries the related links for each answer", () => {
    assert.match(llmsFullText(), /Related: \[Websites and web development\]\(https:\/\/drylake\.com\.au\/services\/web-development\)/);
  });
});
