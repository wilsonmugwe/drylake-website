import { expect, test, type Page, type Request } from "@playwright/test";

import { expectNoAxeViolations, horizontalOverflow, isMobileProject, undersizedTargets } from "./helpers";

/*
 * GENUINE REVIEW REQUESTS. Local only (@local): it submits, and no feedback may be written in
 * production. Browser tests intercept /api/feedback (no database in the local e2e build); the
 * server tests hit the real routes and only ever reach their refusal paths (nothing is written or
 * emailed: placeholder Supabase, empty RESEND_API_KEY). The database invariants (single use under
 * concurrency, the duplicate guard) are in tests/db/run-review-db-tests.sh.
 */

const TOKEN = "A".repeat(43);
const FEEDBACK_URL = `/feedback#t=${TOKEN}`;

type Reply = { status: number; body: Record<string, unknown> };

async function interceptFeedback(page: Page, replies: { lookup: Reply; submit?: Reply }) {
  const posts: Request[] = [];
  await page.route("**/api/feedback", async (route) => {
    posts.push(route.request());
    const action = (route.request().postDataJSON() as { action?: string }).action;
    const reply = action === "lookup" ? replies.lookup : (replies.submit ?? { status: 200, body: { success: true, outcome: "submitted", message: "Thank you. Your feedback has been received." } });
    await route.fulfill({ status: reply.status, contentType: "application/json", body: JSON.stringify(reply.body) });
  });
  return posts;
}

const OPEN: Reply = { status: 200, body: { success: true, state: "open", recipientName: "Quinn Tester", organisationName: "Example Pty Ltd" } };

const submitted = (posts: Request[]) => posts.filter((p) => (p.postDataJSON() as { action?: string }).action === "submit");

test.describe("public site shows no feedback section when there is none @local", () => {
  test("/services has no quotes section, no stars and no review markup", async ({ page }) => {
    await page.goto("/services");
    await expect(page.getByRole("heading", { name: "What people say" })).toHaveCount(0);
    await expect(page.locator("blockquote")).toHaveCount(0);
    const text = (await page.locator("main").innerText()).toLowerCase();
    expect(text).not.toMatch(/testimonial|star rating|out of 5|customer reviews|★|☆/);
    const ld = (await page.locator("script[type='application/ld+json']").allTextContents()).join("");
    expect(ld).not.toMatch(/aggregateRating|ratingValue|"@type":\s*"Review"|reviewRating/);
  });

  test("no page of the public site draws a rating", async ({ request }) => {
    for (const path of ["/", "/services", "/solutions", "/contact", "/collaborate"]) {
      const response = await request.get(path);
      if (response.status() !== 200) continue;
      const html = await response.text();
      expect(html, path).not.toMatch(/aggregateRating|ratingValue/);
    }
  });
});

