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
import { llmsText } from "../lib/discovery/llms.ts";
import { faqNode, serviceNode } from "../lib/discovery/structured-data.ts";

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

  it("the service template renders every content block and a Start a Conversation link", () => {
    const page = code("app/services/[slug]/page.tsx");

    for (const field of ["service.problem", "service.builds", "service.useCases", "service.approach", "service.production", "service.faqs"]) {
      assert.ok(page.includes(`${field}.map(`), field);
    }
    assert.match(page, /href="\/contact"/);
    assert.match(page, /Start a Conversation/);
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
    assert.match(source, /pageMetadata\(\{\s*title: "Perth Technology Company[^"]+",/);
    assert.match(source, /path: "\/perth"/);
  });

  it("invents no address, opening hours, local clients, reviews or statistics", () => {
    assert.ok(!/LocalBusiness|streetAddress|openingHours|postalCode|geo:|telephone/.test(source));
    assert.ok(!INVENTED_PROOF.test(page.replace(/\/\*[\s\S]*?\*\//g, "")));
  });

  it("links to the services and to Start a Conversation", () => {
    assert.match(source, /<ServiceIndex\b/);
    assert.match(source, /href="\/contact"/);
  });
});

describe("metadata quality", () => {
  const pageTitles = STATIC_PUBLIC_PAGES.map((file) => read(file).match(/pageMetadata\(\{\s*title:\s*"([^"]+)"/)?.[1]);
  const titles = [...pageTitles, ...SERVICES.map((service) => service.title)];

  it("every public page has a title", () => {
    assert.ok(pageTitles.every(Boolean), JSON.stringify(pageTitles));
  });

  it("Perth is not mechanically added to every title", () => {
    const withPerth = titles.filter((title) => /Perth/.test(title));
    assert.ok(withPerth.length <= 2, withPerth.join(" / "));
  });

  it("titles stay short enough to display in results", () => {
    for (const title of titles) assert.ok(title.length <= 70, `${title.length}: ${title}`);
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

describe("homepage duplicate copy (Approach section)", () => {
  it("each stage description is rendered once, not once per breakpoint", () => {
    const source = code("components/sections/Approach.tsx");

    assert.equal((source.match(/\{stage\.text\}/g) ?? []).length, 1);
    assert.equal((read("components/sections/Approach.tsx").match(/We learn how the business works today/g) ?? []).length, 1);
  });
});
