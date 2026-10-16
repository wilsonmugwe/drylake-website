/*
 * Builds the Workstream 9 flyers as self-contained HTML: A4 portrait print + 1080x1350 social,
 * one pair per entry in content.mjs. Everything is inline (CSS, the wordmark SVG, a generated
 * cracked-lakebed texture, the pre-generated QR SVG); the only external request is the Geist font
 * from Google Fonts, which is the family the site loads. Original vector artwork only: no photos,
 * no people. Contract: deterministic output (seeded texture), no em dashes in any string.
 *
 * Usage: node build.mjs   (writes ../html/<slug>-a4.html and ../html/<slug>-social.html)
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BRAND, FLYERS } from "./content.mjs";
import { lakebed } from "./texture.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "html");
const REPO = join(HERE, "..", "..", "..", "..", "..");
const WORDMARK = readFileSync(join(REPO, "public/brand/drylake-wordmark-dark-bg.svg"), "utf8")
  .replace(/ width="\d+" height="\d+"/, "")
  .replace("<svg ", '<svg class="wordmark" ');

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const CSS = `
:root{--ink:#0b0b0a;--ink2:#121210;--ink3:#1a1a17;--mineral:#f2f0e9;--muted:rgba(242,240,233,.72);
--faint:rgba(242,240,233,.5);--signal:#f26a2e;--ochre:#c2703d;--line:rgba(242,240,233,.14)}
*{box-sizing:border-box;margin:0;padding:0;forced-color-adjust:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{background:#0b0b0a;color:#f2f0e9;font-family:Geist,Arial,Helvetica,sans-serif}
.sheet{position:relative;overflow:hidden;background:var(--ink);display:flex;flex-direction:column}
.texture{position:absolute;left:-8px;top:-8px;width:calc(100% + 16px);pointer-events:none}
.top{position:relative;display:flex;justify-content:space-between;align-items:center}
.wordmark{display:block;height:auto}
.kicker{font-family:"Geist Mono",ui-monospace,monospace;text-transform:uppercase;letter-spacing:.14em;color:var(--faint)}
.body{position:relative;margin-top:auto}
.eyebrow{display:inline-flex;align-items:center;gap:.6em;font-family:"Geist Mono",ui-monospace,monospace;
 text-transform:uppercase;letter-spacing:.14em;color:var(--signal)}
.eyebrow::before{content:"";width:1.6em;height:2px;background:var(--signal)}
h1{font-weight:600;letter-spacing:-.025em;line-height:1.02;color:var(--mineral)}
h1 .accent{color:var(--signal)}
.sub{color:var(--muted);line-height:1.45}
ul{list-style:none}
li{position:relative;line-height:1.35;color:var(--mineral)}
li::before{content:"";position:absolute;left:0;top:.42em;width:.62em;height:.62em;background:var(--ochre);
 clip-path:polygon(0 18%,62% 0,100% 54%,40% 100%)}
.status{border:1px solid rgba(242,106,46,.55);color:var(--mineral);border-radius:10px}
.cta{position:relative;display:flex;align-items:center;justify-content:space-between;background:var(--ink3);
 border:1px solid var(--line);border-radius:16px}
.cta h2{font-weight:600;letter-spacing:-.015em;color:var(--mineral)}
.cta .url{color:var(--signal);font-weight:600}
.cta p{color:var(--muted);line-height:1.4}
.qr{background:#fff;border-radius:12px;flex:none;display:flex;flex-direction:column;align-items:center}
.qr svg{display:block;width:100%;height:auto}
.qr span{color:#0b0b0a;font-weight:600;text-transform:uppercase;letter-spacing:.1em}
.foot{position:relative;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:1em}
.contact{color:var(--mineral);font-weight:500}
.fine{color:var(--faint)}
`;

const A4 = `
@page{size:A4;margin:0}
html,body{width:210mm;height:297mm}
.sheet{width:210mm;height:297mm;padding:15mm 15mm 11mm}
.texture{height:150mm}
.wordmark{width:43mm}.kicker{font-size:7.5pt}
.eyebrow{font-size:8.5pt;margin-bottom:5mm}
h1{font-size:33pt;margin-bottom:5mm}
.sub{font-size:11.5pt;max-width:160mm;margin-bottom:7mm}
ul{display:grid;gap:3.2mm;margin-bottom:7mm}li{font-size:11pt;padding-left:7mm}
.status{font-size:9pt;padding:2.6mm 3.6mm;margin:-2mm 0 7mm}
.cta{padding:6mm 6mm 6mm 7mm;gap:6mm;margin-bottom:6mm}
.cta h2{font-size:15pt;margin-bottom:1.5mm}.cta .url{font-size:12pt;margin-bottom:2.5mm}.cta p{font-size:9pt}
.cta p+p{margin-top:1.2mm}
.qr{width:33mm;padding:2.6mm 2.6mm 1.6mm;gap:1.2mm}.qr span{font-size:6pt}
.foot{padding-top:4mm;font-size:8.5pt}.fine{font-size:7pt;margin-top:1.2mm}
`;

const SOCIAL = `
html,body{width:1080px;height:1350px}
.sheet{width:1080px;height:1350px;padding:72px 76px 60px}
.texture{height:700px}
.wordmark{width:230px}.kicker{font-size:17px}
.eyebrow{font-size:20px;margin-bottom:26px}
h1{font-size:76px;margin-bottom:26px}
.sub{font-size:27px;max-width:880px;margin-bottom:34px}
ul{display:grid;gap:15px;margin-bottom:38px}li{font-size:26px;padding-left:36px}
.status{font-size:20px;padding:13px 18px;margin:-12px 0 34px}
.cta{padding:30px 36px;margin-bottom:34px}
.cta h2{font-size:33px;margin-bottom:8px}.cta .url{font-size:28px;margin-bottom:10px}.cta p{font-size:19px}
.cta p+p{margin-top:6px}
.foot{padding-top:22px;font-size:19px}.fine{font-size:15px;margin-top:6px}
`;

function page(flyer, format) {
  const isA4 = format === "a4";
  const [w, h] = isA4 ? [794, 567] : [1080, 700];
  const qr = isA4 ? readFileSync(join(HERE, "qr", `${flyer.slug}.svg`), "utf8").trim() : "";
  const headline = flyer.headline
    .map((line, i) => (i === flyer.accentLine ? `<span class="accent">${esc(line)}</span>` : esc(line)))
    .join("<br>");
  const lines = [flyer.cta.condition, flyer.cta.hours].filter(Boolean).map((t) => `<p>${esc(t)}</p>`).join("");
  const title = `Drylake flyer: ${flyer.eyebrow} (${isA4 ? "A4 print" : "social 1080x1350"})`;
  return `<!doctype html>
<html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@500&display=block" rel="stylesheet">
<style>${CSS}${isA4 ? A4 : SOCIAL}</style></head>
<body><main class="sheet" aria-label="${esc(title)}">
${lakebed({ width: w, height: h, seed: flyer.slug.length * 7919 + (isA4 ? 1 : 2), litRow: isA4 ? 2 : 1, litCols: isA4 ? [5, 6] : [6] })}
<header class="top">${WORDMARK}<span class="kicker">${esc(BRAND.place)}</span></header>
<section class="body">
<p class="eyebrow">${esc(flyer.eyebrow)}</p>
<h1>${headline}</h1>
<p class="sub">${esc(flyer.sub)}</p>
<ul>${flyer.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
${flyer.status ? `<p class="status">${esc(flyer.status)}</p>` : ""}
<div class="cta"><div><h2>${esc(flyer.cta.title)}</h2><p class="url">${esc(flyer.printUrl)}</p>${lines}</div>
${qr ? `<div class="qr">${qr}<span>Scan to visit</span></div>` : ""}</div>
<footer class="foot"><div><p class="contact">${esc(BRAND.web)} &#183; ${esc(BRAND.phone)} &#183; ${esc(BRAND.email)}</p>
<p class="fine">${esc(BRAND.legal)} &#183; ${esc(BRAND.abn)} &#183; ${esc(BRAND.place)}</p></div>
<p class="fine" style="text-align:right">${esc(BRAND.tagline)}</p></footer>
</section></main></body></html>
`;
}

mkdirSync(OUT, { recursive: true });
for (const flyer of FLYERS) {
  for (const format of ["a4", "social"]) {
    const html = page(flyer, format);
    if (html.includes("\u2014")) throw new Error(`em dash in ${flyer.slug}-${format}`);
    writeFileSync(join(OUT, `${flyer.slug}-${format}.html`), html);
  }
  console.log(`built ${flyer.slug}`);
}
