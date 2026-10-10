/*
 * Renders the web-app manifest icons (192 and 512 px PNG) from the official tile SVG
 * (public/brand/drylake-mark-tile.svg, written by generate-tile.py). Uses the Playwright
 * Chromium the e2e suite already installs, so no image library is added to the project.
 *
 * The corners stay transparent (the tile is a rounded square), which is what Chrome and
 * Android expect for a purpose "any" icon. Not marked "maskable": a mask would crop the plates.
 *
 * Run: node scripts/brand/render-app-icons.mjs
 */
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const svg = readFileSync(`${ROOT}public/brand/drylake-mark-tile.svg`, "utf8");

const browser = await chromium.launch();
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const sized = svg.replace('width="512" height="512"', `width="${size}" height="${size}"`);
  await page.setContent(`<html><body style="margin:0;background:transparent">${sized}</body></html>`);
  await page.screenshot({
    path: `${ROOT}public/brand/drylake-app-icon-${size}.png`,
    omitBackground: true,
    clip: { x: 0, y: 0, width: size, height: size },
  });
  await page.close();
}
await browser.close();
console.log("wrote drylake-app-icon-192.png and drylake-app-icon-512.png");
