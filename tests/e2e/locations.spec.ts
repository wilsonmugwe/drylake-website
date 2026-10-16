import { mkdirSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { horizontalOverflow, LOCATION_PATHS } from "./helpers";

/*
 * PR 5 (Perth location SEO): /perth and the standalone location pages render at a phone width
 * (375) and a desktop width (1440) with no sideways scroll, and the directory is navigable.
 * Set LOCATION_SHOTS=<dir> to also write full-page screenshots (used for the PR evidence).
 */
test.use({ reducedMotion: "reduce" });

const WIDTHS = [375, 1440] as const;
const PAGES = ["/perth", "/locations/osborne-park"] as const;

for (const path of PAGES) {
  for (const width of WIDTHS) {
    test(`${path} renders at ${width}px with no horizontal scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await page.waitForLoadState("networkidle").catch(() => undefined);

      await expect(page.locator("h1")).toBeVisible();

      const { scrollWidth, clientWidth } = await horizontalOverflow(page);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

      const shots = process.env.LOCATION_SHOTS;
      if (shots) {
        mkdirSync(shots, { recursive: true });
        await page.screenshot({ path: `${shots}/${path.replaceAll("/", "_").replace(/^_/, "")}-${width}.png`, fullPage: true });
      }
    });
  }
}

test("/perth lists every standalone page and an in-page anchor for the rest", async ({ page }) => {
  await page.goto("/perth");

  for (const path of LOCATION_PATHS) {
    await expect(page.locator(`#areas a[href="${path}"]`)).toHaveCount(1);
  }

  await expect(page.locator('#areas a[href="/perth#area-subiaco"]')).toHaveCount(1);
  await expect(page.locator("#area-subiaco")).toHaveCount(1);
  expect(await page.locator("li[id^='area-']").count()).toBeGreaterThanOrEqual(70);
});

test("each location page has one h1, a canonical, a breadcrumb and a consultation link", async ({ page }) => {
  for (const path of LOCATION_PATHS) {
    await page.goto(path);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://drylake.com.au${path}`);
    await expect(page.locator("nav[aria-label='Breadcrumb']")).toBeVisible();
    await expect(page.locator('main a[href^="/consultation"]').first()).toBeVisible();
    expect(await page.locator("script[type='application/ld+json']").allTextContents().then((all) => all.join(""))).not.toMatch(/LocalBusiness|aggregateRating|streetAddress/);
  }
});
