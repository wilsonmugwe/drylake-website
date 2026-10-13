import { expect, test, type Page, type Route } from "@playwright/test";

import { expectNoAxeViolations, horizontalOverflow, stubTurnstile, undersizedTargets } from "./helpers";

/*
 * CONSULTATION BOOKING UI. Local only (@local): it books, and the booking API must never receive
 * test traffic in production. The consultation API is intercepted in the browser (no database in
 * the local e2e build), so these tests cover the interface contract: the flow, validation, the
 * summary, the slot-taken path and the manage page. The server and database side is covered by
 * tests/consultation-booking.test.mjs and tests/db/run-consultation-db-tests.sh.
 */

/* Two Mondays and a Friday, Perth 9:00, 9:30 (UTC+8). */
const DAYS = [
  { date: "2027-03-01", slots: ["2027-03-01T01:00:00.000Z", "2027-03-01T01:30:00.000Z"] },
  { date: "2027-03-02", slots: [] },
  { date: "2027-03-05", slots: ["2027-03-05T01:00:00.000Z"] },
];

async function stubAvailability(page: Page, days = DAYS) {
  let calls = 0;
  await page.route("**/api/consultations/availability", (route) => {
    calls += 1;
    return route.fulfill({ json: { timezone: "Australia/Perth", days } });
  });
  return () => calls;
}

async function pickFirstSlot(page: Page) {
  await page.getByRole("radio", { name: /Monday 1 March, 2 times available/ }).check();
  await page.getByRole("radio", { name: "9:30 am" }).check();
  await page.getByRole("button", { name: "Continue" }).click();
}

async function fillDetails(page: Page) {
  await page.getByLabel(/Full name/).fill("Quinn Tester");
  await page.getByLabel(/Email address/).fill("quinn@example.com");
  await page.getByLabel(/About your business or project/).fill("We run a cleaning business and lose bookings in email.");
  await page.getByRole("button", { name: "Review booking" }).click();
}

