import { expect, test } from "@playwright/test";

import { isMobileProject, isRemote, PUBLIC_PATHS } from "./helpers";

/*
 * PERFORMANCE GUARDS. Not a lab benchmark (local numbers are not production numbers: see the
 * PR), but cheap tripwires for the regressions this site has actually had:
 *   - Clerk's browser SDK (~340 KB) loading on public pages (PR #31 scoped it to signed-in areas)
 *   - the homepage JavaScript growing (new heavy library, a client component swallowing a page)
 *   - the hero headline waiting for JavaScript or an entrance animation before it paints (LCP)
 */

/*
 * Compressed same-origin JavaScript fetched by "/" on a local production build, measured
 * 2026-10-07 at 154,458 bytes (151 KB) across 12 files: Next runtime, React and the page's
 * client islands. The budget leaves ~30% headroom; raise it deliberately, in the same PR as the
 * change that needs it.
 */
const BASE_HOME_JS_BUDGET_BYTES = 200 * 1024;

/*
 * The AI assistant launcher adds ~1.2 KB compressed to the homepage ONLY when the assistant is
 * built in (CHAT_ASSISTANT_ENABLED=true at build time; off, the launcher is dead-code-eliminated
 * and the number is unchanged). Allow 2 KB for that case; the chat panel itself is lazy-loaded.
 */
const HOME_JS_BUDGET_BYTES = BASE_HOME_JS_BUDGET_BYTES + (process.env.E2E_ASSISTANT ? 2 * 1024 : 0);

test("public pages never download Clerk", async ({ page }) => {
  test.setTimeout(120_000);
  const clerkRequests: string[] = [];
  page.on("request", (request) => {
    if (/clerk/i.test(request.url())) clerkRequests.push(request.url());
  });

  for (const path of PUBLIC_PATHS) {
    await page.goto(path, { waitUntil: "load" });
    await page.waitForTimeout(400);
  }

  expect(clerkRequests).toEqual([]);

  // Control: the sign-in screen DOES request Clerk (locally, from the placeholder key's
  // unresolvable domain), so an empty list above means "none", not "listener broken".
  await page.goto("/sign-in", { waitUntil: "load" });
  await expect.poll(() => clerkRequests.length).toBeGreaterThan(0);
});

test("homepage JavaScript stays inside its budget", async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo), "same bundle at every width");
  test.skip(isRemote, "budget is calibrated on the local build (production adds analytics)");

  await page.goto("/");
  await page.waitForLoadState("networkidle").catch(() => undefined);

  const scripts = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((entry) => (entry as PerformanceResourceTiming).initiatorType === "script")
      .filter((entry) => new URL(entry.name).origin === location.origin)
      .map((entry) => ({ name: entry.name, bytes: (entry as PerformanceResourceTiming).encodedBodySize }))
  );

  const total = scripts.reduce((sum, script) => sum + script.bytes, 0);
  testInfo.annotations.push({ type: "home-js-bytes", description: String(total) });
  console.log(`[perf] / script bytes (compressed): ${total} across ${scripts.length} files`);

  expect(total).toBeGreaterThan(0);
  expect(total, `homepage JS ${Math.round(total / 1024)} KB`).toBeLessThanOrEqual(HOME_JS_BUDGET_BYTES);
});

test.describe("first paint without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the hero headline is server-rendered, visible and at full opacity", async ({ page }) => {
    await page.goto("/");

    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
    await expect(h1).toContainText("running your business easier");

    const opacities = await h1.locator("span").evaluateAll((spans) =>
      [spans[0].parentElement!, ...spans].map((element) => Number(getComputedStyle(element).opacity))
    );
    expect(opacities.every((opacity) => opacity === 1), `opacities ${opacities}`).toBe(true);
  });

  test("every public page shows its headline and primary content without JavaScript", async ({ page }) => {
    for (const path of PUBLIC_PATHS) {
      await page.goto(path);
      await expect(page.locator("h1"), path).toBeVisible();
      expect((await page.locator("main").innerText()).length, `${path} main text`).toBeGreaterThan(300);
    }
  });
});

test("images declare their size or sit in a sized box (no layout shift)", async ({ page }) => {
  for (const path of ["/", "/about", "/contact"]) {
    await page.goto(path);

    const unsized = await page.locator("main img").evaluateAll((images) =>
      images
        .filter((image) => !image.getAttribute("width") && !image.getAttribute("height"))
        .filter((image) => {
          const parent = image.parentElement;
          return !parent || getComputedStyle(parent).position === "static";
        })
        .map((image) => image.getAttribute("src") ?? "")
    );

    expect(unsized, path).toEqual([]);
  }
});
