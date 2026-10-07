import { expect, test, type Page, type Request } from "@playwright/test";

import { stubTurnstile } from "./helpers";

/*
 * CONTACT FORM. Local only (@local): it submits, and production's /api/contact is rate limited
 * and must never receive test traffic. No email can be sent from these tests: the browser-side
 * tests intercept /api/contact, and the server-side ones run against a server started with
 * RESEND_API_KEY="" (playwright.config.ts), so delivery fails closed with a 502.
 *
 * Turnstile is stubbed in the browser tests (hermetic: no third party). One test uses the real
 * widget with Cloudflare's always-pass test site key, end to end through the real server.
 */

const VALID = {
  name: "Quinn Tester",
  email: "quinn@example.com",
  company: "Example Pty Ltd",
  message: "Our job sheets are retyped into the accounting system every Friday.",
};

async function fillForm(page: Page, values: Partial<typeof VALID> = VALID) {
  if (values.name !== undefined) await page.getByLabel("Your name").fill(values.name);
  if (values.email !== undefined) await page.getByLabel("Work email").fill(values.email);
  if (values.company !== undefined) await page.getByLabel("Business / organisation").fill(values.company);
  if (values.message !== undefined) await page.getByLabel("Tell us what's happening").fill(values.message);
}

async function expectValuesKept(page: Page, values = VALID) {
  await expect(page.getByLabel("Your name")).toHaveValue(values.name);
  await expect(page.getByLabel("Work email")).toHaveValue(values.email);
  await expect(page.getByLabel("Business / organisation")).toHaveValue(values.company);
  await expect(page.getByLabel("Tell us what's happening")).toHaveValue(values.message);
}

/* The form's own error message (Next's route announcer is also role="alert", outside the form). */
function formAlert(page: Page) {
  return page.locator("form").getByRole("alert");
}

function submitButton(page: Page) {
  return page.getByRole("button", { name: /Start the conversation|Sending/ });
}

/* Counts POSTs to /api/contact and answers them with `reply` (never reaches the server). */
async function interceptContact(
  page: Page,
  reply: { status: number; body: unknown; delayMs?: number } | "abort"
) {
  const posts: Request[] = [];

  await page.route("**/api/contact", async (route) => {
    posts.push(route.request());

    if (reply === "abort") {
      await route.abort("failed");
      return;
    }

    if (reply.delayMs) await new Promise((resolve) => setTimeout(resolve, reply.delayMs));
    await route.fulfill({ status: reply.status, contentType: "application/json", body: JSON.stringify(reply.body) });
  });

  return posts;
}

