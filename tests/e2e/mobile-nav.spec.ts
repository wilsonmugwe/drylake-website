import { expect, test, type Page } from "@playwright/test";

import { isMobileProject } from "./helpers";

/*
 * MOBILE NAVIGATION: the full-screen menu is a real modal dialog (focus in, Tab trapped,
 * Escape and Close return focus, page scroll locked), and choosing a destination closes it in
 * the same tap that navigates or scrolls. Mobile project only (the control is hidden >= 1024px).
 */

test.use({ reducedMotion: "reduce" });

test.beforeEach(({}, testInfo) => test.skip(!isMobileProject(testInfo), "mobile menu exists below 1024px only"));

function menuButton(page: Page) {
  return page.getByRole("button", { name: "Menu" });
}

function dialog(page: Page) {
  return page.getByRole("dialog", { name: "Site navigation" });
}

async function openMenu(page: Page) {
  await menuButton(page).click();
  await expect(dialog(page)).toBeVisible();
}

test("menu control is a 44px button that opens a modal dialog with focus inside", async ({ page }) => {
  await page.goto("/");

  const button = menuButton(page);
  await expect(button).toHaveAttribute("aria-expanded", "false");
  const box = await button.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  await openMenu(page);
  await expect(dialog(page)).toHaveAttribute("aria-modal", "true");
  await expect(page.getByRole("button", { name: "Close" })).toBeFocused();
  await expect(menuButton(page)).toHaveAttribute("aria-expanded", "true");

  // The page behind cannot scroll while the menu is open.
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");
});

test("Tab is trapped inside the menu, Escape closes it and returns focus", async ({ page }) => {
  await page.goto("/about");
  await openMenu(page);

  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest("#mobile-navigation")))).toBe(true);
  }

  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Shift+Tab");
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest("#mobile-navigation")))).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);
  await expect(menuButton(page)).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
});

test("Close button closes the menu and returns focus", async ({ page }) => {
  await page.goto("/");
  await openMenu(page);

  await page.getByRole("button", { name: "Close" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(menuButton(page)).toBeFocused();
});

test("menu lists the destinations, Client Login and the primary action, all 44px or more", async ({ page }) => {
  await page.goto("/");
  await openMenu(page);

  const menu = dialog(page);
  for (const name of ["What We Do", "Our Approach", "About", "Contact", "Client Login", "Start Free Consultation"]) {
    const link = menu.getByRole("link", { name: new RegExp(name) }).first();
    await expect(link).toBeVisible();
    const box = await link.boundingBox();
    expect(box?.height ?? 0, `${name} tap target`).toBeGreaterThanOrEqual(44);
  }
});

test("a section link closes the menu and lands on the section", async ({ page }) => {
  await page.goto("/");
  await openMenu(page);

  await dialog(page).getByRole("link", { name: /About/ }).click();

  await expect(dialog(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/#about$/);
  await expect
    .poll(() => page.evaluate(() => document.getElementById("about")?.getBoundingClientRect().top ?? NaN))
    .toBeLessThan(120);
  await expect
    .poll(() => page.evaluate(() => document.getElementById("about")?.getBoundingClientRect().top ?? NaN))
    .toBeGreaterThan(-5);

  // Scroll lock released: the page scrolls again.
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
});

test("a section link from another page navigates home to the section", async ({ page }) => {
  await page.goto("/contact");
  await openMenu(page);

  await dialog(page).getByRole("link", { name: /What We Do/ }).click();

  await expect(page).toHaveURL(/\/#solutions$/);
  await expect(dialog(page)).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => document.getElementById("solutions")?.getBoundingClientRect().top ?? NaN))
    .toBeLessThan(120);
});

test("Start Free Consultation from the menu opens the booking page at the top", async ({ page }) => {
  await page.goto("/about");
  await page.evaluate(() => window.scrollTo(0, 1200));
  await openMenu(page);

  await dialog(page).getByRole("link", { name: /Start Free Consultation/ }).click();

  await expect(page).toHaveURL(/\/consultation$/);
  await expect(dialog(page)).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
});

test("Back after a menu section jump returns to the top of the page", async ({ page }) => {
  await page.goto("/");
  await openMenu(page);
  await dialog(page).getByRole("link", { name: /Our Approach/ }).click();
  await expect(page).toHaveURL(/\/#approach$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
  await expect(dialog(page)).toHaveCount(0);
});
