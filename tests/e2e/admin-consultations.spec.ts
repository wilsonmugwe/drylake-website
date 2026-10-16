import { expect, test } from "@playwright/test";

/*
 * ADMIN CONSULTATIONS, signed-out ROUTE level (no Clerk). Read-only and safe against production:
 * every request is refused before any input is read, so nothing here books, changes or cancels.
 *
 * Signed-in flows (a platform admin listing, opening, cancelling and rescheduling, and a signed-in
 * non-admin getting 403) need real Clerk sessions, which a local build with placeholder keys cannot
 * create. Their contract is asserted from source in tests/consultation-admin-access.test.mjs and
 * they are step-by-step production checks in docs/operations/consultation-live-test.md.
 */

const ID = "11111111-1111-4111-8111-111111111111";

test.describe("admin consultations: signed-out", () => {
  for (const body of [
    { action: "cancel", version: 1, reason: "test" },
    { action: "reschedule", version: 1, newStart: "2027-03-01T01:00:00.000Z" },
    { action: "complete", version: 1 },
    { action: "retry_calendar" },
    { nonsense: true },
  ]) {
    test(`POST ${body.action ?? "garbage"}: 401 JSON, no cache, before the body is read`, async ({ request }) => {
      const response = await request.post(`/api/admin/consultations/${ID}`, {
        headers: { accept: "application/json", "sec-fetch-mode": "cors" },
        data: body,
        maxRedirects: 0,
      });

      expect(response.status()).toBe(401);
      expect(response.headers()["content-type"]).toContain("application/json");
      expect(response.headers()["cache-control"]).toContain("no-store");
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(JSON.stringify(json)).not.toMatch(/consultation|booking|cancel|reschedul/i);
    });
  }

  test("a browser form post is sent to sign-in instead of seeing JSON", async ({ request }) => {
    const response = await request.post(`/api/admin/consultations/${ID}`, {
      headers: { accept: "text/html", "sec-fetch-mode": "navigate" },
      data: { action: "cancel", version: 1 },
      maxRedirects: 0,
    });

    expect([302, 303, 307]).toContain(response.status());
    expect(new URL(response.headers().location, "http://x").pathname).toBe("/sign-in");
  });

  for (const path of ["/admin/consultations", `/admin/consultations/${ID}`, "/admin/consultations?status=CANCELLED&rep=benedict"]) {
    test(`${path} redirects to sign-in carrying its return path`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });

      expect([302, 303, 307]).toContain(response.status());
      const location = new URL(response.headers().location, "http://x");
      expect(location.pathname).toBe("/sign-in");
      expect(location.searchParams.get("redirect_url")).toBe(path);
    });
  }

  test("the background endpoint refuses a caller without the cron secret", async ({ request }) => {
    for (const method of ["get", "post"] as const) {
      const response = await request[method]("/api/cron/consultation-notifications", { maxRedirects: 0 });
      expect(response.status()).toBe(401);
    }
    const wrong = await request.get("/api/cron/consultation-notifications", { headers: { authorization: "Bearer not-the-secret" }, maxRedirects: 0 });
    expect(wrong.status()).toBe(401);
  });
});

test.describe("health: consultation block", () => {
  test("keeps its fields, adds consultations, and exposes no personal data", async ({ request }) => {
    const response = await request.get("/api/health");
    const text = await response.text();
    const json = JSON.parse(text);

    expect([200, 503]).toContain(response.status());
    expect(response.headers()["cache-control"]).toContain("no-store");
    for (const key of ["status", "missingRequired", "region", "environment", "timestamp"]) expect(json).toHaveProperty(key);
    expect(json).toHaveProperty("consultations");
    expect(typeof json.consultations.available).toBe("boolean");
    expect(text).not.toContain("@");
    expect(text).not.toMatch(/DL-[A-Z0-9]{6}/);
    expect(text).not.toMatch(/MS_GRAPH|SECRET|client_secret/);

    if (json.consultations.available) {
      expect(["running", "stalled", "unknown"]).toContain(json.consultations.dispatch.minuteTrigger);
      expect(["not_connected", "ok", "expired", "auth_failed", "unknown"]).toContain(json.consultations.calendar.credentials);
    }
  });
});
