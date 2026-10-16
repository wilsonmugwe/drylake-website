import { expect, test, type Page } from "@playwright/test";

import { expectNoAxeViolations, horizontalOverflow, revealWholePage, stubTurnstile } from "./helpers";

/*
 * PRIVACY AND COOKIES (workstream 3 and 4, 2026-10-16).
 *
 * The cookie audit found no optional cookies, so there is no consent banner; there is a setting on
 * /security-privacy#cookie-settings that switches Vercel Web Analytics off. These tests prove, in a
 * real browser:
 *   - the control works from the keyboard, persists across a reload, and resets;
 *   - with analytics off NOTHING is sent to /_vercel/insights (page views and events), and with it
 *     on something is (a positive control, so a silent emulator cannot make the test pass);
 *   - sign-in (Clerk) and the contact form (Turnstile) keep working with analytics off;
 *   - the policy and the page list the same providers; no sideways scroll at 320, 375 and 1440.
 *
 * The Vercel script exists only on Vercel, so tests tagged @local replace it with a small stand-in
 * that implements the one contract our code depends on: window.va('beforeSend', fn) is applied to
 * every page view and event, and a non-null result is POSTed to /_vercel/insights/view or /event.
 * That is exactly the vendor behaviour documented in @vercel/analytics (dist/index.mjs, inject()).
 */

const PREFERENCES_KEY = "drylake-privacy-preferences";
const PAGE = "/security-privacy";

const INSIGHTS_STAND_IN = `(function () {
  var before = null;
  function send(kind, event) {
    var result = before ? before(event) : event;
    if (!result) return;
    fetch("/_vercel/insights/" + kind, { method: "POST", body: JSON.stringify(result), keepalive: true }).catch(function () {});
  }
  function handle(args) {
    var command = args[0], arg = args[1];
    if (command === "beforeSend") before = arg;
    else if (command === "pageview") send("view", { type: "pageview", url: location.href });
    else if (command === "event") send("event", { type: "event", url: location.href, name: arg.name, data: arg.data });
  }
  var queued = window.vaq || [];
  window.va = function () { handle([].slice.call(arguments)); };
  queued.forEach(handle);
})();`;

/* Replaces the Vercel script and records every analytics POST. Returns the live list. */
async function trackInsights(page: Page) {
  const sent: string[] = [];
  await page.route("**/_vercel/insights/script.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: INSIGHTS_STAND_IN })
  );
  await page.route(/\/_vercel\/insights\/(view|event)$/, (route) => {
    sent.push(new URL(route.request().url()).pathname);
    return route.fulfill({ status: 204, body: "" });
  });
  return sent;
}

async function storedPreference(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
}

const analyticsSwitch = (page: Page) => page.getByRole("switch", { name: "Analytics" });

test.describe("preference control", () => {
  test("is reachable by keyboard, persists across a reload, and resets", async ({ page }) => {
    await page.goto(`${PAGE}#cookie-settings`);
    const toggle = analyticsSwitch(page);
    await expect(toggle).toBeChecked();
    expect(await storedPreference(page), "nothing is stored on a plain visit").toBeNull();

    await toggle.focus();
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Space");
    await expect(toggle).not.toBeChecked();
    await expect(page.getByTestId("analytics-status")).toContainText("Off.");
    expect(JSON.parse((await storedPreference(page)) ?? "null")).toEqual({ v: 1, analytics: false });

    await page.reload();
    await expect(analyticsSwitch(page)).not.toBeChecked();

    await page.getByRole("button", { name: "Reset to default" }).click();
    await expect(analyticsSwitch(page)).toBeChecked();
    expect(await storedPreference(page)).toBeNull();
  });

  test("a keyboard user tabbing from the section anchor lands on the switch", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "touch project: no keyboard tabbing");
    await page.goto(`${PAGE}#cookie-settings`);
    await page.keyboard.press("Tab");
    await expect(analyticsSwitch(page)).toBeFocused();
  });

  test("a Global Privacy Control signal starts analytics off until the visitor chooses", async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, "globalPrivacyControl", { value: true }));
    await page.goto(PAGE);
    await expect(analyticsSwitch(page)).not.toBeChecked();
    await expect(page.getByTestId("analytics-status")).toContainText("Global Privacy Control");

    await analyticsSwitch(page).check();
    await expect(analyticsSwitch(page)).toBeChecked();
  });

  test("corrupt stored data is ignored and the page still works", async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, "{not json"), PREFERENCES_KEY);
    await page.goto(PAGE);
    await expect(analyticsSwitch(page)).toBeChecked();
  });

  test("axe finds nothing with the setting switched off", async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => localStorage.setItem(key, value),
      [PREFERENCES_KEY, JSON.stringify({ v: 1, analytics: false })]
    );
    await page.goto(PAGE);
    await revealWholePage(page);
    await expectNoAxeViolations(page);
  });
});

