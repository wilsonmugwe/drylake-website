/*
 * PR "Drylake SEO, Search Visibility & Local Discovery" (2026-10-07).
 * Guards the /services architecture, the legacy redirects, the Perth page, internal links,
 * honest content (no invented proof) and the homepage duplicate-copy fix.
 * Runs under `npm test` (node:test), no new dependencies.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  LEGACY_SERVICE_REDIRECTS,
  PERTH_PATH,
  PRIVATE_PREFIXES,
  PUBLIC_PAGES,
  SERVICES,
  SERVICES_PATH,
  findService,
  relatedServices,
} from "../lib/discovery/entity.ts";
import { ENTITY, ORGANIZATION_ID, absoluteUrl } from "../lib/discovery/entity.ts";
import { robotsGroups, CRAWLERS } from "../lib/discovery/crawlers.ts";
import { isAllowed } from "../lib/discovery/robots-eval.ts";
import { LLMS_FULL_PATH, llmsFullText, llmsText } from "../lib/discovery/llms.ts";
import {
  breadcrumbNode,
  faqNode,
  jsonLd,
  serviceNode,
  siteGraph,
  webPageNode,
} from "../lib/discovery/structured-data.ts";
import { PAGE_SEO, serviceShareImage } from "../lib/seo-pages.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const EXPECTED_SLUGS = [
  "custom-software-development",
  "business-automation",
  "systems-integration",
  "ai-automation",
  "web-development",
];

const STATIC_PUBLIC_PAGES = [
  "app/page.tsx",
  "app/solutions/page.tsx",
  "app/services/page.tsx",
  "app/perth/page.tsx",
  "app/about/page.tsx",
  "app/contact/page.tsx",
  "app/privacy/page.tsx",
];

/* Claims Drylake cannot make yet: no clients, reviews, results, awards or counts. */
const INVENTED_PROOF =
  /testimonial|case stud|our clients|trusted by|\bawards?\b|award-winning|\brated\b|star rating|customer reviews|\d+\s*%|\d+\+?\s+(clients|projects|businesses|customers|years)/i;

describe("/services architecture", () => {
  it("has exactly the five agreed service pages under /services", () => {
    assert.equal(SERVICES_PATH, "/services");
    assert.deepEqual(SERVICES.map((service) => service.slug), EXPECTED_SLUGS);
    for (const service of SERVICES) assert.equal(service.path, `/services/${service.slug}`);
  });

  it("every service page has the substance of a real page, not a doorway", () => {
    for (const service of SERVICES) {
      assert.ok(service.problem.length >= 2, `${service.slug} problem`);
      assert.ok(service.builds.length >= 4, `${service.slug} builds`);
      assert.ok(service.useCases.length >= 3, `${service.slug} use cases`);
      assert.ok(service.approach.length >= 3, `${service.slug} approach`);
      assert.ok(service.production.length >= 3, `${service.slug} production`);
      assert.ok(service.faqs.length >= 3, `${service.slug} faqs`);

      const words = JSON.stringify(service).split(/\s+/).length;
      assert.ok(words >= 450, `${service.slug} has only ${words} words`);
    }
  });

  it("service copy is unique across pages (no templated duplicate paragraphs)", () => {
    const seen = new Map();

    for (const service of SERVICES) {
      for (const text of [service.intro, ...service.problem, ...service.useCases.map((u) => u.text), ...service.approach.map((a) => a.text)]) {
        assert.ok(!seen.has(text), `"${text.slice(0, 60)}" repeats on ${service.slug} and ${seen.get(text)}`);
        seen.set(text, service.slug);
      }
    }
  });

  it("related services exist, exclude the page itself and number at least two", () => {
    for (const service of SERVICES) {
      const related = relatedServices(service);

      assert.equal(related.length, service.related.length, service.slug);
      assert.ok(related.length >= 2, service.slug);
      assert.ok(!related.some((other) => other.slug === service.slug), service.slug);
    }
  });

  it("findService only knows the five slugs", () => {
    assert.equal(findService("applied-ai"), null);
    assert.equal(findService("web-development")?.name, "Web development");
  });

  it("the service template renders every content block and a Start a conversation link", () => {
    const page = code("app/services/[slug]/page.tsx");

    for (const field of ["service.problem", "service.builds", "service.useCases", "service.approach", "service.production", "service.faqs"]) {
      assert.ok(page.includes(`${field}.map(`), field);
    }
    assert.match(page, /href="\/contact"/);
    assert.match(page, /Start a conversation/);
    assert.match(page, /relatedServices\(service\)/);
    assert.match(page, /href="\/perth"/);
  });

  it("Service and FAQ structured data come from the same data the page renders", () => {
    for (const service of SERVICES) {
      const node = serviceNode(service);

      assert.equal(node["@type"], "Service");
      assert.equal(node.url, `https://drylake.com.au${service.path}`);
      assert.equal(node.name, service.name);
      assert.ok(!("offers" in node) && !("aggregateRating" in node), "no prices or ratings");
      assert.equal(faqNode(service.path, service.faqs).mainEntity.length, service.faqs.length);
    }
  });
});

