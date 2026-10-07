import { expect, test } from "@playwright/test";

import { isMobileProject, localPath, PRODUCTION_ORIGIN, PUBLIC_PATHS } from "./helpers";

/*
 * SEARCH VISIBILITY, observed on the rendered pages (lib/seo* unit tests cover the builders):
 * unique titles and descriptions, self-referencing canonicals on the production origin, a
 * complete and resolving Open Graph/Twitter card, parseable structured data, robots.txt,
 * sitemap.xml and noindex on everything private. Desktop project only: metadata does not
 * change with the viewport.
 */

test.beforeEach(({}, testInfo) => test.skip(isMobileProject(testInfo), "metadata is viewport independent"));

const canonicalFor = (path: string) => (path === "/" ? PRODUCTION_ORIGIN : `${PRODUCTION_ORIGIN}${path}`);

test("every public page has a unique title, description, canonical and share card", async ({ page, request }) => {
  test.setTimeout(120_000);

  const titles = new Map<string, string>();
  const descriptions = new Map<string, string>();
  const checkedImages = new Set<string>();

  for (const path of PUBLIC_PATHS) {
    await page.goto(path);
    const head = page.locator("head");

    const title = await page.title();
    const description = (await head.locator('meta[name="description"]').getAttribute("content")) ?? "";

    expect(title.length, `${path} title`).toBeGreaterThan(10);
    expect(title.length, `${path} title`).toBeLessThanOrEqual(70);
    expect(description.length, `${path} description`).toBeGreaterThanOrEqual(70);
    expect(description.length, `${path} description`).toBeLessThanOrEqual(170);
    expect(`${title} ${description}`, `${path} em dash`).not.toContain("—");
    expect(titles.has(title), `${path} duplicates the title of ${titles.get(title)}`).toBe(false);
    expect(descriptions.has(description), `${path} duplicates the description of ${descriptions.get(description)}`).toBe(false);
    titles.set(title, path);
    descriptions.set(description, path);

    await expect(page.locator("html")).toHaveAttribute("lang", "en-AU");
    await expect(head.locator('link[rel="canonical"]')).toHaveAttribute("href", canonicalFor(path));
    await expect(head.locator('meta[property="og:url"]')).toHaveAttribute("content", canonicalFor(path));
    await expect(head.locator('meta[property="og:title"]')).toHaveAttribute("content", /\S/);
    await expect(head.locator('meta[property="og:description"]')).toHaveAttribute("content", /\S/);
    await expect(head.locator('meta[property="og:locale"]')).toHaveAttribute("content", "en_AU");
    await expect(head.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");

    const robots = await head.locator('meta[name="robots"]').getAttribute("content");
    expect(robots ?? "", `${path} robots`).not.toMatch(/noindex/);

    const image = (await head.locator('meta[property="og:image"]').first().getAttribute("content")) ?? "";
    expect(image, `${path} og:image is absolute on the production origin`).toMatch(/^https:\/\/drylake\.com\.au\//);
    await expect(head.locator('meta[property="og:image:width"]').first()).toHaveAttribute("content", "1200");
    await expect(head.locator('meta[property="og:image:height"]').first()).toHaveAttribute("content", "630");

    const imagePath = localPath(image);
    if (!checkedImages.has(imagePath)) {
      checkedImages.add(imagePath);
      const response = await request.get(imagePath);
      expect(response.status(), `${path} share image ${imagePath}`).toBe(200);
      expect(response.headers()["content-type"]).toMatch(/^image\//);
    }
  }
});

test("structured data on every public page parses and names the organisation", async ({ page }) => {
  for (const path of PUBLIC_PATHS) {
    await page.goto(path);

    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) => scripts.map((script) => script.textContent ?? ""));

    expect(blocks.length, `${path} JSON-LD`).toBeGreaterThan(0);

    const types = new Set<string>();
    for (const block of blocks) {
      const data = JSON.parse(block);
      expect(data["@context"], `${path} @context`).toBe("https://schema.org");
      const nodes = data["@graph"] ?? [data];
      for (const node of nodes) [node["@type"]].flat().forEach((type: string) => types.add(type));
    }

    expect([...types].some((type) => type === "Organization" || type === "ProfessionalService"), `${path} types ${[...types]}`).toBe(true);
    if (path !== "/") expect(types.has("BreadcrumbList"), `${path} breadcrumb`).toBe(true);
  }
});

test("robots.txt: public site allowed, private surfaces disallowed, sitemap listed", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.status()).toBe(200);

  const body = await response.text();
  expect(body).toContain(`Sitemap: ${PRODUCTION_ORIGIN}/sitemap.xml`);
  for (const prefix of ["/api", "/admin", "/client", "/portal", "/sign-in", "/sign-up"]) {
    expect(body).toContain(`Disallow: ${prefix}`);
  }

  const wildcard = body.split(/\n\s*\n/).find((group) => /User-Agent: \*/i.test(group)) ?? "";
  expect(wildcard).toContain("Allow: /");
  expect(wildcard).not.toMatch(/Disallow: \/\s*$/m);
});

test("sitemap.xml lists exactly the public pages, and each one is live", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);

  const locations = [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const paths = locations.map((loc) => (loc === PRODUCTION_ORIGIN ? "/" : localPath(loc)));

  expect([...paths].sort()).toEqual([...PUBLIC_PATHS].sort());

  for (const path of paths) {
    const page = await request.get(path, { maxRedirects: 0 });
    expect(page.status(), path).toBe(200);
    expect(page.headers()["x-robots-tag"] ?? "", path).not.toContain("noindex");
  }
});

test("llms.txt and llms-full.txt are served as text", async ({ request }) => {
  for (const path of ["/llms.txt", "/llms-full.txt"]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["content-type"], path).toContain("text/plain");
    expect(await response.text(), path).toContain("Drylake");
  }
});

test("legacy /solutions/* service URLs redirect permanently to /services/*", async ({ request }) => {
  const response = await request.get("/solutions/custom-software", { maxRedirects: 0 });

  expect([301, 308]).toContain(response.status());
  expect(response.headers().location).toMatch(/\/services\/custom-software-development$/);
});

test("auth screens and the 404 are not indexable", async ({ page }) => {
  for (const path of ["/sign-in", "/sign-up", "/missing-page-for-seo-check"]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]').first(), path).toHaveAttribute("content", /noindex/);
    await expect(page.locator('link[rel="canonical"]'), `${path} claims no canonical`).toHaveCount(0);
  }
});
