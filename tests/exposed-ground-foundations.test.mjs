/*
 * Exposed Ground foundations (D54, Ben 2026-10-17): display face, navigation, footer links,
 * redesign-layer contrast, and the /bronnie honesty rules.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { PRIMARY_NAV, PRIMARY_CTA, CLIENT_LOGIN } from "../lib/navigation/site-nav.ts";
import { FOOTER_COLUMNS } from "../lib/navigation/services-menu.ts";
import { BRONNIE_PAGE } from "../lib/bronnie/copy.ts";
import { PAGE_SEO } from "../lib/seo-pages.ts";
import { PUBLIC_PAGES } from "../lib/discovery/entity.ts";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("Archivo is the display face: variable width, Latin, swap, not preloaded", () => {
  const layout = read("app/layout.tsx");
  assert.match(layout, /Archivo\(\{[\s\S]*?variable: "--font-archivo"[\s\S]*?axes: \["wdth"\][\s\S]*?preload: false/);
  assert.match(layout, /archivo\.variable/);
  assert.match(read("app/globals.css"), /--font-poster: var\(--font-archivo\)/);
});

test("header navigation is exactly Services, Solutions, Approach, BRONNIE, About", () => {
  assert.deepEqual(PRIMARY_NAV.map((i) => i.label), ["Services", "Solutions", "Approach", "BRONNIE", "About"]);
  assert.equal(PRIMARY_NAV.find((i) => i.label === "BRONNIE").href, "/bronnie");
  assert.equal(PRIMARY_CTA.label, "Start Free Consultation");
  assert.equal(CLIENT_LOGIN.href, "/portal");
});

test("Perth and FAQ moved to the footer, which still links every public hub", () => {
  const hrefs = FOOTER_COLUMNS.flatMap((c) => c.links.map((l) => l.href));
  for (const href of ["/perth", "/faq", "/contact", "/consultation", "/bronnie", "/about", "/solutions", "/collaborate", "/privacy", "/terms", "/portal"]) {
    assert.ok(hrefs.includes(href), `footer links ${href}`);
  }
  assert.ok(!PRIMARY_NAV.some((i) => i.href === "/perth" || i.href === "/faq"));
});

const lum = (hex) => {
  const [r, g, b] = hex.replace("#", "").match(/../g).map((h) => {
    const v = parseInt(h, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

test("redesign-layer text colours meet WCAG AA on their own surfaces", () => {
  const css = read("app/exposed-ground.css");
  const token = (name) => css.match(new RegExp(`${name}: (#[0-9a-f]{6})`))[1];
  assert.ok(ratio(token("--eg-muted-dark"), "#0b0b0a") >= 4.5, "muted on ground");
  assert.ok(ratio(token("--eg-muted-light"), "#f2f0e9") >= 4.5, "muted on crust");
  assert.ok(ratio(token("--eg-muted-light"), "#e6e3da") >= 4.5, "muted on stone");
  assert.ok(ratio("#f26a2e", "#0b0b0a") >= 4.5, "signal on ground");
  assert.ok(ratio("#0b0b0a", "#f26a2e") >= 4.5, "ground on signal (pill)");
  assert.ok(ratio("#b83f0c", "#f2f0e9") >= 4.5, "signal ink on crust");
  assert.ok(ratio("#a8380a", "#e6e3da") >= 4.5, "signal ink on stone");
  assert.match(css, /\.eg-stone \.eg-signal-text \{\s*color: #a8380a;/);
});

test("motion is complete at rest: reveals only exist inside a scroll-timeline + motion guard", () => {
  const css = read("app/exposed-ground.css");
  const guarded = css.slice(css.indexOf("@supports (animation-timeline: view())"));
  for (const sel of [".eg-crack path {\n      stroke-dasharray", ".eg-rise > *", ".eg-tilt {"]) {
    assert.ok(guarded.includes(sel), `${sel} is inside the guard`);
  }
  assert.ok(!css.slice(0, css.indexOf("@supports (animation-timeline")).includes("opacity: 0"), "nothing hidden at rest");
});

test("/bronnie: registered for search, honest, and no em dashes", () => {
  assert.equal(PAGE_SEO.bronnie.path, "/bronnie");
  assert.ok(PUBLIC_PAGES.some((p) => p.path === "/bronnie"));
  const all = JSON.stringify(BRONNIE_PAGE) + PAGE_SEO.bronnie.title + PAGE_SEO.bronnie.description;
  assert.ok(!all.includes("—"), "no em dashes");
  assert.equal(BRONNIE_PAGE.description, "BRONNIE is an AI-powered platform being developed by Drylake.");
  assert.match(BRONNIE_PAGE.stamp, /Not yet available/);
  for (const banned of [/\blaunch(ed|es)?\b/i, /\bnow available\b/i, /\blive\b/i, /customers? (use|love|trust)/i, /\b\d+%/]) {
    assert.ok(!banned.test(all), `no ${banned}`);
  }
  assert.equal(BRONNIE_PAGE.phases.filter((p) => p.state === "now").length, 1, "exactly one current stage");
  const page = read("app/bronnie/page.tsx").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.ok(!/SoftwareApplication|"Product"/.test(page), "no product structured data while nothing is offered");
});