describe("legacy /solutions/* service URLs", () => {
  it("each old service URL redirects permanently to its successor", () => {
    assert.deepEqual(
      LEGACY_SERVICE_REDIRECTS.map((r) => [r.source, r.destination]),
      [
        ["/solutions/custom-software", "/services/custom-software-development"],
        ["/solutions/automation-integration", "/services/business-automation"],
        ["/solutions/applied-ai", "/services/ai-automation"],
      ]
    );

    for (const redirect of LEGACY_SERVICE_REDIRECTS) {
      assert.ok(SERVICES.some((service) => service.path === redirect.destination), redirect.destination);
    }

    const config = code("next.config.ts");
    assert.match(config, /async redirects\(\)/);
    assert.match(config, /LEGACY_SERVICE_REDIRECTS\.map\(\(redirect\) => \(\{ \.\.\.redirect, permanent: true \}\)\)/);
  });

  it("no public surface still links to an old service URL", () => {
    const surfaces = [
      ...STATIC_PUBLIC_PAGES.map(read),
      read("app/services/[slug]/page.tsx"),
      read("components/sections/Solutions.tsx"),
      read("components/sections/WhatWeDo.tsx"),
      read("components/layout/Footer.tsx"),
      read("components/layout/Navbar.tsx"),
      llmsText(),
      JSON.stringify(PUBLIC_PAGES),
    ].join("\n");

    for (const redirect of LEGACY_SERVICE_REDIRECTS) assert.ok(!surfaces.includes(redirect.source), redirect.source);
  });
});

describe("sitemap and page registry", () => {
  const paths = PUBLIC_PAGES.map((page) => page.path);

  it("lists /services, every service, /perth and the core pages exactly once", () => {
    for (const path of ["/", "/solutions", "/services", ...SERVICES.map((s) => s.path), "/perth", "/about", "/contact", "/privacy"]) {
      assert.equal(paths.filter((p) => p === path).length, 1, path);
    }
    assert.equal(paths.length, 12);
  });

  it("lists nothing private, no auth route and no trailing slash", () => {
    for (const path of paths) {
      assert.ok(!PRIVATE_PREFIXES.some((prefix) => path.startsWith(prefix)), path);
      assert.ok(path === "/" || !path.endsWith("/"), path);
    }
  });

  it("llms.txt links the services hub and the Perth page", () => {
    const text = llmsText();

    assert.ok(text.includes("https://drylake.com.au/services)"));
    assert.ok(text.includes("https://drylake.com.au/perth)"));
  });
});

