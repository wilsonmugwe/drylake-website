import { defineConfig, devices } from "@playwright/test";

/*
 * Production experience QA suite (PR 7, 2026-10-07). `npm run test:e2e`.
 *
 * Local (default): builds the app and serves it with `next start` on 3107, with Cloudflare's
 * published Turnstile TEST keys and the placeholder Clerk/Supabase keys from .env.local.
 * RESEND_API_KEY is forced empty, so no enquiry can ever be emailed from a test run: the real
 * server's delivery step fails closed (502), which is itself one of the tested paths.
 *
 * Remote (read-only): PLAYWRIGHT_BASE_URL=https://drylake.com.au npm run test:e2e:prod
 * runs every test NOT tagged @local. @local tests submit forms, stub third-party scripts or
 * depend on test keys, so they never run against production (the contact endpoint is rate
 * limited there and must not receive test traffic).
 *
 * E2E_SKIP_BUILD=1 reuses an existing `.next` build (the build is the slow part).
 */
const PORT = 3107;
const REMOTE_BASE_URL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = REMOTE_BASE_URL ?? `http://localhost:${PORT}`;

/* Cloudflare's documented always-pass test keys. Never real credentials. */
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";

const startCommand = `npx next start -p ${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // next start is a single process; more workers than this only queue on it.
  workers: process.env.CI ? 2 : 3,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  grepInvert: REMOTE_BASE_URL ? /@local/ : undefined,

  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "desktop",
      testIgnore: /responsive-matrix\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      testIgnore: /responsive-matrix\.spec\.ts/,
      // iPhone-class viewport and touch on Chromium (the cached browser).
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 667 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "matrix",
      testMatch: /responsive-matrix\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: REMOTE_BASE_URL
    ? undefined
    : {
        command: process.env.E2E_SKIP_BUILD ? startCommand : `npm run build && ${startCommand}`,
        url: `${baseURL}/robots.txt`,
        reuseExistingServer: !process.env.CI,
        timeout: 600_000,
        stdout: "ignore",
        stderr: "pipe",
        env: {
          NEXT_PUBLIC_TURNSTILE_SITE_KEY: TURNSTILE_TEST_SITE_KEY,
          TURNSTILE_SECRET_KEY: TURNSTILE_TEST_SECRET_KEY,
          // Delivery must be impossible from a test run (see header).
          RESEND_API_KEY: "",
          CONTACT_TO_EMAIL: "",
          EMAIL_FROM: "",
          NEXT_TELEMETRY_DISABLED: "1",
        },
      },
});
