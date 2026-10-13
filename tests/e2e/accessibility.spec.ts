import { expect, test } from "@playwright/test";

import { expectNoAxeViolations, isMobileProject, PUBLIC_PATHS, revealWholePage, stubTurnstile } from "./helpers";

/*
 * ACCESSIBILITY: axe-core WCAG 2.2 A/AA (colour contrast included) on every public page at
 * 375 and 1440, plus the things axe cannot judge: skip link, keyboard order, visible focus,
 * heading outline, reduced motion and the mobile menu dialog.
 */

for (const path of [...PUBLIC_PATHS, "/sign-in", "/page-that-does-not-exist"]) {
  test(`axe: ${path} has no WCAG A/AA violations`, async ({ page }) => {
    await stubTurnstile(page);
    await page.goto(path);
    await revealWholePage(page);
    await expectNoAxeViolations(page);
  });
}

for (const path of PUBLIC_PATHS) {
  test(`headings: ${path} has one h1 and never skips a level`, async ({ page }) => {
    await page.goto(path);

    const levels = await page
      .locator("h1, h2, h3, h4, h5, h6")
      .evaluateAll((headings) =>
        headings
          .filter((heading) => !heading.closest("[aria-hidden=true]"))
          .map((heading) => Number(heading.tagName.slice(1)))
      );

    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    expect(levels[0], "first heading is the h1").toBe(1);

    const skips = levels.flatMap((level, index) =>
      index > 0 && level > levels[index - 1] + 1 ? [`h${levels[index - 1]} -> h${level}`] : []
    );
    expect(skips, "heading level skips").toEqual([]);
  });
}

test("skip link is the first stop and moves focus to the main content", async ({ page }) => {
  await page.goto("/about");
  await page.keyboard.press("Tab");

  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();

  await page.keyboard.press("Enter");
  await expect(page.locator("main#main-content")).toBeFocused();
});

test("keyboard: the header is reachable in reading order with a visible focus indicator", async ({ page }, testInfo) => {
  await page.goto("/privacy");

  const expected = isMobileProject(testInfo)
    ? ["Skip to content", "Drylake home", "Menu"]
    : ["Skip to content", "Drylake home", "What We Do", "Our Approach", "About", "Contact", "Client Login", "Start Free Consultation"];

  for (const name of expected) {
    await page.keyboard.press("Tab");

    const focused = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      if (!element) return null;
      const style = getComputedStyle(element);
      return {
        name: (element.getAttribute("aria-label") ?? element.textContent ?? "").trim(),
        indicator:
          (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) ||
          (style.boxShadow !== "none" && style.boxShadow !== ""),
      };
    });

    expect(focused?.name, "focus order").toContain(name);
    expect(focused?.indicator, `${name} shows a focus indicator`).toBe(true);
  }
});

test("keyboard: the contact form can be completed without a mouse", async ({ page }) => {
  await stubTurnstile(page);
  await page.goto("/contact");

  await page.getByLabel("Your name").focus();
  const order: string[] = [];

  for (let i = 0; i < 6; i++) {
    order.push(await page.evaluate(() => (document.activeElement as HTMLElement | null)?.id ?? ""));
    await page.keyboard.press("Tab");
  }

  expect(order).toEqual(["name", "email", "company", "projectType", "helpType", "message"]);
});

test("mobile menu dialog passes axe and labels its regions", async ({ page }, testInfo) => {
  test.skip(!isMobileProject(testInfo), "mobile only");
  await page.goto("/");
  await page.getByRole("button", { name: "Menu" }).click();

  await expect(page.getByRole("dialog", { name: "Site navigation" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await expectNoAxeViolations(page, "#mobile-navigation");
});

test.describe("motion", () => {
  test("reduced motion: nothing animates for longer than an instant", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();

    for (const path of ["/", "/about", "/contact"]) {
      await page.goto(path);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
      await page.waitForTimeout(200);

      const long = await page.evaluate(() =>
        document
          .getAnimations()
          .filter((animation) => {
            const timing = animation.effect?.getComputedTiming();
            const duration = Number(timing?.duration ?? 0);
            return animation.playState === "running" && (duration > 50 || timing?.iterations === Infinity);
          })
          .map((animation) => (animation as CSSAnimation).animationName ?? "animation")
      );

      expect(long, `${path} long animations under reduced motion`).toEqual([]);
    }

    await context.close();
  });

  test("full motion: nothing runs forever (no perpetual animation)", async ({ page }) => {
    for (const path of ["/", "/about", "/services"]) {
      await page.goto(path);

      const infinite = await page.evaluate(() =>
        document
          .getAnimations()
          .filter((animation) => animation.effect?.getComputedTiming().iterations === Infinity)
          .map((animation) => (animation as CSSAnimation).animationName ?? "animation")
      );

      expect(infinite, `${path} infinite animations`).toEqual([]);
    }
  });
});
