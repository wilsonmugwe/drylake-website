import { expect, test, type Page } from "@playwright/test";

import { collectConsoleErrors, horizontalOverflow } from "./helpers";

/*
 * Homepage clarity (2026-10-10): the five hero tiles open a small card on the same page.
 * Desktop (1440) uses the tile beside the headline; mobile (375) uses the phone composition.
 * Pinned: the card opens beside its plate, inside the viewport, without navigating; it closes on
 * a second click, an outside click, Escape and its close button; only one is ever open; the whole
 * plate (not just its label) is the target; keyboard users can open and close it.
 */

test.use({ reducedMotion: "reduce" });

const CARDS = {
  Quotes: ["Preparing quotes takes too long.", "Create, send and keep track of quotes without losing paperwork."],
  Invoices: ["Keeping track of invoices and payments is frustrating.", "Keep invoices and payment information organised in one place."],
  Scheduling: ["Appointments get missed, double-booked or forgotten.", "Make it easier to manage bookings, availability and reminders."],
  "One system": ["Your business information is spread across too many places.", "Bring the tools you rely on together so your business runs more smoothly."],
  Enquiries: ["Customer messages get buried in emails or missed.", "Keep enquiries together so it’s easier to respond and follow up."],
} as const;
type Label = keyof typeof CARDS;

/* The visible interactive picture (the tile on desktop, the phone composition on phones). */
const picture = (page: Page) => page.locator(".lb-ix").filter({ visible: true });
const plate = (page: Page, label: Label) => picture(page).getByRole("button", { name: label, exact: true });
const openCards = (page: Page) => page.locator(".lb-pop:popover-open");

/* Centre of a plate's label (where its focus ring sits), in page coordinates. */
async function labelPoint(page: Page, label: Label) {
  const box = await plate(page, label).locator(".lb-hit-mark").boundingBox();
  if (!box) throw new Error(`${label}: no label box`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function clickPlate(page: Page, label: Label) {
  const { x, y } = await labelPoint(page, label);
  await page.mouse.click(x, y);
}

async function openHome(page: Page) {
  await page.goto("/");
  await picture(page).scrollIntoViewIfNeeded();
  await expect(plate(page, "Quotes")).toBeVisible();
}

test("the five tiles sit where the brief puts them", async ({ page }) => {
  await openHome(page);
  const q = await labelPoint(page, "Quotes");
  const i = await labelPoint(page, "Invoices");
  const s = await labelPoint(page, "Scheduling");
  const o = await labelPoint(page, "One system");
  const e = await labelPoint(page, "Enquiries");
  expect(q.x).toBeLessThan(i.x);
  expect(q.y).toBeLessThan(s.y);
  expect(s.x).toBeLessThan(e.x);
  expect(i.y).toBeLessThan(e.y);
  expect(o.x).toBeGreaterThan(s.x);
  expect(o.y).toBeGreaterThan(i.y);
  expect(o.y).toBeLessThan(e.y);
});

for (const label of Object.keys(CARDS) as Label[]) {
  test(`${label}: opens its card beside the plate, on the same page`, async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openHome(page);
    const url = page.url();
    const pages = page.context().pages().length;

    await clickPlate(page, label);
    const card = openCards(page);
    await expect(card).toHaveCount(1);
    await expect(card).toContainText(label);
    await expect(card).toContainText("The problem");
    await expect(card).toContainText(CARDS[label][0]);
    await expect(card).toContainText("How we help");
    await expect(card).toContainText(CARDS[label][1]);
    await expect(plate(page, label)).toHaveAttribute("aria-expanded", "true");

    // Same page: no navigation, no new tab.
    expect(page.url()).toBe(url);
    expect(page.context().pages().length).toBe(pages);

    // Inside the viewport, compact, and near its plate.
    const viewport = page.viewportSize()!;
    const box = (await card.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    const tile = (await picture(page).boundingBox())!;
    expect(box.width * box.height).toBeLessThan(tile.width * tile.height);
    const at = await labelPoint(page, label);
    const gap = Math.min(Math.abs(box.y + box.height - at.y), Math.abs(box.y - at.y));
    expect(gap, "card sits just above or below its plate").toBeLessThan(80);

    const { scrollWidth, clientWidth } = await horizontalOverflow(page);
    expect(scrollWidth, "no horizontal scroll").toBeLessThanOrEqual(clientWidth);
    expect(errors).toEqual([]);
  });
}

test("a second click closes it; another tile replaces it; never two at once", async ({ page }) => {
  await openHome(page);
  await clickPlate(page, "Quotes");
  await expect(openCards(page)).toHaveCount(1);
  await clickPlate(page, "Quotes");
  await expect(openCards(page)).toHaveCount(0);

  await clickPlate(page, "Quotes");
  await clickPlate(page, "Enquiries");
  await expect(openCards(page)).toHaveCount(1);
  await expect(openCards(page)).toContainText(CARDS.Enquiries[0]);
  await expect(plate(page, "Quotes")).toHaveAttribute("aria-expanded", "false");
});

test("an outside click, Escape and the close button each close it", async ({ page }) => {
  await openHome(page);

  await clickPlate(page, "Invoices");
  await expect(openCards(page)).toHaveCount(1);
  await page.mouse.click(5, (page.viewportSize()!.height * 3) / 4);
  await expect(openCards(page)).toHaveCount(0);

  await clickPlate(page, "Invoices");
  await page.keyboard.press("Escape");
  await expect(openCards(page)).toHaveCount(0);

  await clickPlate(page, "Invoices");
  await openCards(page).getByRole("button", { name: "Close Invoices" }).click();
  await expect(openCards(page)).toHaveCount(0);
});

test("the whole plate is the target, not just its label", async ({ page }) => {
  await openHome(page);
  // Quotes is the top-left plate (tile units 8..44 x 8..46): click near its outer corner.
  const tile = (await picture(page).boundingBox())!;
  const view = (await picture(page).evaluate((el) => el.classList.contains("lb-tile"))) ? { min: -6, size: 112 } : { min: -11, size: 122 };
  const px = (v: number) => ((v - view.min) / view.size);
  await page.mouse.click(tile.x + px(13) * tile.width, tile.y + px(13) * tile.height);
  await expect(openCards(page)).toHaveCount(1);
  await expect(openCards(page)).toContainText(CARDS.Quotes[0]);
});

test("keyboard: Enter opens, Tab reaches the close button, Escape closes and keeps focus", async ({ page }) => {
  await openHome(page);
  await plate(page, "Scheduling").focus();
  await page.keyboard.press("Enter");
  await expect(openCards(page)).toHaveCount(1);
  await expect(openCards(page)).toContainText(CARDS.Scheduling[0]);

  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Close Scheduling" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(openCards(page)).toHaveCount(0);
  await expect(plate(page, "Scheduling")).toBeFocused();
});
