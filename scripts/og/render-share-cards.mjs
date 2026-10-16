/*
 * Renders the 1200 x 630 social share cards in public/og/ (plus public/opengraph-image.png,
 * the fallback card) from the same copy the pages use: lib/seo-pages.ts and
 * lib/discovery/services.ts. Run after changing a page's headline, a service name or the brand
 * mark, then commit the PNGs. tests/seo-search-visibility.test.mjs fails if a page has no card,
 * or a card is not a 1200 x 630 PNG.
 *
 * Why static PNGs and not next/og at request time: next/og bundles only Geist Regular, so it
 * cannot draw the bold headline in the site's own typeface. This script uses the site's real
 * Geist variable font (from a production build) and the brand SVGs, so the cards match the site.
 *
 * Requirements: a production build (`npm run build`, for the font files) and Playwright with
 * Chromium. Playwright is not a project dependency; point PLAYWRIGHT_MODULE at an install:
 *   PLAYWRIGHT_MODULE=~/qa-tmp/node_modules/playwright node scripts/og/render-share-cards.mjs
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { PAGE_SEO, serviceShareImage } from "../../lib/seo-pages.ts";
import { SERVICES } from "../../lib/discovery/services.ts";
import { RESPONSE_TIME } from "../../lib/site.ts";
import { LOCATION_PAGES, locationShareImage } from "../../lib/service-area-pages.ts";
import { findArea } from "../../lib/service-areas.ts";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");

/* Headline + one line per card. Short statements the pages already make; no claims. */
const CARDS = [
  { image: PAGE_SEO.home.image, headline: "Operational software and automation", line: "For Australian businesses held back by manual work" },
  { image: PAGE_SEO.solutions.image, headline: "Technology should solve the problem.", line: "Custom software, automation, AI and connected systems" },
  { image: PAGE_SEO.services.image, headline: "Software, automation, integration, AI and web", line: "Five service lines for Australian businesses" },
  { image: PAGE_SEO.perth.image, headline: "A Perth technology company", line: "Software, automation and AI for businesses in Perth, WA and Australia" },
  { image: PAGE_SEO.about.image, headline: "Built close to the problem.", line: "About Drylake, a Perth technology company" },
  { image: PAGE_SEO.contact.image, headline: "Tell us what's getting in the way.", line: `A founder replies within ${RESPONSE_TIME}` },
  { image: PAGE_SEO.consultation.image, headline: "Book a free consultation.", line: "30 minutes, no obligation. Monday, Tuesday and Friday, Perth time" },
  { image: PAGE_SEO.privacy.image, headline: "Privacy Policy", line: "How Drylake Pty Ltd handles personal information" },
  { image: PAGE_SEO.terms.image, headline: "Terms of Use", line: "The terms for the Drylake website and Drylake Workspace" },
  ...SERVICES.map((service) => ({ image: serviceShareImage(service.slug), headline: service.name, line: service.summary })),
  ...Object.keys(LOCATION_PAGES).map((slug) => ({
    image: locationShareImage(slug),
    headline: `Websites and software in ${findArea(slug).name}`,
    line: "A Perth technology company. Remote, and on site by arrangement",
  })),
];

function geistFontFaces() {
  const chunks = join(ROOT, ".next/static/chunks");
  const media = join(ROOT, ".next/static/media");
  const css = readdirSync(chunks).filter((f) => f.endsWith(".css")).map((f) => readFileSync(join(chunks, f), "utf8")).join("\n");
  const faces = [...css.matchAll(/@font-face\{[^}]*\}/g)].map((m) => m[0]).filter((face) => /font-family:Geist;/.test(face));
  if (faces.length === 0) throw new Error("No Geist @font-face in .next/static/chunks: run `npm run build` first.");
  // Inlined as data URLs: a page loaded with setContent() is about:blank, which may not read file:// fonts.
  return faces
    .map((face) =>
      face.replace(/url\(\.\.\/media\/([^)]+)\)/g, (_, file) => `url(data:font/woff2;base64,${readFileSync(join(media, file)).toString("base64")})`)
    )
    .join("\n");
}

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const svg = (rel) => readFileSync(join(ROOT, rel), "utf8").replace(/ width="\d+" height="\d+"/, "");

function cardHtml(card, fonts) {
  return `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><style>
${fonts}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#ffffff;font-family:Geist,sans-serif;color:#0f1013;position:relative;overflow:hidden}
.lockup{position:absolute;left:80px;top:72px;display:flex;align-items:center;gap:22px}
.lockup .tile svg{width:76px;height:76px;display:block}
.lockup .word svg{height:72px;width:auto;display:block}
.text{position:absolute;left:80px;right:150px;bottom:116px}
.bar{width:80px;height:6px;background:#f26a2e;margin-bottom:34px}
h1{font-size:${card.headline.length > 34 ? 60 : 70}px;font-weight:700;letter-spacing:-0.035em;line-height:1.04;max-width:960px;text-wrap:balance}
p{margin-top:20px;font-size:27px;line-height:1.35;color:#4b4f57;max-width:900px}
.foot{position:absolute;left:80px;bottom:56px;font-size:21px;color:#7a7e86}
</style></head><body>
<div class="lockup"><span class="tile">${svg("public/brand/drylake-mark-tile.svg")}</span><span class="word">${svg("public/brand/drylake-wordmark-light-bg.svg")}</span></div>
<div class="text"><div class="bar"></div><h1>${escape(card.headline)}</h1><p>${escape(card.line)}</p></div>
<div class="foot">drylake.com.au &#183; Perth, Western Australia</div>
</body></html>`;
}

const fonts = geistFontFaces();
mkdirSync(join(ROOT, "public/og"), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });

for (const card of CARDS) {
  await page.setContent(cardHtml(card, fonts), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const usesGeist = await page.evaluate(() => [...document.fonts].some((face) => face.family === "Geist" && face.status === "loaded"));
  if (!usesGeist) throw new Error(`Geist did not load for ${card.image}`);
  const overlap = await page.evaluate(() => {
    const box = (sel) => document.querySelector(sel).getBoundingClientRect();
    return box(".text").top < box(".lockup").bottom + 32 || box(".text").bottom > box(".foot").top - 24;
  });
  if (overlap) throw new Error(`Text overlaps the lockup or footer on ${card.image}: shorten the copy`);
  const out = join(ROOT, "public", card.image);
  writeFileSync(out, await page.screenshot({ type: "png" }));
  console.log("wrote", card.image);
}

await browser.close();
copyFileSync(join(ROOT, "public", PAGE_SEO.home.image), join(ROOT, "public/opengraph-image.png"));
console.log("wrote /opengraph-image.png (fallback, same as the home card)");