test.describe("feedback page @local", () => {
  test("is private: noindex in the page and the header, and not in the sitemap", async ({ page, request }) => {
    const response = await page.goto("/feedback");
    expect(response?.headers()["x-robots-tag"]).toMatch(/noindex/);
    await expect(page.locator("meta[name='robots']")).toHaveAttribute("content", /noindex/);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).not.toContain("/feedback");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Disallow: \/feedback/);
  });

  test("without a link token it says so and makes no request", async ({ page }) => {
    const posts = await interceptFeedback(page, { lookup: OPEN });
    await page.goto("/feedback");
    await expect(page.getByRole("status")).toContainText("could not find this feedback link");
    expect(posts).toHaveLength(0);
  });

  test("reads the token from the fragment, then removes it from the address bar", async ({ page }) => {
    const posts = await interceptFeedback(page, { lookup: OPEN });
    await page.goto(FEEDBACK_URL);
    await expect(page.getByLabel("Your comments")).toBeVisible();
    expect(page.url()).not.toContain("#t=");
    expect(page.url()).not.toContain(TOKEN);
    expect((posts[0].postDataJSON() as { token: string }).token).toBe(TOKEN);
  });

  test("an expired, used or unknown link shows the reason and no form", async ({ page }) => {
    await interceptFeedback(page, { lookup: { status: 200, body: { success: true, state: "expired", message: "This link has expired. If you would still like to share feedback, please email us." } } });
    await page.goto(FEEDBACK_URL);
    await expect(page.getByRole("status")).toContainText("has expired");
    await expect(page.getByLabel("Your comments")).toHaveCount(0);
  });

  test("a rating is optional; comments alone send, and publication consent defaults to NO", async ({ page }) => {
    const posts = await interceptFeedback(page, { lookup: OPEN });
    await page.goto(FEEDBACK_URL);
    await page.getByLabel("Your comments").fill("Good work, but replies were slow.");
    await expect(page.getByLabel(/may publish my comments/)).not.toBeChecked();
    await expect(page.getByText("How should it be credited?")).toHaveCount(0);
    await page.getByRole("button", { name: "Send feedback" }).click();

    await expect(page.getByRole("status")).toContainText("Thank you");
    const [post] = submitted(posts);
    expect(post.postDataJSON()).toMatchObject({ action: "submit", token: TOKEN, rating: null, comments: "Good work, but replies were slow.", publishConsent: false, displayChoice: null });
  });

  test("negative feedback sends exactly like positive feedback", async ({ page }) => {
    const posts = await interceptFeedback(page, { lookup: OPEN });
    await page.goto(FEEDBACK_URL);
    await page.getByRole("radio", { name: "1 out of 5" }).check({ force: true });
    await page.getByLabel("Your comments").fill("The invoice was wrong and nobody called back.");
    await page.getByRole("button", { name: "Send feedback" }).click();
    await expect(page.getByRole("status")).toContainText("Thank you");
    expect(submitted(posts)[0].postDataJSON()).toMatchObject({ rating: 1, publishConsent: false });
  });

  test("ticking publication consent reveals how to be credited, with a preview, and sends it", async ({ page }) => {
    const posts = await interceptFeedback(page, { lookup: OPEN });
    await page.goto(FEEDBACK_URL);
    await page.getByLabel("Your comments").fill("They were quick and clear.");
    await page.getByLabel(/may publish my comments/).check({ force: true });
    await expect(page.getByText("How should it be credited?")).toBeVisible();
    await expect(page.getByText("Shown as: Quinn Tester, Example Pty Ltd")).toBeVisible();
    await expect(page.getByText("Shown as: A Drylake client")).toBeVisible();
    await page.getByRole("radio", { name: /My first name and organisation/ }).check({ force: true });
    await page.getByRole("button", { name: "Send feedback" }).click();
    await expect(page.getByRole("status")).toContainText("Thank you");
    expect(submitted(posts)[0].postDataJSON()).toMatchObject({ publishConsent: true, displayChoice: "first_name_and_organisation" });
  });

  test("consent without a comment is stopped before sending", async ({ page }) => {
    const posts = await interceptFeedback(page, { lookup: OPEN });
    await page.goto(FEEDBACK_URL);
    await page.getByRole("radio", { name: "5 out of 5" }).check({ force: true });
    await page.getByLabel(/may publish my comments/).check({ force: true });
    await page.getByRole("button", { name: "Send feedback" }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText("please write a comment");
    expect(submitted(posts)).toHaveLength(0);
  });

  test("an empty form is stopped before sending", async ({ page }) => {
    const posts = await interceptFeedback(page, { lookup: OPEN });
    await page.goto(FEEDBACK_URL);
    await page.getByRole("button", { name: "Send feedback" }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText("rating or a comment");
    expect(submitted(posts)).toHaveLength(0);
  });

  test("a link that was used in the meantime closes the form instead of looping", async ({ page }) => {
    await interceptFeedback(page, {
      lookup: OPEN,
      submit: { status: 409, body: { success: false, outcome: "already_submitted", error: "This link has already been used. Thank you for your feedback." } },
    });
    await page.goto(FEEDBACK_URL);
    await page.getByLabel("Your comments").fill("Again.");
    await page.getByRole("button", { name: "Send feedback" }).click();
    await expect(page.getByRole("status")).toContainText("already been used");
    await expect(page.getByLabel("Your comments")).toHaveCount(0);
  });

  test("a server error keeps what was typed and is never shown as success", async ({ page }) => {
    await interceptFeedback(page, { lookup: OPEN, submit: { status: 500, body: { success: false, error: "We couldn't save your feedback. Please try again, or email hello@drylake.com.au." } } });
    await page.goto(FEEDBACK_URL);
    await page.getByLabel("Your comments").fill("Keep this text.");
    await page.getByRole("button", { name: "Send feedback" }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText("couldn't save");
    await expect(page.getByLabel("Your comments")).toHaveValue("Keep this text.");
    await expect(page.getByRole("status")).toHaveCount(0);
  });

  test("the form is usable from the keyboard", async ({ page }, testInfo) => {
    test.skip(isMobileProject(testInfo), "keyboard order is a desktop concern");
    await interceptFeedback(page, { lookup: OPEN });
    await page.goto(FEEDBACK_URL);
    await page.getByLabel("Your comments").focus();
    await page.keyboard.type("Typed by keyboard.");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel(/may publish my comments/)).toBeFocused();
    await page.keyboard.press("Space");
    await expect(page.getByLabel(/may publish my comments/)).toBeChecked();
  });

  test("no horizontal overflow, 44px targets on mobile, axe clean", async ({ page }, testInfo) => {
    await interceptFeedback(page, { lookup: OPEN });
    await page.goto(FEEDBACK_URL);
    await expect(page.getByLabel("Your comments")).toBeVisible();
    await page.getByLabel(/may publish my comments/).check({ force: true });
    const overflow = await horizontalOverflow(page);
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
    if (isMobileProject(testInfo)) expect(await undersizedTargets(page)).toEqual([]);
    await expectNoAxeViolations(page);
  });
});

