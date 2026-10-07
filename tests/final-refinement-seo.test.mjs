/*
 * Final refinement PR (2026-10-08): services vs solutions, problem-led discovery, the
 * Perth -> Western Australia -> Australia hierarchy, the Organization -> Service relationship
 * and the llms.txt problem map. Report: docs/review/2026-10-08-final-refinement/seo-geo.md
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { ORGANIZATION_ID, PERTH_PATH, SERVICES, absoluteUrl } from "../lib/discovery/entity.ts";
import { llmsFullText, llmsText } from "../lib/discovery/llms.ts";
import { BUSINESS_PROBLEMS, problemPath, problemsForService } from "../lib/discovery/problems.ts";
import {
  breadcrumbNode,
  faqNode,
  organizationNode,
  serviceNode,
  siteGraph,
  webPageNode,
} from "../lib/discovery/structured-data.ts";
import { PAGE_SEO } from "../lib/seo-pages.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const INVENTED_PROOF =
  /testimonial|case stud|our clients|trusted by|\bawards?\b|award-winning|\brated\b|star rating|customer reviews|\d+\s*%|\d+\+?\s+(clients|projects|businesses|customers|years|hours)/i;

describe("problem registry", () => {
  const slugs = new Set(SERVICES.map((service) => service.slug));

  it("every problem has a unique anchor id and links only to real services", () => {
    const ids = BUSINESS_PROBLEMS.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length);

    for (const item of BUSINESS_PROBLEMS) {
      assert.match(item.id, /^[a-z]+(-[a-z]+)*$/, item.id);
      assert.ok(item.services.length > 0, item.id);
      for (const slug of item.services) assert.ok(slugs.has(slug), `${item.id} -> ${slug}`);
      assert.equal(problemPath(item), `/solutions#${item.id}`);
    }
  });

  it("every service page has at least one problem pointing at it", () => {
    for (const service of SERVICES) assert.ok(problemsForService(service.slug).length > 0, service.slug);
  });

  it("claims no statistics, savings, clients or results, and uses no em dashes", () => {
    const copy = JSON.stringify(BUSINESS_PROBLEMS);
    assert.equal(copy.match(INVENTED_PROOF), null);
    assert.ok(!copy.includes("—"));
  });
});

describe("/services and /solutions have different jobs", () => {
  const solutions = code("app/solutions/page.tsx");
  const services = code("app/services/page.tsx");

  it("/solutions leads with the problem list, then how it fits, then the services", () => {
    const order = ["<ProblemIndex />", "<Solutions />", "<ServiceIndex", "<ContactCTA />"].map((tag) => solutions.indexOf(tag));
    assert.ok(order.every((index) => index > 0), JSON.stringify(order));
    assert.deepEqual([...order].sort((a, b) => a - b), order);
  });

  it("/solutions has a visible breadcrumb matching its BreadcrumbList", () => {
    assert.match(solutions, /<Breadcrumbs crumbs=\{SOLUTIONS_CRUMBS\} \/>/);
    assert.match(solutions, /breadcrumbNode\("\/solutions", SOLUTIONS_CRUMBS\)/);
  });

  it("Service nodes are emitted on /services and service pages, not repeated on /solutions", () => {
    assert.ok(!/serviceNode/.test(solutions));
    assert.match(services, /SERVICES\.map\(serviceNode\)/);
  });

  it("each page links to the other with a descriptive anchor", () => {
    assert.match(read("app/services/page.tsx"), /the business problems we solve/);
    assert.match(read("app/solutions/page.tsx"), /href="\/services"/);
  });

  it("titles target different intent", () => {
    assert.match(PAGE_SEO.solutions.title, /Problems/);
    assert.ok(!/Problems/.test(PAGE_SEO.services.title));
  });

  it("the Solutions section no longer repeats the homepage label or links to its own page", () => {
    const section = code("components/sections/Solutions.tsx");
    assert.ok(!section.includes("02 / What We Do"));
    assert.ok(!section.includes('href="/solutions"'));
  });

  it("each problem row is an anchor target and links its services", () => {
    const index = code("components/sections/ProblemIndex.tsx");
    assert.match(index, /id=\{item\.id\}/);
    assert.match(index, /href=\{service\.path\}/);
  });

  it("service pages link back to their problems", () => {
    const page = code("app/services/[slug]/page.tsx");
    assert.match(page, /problemsForService\(service\.slug\)/);
    assert.match(page, /href=\{problemPath\(item\)\}/);
  });
});

describe("structured data: geography and entity relationships", () => {
  const org = organizationNode();

  it("areaServed runs Perth -> Western Australia -> Australia, on the Organization and every Service", () => {
    const names = (area) => area.map((place) => `${place["@type"]}:${place.name}`);
    const expected = ["City:Perth", "State:Western Australia", "Country:Australia"];

    assert.deepEqual(names(org.areaServed), expected);
    assert.equal(org.areaServed[0].containedInPlace.name, "Western Australia");
    assert.equal(org.areaServed[1].containedInPlace.name, "Australia");
    for (const service of SERVICES) assert.deepEqual(names(serviceNode(service).areaServed), expected);
  });

  it("publishes no street address, postcode, phone or LocalBusiness type", () => {
    const text = JSON.stringify(siteGraph());
    assert.ok(!/streetAddress|postalCode|telephone|LocalBusiness|ProfessionalService/.test(text));
  });

  it("the offer catalog references exactly the Service node ids", () => {
    const offered = org.hasOfferCatalog.itemListElement.map((offer) => offer.itemOffered["@id"]);
    assert.deepEqual(offered, SERVICES.map((service) => serviceNode(service)["@id"]));
    assert.ok(!JSON.stringify(org.hasOfferCatalog).includes("price"));
  });

  it("every @id reference in the site's graphs resolves to a node defined somewhere on the site", () => {
    const nodes = [
      ...siteGraph(),
      webPageNode({ path: "/", name: "x", description: "x" }),
      webPageNode({ path: "/solutions", name: "x", description: "x", breadcrumb: [] }),
      breadcrumbNode("/solutions", [{ name: "Home", path: "/" }]),
      webPageNode({ path: PERTH_PATH, name: "x", description: "x" }),
      ...SERVICES.flatMap((service) => [
        webPageNode({ path: service.path, name: "x", description: "x", breadcrumb: [] }),
        breadcrumbNode(service.path, [{ name: "Home", path: "/" }]),
        serviceNode(service),
        faqNode(service.path, service.faqs),
      ]),
    ];
    const defined = new Set(nodes.map((node) => node["@id"]).filter(Boolean));
    const refs = [];
    const walk = (value, top) => {
      if (Array.isArray(value)) return value.forEach((item) => walk(item, false));
      if (value && typeof value === "object") {
        const keys = Object.keys(value);
        if (!top && keys.length === 1 && keys[0] === "@id") refs.push(value["@id"]);
        for (const key of keys) if (key !== "@id") walk(value[key], false);
      }
    };
    nodes.forEach((node) => walk(node, true));

    assert.ok(refs.includes(ORGANIZATION_ID));
    for (const ref of refs) assert.ok(defined.has(ref), `unresolved @id ${ref}`);
  });

  it("there is exactly one Organization node in the site graph", () => {
    assert.equal(siteGraph().filter((node) => node["@type"] === "Organization").length, 1);
  });
});

describe("llms.txt answers the problem and approach questions", () => {
  for (const [name, text] of [["llms.txt", llmsText()], ["llms-full.txt", llmsFullText()]]) {
    it(`${name} lists every problem with its anchor and an approach section`, () => {
      assert.match(text, /## Problems we solve/);
      assert.match(text, /## Approach/);
      for (const item of BUSINESS_PROBLEMS) {
        assert.ok(text.includes(item.problem), item.id);
        assert.ok(text.includes(absoluteUrl(problemPath(item))), item.id);
      }
      assert.ok(!text.includes("—"));
    });
  }
});