describe("Perth page", () => {
  const page = read("app/perth/page.tsx");
  const source = code("app/perth/page.tsx");

  it("is the single local page, with its own canonical and metadata", () => {
    assert.equal(PERTH_PATH, "/perth");
    assert.match(source, /const SEO = PAGE_SEO\.perth;/);
    assert.match(source, /pageMetadata\(SEO\)/);
    assert.equal(PAGE_SEO.perth.path, "/perth");
    assert.match(PAGE_SEO.perth.title, /^Perth /);
  });

  it("invents no address, opening hours, local clients, reviews or statistics", () => {
    assert.ok(!/LocalBusiness|streetAddress|openingHours|postalCode|geo:|telephone/.test(source));
    assert.ok(!INVENTED_PROOF.test(page.replace(/\/\*[\s\S]*?\*\//g, "")));
  });

  it("links to the services and to Start a conversation", () => {
    assert.match(source, /<ServiceIndex\b/);
    assert.match(source, /href="\/contact"/);
  });
});

describe("metadata quality", () => {
  const pageTitles = STATIC_PUBLIC_PAGES.map((file) => PAGE_SEO[code(file).match(/const SEO = PAGE_SEO\.(\w+);/)?.[1]]?.title);
  const titles = [...pageTitles, ...SERVICES.map((service) => service.title)];

  it("every public page has a title", () => {
    assert.ok(pageTitles.every(Boolean), JSON.stringify(pageTitles));
  });

  it("Perth is not mechanically added to every title", () => {
    const withPerth = titles.filter((title) => /Perth/.test(title));
    assert.ok(withPerth.length <= 2, withPerth.join(" / "));
  });

  it("titles stay short enough to display in results", () => {
    for (const title of titles) assert.ok(title.length <= 65, `${title.length}: ${title}`);
  });
});

describe("honest, client-facing copy", () => {
  const copy = [JSON.stringify(SERVICES), read("app/perth/page.tsx"), read("app/services/page.tsx")].join("\n");

  it("claims no clients, reviews, results, awards or counts", () => {
    const match = copy.match(INVENTED_PROOF);
    assert.equal(match, null, match?.[0]);
  });

  it("uses no em dashes", () => {
    assert.ok(!copy.includes("—"));
  });
});

/*
 * PR 6 "Drylake Search Visibility, GEO & Local Discovery" (2026-10-07).
 * One copy registry (lib/seo-pages.ts), a share card per page, honest JSON-LD, llms-full.txt.
 */
const PAGE_ENTRIES = Object.values(PAGE_SEO);
const ALL_SEO = [
  ...PAGE_ENTRIES.map((entry) => ({ path: entry.path, title: entry.title, description: entry.description, image: entry.image, alt: entry.imageAlt })),
  ...SERVICES.map((service) => ({ path: service.path, title: service.title, description: service.description, image: serviceShareImage(service.slug), alt: `Drylake: ${service.name} for Australian businesses` })),
];

function pngSize(file) {
  const buffer = readFileSync(join(ROOT, "public", file));
  assert.equal(buffer.readUInt32BE(0), 0x89504e47, `${file} is not a PNG`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/* Properties that would claim something Drylake cannot evidence, or publish what it must not. */
const FORBIDDEN_SCHEMA = /aggregateRating|"review"|ratingValue|"award"|telephone|streetAddress|postalCode|openingHours|priceRange|"offers"|numberOfEmployees|"geo"|hasCredential/;

describe("PR 6: one registry for page search copy", () => {
  it("every public page in the sitemap has exactly one copy entry", () => {
    assert.deepEqual(ALL_SEO.map((entry) => entry.path).sort(), PUBLIC_PAGES.map((page) => page.path).sort());
  });

  it("titles and descriptions are unique; descriptions 140 to 160 characters; titles at most 65", () => {
    assert.equal(new Set(ALL_SEO.map((e) => e.title)).size, ALL_SEO.length);
    assert.equal(new Set(ALL_SEO.map((e) => e.description)).size, ALL_SEO.length);
    for (const entry of ALL_SEO) {
      assert.ok(entry.description.length >= 140 && entry.description.length <= 160, `${entry.path} ${entry.description.length}`);
      assert.ok(entry.title.length <= 65, `${entry.path} ${entry.title.length}`);
      assert.match(entry.title, /Drylake/, entry.path);
    }
  });

  it("search copy contains no em dash, invented proof, price or GST wording", () => {
    const text = JSON.stringify(PAGE_SEO);
    assert.ok(!text.includes("—"));
    assert.equal(text.match(INVENTED_PROOF), null);
    assert.ok(!/\$|\bGST\b|inc-GST|ex-GST/.test(text));
  });

  it("no surface publishes a street address (remote-first, locality only)", () => {
    const surfaces = [JSON.stringify(PAGE_SEO), JSON.stringify(siteGraph()), llmsText(), llmsFullText()].join("\n");
    assert.ok(!/Joondalup|Davidson|\b6027\b|streetAddress/i.test(surfaces));
  });
});

describe("PR 6: social share images", () => {
  it("every page has its own 1200 x 630 PNG card with alt text", () => {
    assert.equal(new Set(ALL_SEO.map((e) => e.image)).size, ALL_SEO.length, "cards are per page");
    for (const entry of ALL_SEO) {
      assert.match(entry.image, /^\/og\/[a-z-]+\.png$/);
      assert.deepEqual(pngSize(entry.image), { width: 1200, height: 630 }, entry.image);
      assert.ok(entry.alt.length >= 10 && !entry.alt.includes("—"), entry.path);
    }
    assert.deepEqual(pngSize("/opengraph-image.png"), { width: 1200, height: 630 });
  });

  it("pageMetadata emits og:image with size and alt, and twitter:image with alt", () => {
    const source = code("lib/seo.ts");
    assert.match(source, /width: SHARE_IMAGE\.width/);
    assert.match(source, /images: \[shareImage\]/);
    assert.match(source, /images: \[\{ url: shareImage\.url, alt: shareImage\.alt \}\]/);
    assert.match(code("app/services/[slug]/page.tsx"), /image: serviceShareImage\(service\.slug\)/);
  });

  it("the card generator reads the same copy registry as the pages", () => {
    const script = read("scripts/og/render-share-cards.mjs");
    assert.match(script, /from "\.\.\/\.\.\/lib\/seo-pages\.ts"/);
    assert.match(script, /from "\.\.\/\.\.\/lib\/discovery\/services\.ts"/);
  });

  it("crawlers that build link previews and indexes can fetch the cards and llms files", () => {
    const groups = robotsGroups(PRIVATE_PREFIXES);
    for (const crawler of CRAWLERS.filter((c) => c.access === "allow")) {
      for (const path of ["/og/home.png", "/opengraph-image.png", "/llms.txt", LLMS_FULL_PATH]) {
        assert.ok(isAllowed(groups, crawler.token, path), `${crawler.token} ${path}`);
      }
    }
  });
});

describe("PR 6: structured data is valid and honest", () => {
  const pageNodes = ALL_SEO.map((entry) => webPageNode({ path: entry.path, name: entry.title, description: entry.description }));
  const nodes = [
    ...siteGraph(),
    ...pageNodes,
    ...SERVICES.flatMap((service) => [
      serviceNode(service),
      faqNode(service.path, service.faqs),
      breadcrumbNode(service.path, [
        { name: "Home", path: "/" },
        { name: "Services", path: SERVICES_PATH },
        { name: service.name, path: service.path },
      ]),
    ]),
  ];

  it("serialises to JSON that parses back to the same graph", () => {
    const parsed = JSON.parse(jsonLd(nodes));
    assert.equal(parsed["@context"], "https://schema.org");
    assert.equal(parsed["@graph"].length, nodes.length);
    for (const node of parsed["@graph"]) assert.ok(node["@type"], JSON.stringify(node).slice(0, 80));
  });

  it("every @id is unique and every @id reference resolves", () => {
    const ids = nodes.map((n) => n["@id"]).filter(Boolean);
    assert.equal(new Set(ids).size, ids.length);
    const refs = [...JSON.stringify(nodes).matchAll(/\{"@id":"([^"]+)"\}/g)].map((m) => m[1]);
    const known = new Set([...ids, ...ALL_SEO.map((e) => `${absoluteUrl(e.path)}#breadcrumb`)]);
    for (const ref of refs) assert.ok(known.has(ref), ref);
  });

  it("carries no fabricated or private properties", () => {
    assert.equal(JSON.stringify(nodes).match(FORBIDDEN_SCHEMA), null);
  });

  it("Organization is not a LocalBusiness and states only verifiable facts", () => {
    const [organization] = siteGraph();
    assert.equal(organization["@type"], "Organization");
    assert.equal(organization["@id"], ORGANIZATION_ID);
    assert.equal(organization.foundingDate, "2026-09-24");
    assert.equal(organization.foundingDate, ENTITY.foundingDate);
    assert.ok(new Date(organization.foundingDate) <= new Date());
  });

  it("each page's dateModified equals its sitemap lastmod", () => {
    for (const node of pageNodes) {
      const page = PUBLIC_PAGES.find((p) => absoluteUrl(p.path) === node.url);
      assert.equal(node.dateModified, page.lastModified, node.url);
    }
  });
});

describe("PR 6: llms-full.txt", () => {
  const full = llmsFullText();

  it("is linked from llms.txt and served as static text", () => {
    assert.ok(llmsText().includes(`${absoluteUrl(LLMS_FULL_PATH)})`));
    const route = code("app/llms-full.txt/route.ts");
    assert.match(route, /force-static/);
    assert.match(route, /text\/plain/);
  });

  it("carries every service's text, so it says nothing the pages do not", () => {
    for (const service of SERVICES) {
      assert.ok(full.includes(service.intro), service.slug);
      assert.ok(full.includes(absoluteUrl(service.path)), service.slug);
      for (const faq of service.faqs) assert.ok(full.includes(faq.answer), faq.question);
    }
    assert.ok(full.includes(ENTITY.legalSummary));
  });

  it("has no em dash, private path or invented proof", () => {
    assert.ok(!full.includes("—"));
    for (const prefix of PRIVATE_PREFIXES) assert.ok(!full.includes(`drylake.com.au${prefix}`), prefix);
    assert.equal(full.match(INVENTED_PROOF), null);
  });
});

describe("homepage duplicate copy (Approach section)", () => {
  it("each stage description is rendered once, not once per breakpoint", () => {
    const source = code("components/sections/Approach.tsx");

    assert.equal((source.match(/\{stage\.text\}/g) ?? []).length, 1);
    assert.equal((read("components/sections/Approach.tsx").match(/We learn how the business works today/g) ?? []).length, 1);
  });
});