test.describe("consultation booking @local", () => {
  test.beforeEach(async ({ page }) => {
    await stubTurnstile(page);
  });

  test("books a free consultation: pick, details, review summary, confirm", async ({ page }) => {
    await stubAvailability(page);
    const posts: unknown[] = [];
    await page.route("**/api/consultations", async (route: Route) => {
      posts.push(route.request().postDataJSON());
      await route.fulfill({
        status: 201,
        json: { success: true, booking: { reference: "DL-7KQ2MX", start: "2027-03-01T01:30:00.000Z", end: "2027-03-01T02:00:00.000Z" } },
      });
    });

    await page.goto("/consultation");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Book a free");
    await expect(page.getByText(/No obligation to proceed/).first()).toBeVisible();
    // A fully booked day is shown, not hidden, and cannot be chosen.
    await expect(page.getByRole("radio", { name: /Tuesday 2 March, fully booked/ })).toBeDisabled();

    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
    await pickFirstSlot(page);

    // Required fields are enforced before the review step.
    await page.getByRole("button", { name: "Review booking" }).click();
    await expect(page.getByText("Please enter your full name.")).toBeVisible();
    await fillDetails(page);

    const summary = page.locator("dl").first();
    await expect(summary).toContainText("Free 30-minute consultation");
    await expect(summary).toContainText("Monday 1 March 2027");
    await expect(summary).toContainText("9:30 am to 10:00 am");
    await expect(summary).toContainText("Perth time (AWST)");
    await expect(page.getByText("No obligation to proceed. Any work is quoted before it begins.")).toBeVisible();

    await page.getByRole("button", { name: "Confirm free consultation" }).click();
    await expect(page.getByTestId("consultation-confirmed")).toContainText("DL-7KQ2MX");
    await expect(page.getByTestId("consultation-confirmed")).toContainText("quinn@example.com");

    expect(posts).toHaveLength(1);
    const body = posts[0] as Record<string, string>;
    expect(body.start).toBe("2027-03-01T01:30:00.000Z");
    expect(body.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.turnstileToken).toBe("XXXX.DUMMY.TOKEN.XXXX");
  });

  test("a slot taken meanwhile: the brief's message, fresh times, back to choosing; the retry keeps one key", async ({ page }) => {
    const calls = await stubAvailability(page);
    const keys: string[] = [];
    await page.route("**/api/consultations", (route) => {
      keys.push((route.request().postDataJSON() as { idempotencyKey: string }).idempotencyKey);
      return route.fulfill({
        status: 409,
        json: { success: false, code: "slot_taken", error: "This time has just been booked. Please choose another available time." },
      });
    });

    await page.goto("/consultation");
    await pickFirstSlot(page);
    await fillDetails(page);
    await page.getByRole("button", { name: "Confirm free consultation" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "This time has just been booked" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Choose a time" })).toBeVisible();
    expect(calls()).toBeGreaterThanOrEqual(2);

    // Choosing again and confirming reuses the same idempotency key (no duplicate on retry).
    await pickFirstSlot(page);
    await page.getByRole("button", { name: "Review booking" }).click();
    await page.getByRole("button", { name: "Confirm free consultation" }).click();
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  test("double clicking confirm sends one request", async ({ page }) => {
    await stubAvailability(page);
    let posts = 0;
    await page.route("**/api/consultations", async (route) => {
      posts += 1;
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.fulfill({ status: 201, json: { success: true, booking: { reference: "DL-7KQ2MX", start: DAYS[0].slots[1], end: DAYS[0].slots[1] } } });
    });
    await page.goto("/consultation");
    await pickFirstSlot(page);
    await fillDetails(page);
    await page.getByRole("button", { name: "Confirm free consultation" }).dblclick();
    await expect(page.getByTestId("consultation-confirmed")).toBeVisible();
    expect(posts).toBe(1);
  });

  for (const width of [320, 375, 430]) {
    test(`fits ${width}px with 44px targets and no horizontal scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await stubAvailability(page);
      await page.goto("/consultation");
      await page.getByRole("radio", { name: /Monday 1 March/ }).check();
      const { scrollWidth, clientWidth } = await horizontalOverflow(page);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
      expect(await undersizedTargets(page)).toEqual([]);
    });
  }

  test("is accessible (axe) on the time and confirm steps", async ({ page }) => {
    await stubAvailability(page);
    await page.goto("/consultation");
    await expectNoAxeViolations(page, "main");
    await pickFirstSlot(page);
    await fillDetails(page);
    await expect(page.getByRole("button", { name: "Confirm free consultation" })).toBeEnabled();
    await expectNoAxeViolations(page, "main");
  });

  test("the booking page links to the message form, and the contact page offers both", async ({ page }) => {
    await stubAvailability(page);
    await page.goto("/consultation");
    await expect(page.getByRole("link", { name: /Send us a message/ })).toHaveAttribute("href", "/contact");
    await page.goto("/contact");
    await expect(page.getByRole("heading", { name: "Book a free consultation" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Send us a message" })).toBeVisible();
    await expect(page.locator("main").getByRole("link", { name: /Start Free Consultation/ })).toHaveAttribute("href", "/consultation");
    // The existing enquiry form is still on the page.
    await expect(page.getByRole("button", { name: /Start the conversation/ })).toBeVisible();
  });
});

test.describe("manage appointment @local", () => {
  const BOOKING = {
    reference: "DL-7KQ2MX",
    name: "Quinn Tester",
    start: "2027-03-01T01:30:00.000Z",
    end: "2027-03-01T02:00:00.000Z",
    status: "CONFIRMED",
    version: 1,
    canChange: true,
    cancelledByDrylake: false,
  };
  const TOKEN = "A".repeat(43);

  test("opens from the fragment link, never sends the token in a URL, and cancels after confirming", async ({ page }) => {
    const bodies: Array<Record<string, unknown>> = [];
    const urls: string[] = [];
    page.on("request", (request) => urls.push(request.url()));
    await page.route("**/api/consultations/manage", (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      bodies.push(body);
      if (body.action === "cancel") {
        return route.fulfill({ json: { success: true, booking: { ...BOOKING, status: "CANCELLED", version: 2, canChange: false } } });
      }
      return route.fulfill({ json: { success: true, booking: BOOKING } });
    });

    await page.goto(`/consultation/manage#t=${TOKEN}`);
    await expect(page.getByTestId("manage-status")).toHaveText("Confirmed");
    await expect(page.getByText("Monday 1 March 2027")).toBeVisible();

    await page.getByRole("button", { name: "Cancel consultation" }).click();
    await expect(page.getByRole("heading", { name: "Cancel your consultation?" })).toBeVisible();
    expect(bodies.filter((b) => b.action === "cancel")).toHaveLength(0); // nothing until confirmed
    await page.getByRole("button", { name: "Yes, cancel it" }).click();
    await expect(page.getByTestId("manage-status")).toHaveText("Cancelled");

    expect(bodies[0]).toEqual({ token: TOKEN, action: "view" });
    expect(bodies.at(-1)).toMatchObject({ token: TOKEN, action: "cancel", version: 1 });
    expect(urls.some((url) => url.split("#")[0].includes(TOKEN))).toBe(false);
  });

  test("reschedules after confirming, leaving out the current time, and adopts the new link", async ({ page }) => {
    await stubAvailability(page);
    await page.route("**/api/consultations/manage", (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      if (body.action === "reschedule") {
        return route.fulfill({
          json: { success: true, token: "B".repeat(43), booking: { ...BOOKING, start: body.newStart, status: "RESCHEDULED", version: 2 } },
        });
      }
      return route.fulfill({ json: { success: true, booking: BOOKING } });
    });

    await page.goto(`/consultation/manage#t=${TOKEN}`);
    await page.getByRole("button", { name: "Reschedule" }).click();
    await page.getByRole("radio", { name: /Monday 1 March/ }).check();
    // The appointment's own time (9:30) is not offered as a new time.
    await expect(page.getByRole("radio", { name: "9:30 am" })).toHaveCount(0);
    await page.getByRole("radio", { name: "9:00 am" }).check();
    await page.getByRole("button", { name: "Review new time" }).click();
    await expect(page.getByRole("heading", { name: "Move your consultation?" })).toBeVisible();
    await page.getByRole("button", { name: "Yes, move my consultation" }).click();
    await expect(page.getByTestId("manage-status")).toHaveText("Confirmed (rescheduled)");
    expect(new URL(page.url()).hash).toBe(`#t=${"B".repeat(43)}`);
  });

  test("an invalid or expired link explains what to do", async ({ page }) => {
    await page.route("**/api/consultations/manage", (route) =>
      route.fulfill({ status: 404, json: { success: false, error: "This appointment link is not valid or has expired." } })
    );
    await page.goto(`/consultation/manage#t=${TOKEN}`);
    await expect(page.getByRole("alert").filter({ hasText: "not valid or has expired" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Book a new consultation" })).toBeVisible();
  });
});

/* The hero tile labels (brief, Task 4): every label sits inside its own plate at every width. */
test.describe("lake bed labels", () => {
  for (const width of [320, 360, 375, 390, 414, 430, 768, 1024, 1440]) {
    test(`every label is inside its plate at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const outside = await page.evaluate(() => {
        const tile = [...document.querySelectorAll<HTMLElement>(".lb-ix")].find((t) => t.getBoundingClientRect().width > 0);
        if (!tile) return ["no visible tile"];
        tile.scrollIntoView({ block: "center", behavior: "instant" });
        document.getAnimations().forEach((animation) => animation.finish());

        const hits = [...tile.querySelectorAll<HTMLElement>(".lb-hit")];
        const problems: string[] = [];
        for (const label of tile.querySelectorAll<HTMLElement>(".lb-label")) {
          const plate = hits[Number(label.dataset.plate)];
          const r = label.getBoundingClientRect();
          // Each hit button is clipped to its plate's outline, so hit-testing answers "is this
          // point on the plate?". Both ends of the label's text (the "+" cue is out of flow).
          for (const x of [r.left + 1, r.right - 1]) {
            if (!document.elementsFromPoint(x, r.top + r.height / 2).includes(plate)) {
              problems.push(`${label.textContent?.trim()} at x=${Math.round(x)}`);
            }
          }
        }
        return problems;
      });
      expect(outside).toEqual([]);
    });
  }
});
