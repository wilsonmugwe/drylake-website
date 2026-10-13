import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";

/*
 * Shared facts for the e2e suite. PUBLIC_PATHS mirrors PUBLIC_PAGES in lib/discovery/entity.ts;
 * seo.spec.ts fails if the live sitemap and this list ever disagree, so a new public page
 * cannot ship without QA coverage.
 */
export const SERVICE_PATHS = [
  "/services/custom-software-development",
  "/services/business-automation",
  "/services/systems-integration",
  "/services/ai-automation",
  "/services/web-development",
] as const;

export const PUBLIC_PATHS = [
  "/",
  "/solutions",
  "/services",
  ...SERVICE_PATHS,
  "/perth",
  "/about",
  "/contact",
  "/consultation",
  "/privacy",
  "/terms",
] as const;

export const PRODUCTION_ORIGIN = "https://drylake.com.au";

/* Widths the brief names, plus the two desktop breakpoints the layout switches at. */
export const WIDTH_MATRIX = [320, 360, 375, 390, 393, 414, 430, 768, 1024, 1440] as const;

export const isRemote = Boolean(process.env.PLAYWRIGHT_BASE_URL);

export function isMobileProject(testInfo: TestInfo) {
  return testInfo.project.name === "mobile";
}

/* An absolute production URL (canonical, og:image) mapped onto the server under test. */
export function localPath(absoluteUrl: string): string {
  const url = new URL(absoluteUrl);
  return `${url.pathname}${url.search}`;
}

/*
 * Console errors that are expected only on a local `next start` and never in production:
 * the Vercel Analytics script exists only on Vercel, and the placeholder Clerk key points at
 * a domain that does not resolve. Anything else is a real error.
 */
const LOCAL_ONLY_NOISE = [
  /_vercel\/insights/,
  /Failed to load resource: the server responded with a status of 404/,
  /ERR_NAME_NOT_RESOLVED/,
];

export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (!isRemote && LOCAL_ONLY_NOISE.some((pattern) => pattern.test(text))) return;
    // The local build has no database (placeholder Supabase URL), so the booking page's
    // availability call answers 503 by design; the page shows its own error state. Scoped to
    // that one URL so any other 5xx still fails, and never ignored against production.
    if (!isRemote && /status of 503/.test(text) && message.location().url.includes("/api/consultations/availability")) return;
    errors.push(text);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

  return errors;
}

/*
 * Let entrance animations (section reveals, menu stagger) finish. Measured 2026-10-07: axe run
 * mid-reveal reports text at 1.07:1 that settles to full contrast a moment later, so contrast is
 * judged on the settled page, which is what a reader sees. Bounded: the suite separately fails
 * any infinite animation (accessibility.spec.ts "motion").
 */
export async function settleAnimations(page: Page, timeoutMs = 5_000) {
  await page.evaluate(
    (limit) =>
      Promise.race([
        Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined))),
        new Promise((resolve) => setTimeout(resolve, limit)),
      ]),
    timeoutMs
  );
}

/*
 * Scroll the whole page once so every scroll-triggered reveal (components/motion/InView.tsx)
 * has run. Content still waiting below the fold is transparent, and axe skips transparent text,
 * so without this most of a long page would never be contrast-checked.
 */
export async function revealWholePage(page: Page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
  });
  await settleAnimations(page);
}

/* WCAG 2.2 A/AA automated checks, colour contrast included, on the settled page. */
export async function expectNoAxeViolations(page: Page, include?: string) {
  await settleAnimations(page);

  let builder = new AxeBuilder({ page }).withTags([
    "wcag2a",
    "wcag2aa",
    "wcag21a",
    "wcag21aa",
    "wcag22aa",
  ]);

  if (include) builder = builder.include(include);

  const results = await builder.analyze();
  const summary = results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.nodes
        .slice(0, 3)
        .map((node) => node.target.join(" "))
        .join(" | ")}`
  );

  expect(summary, "axe violations").toEqual([]);
}

/* No horizontal page scroll: the document is never wider than the viewport. */
export async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth };
  });
}

/*
 * Interactive controls smaller than 44 x 44 CSS px. Inline links inside running text are
 * exempt (WCAG 2.5.8 inline exception), as are hidden and zero-size elements.
 */
export async function undersizedTargets(page: Page, minimum = 44) {
  return page.evaluate((min) => {
    const selector = "a[href], button, input:not([type=hidden]), select, textarea, [role=button]";

    return [...document.querySelectorAll<HTMLElement>(selector)]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;

        const style = getComputedStyle(element);
        if (style.visibility === "hidden" || element.closest("[aria-hidden=true]")) return false;

        const block = element.closest("p, li");
        const inlineInText =
          style.display === "inline" &&
          block !== null &&
          (block.textContent ?? "").trim().length > (element.textContent ?? "").trim().length + 5;

        // Turnstile renders inside a cross-origin iframe we do not control.
        if (element.closest("iframe")) return false;

        return !inlineInText && rect.height < min;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const name = element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 40);
        return `${element.tagName.toLowerCase()} "${name}" ${Math.round(rect.width)}x${Math.round(rect.height)}`;
      });
  }, minimum);
}

/*
 * Replace Cloudflare's Turnstile script with a deterministic stand-in so form tests are
 * hermetic and never depend on a third party. mode "pass" issues the documented dummy token;
 * "error" calls the widget's error callback (blocked script, bad key).
 */
export async function stubTurnstile(page: Page, mode: "pass" | "error" = "pass") {
  await page.route("https://challenges.cloudflare.com/turnstile/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      // reset() issues a fresh token, as the real widget does after a spent one.
      body: `(function () {
        var options = null;
        function issue() {
          setTimeout(function () {
            if (!options) return;
            ${mode === "pass" ? 'options.callback("XXXX.DUMMY.TOKEN.XXXX");' : 'options["error-callback"]("110200");'}
          }, 50);
        }
        window.turnstile = {
          render: function (el, opts) { options = opts; issue(); return "stub-widget"; },
          reset: function () { issue(); },
          remove: function () { options = null; }
        };
      })();`,
    })
  );
}
