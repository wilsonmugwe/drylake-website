#!/usr/bin/env node
/*
 * Live discoverability check for drylake.com.au (or --base=<url> for a local build).
 *
 *   node scripts/discoverability-check.mjs
 *   node scripts/discoverability-check.mjs --base=http://localhost:3100
 *
 * Fails (exit 1) if any of these regress on the deployed site:
 *   - a public page is not 200, carries noindex, has the wrong canonical, or lacks the
 *     Organization graph (#organization, legal name, ABN) for a search or AI-search agent
 *   - robots.txt stops allowing the public site, stops disallowing the private surfaces,
 *     or stops opting the training tokens out
 *   - sitemap.xml no longer lists exactly the public pages
 *   - llms.txt or the IndexNow key file disappears
 *   - a private surface (/admin, /client, /portal, /api) loses its noindex header
 *
 * Spoofed user agents from a CI IP can legitimately be challenged by bot verification;
 * a 403/429 with x-vercel-mitigated is reported as such, so it is visible, not hidden.
 */
import { CRAWLERS, TRAINING_ALLOWED_TOKENS, blockedTokens } from "../lib/discovery/crawlers.ts";
import { ENTITY, ORGANIZATION_ID, PRIVATE_PREFIXES, PUBLIC_PAGES, SITE_URL, absoluteUrl } from "../lib/discovery/entity.ts";
import { INDEXNOW_KEY } from "../lib/discovery/indexnow.ts";

const baseArg = process.argv.find((arg) => arg.startsWith("--base="));
const BASE = baseArg ? baseArg.slice("--base=".length).replace(/\/$/, "") : SITE_URL;

/* Documented user-agent strings (vendor pages, see lib/discovery/crawlers.ts). */
const AGENTS = {
  Googlebot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  bingbot: "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  Applebot: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)",
  DuckDuckBot: "DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)",
  "OAI-SearchBot": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot",
  "Claude-SearchBot": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-SearchBot/1.0; +Claude-SearchBot@anthropic.com)",
  PerplexityBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
};

const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function get(path, agent = "Googlebot") {
  // Spaced requests: the production firewall rate-limits bursts.
  await sleep(400);
  const response = await fetch(`${BASE}${path}`, { redirect: "manual", headers: { "User-Agent": AGENTS[agent] } });
  const body = response.status === 200 ? await response.text() : "";

  return {
    status: response.status,
    body,
    robotsHeader: response.headers.get("x-robots-tag") ?? "",
    mitigated: response.headers.get("x-vercel-mitigated") ?? "",
  };
}

function expectedPath(path) {
  return new URL(absoluteUrl(path)).pathname;
}

async function checkPublicPages() {
  for (const page of PUBLIC_PAGES) {
    for (const agent of Object.keys(AGENTS)) {
      const result = await get(page.path, agent);
      const where = `${page.path} as ${agent}`;

      if (result.status !== 200) {
        fail(`${where}: status ${result.status}${result.mitigated ? ` (vercel-mitigated: ${result.mitigated})` : ""}`);
        continue;
      }

      if (/noindex/i.test(result.robotsHeader)) fail(`${where}: X-Robots-Tag ${result.robotsHeader}`);
      if (/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(result.body)) fail(`${where}: meta robots noindex`);

      // Content checks once per page (they do not vary by agent).
      if (agent !== "Googlebot") continue;

      const canonical = result.body.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1];

      if (!canonical) {
        fail(`${page.path}: no canonical`);
      } else if (new URL(canonical).pathname !== expectedPath(page.path) || new URL(canonical).host !== new URL(SITE_URL).host) {
        fail(`${page.path}: canonical is ${canonical}`);
      }

      if (!result.body.includes(ORGANIZATION_ID)) fail(`${page.path}: Organization @id missing from JSON-LD`);
      if (!result.body.includes(ENTITY.legalName)) fail(`${page.path}: legal name missing`);
      if (!result.body.includes(ENTITY.abn)) fail(`${page.path}: ABN missing`);
      if (!/<title>[^<]{10,}<\/title>/.test(result.body)) fail(`${page.path}: missing or empty <title>`);
    }
  }
}

