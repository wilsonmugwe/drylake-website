#!/usr/bin/env node
/*
 * Live residential-address sweep for drylake.com.au (or --base=<url> for a local build).
 *
 *   node scripts/privacy-address-sweep.mjs
 *   node scripts/privacy-address-sweep.mjs --base=http://localhost:3100
 *
 * Owner rule (2026-10-16): the residential street address never appears on the public website.
 * Fetches everything a visitor, crawler or AI agent can reach without signing in, and fails
 * (exit 1) if any response contains an address component or a "based in Joondalup" claim:
 *   - every sitemap URL as HTML (incl. its JSON-LD and metadata) and as Markdown for agents
 *   - robots.txt, sitemap.xml, llms.txt, llms-full.txt, the web manifest, security.txt
 *   - the 404 page
 *   - every JavaScript and CSS chunk the homepage and a location page load
 * Patterns: lib/privacy/residential-address.ts. The unit test covers the repo and the build.
 */
import { findPrivacyViolations, findResidentialAddress } from "../lib/privacy/residential-address.ts";
import { SITE_URL } from "../lib/discovery/entity.ts";

const baseArg = process.argv.find((arg) => arg.startsWith("--base="));
const BASE = baseArg ? baseArg.slice("--base=".length).replace(/\/$/, "") : SITE_URL;
const UA = "Mozilla/5.0 (compatible; DrylakePrivacySweep/1.0)";

const failures = [];
let checked = 0;

async function fetchText(url, headers = {}) {
  const response = await fetch(url, { headers: { "user-agent": UA, ...headers }, redirect: "follow" });
  return { status: response.status, text: await response.text() };
}

async function check(label, url, { headers, assetsOnly = false } = {}) {
  try {
    const { status, text } = await fetchText(url, headers);
    checked += 1;
    /* Assets are scanned for the address only: a minified chunk can contain prose fragments. */
    const findings = assetsOnly ? findResidentialAddress(text) : findPrivacyViolations(text);
    for (const finding of findings) failures.push(`${label} (${status}): ${finding.name}: ${finding.excerpt}`);
    return text;
  } catch (error) {
    failures.push(`${label}: fetch failed: ${error.message}`);
    return "";
  }
}

const sitemap = await check("sitemap.xml", `${BASE}/sitemap.xml`);
const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
if (pages.length === 0) failures.push("sitemap.xml lists no pages: sweep would prove nothing");

for (const path of pages) {
  await check(path, `${BASE}${path}`);
  await check(`${path} (markdown)`, `${BASE}${path}`, { headers: { accept: "text/markdown" } });
}
for (const path of ["/robots.txt", "/llms.txt", "/llms-full.txt", "/manifest.webmanifest", "/.well-known/security.txt", "/drylake-privacy-sweep-404"]) {
  await check(path, `${BASE}${path}`);
}

const assetPages = ["/", pages.find((path) => path.startsWith("/locations/")) ?? "/perth"];
const assets = new Set();
for (const path of assetPages) {
  const { text } = await fetchText(`${BASE}${path}`);
  for (const match of text.matchAll(/\/_next\/static\/[^"'\s)]+\.(?:js|css)/g)) assets.add(match[0]);
}
for (const asset of assets) await check(asset, `${BASE}${asset}`, { assetsOnly: true });

console.log(`privacy address sweep: ${BASE}, ${checked} responses checked, ${failures.length} finding(s)`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`  FAIL ${failure}`);
  process.exit(1);
}
