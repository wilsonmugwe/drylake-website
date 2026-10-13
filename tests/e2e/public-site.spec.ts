import { expect, test, type Page } from "@playwright/test";

import { collectConsoleErrors, isMobileProject, PUBLIC_PATHS } from "./helpers";

/*
 * PUBLIC SITE: every public page renders its chrome and content, the header/footer links go
 * where they say, the primary action lands on the contact page at the top, and the browser's
 * Back/Forward buttons retrace a visit. Runs on desktop (1440) and mobile (375).
 */

test.use({ reducedMotion: "reduce" });

/* Top of a section relative to the viewport, after the fixed header (scroll-margin) has been applied. */
async function sectionTop(page: Page, id: string) {
  return page.evaluate((sectionId) => document.getElementById(sectionId)?.getBoundingClientRect().top ?? NaN, id);
}

async function expectSectionInView(page: Page, id: string) {
  // Lands at the section start: just below the fixed header, never mid-page.
  await expect.poll(() => sectionTop(page, id), { message: `#${id} scrolled into view` }).toBeLessThan(140);
  await expect.poll(() => sectionTop(page, id)).toBeGreaterThan(-5);
}

for (const path of PUBLIC_PATHS) {
  test(`${path} renders header, one h1, main content and footer without errors`, async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const response = await page.goto(path);

    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("main#main-content")).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Footer navigation" })).toBeAttached();
    await expect(page.getByRole("link", { name: "Drylake home" }).first()).toBeVisible();

    // No em dash anywhere a visitor reads (portfolio rule).
    const text = await page.locator("body").innerText();
    expect(text, "em dash in visible copy").not.toContain("—");

    expect(errors, "console errors").toEqual([]);
  });
}

test("homepage hero states the proposition and offers the free primary action", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("h1")).toHaveText(/Technology that makes\s*running your business easier\./);

  const cta = page.locator("main").getByRole("link", { name: /Get Started for Free/i }).first();
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute("href", "/contact");
});

test("logo: header wordmark draws the y in tile ochre and links home", async ({ page }) => {
  await page.goto("/about");

  const home = page.locator("header").getByRole("link", { name: "Drylake home" });
  await expect(home).toBeVisible();

  const ochreStrokes = await home
    .locator("svg path")
    .evaluateAll((paths) => paths.map((path) => (path.getAttribute("stroke") ?? "").toUpperCase()));
  expect(ochreStrokes).toContain("#C2703D");

  await home.click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
});

test("Get Started for Free opens the contact page at the top, not the footer", async ({ page }, testInfo) => {
  await page.goto("/");

  if (isMobileProject(testInfo)) {
    await page.locator("main").getByRole("link", { name: /Get Started for Free/i }).first().click();
  } else {
    await page.locator("header").getByRole("link", { name: /Get Started for Free/i }).click();
  }

  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.locator("h1")).toBeInViewport();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
});

test.describe("desktop navbar", () => {
  test.beforeEach(({}, testInfo) => test.skip(isMobileProject(testInfo), "desktop header links are hidden below 1024px"));

  test("section links scroll to their sections, every time", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Primary navigation" });

    await nav.getByRole("link", { name: "What We Do" }).click();
    await expect(page).toHaveURL(/\/#solutions$/);
    await expectSectionInView(page, "solutions");

    await nav.getByRole("link", { name: "Our Approach" }).click();
    await expect(page).toHaveURL(/\/#approach$/);
    await expectSectionInView(page, "approach");

    await nav.getByRole("link", { name: "About" }).click();
    await expect(page).toHaveURL(/\/#about$/);
    await expectSectionInView(page, "about");

    // Same link again after scrolling away: still scrolls (identical-URL <Link> was a no-op).
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await nav.getByRole("link", { name: "About" }).click();
    await expectSectionInView(page, "about");
  });

  test("section links work from another page", async ({ page }) => {
    await page.goto("/privacy");
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Our Approach" }).click();

    await expect(page).toHaveURL(/\/#approach$/);
    await expectSectionInView(page, "approach");
  });

  test("Contact and Client Login go to the right places", async ({ page }) => {
    await page.goto("/about");
    const nav = page.getByRole("navigation", { name: "Primary navigation" });

    await nav.getByRole("link", { name: "Contact" }).click();
    await expect(page).toHaveURL(/\/contact$/);
    await expect(page.locator("h1")).toBeInViewport();

    await expect(nav.getByRole("link", { name: "Client Login" })).toHaveAttribute("href", "/portal");
  });
});

test("browser Back and Forward retrace a visit", async ({ page }) => {
  await page.goto("/");
  await page.locator("footer").getByRole("link", { name: "About", exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);

  await page.locator("footer").getByRole("link", { name: "Contact", exact: true }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.locator("h1")).toBeInViewport();

  await page.goBack();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.locator("h1")).toContainText(/\S/);

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("h1")).toContainText("Technology that makes");

  await page.goForward();
  await expect(page).toHaveURL(/\/about$/);

  await page.goForward();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.locator("h1")).toContainText("getting in the way");
});

test("Back after a section jump returns to the previous position", async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo), "covered for the mobile menu in mobile-nav.spec.ts");

  await page.goto("/");
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "About" }).click();
  await expect(page).toHaveURL(/\/#about$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
});

test("footer: direct contact lines, company details and every link resolves", async ({ page, request }) => {
  await page.goto("/");
  const footer = page.locator("footer");

  await expect(footer.locator('a[href="mailto:hello@drylake.com.au"]')).toBeAttached();
  await expect(footer.locator('a[href="tel:+61433448000"]')).toBeAttached();
  await expect(footer).toContainText(/Drylake Pty Ltd/i);
  await expect(footer).toContainText("ABN 70 702 662 557");

  const hrefs = await footer
    .getByRole("navigation", { name: "Footer navigation" })
    .locator("a[href]")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));

  expect(hrefs.length).toBeGreaterThan(8);

  for (const href of new Set(hrefs.map((href) => href.split("#")[0] || "/"))) {
    const response = await request.get(href);
    expect(response.status(), `${href}`).toBeLessThan(400);
  }
});

test("internal links on every public page resolve (no broken links)", async ({ page, request }, testInfo) => {
  test.skip(isMobileProject(testInfo), "link graph is the same at every width; checked once");
  test.setTimeout(120_000);

  const targets = new Set<string>();

  for (const path of PUBLIC_PATHS) {
    await page.goto(path);
    const hrefs = await page
      .locator('a[href^="/"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
    hrefs.forEach((href) => targets.add(href.split("#")[0] || "/"));
  }

  const broken: string[] = [];

  for (const href of targets) {
    const response = await request.get(href);
    if (response.status() >= 400) broken.push(`${href} -> ${response.status()}`);
  }

  expect(broken).toEqual([]);
});

test("unknown URL: branded 404 with a way home, not indexed", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist");

  expect(response?.status()).toBe(404);
  await expect(page.locator("h1")).toContainText("Page not found");
  // Next adds its own noindex robots tag to a 404 next to ours; every one must say noindex.
  const robots = await page.locator('meta[name="robots"]').evaluateAll((tags) => tags.map((tag) => tag.getAttribute("content")));
  expect(robots.length).toBeGreaterThan(0);
  expect(robots.every((content) => /noindex/.test(content ?? ""))).toBe(true);
  await expect(page.locator('a[href="/"]').first()).toBeVisible();
});