test.describe("unsubscribe page @local", () => {
  test("posts the token from the fragment and confirms", async ({ page }) => {
    const posts: Request[] = [];
    await page.route("**/api/feedback/unsubscribe", async (route) => {
      posts.push(route.request());
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, message: "You will not receive feedback requests from Drylake again." }) });
    });
    await page.goto(`/feedback/unsubscribe#t=${TOKEN}`);
    await expect(page.getByRole("status")).toContainText("will not receive feedback requests");
    expect(posts).toHaveLength(1);
    expect(posts[0].method()).toBe("POST");
    expect((posts[0].postDataJSON() as { token: string }).token).toBe(TOKEN);
    expect(page.url()).not.toContain("#t=");
  });

  test("an unknown link offers the email route, not a silent failure", async ({ page }) => {
    await page.goto("/feedback/unsubscribe");
    await expect(page.getByRole("status")).toContainText("could not find this unsubscribe link");
    await expect(page.getByRole("status")).toContainText("hello@drylake.com.au");
  });

  test("a failed attempt can be retried", async ({ page }) => {
    let calls = 0;
    await page.route("**/api/feedback/unsubscribe", async (route) => {
      calls += 1;
      const ok = calls > 1;
      await route.fulfill({
        status: ok ? 200 : 500,
        contentType: "application/json",
        body: JSON.stringify(ok ? { success: true, message: "You will not receive feedback requests from Drylake again." } : { success: false, error: "We couldn't process this." }),
      });
    });
    await page.goto(`/feedback/unsubscribe#t=${TOKEN}`);
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("status")).toContainText("will not receive feedback requests");
  });

  test("is accessible and does not overflow", async ({ page }) => {
    await page.route("**/api/feedback/unsubscribe", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, message: "Done." }) }));
    await page.goto(`/feedback/unsubscribe#t=${TOKEN}`);
    await expect(page.getByRole("status")).toContainText("Done.");
    const overflow = await horizontalOverflow(page);
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
    await expectNoAxeViolations(page);
  });
});

