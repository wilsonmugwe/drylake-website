/*
 * Search and AI discoverability regression guard.
 *
 * Protects, at build/test time: the Drylake entity facts, the structured-data graph, the
 * crawler policy (search + AI search allowed, training opted out, private surfaces closed),
 * the sitemap's coverage of every public page, llms.txt, IndexNow, the noindex headers on
 * private surfaces, and the internal links that keep service pages discoverable.
 * The deployed site is checked separately by scripts/discoverability-check.mjs (CI, weekly
 * and after every production deploy).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { DRYLAKE_BUSINESS } from "../lib/business.ts";
import { CRAWLERS, blockedTokens } from "../lib/discovery/crawlers.ts";
import {
  ENTITY,
  FOUNDERS,
  ORGANIZATION_ID,
  PRIVATE_PREFIXES,
  PUBLIC_PAGES,
  SERVICES,
  SITE_URL,
  WEBSITE_ID,
  absoluteUrl,
} from "../lib/discovery/entity.ts";
import { INDEXNOW_KEY, indexNowPayload } from "../lib/discovery/indexnow.ts";
import { llmsText } from "../lib/discovery/llms.ts";
import {
  breadcrumbNode,
  faqNode,
  jsonLd,
  serviceNode,
  siteGraph,
  webPageNode,
} from "../lib/discovery/structured-data.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

function walk(dir, predicate, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);

    if (statSync(full).isDirectory()) walk(full, predicate, out);
    else if (predicate(full)) out.push(relative(ROOT, full).replaceAll("\\", "/"));
  }

  return out;
}

/* ATO ABN checksum: subtract 1 from the first digit, weight, sum, divisible by 89. */
function isValidAbn(abn) {
  const digits = abn.replace(/\s/g, "").split("").map(Number);
  if (digits.length !== 11) return false;
  digits[0] -= 1;
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  return digits.reduce((sum, digit, index) => sum + digit * weights[index], 0) % 89 === 0;
}

const allGraphs = () => [
  ...siteGraph(),
  ...SERVICES.flatMap((service) => [serviceNode(service), faqNode(service.path, service.faqs)]),
];

describe("one consistent Drylake entity", () => {
  it("states exactly the agreed identity", () => {
    assert.equal(ENTITY.brand, "Drylake");
    assert.equal(ENTITY.legalName, "DRYLAKE PTY LTD");
    assert.equal(ENTITY.abn, "70 702 662 557");
    assert.equal(ENTITY.url, "https://drylake.com.au");
    assert.equal(ENTITY.locality, "Perth");
    assert.equal(ENTITY.region, "Western Australia");
    assert.equal(ENTITY.countryCode, "AU");
  });

  it("matches the invoicing identity (one source for legal name and ABN)", () => {
    assert.equal(ENTITY.legalName, DRYLAKE_BUSINESS.legalName);
    assert.equal(ENTITY.abn, DRYLAKE_BUSINESS.abn);
    assert.equal(ENTITY.acn, DRYLAKE_BUSINESS.acn);
  });

  it("the ABN passes the ATO checksum and contains the ACN", () => {
    assert.ok(isValidAbn(ENTITY.abn));
    assert.ok(ENTITY.abn.replace(/\s/g, "").endsWith(ENTITY.acn.replace(/\s/g, "")));
  });

  it("sameAs lists only https profile URLs (never placeholders)", () => {
    for (const url of ENTITY.sameAs) {
      assert.match(url, /^https:\/\/[^\s]+$/);
      assert.ok(!/example|placeholder|todo/i.test(url), url);
    }
  });

  it("no client-facing entity, service or llms.txt text contains an em dash", () => {
    const text = JSON.stringify([ENTITY, FOUNDERS, SERVICES]) + llmsText();

    assert.ok(!text.includes("—"), "em dash found");
  });

  it("the site-wide header copy does not use the retired 'Technologies' name", () => {
    const text = JSON.stringify([ENTITY, SERVICES, siteGraph()]) + llmsText();

    assert.ok(!/drylake technologies/i.test(text));
  });
});

