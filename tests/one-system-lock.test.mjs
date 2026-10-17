/*
 * One System lock (Exposed Ground redesign, D54, Ben 2026-10-17): "Preserve the original visual
 * component, including its layout, shapes, orange accent, labels and functionality. A minimal
 * font-weight adjustment is permitted for accessibility, but do not redesign the component."
 *
 * Fingerprints the tile's source files and every CSS rule that styles it, so the redesign cannot
 * alter it by accident. The fingerprints were taken AFTER the one approved change (the ochre
 * label 600 -> 700). If a change here is genuinely approved by Ben, update the hash in the same
 * commit and say so in the PR. Anything else that fails this test is a regression.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);

/* Every rule in public-site.css whose selector names an .lb class, plus its keyframes. */
function lakebedCss() {
  const css = read("app/public-site.css").replace(/\/\*[\s\S]*?\*\//g, "");
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (css[i] === "}") {
      depth--;
      if (depth === 0) {
        const selStart = css.lastIndexOf("}", start - 1) + 1;
        const block = css.slice(selStart, i + 1).trim();
        const selector = block.slice(0, block.indexOf("{"));
        if (/\.lb[-\s.{:[]|\.lb$|@keyframes lb-/.test(selector)) out.push(block.replace(/\s+/g, " "));
      }
    }
  }
  return out.join("\n");
}

const LOCKED = {
  "components/visuals/LakeBed.tsx": "404d2ae5d21e23e4",
  "components/visuals/LakeBedInteractive.tsx": "d245e90290f09628",
  "components/visuals/lakebed-geometry.ts": "a67608d5bcff175c",
  "components/brand/DrylakeMark.tsx": "b48e263010bef697",
};
const LOCKED_CSS = "104fd1901dbf30f3";

test("One System tile source files are unchanged", () => {
  for (const [file, hash] of Object.entries(LOCKED)) {
    assert.equal(sha(read(file)), hash, `${file} changed: the One System graphic is locked (D54)`);
  }
});

test("One System tile CSS is unchanged", () => {
  const css = lakebedCss();
  assert.ok(css.includes(".lb-label-ochre"), "extractor found the tile rules");
  assert.equal(sha(css), LOCKED_CSS, "a .lb-* rule changed: the One System graphic is locked (D54)");
});

test("the approved change: the ochre label is weight 700 and nothing else moved", () => {
  const css = lakebedCss();
  const rule = css.split("\n").find((r) => r.startsWith(".lb-label-ochre {"));
  assert.ok(rule, "base .lb-label-ochre rule exists");
  assert.match(rule, /color: #fff;/);
  assert.match(rule, /font-weight: 700;/);
});

/* WCAG 2.x relative luminance contrast, recomputed so the PR states the real figures. */
const lum = (hex) => {
  const c = hex.replace("#", "").match(/../g).map((h) => parseInt(h, 16) / 255);
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

test("contrast of the One system label is measured, not assumed", () => {
  const ochre = read("components/brand/DrylakeMark.tsx").match(/TILE_OCHRE = "(#[0-9A-Fa-f]{6})"/)[1];
  const white = ratio("#ffffff", ochre);
  const ink = ratio("#17191e", ochre);
  assert.equal(Math.round(white * 100) / 100, 3.7, "white on ochre");
  assert.equal(Math.round(ink * 100) / 100, 4.76, "ink on ochre (the alternative, needs Ben's approval)");
  // White passes the 3:1 large-text level only; the label's maximum size is 17 px (< 18.66 px bold).
  assert.ok(white >= 3 && white < 4.5);
});