test.describe("contact form @local", () => {
  test.beforeEach(async ({ page }) => {
    await stubTurnstile(page, "pass");
    await page.goto("/contact");
  });

  test("every field has a visible label and the right input type", async ({ page }) => {
    await expect(page.getByLabel("Your name")).toHaveAttribute("required", "");
    await expect(page.getByLabel("Work email")).toHaveAttribute("type", "email");
    await expect(page.getByLabel("Work email")).toHaveAttribute("autocomplete", "email");
    await expect(page.getByLabel("Where is the friction?")).toBeVisible();
    await expect(page.getByLabel("What kind of help are you looking for?")).toBeVisible();
    await expect(page.getByLabel("Tell us what's happening")).toHaveAttribute("required", "");
  });

  test("required fields: an empty form is not submitted", async ({ page }) => {
    const posts = await interceptContact(page, { status: 200, body: { success: true } });

    await submitButton(page).click();

    expect(await page.getByLabel("Your name").evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
    await page.waitForTimeout(300);
    expect(posts).toHaveLength(0);
  });

  test("invalid email is refused before sending", async ({ page }) => {
    const posts = await interceptContact(page, { status: 200, body: { success: true } });

    await fillForm(page, { ...VALID, email: "not-an-email" });
    await submitButton(page).click();

    expect(await page.getByLabel("Work email").evaluate((el: HTMLInputElement) => el.validity.typeMismatch)).toBe(true);
    await page.waitForTimeout(300);
    expect(posts).toHaveLength(0);
  });

  test("long input is capped at the field limits the server enforces", async ({ page }) => {
    await page.getByLabel("Your name").fill("N".repeat(300));
    await page.getByLabel("Tell us what's happening").fill("M".repeat(6000));

    expect((await page.getByLabel("Your name").inputValue()).length).toBeLessThanOrEqual(120);
    expect((await page.getByLabel("Tell us what's happening").inputValue()).length).toBeLessThanOrEqual(5000);
  });

  test("success: one POST with the typed values, then the confirmation", async ({ page }) => {
    const posts = await interceptContact(page, { status: 200, body: { success: true } });

    await fillForm(page);
    await page.getByLabel("Where is the friction?").selectOption("Manual processes");
    await submitButton(page).click();

    await expect(page.getByRole("status")).toContainText("Thanks for reaching out.");
    expect(posts).toHaveLength(1);

    const sent = posts[0].postDataJSON();
    expect(sent).toMatchObject({ ...VALID, projectType: "Manual processes", turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" });
  });

  test("success: the confirmation is focused and in view, and no budget is sent", async ({ page }) => {
    const posts = await interceptContact(page, { status: 200, body: { success: true } });

    await fillForm(page);
    await page.getByLabel("What kind of help are you looking for?").selectOption("Build a new system");
    await submitButton(page).click();

    const confirmation = page.getByRole("status").filter({ hasText: "Thanks for reaching out." });
    await expect(confirmation).toBeFocused();
    await expect(confirmation).toBeInViewport();

    const sent = posts[0].postDataJSON();
    expect(sent.helpType).toBe("Build a new system");
    expect(sent).not.toHaveProperty("budget");
  });

  test("unusual characters are sent exactly as typed", async ({ page }) => {
    const posts = await interceptContact(page, { status: 200, body: { success: true } });
    const unusual = {
      name: "Zoë O'Brien-Ngữ 李",
      email: "zoe+test@example.com.au",
      company: "Ä & B <Holdings> \"Pty\"",
      message: "Line one\nLine two: <script>alert(1)</script> & emoji 🚚 ½",
    };

    await fillForm(page, unusual);
    await submitButton(page).click();

    await expect(page.getByRole("status")).toBeVisible();
    expect(posts[0].postDataJSON()).toMatchObject(unusual);
  });

  test("double submission sends exactly one request", async ({ page }) => {
    const posts = await interceptContact(page, { status: 200, body: { success: true }, delayMs: 1200 });

    await fillForm(page);
    await expect(submitButton(page)).toBeEnabled();
    await submitButton(page).dblclick();
    await page.getByLabel("Tell us what's happening").press("Control+Enter");
    await page.getByLabel("Your name").press("Enter");

    await expect(page.getByRole("status")).toBeVisible({ timeout: 10_000 });
    expect(posts).toHaveLength(1);
  });

  test("while sending, the button says so and is disabled", async ({ page }) => {
    await interceptContact(page, { status: 200, body: { success: true }, delayMs: 1500 });

    await fillForm(page);
    await submitButton(page).click();

    await expect(page.getByRole("button", { name: "Sending..." })).toBeDisabled();
    await expect(page.locator("form")).toHaveAttribute("aria-busy", "true");
  });

  test("server failure (502): honest message, typed answers kept, retry works", async ({ page }) => {
    let calls = 0;
    await page.route("**/api/contact", (route) => {
      calls += 1;
      return calls === 1
        ? route.fulfill({
            status: 502,
            contentType: "application/json",
            body: JSON.stringify({ error: "We couldn't send your enquiry. Please email hello@drylake.com.au directly." }),
          })
        : route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
    });

    await fillForm(page);
    await submitButton(page).click();

    const alert = formAlert(page);
    await expect(alert).toContainText("hello@drylake.com.au");
    await expect(alert).toBeFocused();
    await expectValuesKept(page);

    // The spent token was replaced; the visitor can simply send again.
    await submitButton(page).click();
    await expect(page.getByRole("status")).toContainText("Thanks for reaching out.");
    expect(calls).toBe(2);
  });

  test("non-JSON platform error page is a failure, never a success", async ({ page }) => {
    await page.route("**/api/contact", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<html>Gateway</html>" })
    );

    await fillForm(page);
    await submitButton(page).click();

    await expect(formAlert(page)).toContainText("couldn't send your enquiry");
    await expect(page.getByRole("status")).toHaveCount(0);
    await expectValuesKept(page);
  });

  test("Turnstile rejected by the server (403): asks to redo the check, answers kept", async ({ page }) => {
    await interceptContact(page, {
      status: 403,
      body: { error: "Security verification failed. Please complete the check again and resend." },
    });

    await fillForm(page);
    await submitButton(page).click();

    await expect(formAlert(page)).toContainText("security check didn't go through");
    await expectValuesKept(page);
  });

  test("rate limited (429): asks to wait, answers kept", async ({ page }) => {
    await interceptContact(page, { status: 429, body: {} });

    await fillForm(page);
    await submitButton(page).click();

    await expect(formAlert(page)).toContainText("Too many attempts");
    await expectValuesKept(page);
  });

  test("network failure: tells the visitor to check the connection, answers kept", async ({ page }) => {
    await interceptContact(page, "abort");

    await fillForm(page);
    await submitButton(page).click();

    await expect(formAlert(page)).toContainText("couldn't reach Drylake");
    await expectValuesKept(page);
  });
});

test.describe("contact form, Turnstile unavailable @local", () => {
  test("widget error: the form explains and offers email, nothing is sent", async ({ page }) => {
    await stubTurnstile(page, "error");
    const posts = await interceptContact(page, { status: 200, body: { success: true } });
    await page.goto("/contact");

    await fillForm(page);
    await submitButton(page).click();

    await expect(formAlert(page)).toContainText("security check could not load");
    await expect(formAlert(page)).toContainText("hello@drylake.com.au");
    expect(posts).toHaveLength(0);
  });
});

test.describe("contact form against the real server @local", () => {
  test("real Turnstile test widget, real handler: delivery failure is a 502 and the answers stay", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/contact");

    // Cloudflare's always-pass test key issues a token on its own; wait for it to land.
    await expect
      .poll(() => page.locator('input[name="cf-turnstile-response"]').inputValue().catch(() => ""), {
        timeout: 30_000,
        message: "Turnstile test token issued (needs network access to challenges.cloudflare.com)",
      })
      .not.toBe("");

    await fillForm(page);
    const responsePromise = page.waitForResponse("**/api/contact");
    await submitButton(page).click();
    const response = await responsePromise;

    // Validation and Turnstile passed; the mailer is disabled in test runs, so delivery fails closed.
    expect(response.status()).toBe(502);
    await expect(formAlert(page)).toContainText("hello@drylake.com.au");
    await expect(page.getByRole("status")).toHaveCount(0);
    await expectValuesKept(page);
  });
});

test.describe("contact API contract @local", () => {
  const post = (data: unknown, headers: Record<string, string> = { "content-type": "application/json" }) => ({
    data: typeof data === "string" ? data : JSON.stringify(data),
    headers,
  });

  test("refuses non-JSON, malformed JSON and oversized bodies", async ({ request }) => {
    expect((await request.post("/api/contact", post("x", { "content-type": "text/plain" }))).status()).toBe(415);
    expect((await request.post("/api/contact", post("{not json"))).status()).toBe(400);

    const big = await request.post("/api/contact", post({ ...VALID, message: "x".repeat(11_000) }));
    expect(big.status()).toBe(413);
  });

  test("validates fields before spending a security check", async ({ request }) => {
    const missing = await request.post("/api/contact", post({ email: "a@b.co", message: "Hello there" }));
    expect(missing.status()).toBe(400);
    expect(await missing.json()).toEqual({ error: "Name, email and project details are required." });

    const badEmail = await request.post("/api/contact", post({ ...VALID, email: "nope", turnstileToken: "t" }));
    expect(badEmail.status()).toBe(400);

    const injected = await request.post("/api/contact", post({ ...VALID, name: "A\r\nBcc: x@y.z", turnstileToken: "t" }));
    expect(injected.status()).toBe(400);

    const tooLong = await request.post("/api/contact", post({ ...VALID, name: "n".repeat(121), turnstileToken: "t" }));
    expect(tooLong.status()).toBe(400);
  });

  test("a missing Turnstile token is 403 JSON and never cached", async ({ request }) => {
    const response = await request.post("/api/contact", post({ ...VALID, turnstileToken: "" }));

    expect(response.status()).toBe(403);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect((await response.json()).error).toMatch(/Security verification failed/);
  });

  test("unusual characters pass validation and reach delivery (502 here: mailer disabled)", async ({ request }) => {
    const response = await request.post(
      "/api/contact",
      post({
        name: "Zoë O'Brien-Ngữ 李",
        email: "Zoe+Test@Example.com.au",
        company: "Ä & B <Holdings>",
        message: "Line one\nLine two <b>bold</b> & 🚚",
        turnstileToken: "XXXX.DUMMY.TOKEN.XXXX",
      })
    );

    expect(response.status()).toBe(502);
    expect((await response.json()).error).toContain("hello@drylake.com.au");
  });

  test("a cross-site browser POST is refused before the handler runs", async ({ request }) => {
    const response = await request.post(
      "/api/contact",
      post({ ...VALID, turnstileToken: "t" }, { "content-type": "application/json", origin: "https://evil.example" })
    );

    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({ success: false, error: "Forbidden" });
  });
});
