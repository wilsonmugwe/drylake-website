import { expect, test } from "@playwright/test";

import { expectNoAxeViolations, horizontalOverflow, revealWholePage, stubTurnstile } from "./helpers";

/*
 * BRAND STORY + FAQs (2026-10-16).
 *   /faq and /about at 320, 375 and 1440: no sideways scroll, axe clean.
 *   /faq: native <details>, answers server-rendered, FAQPage JSON-LD equals the visible Q&A.
 *   homepage: still leads with websites/software/automation; brand band present; texture decorative.
 */

test.use({ reducedMotion: "reduce" });

for (const path of ["/faq", "/about"]) {
  for (const width of [320, 375, 1440]) {
    test(`${path} at ${width}px: no horizontal scroll, axe clean`, async ({ page }) => {
      await stubTurnstile(page);
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      await revealWholePage(page);

      const { scrollWidth, clientWidth } = await horizontalOverflow(page);
      expect(scrollWidth, `${path} at ${width}px overflows`).toBeLessThanOrEqual(clientWidth);

      await expectNoAxeViolations(page);
    });
  }
}

test("/faq: questions are native details, answers are in the HTML while closed, and open on click", async ({ page }) => {
  const response = await page.request.get("/faq");
  const html = await response.text();
  expect(html).toContain("<details");
  expect(html).toContain("Who owns the finished work?");
  expect(html).toContain("proposal and agreement");

  await page.goto("/faq");
  const first = page.locator("details").first();
  await expect(first).not.toHaveAttribute("open", "");
  await first.locator("summary").click();
  await expect(first).toHaveAttribute("open", "");
  await first.locator("summary").click();
  await expect(first).not.toHaveAttribute("open", "");

  // Keyboard: summary is focusable and Enter toggles.
  await first.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("open", "");
});

test("/faq: FAQPage JSON-LD equals the visible questions and answers", async ({ page }) => {
  await page.goto("/faq");

  const visible = await page.locator("details").evaluateAll((nodes) =>
    nodes.map((node) => [
      node.querySelector("summary span")?.textContent?.trim() ?? "",
      node.querySelector("p")?.textContent?.trim() ?? "",
    ]),
  );

  const graphs = await page.locator('script[type="application/ld+json"]').evaluateAll((nodes) =>
    nodes.map((node) => JSON.parse(node.textContent ?? "{}")),
  );
  const faqPages = graphs.flatMap((graph) => (graph["@graph"] ?? []).filter((n: { "@type": string }) => n["@type"] === "FAQPage"));
  expect(faqPages).toHaveLength(1);

  const markup = faqPages[0].mainEntity.map((q: { name: string; acceptedAnswer: { text: string } }) => [q.name, q.acceptedAnswer.text]);
  expect(markup).toEqual(visible);
  expect(visible.length).toBeGreaterThanOrEqual(23);
});

test("homepage: hero still says websites, software and automation; brand band sits below it", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("We build websites, business software and automation tools")).toBeVisible();

  const band = page.locator("#the-name");
  await expect(band).toContainText("Strip it back.");
  await expect(band).toContainText("Find the cracks.");
  await expect(band).toContainText("Build back better.");
  await expect(band.locator('svg[aria-hidden="true"]')).toHaveCount(1);
  await expect(band.getByRole("link", { name: "Why we are called Drylake" })).toHaveAttribute("href", "/about#our-name");

  // The band comes after the hero in the document.
  const order = await page.evaluate(() => {
    const hero = document.querySelector("main h1, main section");
    const band = document.getElementById("the-name");
    return !!hero && !!band && (hero.compareDocumentPosition(band) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
  });
  expect(order).toBe(true);
});

test("/about: the full brand story is present with the approved tagline", async ({ page }) => {
  await page.goto("/about");
  const story = page.locator("#our-name");
  await expect(story).toContainText("When a lake dries");
  await expect(story).toContainText("understanding comes before recommending");
  await expect(story).toContainText("See what lies beneath. Build what comes next.");
  await expect(story.locator('svg[aria-hidden="true"]')).toHaveCount(1);
});
