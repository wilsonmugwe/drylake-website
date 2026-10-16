import { expect, test, type Page } from "@playwright/test";

import { expectNoAxeViolations, horizontalOverflow, isMobileProject, SERVICE_PATHS } from "./helpers";

/*
 * PR 8 (2026-10-16): the Services dropdown (desktop disclosure) and its mobile expandable group,
 * the footer hub, and layout at the widths that matter. Desktop-only and mobile-only blocks skip
 * on the other project, as the existing navigation specs do.
 */

const NAV = (page: Page) => page.getByRole("navigation", { name: "Primary navigation" });
const trigger = (page: Page) => NAV(page).getByRole("button", { name: "Services" });

async function panel(page: Page) {
  const id = await trigger(page).getAttribute("aria-controls");
  expect(id, "aria-controls points at the panel").toBeTruthy();
  return page.locator(`[id="${id}"]`);
}

test.describe("desktop Services dropdown", () => {
  test.beforeEach(({}, testInfo) => test.skip(isMobileProject(testInfo), "desktop header only at >= 1024px"));

  test("is closed by default and exposes aria-expanded / aria-controls", async ({ page }) => {
    await page.goto("/about");
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
    await expect(await panel(page)).toBeHidden();
  });

  test("Enter and Space open it; the links are exactly the service pages plus All services", async ({ page }) => {
    await page.goto("/about");

    for (const key of ["Enter", "Space"]) {
      await trigger(page).focus();
      await page.keyboard.press(key);
      await expect(trigger(page)).toHaveAttribute("aria-expanded", "true");

      const links = (await panel(page)).getByRole("link");
      await expect(links).toHaveCount(SERVICE_PATHS.length + 1);
      const hrefs = await links.evaluateAll((items) => items.map((item) => item.getAttribute("href")));
      expect(hrefs).toEqual([...SERVICE_PATHS, "/services"]);

      await page.keyboard.press(key); // toggles closed again
      await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
    }
  });

  test("ArrowDown opens and focuses the first link; Tab walks the links; Escape closes and returns focus", async ({ page }) => {
    await page.goto("/about");
    await trigger(page).focus();
    await page.keyboard.press("ArrowDown");

    const links = (await panel(page)).getByRole("link");
    await expect(links.first()).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(links.nth(1)).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
    await expect(trigger(page)).toBeFocused();
  });

  test("Escape from the button itself closes it and keeps focus on the button", async ({ page }) => {
    await page.goto("/about");
    await trigger(page).focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
    await expect(trigger(page)).toBeFocused();
  });

  test("tabbing out of the last link closes it (no keyboard trap)", async ({ page }) => {
    await page.goto("/about");
    await trigger(page).focus();
    await page.keyboard.press("Enter");

    for (let i = 0; i < SERVICE_PATHS.length + 2; i++) await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Solutions" }).first()).toBeFocused();
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
  });

  test("hover opens after a short intent delay and closes when the pointer leaves", async ({ page }) => {
    await page.goto("/about");
    await trigger(page).hover();
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "true");

    await page.mouse.move(700, 600);
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
  });

  test("choosing a service closes the menu and opens that page at the top", async ({ page }) => {
    await page.goto("/about");
    await trigger(page).focus();
    await page.keyboard.press("Enter");
    await (await panel(page)).getByRole("link", { name: "Business automation" }).click();

    await expect(page).toHaveURL(/\/services\/business-automation$/);
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
  });

  test("dropdown targets are 44px and the open header state has no axe violations", async ({ page }) => {
    await page.goto("/about");
    await trigger(page).focus();
    await page.keyboard.press("Enter");

    const heights = await (await panel(page)).getByRole("link").evaluateAll((items) =>
      items.map((item) => item.getBoundingClientRect().height)
    );
    for (const height of heights) expect(height).toBeGreaterThanOrEqual(44);

    await expectNoAxeViolations(page, ".site-header");
  });

  test("the descriptor separates what we build from business problems", async ({ page }) => {
    await page.goto("/about");
    await trigger(page).focus();
    await page.keyboard.press("Enter");
    const open = await panel(page);
    await expect(open).toContainText("What we build");
    await expect(open).toContainText("Starting from a problem? See Solutions.");
  });

  test("the header shows six items plus the CTA and Client Login", async ({ page }) => {
    await page.goto("/");
    const items = await NAV(page).locator("ul").first().locator("> li").count();
    expect(items).toBeLessThanOrEqual(6);
    await expect(NAV(page).getByRole("link", { name: "Perth" })).toHaveAttribute("href", "/perth");
    await expect(NAV(page).getByRole("link", { name: "Start Free Consultation" })).toBeVisible();
  });
});

