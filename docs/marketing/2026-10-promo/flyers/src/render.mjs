/*
 * Renders ../html/*.html to ../pdf (A4, print backgrounds) and ../png with headless Chromium.
 * Playwright is borrowed from another local node_modules (pass its path) so this docs folder adds no
 * dependency to the app. forcedColors "none" + explicit backgrounds guard against the operator's
 * Windows contrast theme stripping backgrounds. Fails if the Geist font did not load.
 *
 * Usage: node render.mjs <path-to-node_modules-with-playwright>
 */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { FLYERS } from "./content.mjs";

const require = createRequire(join(process.argv[2] ?? "", "noop.js"));
const { chromium } = require("playwright");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const d of ["pdf", "png"]) mkdirSync(join(ROOT, d), { recursive: true });

async function open(browser, file, viewport, scale) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale, forcedColors: "none", colorScheme: "dark" });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(join(ROOT, "html", file)).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const ok = await page.evaluate(() => document.fonts.check('600 20px "Geist"'));
  if (!ok) throw new Error(`Geist did not load for ${file}`);
  return { ctx, page };
}

const browser = await chromium.launch();
try {
  for (const { slug } of FLYERS) {
    const a4 = await open(browser, `${slug}-a4.html`, { width: 794, height: 1123 }, 2);
    await a4.page.screenshot({ path: join(ROOT, "png", `${slug}-a4.png`), fullPage: false });
    await a4.page.emulateMedia({ media: "print", forcedColors: "none" });
    await a4.page.pdf({ path: join(ROOT, "pdf", `${slug}-a4.pdf`), format: "A4", printBackground: true, preferCSSPageSize: true });
    await a4.ctx.close();
    const social = await open(browser, `${slug}-social.html`, { width: 1080, height: 1350 }, 1);
    await social.page.screenshot({ path: join(ROOT, "png", `${slug}-social.png`), fullPage: false });
    await social.ctx.close();
    console.log(`rendered ${slug}`);
  }
} finally {
  await browser.close();
}
