import { expect, test, type Page } from "@playwright/test";

import { expectNoAxeViolations, horizontalOverflow, isRemote, stubTurnstile } from "./helpers";

/*
 * AI CHAT ASSISTANT (Workstream 5). Needs TWO builds because the launcher is excluded at build
 * time while the feature is off:
 *   flag OFF (default build):  npm run test:e2e                      runs the "off" tests
 *   flag ON  (mock provider):  E2E_ASSISTANT=1 CHAT_ASSISTANT_ENABLED=true  next build, then
 *                              E2E_ASSISTANT=1 E2E_SKIP_BUILD=1 npx playwright test assistant
 * The model is the deterministic mock provider (refused in production). Real Bedrock is not used.
 */
const ON = Boolean(process.env.E2E_ASSISTANT);
const LAUNCHER = "button[data-assistant-launcher]";
const DIALOG = "dialog[aria-labelledby='assistant-title']";

test.skip(isRemote, "local only: submits forms and uses the mock model");

test.describe("flag off @local", () => {
  test.skip(ON, "built with the assistant enabled");

  test("no launcher on any page and the API is a 404", async ({ page, request }) => {
    for (const path of ["/", "/contact", "/faq"]) {
      await page.goto(path);
      await expect(page.locator(LAUNCHER)).toHaveCount(0);
    }
    for (const body of [{ action: "start", turnstileToken: "x" }, {}]) {
      const response = await request.post("/api/assistant", { data: body });
      expect(response.status()).toBe(404);
    }
  });
});

async function openPanel(page: Page) {
  await stubTurnstile(page);
  await page.goto("/");
  await page.locator(LAUNCHER).click();
  const dialog = page.locator(DIALOG);
  await expect(dialog).toBeVisible();
  return dialog;
}

async function ready(page: Page) {
  await expect(page.locator("#assistant-input")).toBeEnabled({ timeout: 15_000 });
}

