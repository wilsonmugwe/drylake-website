import { expect, test } from "@playwright/test";

/*
 * AUTHENTICATION ENTRY, signed-out. A signed-out visitor can never see a private page: the
 * proxy sends every /client, /admin and /portal request to sign-in carrying its own path (query
 * kept) as redirect_url, and every protected API answers 401/403 JSON instead of data.
 *
 * Signed-in client, admin and wrong-role flows need real Clerk sessions, which a local build with
 * placeholder keys cannot create. They are covered by source contracts
 * (tests/qa-regression-contracts.test.mjs, tests/tenant-isolation.test.mjs) and listed as
 * WILSON-PROD checks in the PR.
 */

const PRIVATE_PAGES = [
  "/client",
  "/client/billing",
  "/client/billing?paid=1",
  "/client/projects/11111111-1111-4111-8111-111111111111",
  "/admin",
  "/admin/clients",
  "/admin/invoices",
  "/portal",
  "/portal/workspaces",
];

for (const path of PRIVATE_PAGES) {
  test(`signed-out ${path} redirects to sign-in with its return path`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 });

    expect([302, 303, 307]).toContain(response.status());
    const location = new URL(response.headers().location, "http://x");
    expect(location.pathname).toBe("/sign-in");
    expect(location.searchParams.get("redirect_url")).toBe(path);
  });
}

test("private surfaces carry noindex headers", async ({ request }) => {
  for (const path of ["/client", "/admin", "/portal", "/sign-in"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.headers()["x-robots-tag"], path).toContain("noindex");
  }
});

test("a visitor opening the Workspace lands on the sign-in screen and can get back to the site", async ({ page }) => {
  await page.goto("/client/billing");

  await expect(page).toHaveURL(/\/sign-in\?redirect_url=%2Fclient%2Fbilling$/);
  await expect(page.locator("main#main-content")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  const back = page.getByRole("link", { name: "Back to Drylake" });
  await expect(back).toBeVisible();
  await back.click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("h1")).toContainText("running your business easier");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
});

test("Client Login from the public header goes through /portal to sign-in", async ({ page }) => {
  await page.goto("/");
  await page.locator('a[href="/portal"]').first().evaluate((link: HTMLAnchorElement) => link.click());

  await expect(page).toHaveURL(/\/sign-in\?redirect_url=%2Fportal$/);
});

test("the invitation landing stays public and never asks for a session first", async ({ request }) => {
  // Without a Clerk ticket there is nothing to accept: it routes to /portal, not straight to sign-in.
  const response = await request.get("/portal/accept-invitation", { maxRedirects: 0 });

  expect(response.status()).toBeLessThan(400);
  if (response.status() >= 300) {
    expect(new URL(response.headers().location, "http://x").pathname).toBe("/portal");
  }
});

test.describe("protected APIs answer signed-out callers with JSON, never data", () => {
  test("client document download: 401", async ({ request }) => {
    const response = await request.get("/api/client/documents/11111111-1111-4111-8111-111111111111/download", {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(401);
    expect(response.headers()["content-type"]).toContain("application/json");
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  /*
   * Every admin write endpoint, called the way the admin UI's fetch calls it (Accept: JSON).
   * Body shapes differ by route ({ success:false, error } or { error, code }); the contract is
   * 401 + JSON + an error string + nothing else.
   */
  const ID = "11111111-1111-4111-8111-111111111111";
  const ADMIN_JSON_POSTS = [
    "/api/admin/clients",
    `/api/admin/clients/${ID}/status`,
    `/api/admin/clients/${ID}/billing`,
    `/api/admin/clients/${ID}/invoices`,
    `/api/admin/clients/${ID}/projects`,
    `/api/admin/clients/${ID}/invitations`,
    `/api/admin/clients/${ID}/invitations/inv_qa`,
    `/api/admin/projects/${ID}/updates`,
    `/api/admin/projects/${ID}/documents`,
    `/api/admin/projects/${ID}/milestones`,
    `/api/admin/milestones/${ID}/status`,
  ];

  for (const path of ADMIN_JSON_POSTS) {
    test(`admin ${path}: 401 JSON before reading input`, async ({ request }) => {
      const response = await request.post(path, {
        data: {},
        headers: { "content-type": "application/json", accept: "application/json" },
        maxRedirects: 0,
      });

      expect(response.status()).toBe(401);
      expect(response.headers()["content-type"]).toContain("application/json");
      const body = await response.json();
      expect(typeof body.error).toBe("string");
      expect(Object.keys(body).every((key) => ["success", "error", "code", "field"].includes(key))).toBe(true);
    });
  }

  /*
   * Issue and Resend are native <form method="POST"> buttons (components/admin/AdminInvoiceAction).
   * DEFECT found by this suite (2026-10-07): an admin whose session had expired pressed Issue and
   * got a bare text "Unauthorized" page, a dead end, while every other admin form returns to
   * sign-in (lib/auth/request-kind.ts states that rule). Now: a signed-out form post goes to
   * sign-in and comes back to the invoice; a programmatic caller gets 401 JSON.
   */
  for (const action of ["issue", "resend"]) {
    test(`admin invoice ${action}: a signed-out form post returns to sign-in, then the invoice`, async ({ request }) => {
      const response = await request.post(`/api/admin/invoices/${ID}/${action}`, {
        form: { confirm: "1" },
        headers: { accept: "text/html", "sec-fetch-mode": "navigate", "sec-fetch-dest": "document" },
        maxRedirects: 0,
      });

      expect(response.status()).toBe(303);
      const location = new URL(response.headers().location, "http://x");
      expect(location.pathname).toBe("/sign-in");
      expect(location.searchParams.get("redirect_url")).toBe(`/admin/invoices/${ID}`);
    });

    test(`admin invoice ${action}: 401 JSON for a programmatic caller`, async ({ request }) => {
      const response = await request.post(`/api/admin/invoices/${ID}/${action}`, {
        headers: { accept: "application/json" },
        maxRedirects: 0,
      });

      expect(response.status()).toBe(401);
      expect(await response.json()).toEqual({ success: false, error: "Unauthorized" });
    });
  }

  test("a native admin form post when signed out goes to sign-in, not an error page", async ({ request }) => {
    const response = await request.post(`/api/admin/clients/${ID}/invoices`, {
      form: { amount: "1" },
      headers: { accept: "text/html", "sec-fetch-mode": "navigate", "sec-fetch-dest": "document" },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(303);
    expect(new URL(response.headers().location, "http://x").pathname).toBe("/sign-in");
  });

  test("payment checkout and invitation completion: 401", async ({ request }) => {
    const checkout = await request.post("/api/stripe/checkout", {
      data: {},
      headers: { "content-type": "application/json" },
      maxRedirects: 0,
    });
    expect(checkout.status()).toBe(401);
    expect((await checkout.json()).code).toBe("UNAUTHENTICATED");

    const invitation = await request.post("/api/client/invitations/complete", {
      data: {},
      headers: { "content-type": "application/json" },
      maxRedirects: 0,
    });
    expect(invitation.status()).toBe(401);
  });

  test("the Stripe webhook refuses an unsigned delivery @local", async ({ request }) => {
    const response = await request.post("/api/stripe/webhook", {
      data: { type: "checkout.session.completed" },
      headers: { "content-type": "application/json" },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });
});