test.describe("analytics opt-out @local", () => {
  test("positive control: with analytics on, a page view and a CTA event are sent", async ({ page }) => {
    const sent = await trackInsights(page);
    await page.goto("/about");
    await expect.poll(() => sent).toContain("/_vercel/insights/view");

    sent.length = 0;
    await page.locator("a.btn-primary:visible").first().click();
    await expect.poll(() => sent).toContain("/_vercel/insights/event");
  });

  test("switched off before loading: no page view and no event leaves the browser", async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => localStorage.setItem(key, value),
      [PREFERENCES_KEY, JSON.stringify({ v: 1, analytics: false })]
    );
    const sent = await trackInsights(page);

    await page.goto("/about");
    await page.locator("a.btn-primary:visible").first().click();
    await page.waitForLoadState("load");
    await page.waitForTimeout(1500);

    expect(sent).toEqual([]);
  });

  test("switched off on the page: later navigation and clicks send nothing", async ({ page }) => {
    const sent = await trackInsights(page);
    await page.goto(PAGE);
    await expect.poll(() => sent).toContain("/_vercel/insights/view");

    await analyticsSwitch(page).uncheck();
    sent.length = 0;

    await page.getByRole("link", { name: "Privacy Policy", exact: true }).first().click();
    await expect(page).toHaveURL(/\/privacy$/);
    await page.locator("a.btn-primary:visible").first().click({ timeout: 3000 }).catch(() => undefined);
    await page.waitForTimeout(1500);

    expect(sent).toEqual([]);
  });

  test("switching back on resumes sending", async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => localStorage.setItem(key, value),
      [PREFERENCES_KEY, JSON.stringify({ v: 1, analytics: false })]
    );
    const sent = await trackInsights(page);
    await page.goto(PAGE);
    await analyticsSwitch(page).check();

    await page.getByRole("link", { name: "Privacy Policy", exact: true }).first().click();
    await expect.poll(() => sent).toContain("/_vercel/insights/view");
  });
});

test.describe("essential features with analytics off @local", () => {
  const OFF = [PREFERENCES_KEY, JSON.stringify({ v: 1, analytics: false })];

  test("the contact form still passes the Turnstile check and submits @local", async ({ page }) => {
    await page.addInitScript(([key, value]) => localStorage.setItem(key, value), OFF);
    await stubTurnstile(page, "pass");
    const posts: unknown[] = [];
    await page.route("**/api/contact", async (route) => {
      posts.push(route.request().postDataJSON());
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
    });

    await page.goto("/contact");
    await page.getByLabel("Your name").fill("Quinn Tester");
    await page.getByLabel("Work email").fill("quinn@example.com");
    await page.getByLabel("Tell us what's happening").fill("Job sheets are retyped every Friday.");
    await page.getByRole("button", { name: /Start the conversation/ }).click();

    await expect(page.getByRole("status")).toContainText("Thanks for reaching out.");
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" });
  });

  test("sign-in still loads its sign-in service, and the Workspace is still protected", async ({ page, request }) => {
    await page.addInitScript(([key, value]) => localStorage.setItem(key, value), OFF);
    const clerkRequests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("clerk")) clerkRequests.push(req.url());
    });

    const response = await page.goto("/sign-in");
    expect(response?.status()).toBe(200);
    await expect.poll(() => clerkRequests.length).toBeGreaterThan(0);

    const protectedPage = await request.get("/client", { maxRedirects: 0 });
    expect([302, 303, 307]).toContain(protectedPage.status());
  });
});

test.describe("one provider list on both pages", () => {
  async function providerNames(page: Page, path: string) {
    await page.goto(path);
    return page.locator('[data-testid="processor-list"] [data-processor]').evaluateAll((items) =>
      items.map((item) => item.getAttribute("data-processor"))
    );
  }

  test("the Privacy Policy and Security and privacy list identical providers", async ({ page }) => {
    const policy = await providerNames(page, "/privacy");
    const summary = await providerNames(page, PAGE);
    expect(policy.length).toBeGreaterThanOrEqual(7);
    expect(summary).toEqual(policy);
  });

  test("regions are stated only where known", async ({ page }) => {
    await page.goto(PAGE);
    const list = page.getByTestId("processor-list");
    await expect(list.locator('[data-processor="Clerk"]')).toContainText("United States");
    await expect(list.locator('[data-processor="Supabase"]')).toContainText("Sydney");
    await expect(list.locator('[data-processor="Stripe"]')).toContainText("Region not stated");
  });
});

test.describe("layout", () => {
  for (const width of [320, 375, 1440]) {
    test(`no sideways scroll at ${width}px, with the settings control in view`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`${PAGE}#cookie-settings`);
      const { scrollWidth, clientWidth } = await horizontalOverflow(page);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
      await expect(page.getByTestId("cookie-settings")).toBeVisible();
      const box = await analyticsSwitch(page).boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
    });
  }

  test("links to the page exist on the policy, the contact form and the consultation form", async ({ page }) => {
    for (const path of ["/privacy", "/contact", "/consultation"]) {
      await page.goto(path);
      await expect(page.locator('main a[href^="/security-privacy"]').first(), path).toBeAttached();
    }
  });
});