test.describe("flag on @local", () => {
  test.skip(!ON, "needs the assistant-enabled build (E2E_ASSISTANT=1)");

  test("launcher is a labelled, focusable button that opens an accessible dialog", async ({ page }) => {
    await stubTurnstile(page);
    await page.goto("/");
    const launcher = page.getByRole("button", { name: "Chat with Drylake's AI assistant" });
    await expect(launcher).toBeVisible();
    await launcher.focus();
    await expect(launcher).toBeFocused();
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog", { name: "Drylake assistant" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("I’m Drylake’s AI assistant, not a person.");

    for (const name of ["Our services", "Websites", "Custom software", "Business automation", "Book a free 30-minute consultation", "Send an enquiry", "Speak to a representative"]) {
      await expect(dialog.getByText(name, { exact: true }).first()).toBeVisible();
    }

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(launcher).toBeFocused();
  });

  test("focus is trapped inside the dialog", async ({ page }) => {
    const dialog = await openPanel(page);
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      // Native modal dialogs may hand focus to the browser UI (activeElement = body) but never to the page behind.
      const escaped = await page.evaluate(() => {
        const el = document.activeElement;
        return Boolean(el && el !== document.body && el !== document.documentElement && !el.closest("dialog"));
      });
      expect(escaped).toBe(false);
    }
    await expect(dialog).toBeVisible();
  });

  test("the panel code is lazy: nothing assistant-specific loads until intent", async ({ page }) => {
    const chunks: string[] = [];
    page.on("response", (r) => {
      if (r.url().includes("/_next/static/chunks/")) chunks.push(r.url());
    });
    await stubTurnstile(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const before = chunks.length;
    await page.locator(LAUNCHER).hover();
    await expect.poll(() => chunks.length).toBeGreaterThan(before);
  });

  test("answers from published information, labels the basis, links the source, renders text only", async ({ page }) => {
    const dialog = await openPanel(page);
    await ready(page);
    await dialog.getByRole("button", { name: "Our services" }).click();
    await expect(dialog.getByText("From Drylake’s published information")).toBeVisible();
    await expect(dialog.locator("a[href^='/']").first()).toBeVisible();
    expect(await dialog.locator("[role=log] script, [role=log] img").count()).toBe(0);
    expect(await dialog.innerText()).not.toContain("—");
  });

  test("server guards: a made-up price and an HTML payload never reach the visitor", async ({ page }) => {
    const dialog = await openPanel(page);
    await ready(page);
    for (const probe of ["MOCK_PRICE how much", "MOCK_HTML give me markup"]) {
      await page.locator("#assistant-input").fill(probe);
      await page.getByRole("button", { name: "Send", exact: true }).click();
      await expect(dialog.getByText("I can't answer that reliably").last()).toBeVisible();
    }
    const log = await dialog.locator("[role=log]").innerText();
    expect(log).not.toContain("$4,000");
    expect(await page.locator("script", { hasText: "alert(1)" }).count()).toBe(0);
    expect(await dialog.locator("[role=log] script").count()).toBe(0);
  });

  test("booking goes to the existing consultation page", async ({ page }) => {
    const dialog = await openPanel(page);
    await expect(dialog.getByRole("link", { name: "Book a free 30-minute consultation" })).toHaveAttribute("href", "/consultation");
  });

  test("speak to a representative posts to the contact pipeline with the assistant tag @local", async ({ page }) => {
    const posts: Array<Record<string, unknown>> = [];
    await page.route("**/api/contact", async (route) => {
      posts.push(route.request().postDataJSON());
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
    });
    const dialog = await openPanel(page);
    await dialog.getByRole("button", { name: "Speak to a representative" }).click();
    await expect(dialog.getByText("It is not a live chat", { exact: false })).toBeVisible();
    await expect(dialog.getByText("1 business day", { exact: false })).toBeVisible();

    await dialog.getByLabel("Your name").fill("Quinn Tester");
    await dialog.getByLabel("Email").fill("quinn@example.com");
    await dialog.getByRole("textbox", { name: "Message" }).fill("Please call me about a booking system.");
    await dialog.getByLabel(/I agree that Drylake may reply/).check();
    await dialog.getByRole("button", { name: "Send message" }).click();
    await expect(dialog.getByText("Message sent.")).toBeVisible();

    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ source: "assistant", wantsHuman: true, consent: true, email: "quinn@example.com" });
  });

  test("axe finds no violations with the panel open", async ({ page }) => {
    await openPanel(page);
    await ready(page);
    await expectNoAxeViolations(page);
  });

  for (const width of [320, 375]) {
    test(`mobile sheet at ${width}px has no horizontal scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 });
      const dialog = await openPanel(page);
      await ready(page);
      await dialog.getByRole("button", { name: "Send an enquiry" }).click();
      const page_ = await horizontalOverflow(page);
      expect(page_.scrollWidth).toBeLessThanOrEqual(page_.clientWidth);
      const overflow = await dialog.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
      expect(overflow).toBe(false);
      const box = await dialog.boundingBox();
      expect(box?.width).toBeCloseTo(width, 0);
    });
  }

  test("every visitor-facing string is free of em dashes", async ({ page }) => {
    const dialog = await openPanel(page);
    await dialog.getByRole("button", { name: "Send an enquiry" }).click();
    expect(await dialog.innerText()).not.toContain("—");
  });
});

/* The launcher must never sit on top of a control, on any page, at any scroll position. */
const GUARDED =
  "footer a, footer button, button[type='submit'], form input, form textarea, form select, [data-sticky-cta], a[href^='tel:'], a[href^='mailto:']";

async function overlaps(page: Page) {
  return page.evaluate(
    ({ launcher, guarded }) => {
      const node = document.querySelector(launcher);
      if (!node) return ["no launcher"];
      if (getComputedStyle(node).visibility === "hidden") return [];
      const button = node.getBoundingClientRect();
      const hits: string[] = [];
      for (const el of document.querySelectorAll(guarded)) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const style = getComputedStyle(el);
        if (style.visibility === "hidden" || style.display === "none") continue;
        const x = Math.min(r.right, button.right) - Math.max(r.left, button.left);
        const y = Math.min(r.bottom, button.bottom) - Math.max(r.top, button.top);
        if (x > 1 && y > 1) hits.push(`${el.tagName.toLowerCase()} ${(el.textContent ?? "").trim().slice(0, 30)}`);
      }
      return hits;
    },
    { launcher: LAUNCHER, guarded: GUARDED }
  );
}

test.describe("launcher placement @local", () => {
  test.skip(!ON, "needs the assistant-enabled build (E2E_ASSISTANT=1)");

  for (const width of [320, 375, 768, 1440]) {
    for (const path of ["/", "/contact", "/consultation", "/faq"]) {
      test(`does not cover controls at ${width}px on ${path}`, async ({ page }) => {
        await page.setViewportSize({ width, height: width < 768 ? 700 : 900 });
        await page.goto(path);
        await page.waitForTimeout(300);
        await expect(page.locator(LAUNCHER), "visible at the top of the page").toBeVisible();
        expect(await overlaps(page), "initial viewport").toEqual([]);

        const steps = 6;
        for (let i = 1; i <= steps; i++) {
          await page.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), i / steps);
          await page.waitForTimeout(350);
          expect(await overlaps(page), `scroll ${i}/${steps}`).toEqual([]);
        }

        for (const submit of await page.locator("button[type='submit']:visible").all()) {
          await submit.scrollIntoViewIfNeeded();
          await page.waitForTimeout(350);
          expect(await overlaps(page), "submit in view").toEqual([]);
        }
      });
    }
  }
});
