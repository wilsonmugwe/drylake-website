/*
 * Cookie and storage audit (privacy workstream, 2026-10-16).
 *
 *   node scripts/cookie-audit.mjs http://localhost:3107 > audit.json
 *
 * Opens each page in a FRESH browser context (so nothing leaks between pages), waits for the
 * network to settle, and records what the page left in the browser: cookies set by response
 * headers (context.cookies, which also sees HttpOnly), document.cookie, localStorage,
 * sessionStorage, and every request that went to another origin. Read-only: it never submits a
 * form. Output is JSON on stdout, one entry per page.
 */
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3107";
const PAGES = ["/", "/about", "/services", "/contact", "/consultation", "/privacy", "/terms", "/sign-in"];
const extra = process.argv.slice(3);

const browser = await chromium.launch();
const results = [];

for (const path of [...PAGES, ...extra]) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const origin = new URL(base).origin;
  const thirdParty = new Set();
  const insights = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== origin) thirdParty.add(url.origin);
    if (url.pathname.startsWith("/_vercel/")) insights.push(`${request.method()} ${url.pathname}`);
  });

  let status = null;
  try {
    const response = await page.goto(new URL(path, base).toString(), { waitUntil: "load", timeout: 45_000 });
    status = response?.status() ?? null;
    // Some pages (Turnstile forms) never go fully idle, so settle with a bounded wait.
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(3000);
  } catch (error) {
    status = `error: ${String(error).slice(0, 120)}`;
  }

  const inPage = await page
    .evaluate(() => ({
      documentCookie: document.cookie,
      localStorage: Object.keys(localStorage),
      sessionStorage: Object.keys(sessionStorage),
      iframes: [...document.querySelectorAll("iframe")].map((frame) => frame.src.split("?")[0]),
    }))
    .catch(() => ({ documentCookie: "", localStorage: [], sessionStorage: [], iframes: [] }));

  const cookies = (await context.cookies()).map((cookie) => ({
    name: cookie.name,
    domain: cookie.domain,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
    expiresInDays: cookie.expires > 0 ? Math.round((cookie.expires - Date.now() / 1000) / 86400) : "session",
  }));

  results.push({ path, status, cookies, ...inPage, thirdPartyOrigins: [...thirdParty].sort(), vercelRequests: insights });
  await context.close();
}

await browser.close();
console.log(JSON.stringify({ base, at: new Date().toISOString(), results }, null, 2));
