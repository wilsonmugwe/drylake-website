import { expect, test } from "@playwright/test";

import { horizontalOverflow, PUBLIC_PATHS, stubTurnstile, undersizedTargets, WIDTH_MATRIX } from "./helpers";
import { PAGE_HEIGHT_BASELINE } from "./page-height-baseline";

/*
 * RESPONSIVE MATRIX (project "matrix"): every public page plus the sign-in and 404 screens at
 * 320, 360, 375, 390, 393, 414, 430, 768, 1024 and 1440 px wide (800 px tall).
 *
 *   overflow     the document is never wider than the viewport (no sideways scroll)
 *   targets      every control is at least 44 px tall below 1024 px (touch), 24 px above
 *                (WCAG 2.5.8 minimum; desktop footer rows are 34 px by design)
 *   typography   no heading is wider than its own box (clipped or overflowing headline)
 *   overlap      the fixed header never covers the page headline at load
 *   spacing      page height stays within a band around the 2026-10-07 baseline: a section
 *                that balloons (spacing regression) or vanishes (render failure) fails
 */

test.use({ reducedMotion: "reduce" });

const HEIGHT_GROWTH_TOLERANCE = 1.15;
const HEIGHT_SHRINK_TOLERANCE = 0.75;

for (const path of [...PUBLIC_PATHS, "/sign-in", "/a-missing-page"]) {
  test(`${path} at every width`, async ({ page }) => {
    test.setTimeout(120_000);
    await stubTurnstile(page);
    const problems: string[] = [];

    for (const width of WIDTH_MATRIX) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      await page.waitForLoadState("networkidle").catch(() => undefined);

      const { scrollWidth, clientWidth } = await horizontalOverflow(page);
      if (scrollWidth > clientWidth) problems.push(`${width}px: page is ${scrollWidth}px wide (overflow)`);

      const small = await undersizedTargets(page, width < 1024 ? 44 : 24);
      if (small.length) problems.push(`${width}px: small targets ${small.join(", ")}`);

      const clipped = await page.locator("h1, h2").evaluateAll((headings) =>
        headings
          .filter((heading) => heading.getBoundingClientRect().width > 0)
          .filter((heading) => heading.scrollWidth > heading.clientWidth + 1)
          .map((heading) => (heading.textContent ?? "").trim().slice(0, 40))
      );
      if (clipped.length) problems.push(`${width}px: clipped headings ${clipped.join(" | ")}`);

      const overlap = await page.evaluate(() => {
        const header = document.querySelector("header.site-header");
        const h1 = document.querySelector("h1");
        if (!header || !h1) return null;
        const headerBottom = header.getBoundingClientRect().bottom;
        const h1Top = h1.getBoundingClientRect().top;
        return h1Top < headerBottom - 1 ? `h1 top ${Math.round(h1Top)} under header bottom ${Math.round(headerBottom)}` : null;
      });
      if (overlap) problems.push(`${width}px: ${overlap}`);

      const baseline = PAGE_HEIGHT_BASELINE[path]?.[width];
      if (baseline) {
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        if (height > baseline * HEIGHT_GROWTH_TOLERANCE || height < baseline * HEIGHT_SHRINK_TOLERANCE) {
          problems.push(`${width}px: page height ${height}px vs baseline ${baseline}px`);
        }
      }
    }

    expect(problems).toEqual([]);
  });
}