async function checkRobots() {
  const { status, body } = await get("/robots.txt");

  if (status !== 200) return fail(`robots.txt: status ${status}`);

  // Groups are separated by blank lines; one group may name several user agents.
  const groups = body.split(/\r?\n\s*\r?\n/);
  const star = groups.find((group) => /^User-Agent:\s*\*\s*$/im.test(group)) ?? "";

  if (!/^Allow:\s*\/\s*$/im.test(star)) fail("robots.txt: * group no longer allows /");
  if (/^Disallow:\s*\/\s*$/im.test(star)) fail("robots.txt: * group disallows the whole site");

  for (const prefix of PRIVATE_PREFIXES) {
    if (!new RegExp(`^Disallow:\\s*${prefix}\\s*$`, "im").test(star)) fail(`robots.txt: * group no longer disallows ${prefix}`);
  }

  for (const token of blockedTokens()) {
    const group = groups.find((g) => new RegExp(`^User-Agent:\\s*${token}\\s*$`, "im").test(g)) ?? "";

    if (!/^Disallow:\s*\/\s*$/im.test(group)) fail(`robots.txt: ${token} is no longer opted out of training`);
  }

  if (!/^Content-Signal:\s*search=yes, ai-input=yes, ai-train=no\s*$/im.test(star)) {
    fail("robots.txt: * group Content-Signal is not search=yes, ai-input=yes, ai-train=no");
  }

  // Tokens allowed to train (Google-Extended, decision D-1) have their own group only to say
  // ai-train=yes; it must open exactly what the * group opens.
  for (const token of TRAINING_ALLOWED_TOKENS) {
    const group = groups.find((g) => new RegExp(`^User-Agent:\\s*${token}\\s*$`, "im").test(g)) ?? "";

    if (!/^Content-Signal:\s*search=yes, ai-input=yes, ai-train=yes\s*$/im.test(group)) fail(`robots.txt: ${token} group does not signal ai-train=yes`);
    if (!/^Allow:\s*\/\s*$/im.test(group)) fail(`robots.txt: ${token} group no longer allows /`);
    for (const prefix of PRIVATE_PREFIXES) {
      if (!new RegExp(`^Disallow:\\s*${prefix}\\s*$`, "im").test(group)) fail(`robots.txt: ${token} group no longer disallows ${prefix}`);
    }
  }

  for (const crawler of CRAWLERS.filter((c) => c.access === "allow" && !TRAINING_ALLOWED_TOKENS.includes(c.token))) {
    if (new RegExp(`^User-Agent:\\s*${crawler.token}\\s*$`, "im").test(body)) {
      fail(`robots.txt: ${crawler.token} has its own group; allowed crawlers must use the * group`);
    }
  }

  if (!body.includes(`Sitemap: ${SITE_URL}/sitemap.xml`)) fail("robots.txt: sitemap line missing");
}

async function checkSitemap() {
  const { status, body } = await get("/sitemap.xml");

  if (status !== 200) return fail(`sitemap.xml: status ${status}`);

  const listed = new Set([...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()));
  const expected = new Set(PUBLIC_PAGES.map((page) => absoluteUrl(page.path)));

  for (const url of expected) if (!listed.has(url)) fail(`sitemap.xml: missing ${url}`);
  for (const url of listed) if (!expected.has(url)) fail(`sitemap.xml: unexpected ${url}`);
}

async function checkMachineSurfaces() {
  const llms = await get("/llms.txt");

  if (llms.status !== 200 || !llms.body.includes(ENTITY.abn) || !llms.body.includes(ENTITY.legalName)) {
    fail(`llms.txt: status ${llms.status} or entity facts missing`);
  }

  const key = await get(`/${INDEXNOW_KEY}.txt`);

  if (key.status !== 200 || key.body.trim() !== INDEXNOW_KEY) fail(`IndexNow key file: status ${key.status}`);
}

async function checkPrivateSurfaces() {
  for (const prefix of PRIVATE_PREFIXES) {
    const { status, robotsHeader } = await get(prefix);

    if (status === 200 && !/noindex/i.test(robotsHeader)) fail(`${prefix}: 200 without noindex`);
    if (!/noindex/i.test(robotsHeader)) fail(`${prefix}: X-Robots-Tag noindex missing (status ${status})`);
    notes.push(`${prefix}: ${status}, X-Robots-Tag "${robotsHeader}"`);
  }
}

await checkPublicPages();
await checkRobots();
await checkSitemap();
await checkMachineSurfaces();
await checkPrivateSurfaces();

console.log(`Discoverability check against ${BASE}`);
for (const note of notes) console.log(`  note: ${note}`);

if (failures.length > 0) {
  console.error(`FAILED (${failures.length}):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`PASS: ${PUBLIC_PAGES.length} public pages x ${Object.keys(AGENTS).length} agents, robots, sitemap, llms.txt, IndexNow key, ${PRIVATE_PREFIXES.length} private surfaces`);
