import { expect, test, type Page, type Request } from "@playwright/test";

import { expectNoAxeViolations, horizontalOverflow, isMobileProject, stubTurnstile, undersizedTargets } from "./helpers";

/*
 * COLLABORATE WITH DRYLAKE. Local only (@local): it submits, and no proposal may reach production.
 * Browser tests intercept /api/collaboration (no database in the local e2e build); the server
 * tests hit the real route and only ever reach its refusal paths (nothing is written or emailed:
 * the local build has placeholder Supabase and an empty RESEND_API_KEY).
 *
 * The owner-gated project must be absent from everything a visitor can fetch while its flag is
 * off. The e2e server is started without the flag, so this suite runs in the "off" state.
 */

const VALID = {
  name: "Quinn Tester",
  email: "quinn@example.com",
  organisation: "Example Pty Ltd",
  summary: "We would like to pilot the platform with our front desk team next quarter.",
};

async function fillForm(page: Page, values = VALID) {
  await page.getByLabel("Your name").fill(values.name);
  await page.getByLabel("Work email").fill(values.email);
  await page.getByLabel("Organisation").fill(values.organisation);
  await page.getByLabel("Collaboration category").selectOption("pilot_project");
  await page.getByLabel("Project of interest").selectOption("bronnie");
  await page.getByLabel("Proposal summary").fill(values.summary);
}

async function interceptProposal(page: Page, reply: { status: number; body: unknown } | "abort") {
  const posts: Request[] = [];
  await page.route("**/api/collaboration", async (route) => {
    posts.push(route.request());
    if (reply === "abort") return route.abort("failed");
    return route.fulfill({ status: reply.status, contentType: "application/json", body: JSON.stringify(reply.body) });
  });
  return posts;
}

const submit = (page: Page) => page.getByRole("button", { name: /Send proposal|Sending/ });

test.describe("collaborate page @local", () => {
  test.beforeEach(async ({ page }) => {
    await stubTurnstile(page, "pass");
    await page.goto("/collaborate");
  });

  test("states who it is for, describes BRONNIE honestly and keeps customer enquiries separate", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Work with us");
    for (const item of ["Pilot projects", "Integration proposals", "Business partnerships", "Research and innovation"]) {
      await expect(page.getByText(item, { exact: true }).first()).toBeVisible();
    }
    const body = page.locator("main");
    await expect(body).toContainText("BRONNIE is an AI-powered platform being developed by Drylake.");
    await expect(body).toContainText("No BRONNIE feature is generally available yet");
    await expect(body).toContainText("not claiming any customers, completed pilots, results or deployments");
    await expect(page.getByRole("link", { name: "Contact Drylake" })).toHaveAttribute("href", "/contact");
    await expect(page.getByRole("link", { name: "Book a free consultation" })).toHaveAttribute("href", "/consultation");
    await expect(page.getByTestId("collaboration-microcopy")).toContainText("not a formal partnership");
  });

  test("offers only Drylake, BRONNIE and Other as projects while the gated option is off", async ({ page }) => {
    const options = await page.getByLabel("Project of interest").locator("option").allTextContents();
    expect(options).toEqual(["Select a project", "Drylake", "BRONNIE", "Other"]);
  });

  test("no trace of the gated project in HTML, RSC payload, JSON-LD, llms.txt, sitemap or any script", async ({ page, request }) => {
    const html = await page.content();
    expect(html.toLowerCase()).not.toContain("abbicare");

    const rsc = await request.get("/collaborate", { headers: { RSC: "1", "Next-Router-Prefetch": "1" } });
    expect((await rsc.text()).toLowerCase()).not.toContain("abbicare");

    for (const path of ["/llms.txt", "/llms-full.txt", "/sitemap.xml", "/robots.txt"]) {
      const response = await request.get(path);
      expect((await response.text()).toLowerCase(), path).not.toContain("abbicare");
    }

    const scripts = await page.locator("script[src]").evaluateAll((nodes) => nodes.map((n) => (n as HTMLScriptElement).src));
    expect(scripts.length).toBeGreaterThan(0);
    for (const src of scripts.filter((s) => s.startsWith(page.url().split("/collaborate")[0]))) {
      const response = await request.get(src);
      expect((await response.text()).toLowerCase(), src).not.toContain("abbicare");
    }
  });

  test("the form is fully usable from the keyboard, in reading order", async ({ page }, testInfo) => {
    test.skip(isMobileProject(testInfo), "keyboard order is a desktop concern");
    await page.getByLabel("Your name").focus();
    const order = ["name", "email", "organisation", "category", "project", "summary", "website", "consent"];
    for (const id of order) {
      await expect(page.locator(`#${id}`)).toBeFocused();
      await page.keyboard.press("Tab");
    }
  });

  test("required fields and the privacy acknowledgement stop an empty submit", async ({ page }) => {
    const posts = await interceptProposal(page, { status: 200, body: { success: true } });
    await expect(page.getByLabel(/I have read the/)).toHaveAttribute("required", "");
    await submit(page).click();
    expect(await page.getByLabel("Your name").evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
    await page.waitForTimeout(250);
    expect(posts).toHaveLength(0);
  });

  test("submits the fields and shows success only after the server confirms", async ({ page }) => {
    const posts = await interceptProposal(page, { status: 200, body: { success: true } });
    await fillForm(page);
    await page.getByLabel("Website (optional)").fill("example.com.au");
    await page.getByLabel(/I have read the/).check();
    await submit(page).click();

    await expect(page.getByRole("status")).toContainText("Thanks for getting in touch");
    expect(posts).toHaveLength(1);
    const payload = posts[0].postDataJSON();
    expect(payload).toMatchObject({
      name: VALID.name,
      organisation: VALID.organisation,
      category: "pilot_project",
      project: "bronnie",
      website: "example.com.au",
      consent: true,
    });
    expect(payload.turnstileToken).toBeTruthy();
  });

  test("a server refusal keeps the typed answers and shows the message", async ({ page }) => {
    await interceptProposal(page, { status: 400, body: { success: false, error: "Please enter a valid website address, such as example.com.au." } });
    await fillForm(page);
    await page.getByLabel(/I have read the/).check();
    await submit(page).click();

    await expect(page.locator("form").getByRole("alert")).toContainText("valid website address");
    await expect(page.getByLabel("Your name")).toHaveValue(VALID.name);
    await expect(page.getByLabel("Proposal summary")).toHaveValue(VALID.summary);
  });

  test("a network failure never reads as success", async ({ page }) => {
    await interceptProposal(page, "abort");
    await fillForm(page);
    await page.getByLabel(/I have read the/).check();
    await submit(page).click();
    await expect(page.locator("form").getByRole("alert")).toContainText("couldn't reach Drylake");
    await expect(page.getByRole("status")).toHaveCount(0);
  });

  test("a 2xx without success:true is not success", async ({ page }) => {
    await interceptProposal(page, { status: 200, body: {} });
    await fillForm(page);
    await page.getByLabel(/I have read the/).check();
    await submit(page).click();
    await expect(page.locator("form").getByRole("alert")).toBeVisible();
  });

  test("has no horizontal overflow, 44px targets and no axe violations", async ({ page }, testInfo) => {
    const overflow = await horizontalOverflow(page);
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
    if (isMobileProject(testInfo)) expect(await undersizedTargets(page)).toEqual([]);
    await expectNoAxeViolations(page);
  });
});

