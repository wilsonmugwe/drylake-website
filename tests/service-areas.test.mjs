/*
 * PR 5 "Perth location SEO" (2026-10-16). Guards the service-area registry, the /perth
 * directory, the first batch of standalone /locations/[slug] pages and their honesty.
 *
 * Owner decision D-B: genuine Perth metro service areas, no office or storefront claims, and
 * no doorway pages. A standalone page needs distinct content; every other area is listed in
 * the /perth directory and nowhere else.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { PUBLIC_PAGES, SERVICES, absoluteUrl } from "../lib/discovery/entity.ts";
import { llmsFullText, llmsText } from "../lib/discovery/llms.ts";
import { locationServiceNode } from "../lib/discovery/location-structured-data.ts";
import { jsonLd, siteGraph } from "../lib/discovery/structured-data.ts";
import { PAGE_SEO } from "../lib/seo-pages.ts";
import { LOCATION_PAGES, jaccard, locationCopy, locationPageSeo, locationShingles } from "../lib/service-area-pages.ts";
import {
  AREA_REGIONS,
  AREA_TYPES,
  MANDATORY_AREA_SLUGS,
  SERVICE_AREAS,
  STANDALONE_AREA_SLUGS,
  areaHref,
  findArea,
  locationPath,
} from "../lib/service-areas.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const MANDATORY = [
  "perth-cbd", "west-perth", "east-perth", "subiaco", "leederville", "south-perth", "joondalup", "midland", "fremantle",
  "osborne-park", "malaga", "wangara", "welshpool", "kewdale", "bibra-lake", "balcatta", "maddington", "bayswater",
  "baldivis", "canning-vale", "dianella", "the-vines", "ellenbrook", "thornlie", "morley", "gosnells", "willetton", "byford",
  "wanneroo", "cockburn-central", "rockingham", "mandurah", "scarborough", "victoria-park", "armadale",
];

const FIRST_BATCH = ["osborne-park", "malaga", "canning-vale", "west-perth", "joondalup", "fremantle", "rockingham", "midland"];

/* Claims Drylake cannot make: premises, clients, completed projects or ratings in any suburb. */
const FORBIDDEN_CLAIMS =
  /our office|our offices|our studio|our clients in|our customers in|clients in |customers in |we have completed|we['’]ve completed|we have delivered|completed projects|visit us|come and see us|drop in|star rating|\bstars?\b|\brated\b|aggregateRating|testimonial|case stud|award|trusted by|\d+\s*%|\d+\+?\s+(clients|projects|businesses|customers|years)|near me/i;

describe("service-area registry", () => {
  it("holds all 35 mandatory areas, flagged, and nothing else flagged", () => {
    assert.equal(MANDATORY.length, 35);
    assert.deepEqual([...MANDATORY_AREA_SLUGS].sort(), [...MANDATORY].sort());
    for (const slug of MANDATORY) {
      const area = findArea(slug);
      assert.ok(area, `missing mandatory area ${slug}`);
      assert.equal(area.mandatory, true, slug);
    }
    assert.equal(SERVICE_AREAS.filter((area) => area.mandatory).length, 35);
  });

  it("covers 70 or more genuine metro areas with unique slugs and names", () => {
    assert.ok(SERVICE_AREAS.length >= 70, `only ${SERVICE_AREAS.length}`);
    assert.equal(new Set(SERVICE_AREAS.map((a) => a.slug)).size, SERVICE_AREAS.length);
    assert.equal(new Set(SERVICE_AREAS.map((a) => a.name)).size, SERVICE_AREAS.length);
    for (const area of SERVICE_AREAS) assert.match(area.slug, /^[a-z]+(-[a-z]+)*$/, area.slug);
  });

  it("every area has a known region, a known type and a short accurate-sounding context", () => {
    for (const area of SERVICE_AREAS) {
      assert.ok(area.region in AREA_REGIONS, `${area.slug} region`);
      assert.ok(area.type in AREA_TYPES, `${area.slug} type`);
      assert.ok(area.context.length >= 40 && area.context.length <= 220, `${area.slug} context ${area.context.length}`);
    }
  });

  it("the mandatory groups use the agreed types", () => {
    const type = (slug) => findArea(slug).type;
    for (const s of ["perth-cbd", "west-perth", "east-perth", "subiaco", "leederville", "south-perth", "joondalup", "midland", "fremantle"]) assert.equal(type(s), "commercial", s);
    for (const s of ["osborne-park", "malaga", "wangara", "welshpool", "kewdale", "bibra-lake", "balcatta", "maddington", "bayswater"]) assert.equal(type(s), "industrial", s);
    for (const s of ["baldivis", "canning-vale", "dianella", "the-vines", "ellenbrook", "thornlie", "morley", "gosnells", "willetton", "byford"]) assert.equal(type(s), "residential", s);
    for (const s of ["wanneroo", "cockburn-central", "rockingham", "mandurah", "scarborough", "victoria-park", "armadale"]) assert.equal(type(s), "additional", s);
  });

  it("no area text claims premises, clients, results or ratings, and uses no em dash", () => {
    const text = JSON.stringify(SERVICE_AREAS);
    assert.ok(!text.includes("—"));
    assert.equal(text.match(FORBIDDEN_CLAIMS), null, text.match(FORBIDDEN_CLAIMS)?.[0]);
  });

  it("non-standalone areas link to an anchor in the /perth directory, standalone ones to their page", () => {
    for (const area of SERVICE_AREAS) {
      if (STANDALONE_AREA_SLUGS.includes(area.slug)) assert.equal(areaHref(area), `/locations/${area.slug}`);
      else assert.equal(areaHref(area), `/perth#area-${area.slug}`);
    }
  });
});

describe("standalone location pages (first batch, no doorway pages)", () => {
  it("are exactly the agreed first batch, each with its own content", () => {
    assert.deepEqual([...STANDALONE_AREA_SLUGS].sort(), [...FIRST_BATCH].sort());
    assert.deepEqual(Object.keys(LOCATION_PAGES).sort(), [...FIRST_BATCH].sort());
  });

  it("every standalone page is in the sitemap source exactly once, and no other area is", () => {
    const paths = PUBLIC_PAGES.map((page) => page.path);
    for (const slug of FIRST_BATCH) assert.equal(paths.filter((p) => p === locationPath(slug)).length, 1, slug);
    assert.equal(paths.filter((p) => p.startsWith("/locations/")).length, FIRST_BATCH.length);
    assert.ok(paths.includes("/perth"));
  });

  it("titles are unique, at most 65 characters and carry the brand", () => {
    const seo = FIRST_BATCH.map((slug) => locationPageSeo(slug));
    const others = [...Object.values(PAGE_SEO).map((e) => e.title), ...SERVICES.map((s) => s.title)];
    const titles = seo.map((entry) => entry.title);
    assert.equal(new Set(titles).size, titles.length);
    for (const title of titles) {
      assert.ok(title.length <= 65, `${title.length}: ${title}`);
      assert.match(title, /Drylake/);
      assert.ok(!others.includes(title));
    }
  });

  it("descriptions are unique and 140 to 160 characters", () => {
    const seo = FIRST_BATCH.map((slug) => locationPageSeo(slug));
    const descriptions = seo.map((entry) => entry.description);
    assert.equal(new Set(descriptions).size, descriptions.length);
    for (const description of descriptions) assert.ok(description.length >= 140 && description.length <= 160, `${description.length}: ${description}`);
    const others = [...Object.values(PAGE_SEO).map((e) => e.description), ...SERVICES.map((s) => s.description)];
    for (const description of descriptions) assert.ok(!others.includes(description));
  });

  it("each page canonical path is its own /locations/<slug>", () => {
    for (const slug of FIRST_BATCH) assert.equal(locationPageSeo(slug).path, `/locations/${slug}`);
  });

  it("each page carries enough distinct copy to be a real page (300+ words), not a thin template", () => {
    for (const slug of FIRST_BATCH) {
      const words = locationCopy(slug).split(/\s+/).filter(Boolean).length;
      assert.ok(words >= 300, `${slug}: ${words} words`);
    }
  });

  it("NEAR-DUPLICATE GUARD: no two pages' area-specific copy exceeds 0.5 Jaccard similarity", () => {
    const sets = FIRST_BATCH.map((slug) => [slug, locationShingles(locationCopy(slug))]);
    for (let i = 0; i < sets.length; i += 1) {
      for (let j = i + 1; j < sets.length; j += 1) {
        const score = jaccard(sets[i][1], sets[j][1]);
        assert.ok(score <= 0.5, `${sets[i][0]} vs ${sets[j][0]}: ${score.toFixed(3)}`);
      }
    }
  });

  it("the near-duplicate guard really detects duplicates (control)", () => {
    const a = locationShingles(locationCopy("osborne-park"));
    assert.equal(jaccard(a, a), 1);
    const swapped = locationShingles(locationCopy("osborne-park").replaceAll("Osborne Park", "Malaga"));
    assert.ok(jaccard(a, swapped) > 0.5);
  });

  it("no forbidden claims: premises, clients, completed work, ratings, em dashes, near me", () => {
    for (const slug of FIRST_BATCH) {
      const copy = locationCopy(slug) + JSON.stringify(locationPageSeo(slug));
      assert.ok(!copy.includes("—"), slug);
      assert.equal(copy.match(FORBIDDEN_CLAIMS), null, `${slug}: ${copy.match(FORBIDDEN_CLAIMS)?.[0]}`);
      assert.ok(!/\$|\bGST\b/.test(copy), `${slug} price or GST wording`);
    }
  });

  it("examples are framed as examples, never as results", () => {
    for (const slug of FIRST_BATCH) {
      const page = LOCATION_PAGES[slug];
      assert.ok(page.fits.length >= 3, slug);
      for (const fit of page.fits) assert.match(fit.example, /^(For example|A |An |One )/i, `${slug}: ${fit.example}`);
      assert.match(page.examplesNote, /example/i);
    }
  });

  it("nearby links point at real areas", () => {
    for (const slug of FIRST_BATCH) {
      assert.ok(LOCATION_PAGES[slug].nearby.length >= 3, slug);
      for (const nearby of LOCATION_PAGES[slug].nearby) {
        assert.ok(findArea(nearby), `${slug} -> ${nearby}`);
        assert.notEqual(nearby, slug);
      }
    }
  });
});

describe("location structured data", () => {
  it("emits a Service with areaServed from the Drylake organisation, no LocalBusiness, address or ratings", () => {
    for (const slug of FIRST_BATCH) {
      const node = locationServiceNode(slug);
      assert.equal(node["@type"], "Service");
      assert.deepEqual(node.provider, { "@id": "https://drylake.com.au/#organization" });
      assert.ok(node.areaServed, slug);
      const text = jsonLd([node]);
      assert.ok(!/LocalBusiness|ProfessionalService|streetAddress|postalCode|aggregateRating|ratingValue|"review"|"geo"|openingHours/.test(text), slug);
    }
    assert.ok(!JSON.stringify(siteGraph()).includes("LocalBusiness"));
  });
});

describe("route, directory and machine-readable surfaces", () => {
  const route = code("app/locations/[slug]/page.tsx");

  it("the route is statically generated from the standalone registry and 404s otherwise", () => {
    assert.match(route, /generateStaticParams/);
    assert.match(route, /dynamicParams = false/);
    assert.match(route, /pageMetadata\(/);
    assert.match(route, /breadcrumbNode\(/);
    assert.match(route, /locationServiceNode\(/);
    assert.match(route, /faqNode\(/);
    assert.match(route, /<PrimaryCta href=\{PRIMARY_CTA\.href\}/);
    assert.ok(!/LocalBusiness|streetAddress|aggregateRating/.test(route));
  });

  it("/perth renders every area from the registry, server-side, with anchors and region groups", () => {
    const perth = code("app/perth/page.tsx");
    assert.match(perth, /SERVICE_AREAS|AreaDirectory/);
    const directory = code("components/sections/AreaDirectory.tsx");
    assert.match(directory, /SERVICE_AREAS/);
    assert.match(directory, /id=\{`area-\$\{area\.slug\}`\}/);
    assert.ok(!/["']use client["']/.test(directory));
    assert.match(directory, /areaHref\(/);
  });

  it("llms.txt and llms-full.txt carry the service-area coverage and every standalone page", () => {
    for (const text of [llmsText(), llmsFullText()]) {
      for (const slug of FIRST_BATCH) assert.ok(text.includes(absoluteUrl(locationPath(slug))), slug);
      for (const area of SERVICE_AREAS) assert.ok(text.includes(area.name), area.name);
    }
  });

  it("the e2e suite lists the new pages and checks 375 and 1440 widths", () => {
    const helpers = read("tests/e2e/helpers.ts");
    for (const slug of FIRST_BATCH) assert.ok(helpers.includes(`/locations/${slug}`), slug);
    const spec = read("tests/e2e/locations.spec.ts");
    assert.match(spec, /375/);
    assert.match(spec, /1440/);
    assert.match(spec, /scrollWidth/);
  });
});