describe("structured data describes one organisation", () => {
  const [organization, website, ...founders] = siteGraph();

  it("Organization carries brand, legal name, ABN, ACN, Perth and the site", () => {
    assert.equal(organization["@type"], "Organization");
    assert.equal(organization["@id"], ORGANIZATION_ID);
    assert.equal(organization.name, "Drylake");
    assert.equal(organization.legalName, "DRYLAKE PTY LTD");
    assert.equal(organization.url, SITE_URL);
    assert.deepEqual(
      organization.identifier.map((id) => [id.propertyID, id.value]),
      [["ABN", "70 702 662 557"], ["ACN", "702 662 557"]]
    );
    assert.equal(organization.address.addressLocality, "Perth");
    assert.equal(organization.address.addressCountry, "AU");
    assert.ok(!("streetAddress" in organization.address), "no street address is published");
  });

  it("WebSite and founders point back at the same organisation", () => {
    assert.equal(website["@id"], WEBSITE_ID);
    assert.deepEqual(website.publisher, { "@id": ORGANIZATION_ID });
    assert.equal(founders.length, FOUNDERS.length);
    for (const person of founders) assert.deepEqual(person.worksFor, { "@id": ORGANIZATION_ID });
    assert.deepEqual(organization.founder, FOUNDERS.map((f) => ({ "@id": f.id })));
  });

  it("every page node and service is about / provided by #organization", () => {
    const page = webPageNode({ path: "/about", name: "About", description: "x", type: "AboutPage" });

    assert.deepEqual(page.about, { "@id": ORGANIZATION_ID });
    assert.deepEqual(page.isPartOf, { "@id": WEBSITE_ID });

    for (const service of SERVICES) {
      assert.deepEqual(serviceNode(service).provider, { "@id": ORGANIZATION_ID });
    }
  });

  it("never claims ratings or reviews that do not exist", () => {
    const text = JSON.stringify(allGraphs());

    assert.ok(!/aggregateRating|"review"|ratingValue/i.test(text));
  });

  it("breadcrumbs are absolute and ordered", () => {
    const crumbs = breadcrumbNode("/solutions/applied-ai", [
      { name: "Home", path: "/" },
      { name: "Solutions", path: "/solutions" },
    ]);

    assert.deepEqual(crumbs.itemListElement.map((item) => [item.position, item.item]), [
      [1, SITE_URL],
      [2, `${SITE_URL}/solutions`],
    ]);
  });

  it("JSON-LD output cannot break out of its script tag", () => {
    assert.ok(!jsonLd([{ "@type": "Thing", name: "</script><script>" }]).includes("</script>"));
  });

  it("the root layout emits the identity graph and every public page emits its own node", () => {
    assert.match(code("app/layout.tsx"), /<OrganizationSchema \/>/);

    for (const file of [
      "app/page.tsx",
      "app/solutions/page.tsx",
      "app/solutions/[slug]/page.tsx",
      "app/about/page.tsx",
      "app/contact/page.tsx",
      "app/privacy/page.tsx",
    ]) {
      assert.match(code(file), /webPageNode\(/, file);
    }
  });
});

describe("every public page is listed, titled and canonical", () => {
  const PRIVATE_DIRS = ["admin", "client", "portal", "sign-in", "sign-up", "api"];

  const routeFiles = walk(join(ROOT, "app"), (file) => file.endsWith("page.tsx")).filter(
    (file) => !PRIVATE_DIRS.some((dir) => file.startsWith(`app/${dir}/`))
  );

  const routes = routeFiles.flatMap((file) => {
    const route = `/${file.replace(/^app\//, "").replace(/\/?page\.tsx$/, "")}`.replace(/\/$/, "") || "/";

    if (route === "/solutions/[slug]") return SERVICES.map((service) => service.path);
    assert.ok(!route.includes("["), `unexpected dynamic public route ${route}: list its pages in PUBLIC_PAGES`);

    return [route];
  });

  it("the sitemap source lists exactly the public routes", () => {
    assert.deepEqual([...routes].sort(), PUBLIC_PAGES.map((page) => page.path).sort());
  });

  it("the sitemap is generated from PUBLIC_PAGES with real dates", () => {
    assert.match(code("app/sitemap.ts"), /PUBLIC_PAGES\.map\(/);

    for (const page of PUBLIC_PAGES) {
      const date = new Date(page.lastModified);

      assert.ok(!Number.isNaN(date.getTime()), page.path);
      assert.ok(date.getTime() <= Date.now() + 86_400_000, `${page.path} lastModified is in the future`);
    }
  });

  it("no private prefix appears in the public page list", () => {
    for (const page of PUBLIC_PAGES) {
      assert.ok(!PRIVATE_PREFIXES.some((prefix) => page.path.startsWith(prefix)), page.path);
    }
  });

  it("every static public page builds metadata for its own path (self canonical)", () => {
    for (const file of routeFiles.filter((f) => !f.includes("["))) {
      const route = `/${file.replace(/^app\//, "").replace(/\/?page\.tsx$/, "")}`.replace(/\/$/, "") || "/";
      const source = code(file);

      assert.match(source, /pageMetadata\(/, file);
      assert.match(source, new RegExp(`path:\\s*"${route.replace(/\//g, "\\/")}"`), `${file} canonical path`);
    }
  });

  it("titles and descriptions are unique, and descriptions fit a result snippet", () => {
    const titles = [];
    const descriptions = [];

    for (const file of routeFiles.filter((f) => !f.includes("["))) {
      const source = read(file);
      titles.push(source.match(/pageMetadata\(\{\s*title:\s*"([^"]+)"/)?.[1]);
      descriptions.push(source.match(/description:\s*\n?\s*"([^"]+)"/)?.[1]);
    }

    for (const service of SERVICES) {
      titles.push(service.title);
      descriptions.push(service.description);
      assert.ok(service.description.length >= 110 && service.description.length <= 180, `${service.slug}: ${service.description.length}`);
    }

    assert.ok(titles.every(Boolean) && descriptions.every(Boolean));
    assert.equal(new Set(titles).size, titles.length, "duplicate title");
    assert.equal(new Set(descriptions).size, descriptions.length, "duplicate description");
  });

  it("service pages are statically generated and only for known services", () => {
    const source = code("app/solutions/[slug]/page.tsx");

    assert.match(source, /export const dynamicParams = false/);
    assert.match(source, /generateStaticParams/);
  });

  it("every service page is linked from the homepage section, the footer and /solutions", () => {
    const solutions = read("components/sections/Solutions.tsx");

    for (const service of SERVICES) assert.ok(solutions.includes(`href: "${service.path}"`), service.path);
    assert.match(code("components/layout/Footer.tsx"), /SERVICES\.map\(/);
  });
});

describe("crawler policy: search and AI search in, training out, private closed", () => {
  const blocked = new Set(blockedTokens());
  const allowed = new Set(CRAWLERS.filter((c) => c.access === "allow").map((c) => c.token));

  it("search engines, AI search crawlers and user fetchers are allowed", () => {
    for (const token of ["Googlebot", "bingbot", "Applebot", "DuckDuckBot", "OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "PerplexityBot", "meta-webindexer"]) {
      assert.ok(allowed.has(token), token);
      assert.ok(!blocked.has(token), token);
    }
  });

  it("model-training crawlers and control tokens are opted out", () => {
    for (const token of ["GPTBot", "ClaudeBot", "CCBot", "meta-externalagent", "Amazonbot", "Applebot-Extended", "Google-Extended"]) {
      assert.ok(blocked.has(token), token);
    }
  });

  it("only training and control tokens are ever blocked", () => {
    for (const crawler of CRAWLERS.filter((c) => c.access === "disallow")) {
      assert.ok(["training", "control-token"].includes(crawler.class), crawler.token);
    }
  });

  it("every entry cites the vendor's own documentation", () => {
    for (const crawler of CRAWLERS) {
      assert.match(crawler.source, /^https:\/\/(developers\.google\.com|learn\.microsoft\.com|duckduckgo\.com|support\.apple\.com|www\.mojeek\.com|developers\.openai\.com|support\.claude\.com|docs\.perplexity\.ai|developers\.facebook\.com|developer\.amazon\.com|commoncrawl\.org)\//, crawler.token);
    }
    assert.equal(new Set(CRAWLERS.map((c) => c.token)).size, CRAWLERS.length, "duplicate token");
  });

  it("robots.ts opts training out and keeps the public site open and private surfaces closed", () => {
    const source = code("app/robots.ts");

    assert.match(source, /\{ userAgent: blockedTokens\(\), disallow: "\/" \}/);
    assert.match(source, /\{ userAgent: "\*", allow: "\/", disallow: \[\.\.\.PRIVATE_PREFIXES\] \}/);
    assert.match(source, /sitemap: `\$\{SITE_URL\}\/sitemap\.xml`/);
  });

  it("private prefixes cover every private application surface", () => {
    assert.deepEqual([...PRIVATE_PREFIXES].sort(), ["/admin", "/api", "/client", "/portal", "/sign-in", "/sign-up"]);
  });

  it("private surfaces also send X-Robots-Tag noindex", () => {
    const config = code("next.config.ts");

    assert.match(config, /PRIVATE_PREFIXES\.flatMap\(/);
    assert.match(config, /"X-Robots-Tag", value: "noindex, nofollow"/);
    assert.match(config, /`\$\{prefix\}\/:path\*`/);
  });

  it("the auth proxy only gates private pages, so crawlers never hit a sign-in redirect on public pages", () => {
    const proxy = code("proxy.ts");
    const gated = [...proxy.matchAll(/"(\/[a-z-]+)\(\.\*\)"/g)].map((m) => m[1]);

    assert.ok(gated.length > 0);
    for (const prefix of gated) assert.ok(PRIVATE_PREFIXES.includes(prefix), `${prefix} is gated but not private`);
  });
});

describe("machine-readable surfaces", () => {
  const text = llmsText();

  it("llms.txt states the entity and links every service", () => {
    for (const fact of ["# Drylake", "DRYLAKE PTY LTD", "70 702 662 557", "Perth, Western Australia, Australia", "https://drylake.com.au"]) {
      assert.ok(text.includes(fact), fact);
    }
    for (const service of SERVICES) assert.ok(text.includes(absoluteUrl(service.path)), service.path);
  });

  it("llms.txt is served as static text", () => {
    const route = code("app/llms.txt/route.ts");

    assert.match(route, /force-static/);
    assert.match(route, /text\/plain/);
  });

  it("the IndexNow key file holds exactly the key", () => {
    const file = join(ROOT, `public/${INDEXNOW_KEY}.txt`);

    assert.ok(existsSync(file));
    assert.equal(readFileSync(file, "utf8"), INDEXNOW_KEY);
    assert.match(INDEXNOW_KEY, /^[a-f0-9]{32}$/);
  });

  it("IndexNow submissions only ever contain this site's URLs", () => {
    const payload = indexNowPayload([`${SITE_URL}/about`, "https://evil.example/x", "not a url"]);

    assert.deepEqual(payload.urlList, [`${SITE_URL}/about`]);
    assert.equal(payload.keyLocation, `${SITE_URL}/${INDEXNOW_KEY}.txt`);
  });

  it("webmaster verification tokens come from the environment only", () => {
    const layout = code("app/layout.tsx");

    assert.match(layout, /process\.env\.GOOGLE_SITE_VERIFICATION/);
    assert.match(layout, /"msvalidate\.01": process\.env\.BING_SITE_VERIFICATION/);
  });

  it("the deploy workflow runs the live check, then IndexNow, on production deploys", () => {
    const workflow = read(".github/workflows/discoverability.yml");

    assert.match(workflow, /deployment_status:/);
    assert.match(workflow, /node scripts\/discoverability-check\.mjs/);
    assert.match(workflow, /needs: check/);
    assert.match(workflow, /node scripts\/indexnow-submit\.mjs/);
    assert.match(workflow, /environment == 'Production'/);
  });
});