test.describe("collaboration API (real route) @local", () => {
  const post = (request: import("@playwright/test").APIRequestContext, data: unknown, headers: Record<string, string> = {}) =>
    request.post("/api/collaboration", { data, headers: { "content-type": "application/json", ...headers } });

  const valid = {
    name: "Quinn Tester",
    organisation: "Example Pty Ltd",
    email: "quinn@example.com",
    category: "pilot_project",
    project: "bronnie",
    summary: "We would like to pilot the platform with our front desk team next quarter.",
    website: "",
    consent: true,
    turnstileToken: "XXXX.DUMMY.TOKEN.XXXX",
  };

  test("rejects a missing privacy acknowledgement", async ({ request }) => {
    const response = await post(request, { ...valid, consent: false });
    expect(response.status()).toBe(400);
    expect((await response.json()).field).toBe("consent");
  });

  test("rejects bad input, an unknown project and the gated project while it is off", async ({ request }) => {
    expect((await post(request, { ...valid, email: "nope" })).status()).toBe(400);
    expect((await post(request, { ...valid, project: "secret" })).status()).toBe(400);
    expect((await post(request, { ...valid, project: "abbicare" })).status()).toBe(400);
  });

  test("rejects oversize bodies (413) and the wrong content type (415)", async ({ request }) => {
    expect((await post(request, { ...valid, summary: "x".repeat(13_000) })).status()).toBe(413);
    const wrong = await request.post("/api/collaboration", { data: "name=x", headers: { "content-type": "text/plain" } });
    expect(wrong.status()).toBe(415);
  });

  test("requires a Turnstile token and never writes without one", async ({ request }) => {
    const response = await post(request, { ...valid, turnstileToken: "" });
    expect([403, 503]).toContain(response.status());
    expect((await response.json()).success).toBe(false);
  });

  test("rate limits repeated attempts from one address", async ({ request }) => {
    const statuses: number[] = [];
    for (let i = 0; i < 8; i += 1) {
      statuses.push((await post(request, { ...valid, turnstileToken: "" }, { "x-forwarded-for": "203.0.113.77" })).status());
    }
    expect(statuses).toContain(429);
  });

  test("a cross-site browser post is refused before the handler runs", async ({ request }) => {
    const response = await post(request, valid, { origin: "https://evil.example", "sec-fetch-site": "cross-site" });
    expect(response.status()).toBe(403);
  });
});

test.describe("collaboration admin API @local", () => {
  const ID = "11111111-1111-4111-8111-111111111111";

  test("signed-out callers get 401 JSON before any input is read", async ({ request }) => {
    const response = await request.post(`/api/admin/collaborations/${ID}`, {
      data: { status: "contacted" },
      headers: { "content-type": "application/json", accept: "application/json" },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ success: false, error: "Unauthorized" });
  });

  test("the admin pages send a signed-out visitor to sign-in", async ({ request }) => {
    for (const path of ["/admin/collaborations", `/admin/collaborations/${ID}`]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect([302, 303, 307, 308], path).toContain(response.status());
      expect(response.headers().location, path).toMatch(/sign-in/);
    }
  });
});