test.describe("feedback API (real routes) @local", () => {
  const post = (request: import("@playwright/test").APIRequestContext, data: unknown, headers: Record<string, string> = {}) =>
    request.post("/api/feedback", { data, headers: { "content-type": "application/json", ...headers } });

  test("a malformed token is a 404 with no database call", async ({ request }) => {
    const response = await post(request, { action: "lookup", token: "nope" });
    expect(response.status()).toBe(404);
    expect((await response.json()).success).toBe(false);
  });

  test("bad bodies, wrong type and oversize are refused", async ({ request }) => {
    expect((await post(request, { action: "submit", token: TOKEN })).status()).toBe(400);
    expect((await post(request, { action: "submit", token: TOKEN, rating: 9 })).status()).toBe(400);
    expect((await post(request, { action: "submit", token: TOKEN, comments: "x".repeat(7_000) })).status()).toBe(413);
    expect((await request.post("/api/feedback", { data: "x", headers: { "content-type": "text/plain" } })).status()).toBe(415);
  });

  test("a well-formed token with no database answers a generic error that never echoes it", async ({ request }) => {
    const response = await post(request, { action: "lookup", token: TOKEN });
    expect([500, 503]).toContain(response.status());
    const text = await response.text();
    expect(text).not.toContain(TOKEN);
    expect(text).not.toMatch(/stack|supabase|rpc/i);
  });

  test("rate limits repeated calls from one address", async ({ request }) => {
    const statuses: number[] = [];
    for (let i = 0; i < 26; i += 1) {
      statuses.push((await post(request, { action: "lookup", token: TOKEN }, { "x-forwarded-for": "203.0.113.88" })).status());
    }
    expect(statuses).toContain(429);
  });

  test("unsubscribe is POST only: a plain GET cannot unsubscribe anyone", async ({ request }) => {
    const response = await request.get(`/api/feedback/unsubscribe?t=${TOKEN}`);
    expect(response.status()).toBe(405);
  });

  test("unsubscribe rejects a malformed token without revealing anything", async ({ request }) => {
    const response = await request.post("/api/feedback/unsubscribe", { data: { token: "nope" }, headers: { "content-type": "application/json" } });
    expect(response.status()).toBe(404);
    expect((await response.json()).error).toBe("We could not find this unsubscribe link.");
  });

  test("a cross-site browser post is refused before the handler runs", async ({ request }) => {
    const response = await post(request, { action: "lookup", token: TOKEN }, { origin: "https://evil.example", "sec-fetch-site": "cross-site" });
    expect(response.status()).toBe(403);
  });
});

test.describe("review admin API and pages @local", () => {
  const ID = "11111111-1111-4111-8111-111111111111";
  const json = { "content-type": "application/json", accept: "application/json" };

  for (const [path, data] of [
    ["/api/admin/reviews/requests", { kind: "project", engagementId: ID, confirm: true }],
    [`/api/admin/reviews/requests/${ID}`, { action: "retry" }],
    [`/api/admin/reviews/feedback/${ID}`, { action: "approve" }],
  ] as const) {
    test(`${path}: signed-out callers get 401 JSON before any input is read`, async ({ request }) => {
      const response = await request.post(path, { data, headers: json, maxRedirects: 0 });
      expect(response.status()).toBe(401);
      expect(await response.json()).toEqual({ success: false, error: "Unauthorized" });
    });
  }

  test("the admin pages send a signed-out visitor to sign-in", async ({ request }) => {
    for (const path of ["/admin/reviews", `/admin/reviews/${ID}`]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect([302, 303, 307, 308], path).toContain(response.status());
      expect(response.headers().location, path).toMatch(/sign-in/);
    }
  });
});