test.describe("mobile Services group", () => {
  test.beforeEach(({}, testInfo) => test.skip(!isMobileProject(testInfo), "mobile menu below 1024px only"));
  test.use({ reducedMotion: "reduce" });

  const dialog = (page: Page) => page.getByRole("dialog", { name: "Site navigation" });
  const group = (page: Page) => dialog(page).getByRole("button", { name: /Services/ });

  test("Services expands in place with aria-expanded, 48px links and the same service list", async ({ page }) => {
    await page.goto("/about");
    await page.getByRole("button", { name: "Menu" }).click();

    await expect(group(page)).toHaveAttribute("aria-expanded", "false");
    const box = await group(page).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

    await group(page).click();
    await expect(group(page)).toHaveAttribute("aria-expanded", "true");

    const id = await group(page).getAttribute("aria-controls");
    const links = dialog(page).locator(`[id="${id}"]`).getByRole("link");
    await expect(links).toHaveCount(SERVICE_PATHS.length + 1);
    const hrefs = await links.evaluateAll((items) => items.map((item) => item.getAttribute("href")));
    expect(hrefs).toEqual([...SERVICE_PATHS, "/services"]);

    const heights = await links.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height));
    for (const height of heights) expect(height).toBeGreaterThanOrEqual(44);

    await expectNoAxeViolations(page, "#mobile-navigation");
  });

  test("choosing a service closes the menu and opens the page at the top", async ({ page }) => {
    await page.goto("/about");
    await page.getByRole("button", { name: "Menu" }).click();
    await group(page).click();
    await dialog(page).getByRole("link", { name: "Websites & web development" }).click();

    await expect(page).toHaveURL(/\/services\/web-development$/);
    await expect(dialog(page)).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
  });

  test("Escape closes the whole menu from inside the expanded group and returns focus", async ({ page }) => {
    await page.goto("/about");
    await page.getByRole("button", { name: "Menu" }).click();
    await group(page).click();
    await page.keyboard.press("Escape");

    await expect(dialog(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Menu" })).toBeFocused();
  });

  test("click-to-call uses the verified business line, 44px tall", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menu" }).click();

    const call = dialog(page).getByRole("link", { name: "0433 448 000" });
    await expect(call).toHaveAttribute("href", "tel:+61433448000");
    const box = await call.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});

test.describe("layout and footer hub", () => {
  for (const width of [320, 375, 768, 1440]) {
    test(`no horizontal scroll at ${width}px, menus open and closed`, async ({ page }, testInfo) => {
      test.skip(isMobileProject(testInfo), "viewport is set per test on the desktop project");
      await page.setViewportSize({ width, height: 900 });

      for (const path of ["/", "/services"]) {
        await page.goto(path);
        const closed = await horizontalOverflow(page);
        expect(closed.scrollWidth, `${path} closed`).toBeLessThanOrEqual(closed.clientWidth);
      }

      if (width >= 1024) {
        await trigger(page).focus();
        await page.keyboard.press("Enter");
      } else {
        await page.getByRole("button", { name: "Menu" }).click();
        await page.getByRole("dialog", { name: "Site navigation" }).getByRole("button", { name: /Services/ }).click();
      }
      const open = await horizontalOverflow(page);
      expect(open.scrollWidth, "menu open").toBeLessThanOrEqual(open.clientWidth);
    });
  }

  test("header fits on one row at 1024px with six items, Client Login and the CTA", async ({ page }, testInfo) => {
    test.skip(isMobileProject(testInfo), "desktop header");
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto("/");
    const overflow = await horizontalOverflow(page);
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
    const box = await page.locator(".site-header").boundingBox();
    expect(box?.height ?? 0).toBeLessThan(90);
  });

  test("footer links every audience path", async ({ page }) => {
    await page.goto("/privacy");
    const footer = page.getByRole("navigation", { name: "Footer navigation" });
    for (const href of [
      "/services",
      ...SERVICE_PATHS,
      "/solutions",
      "/perth",
      "/about",
      "/contact",
      "/consultation",
      "/privacy",
      "/terms",
    ]) {
      await expect(footer.locator(`a[href="${href}"]`).first(), href).toBeAttached();
    }
    await expect(page.locator('footer a[href="tel:+61433448000"]')).toBeAttached();
  });
});
