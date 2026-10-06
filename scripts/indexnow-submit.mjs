#!/usr/bin/env node
/*
 * Submit drylake.com.au's public URLs to IndexNow after a production deploy.
 *
 *   node scripts/indexnow-submit.mjs            # submit
 *   node scripts/indexnow-submit.mjs --dry-run  # print the payload only
 *
 * Reads the LIVE sitemap (so only URLs that are actually published are submitted), confirms
 * the key file is served, then POSTs once. Safe to re-run: IndexNow treats repeats as a
 * re-crawl hint. Network failures exit non-zero so CI shows them; nothing on the site depends
 * on this succeeding.
 */
import { INDEXNOW_ENDPOINT, INDEXNOW_HOST, INDEXNOW_KEY, indexNowPayload } from "../lib/discovery/indexnow.ts";

const dryRun = process.argv.includes("--dry-run");
const origin = `https://${INDEXNOW_HOST}`;

async function main() {
  const sitemap = await fetch(`${origin}/sitemap.xml`);

  if (!sitemap.ok) {
    throw new Error(`sitemap.xml returned ${sitemap.status}`);
  }

  const urls = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());

  if (urls.length === 0) {
    throw new Error("sitemap.xml lists no URLs");
  }

  const keyFile = await fetch(`${origin}/${INDEXNOW_KEY}.txt`);
  const keyText = keyFile.ok ? (await keyFile.text()).trim() : "";

  if (keyText !== INDEXNOW_KEY) {
    throw new Error(`key file not served correctly (status ${keyFile.status})`);
  }

  const payload = indexNowPayload(urls);

  const dropped = urls.filter((url) => !payload.urlList.includes(url));

  // Anything not a canonical public URL is refused, and the run fails so it gets looked at.
  if (dropped.length > 0) {
    throw new Error(`sitemap lists non-canonical or non-public URLs, nothing submitted: ${dropped.join(", ")}`);
  }

  console.log(`IndexNow: ${payload.urlList.length} URLs for ${payload.host}`);

  if (dryRun) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });

  // 200 = accepted, 202 = accepted pending key validation. Anything else is a failure.
  console.log(`IndexNow responded ${response.status}`);

  if (response.status !== 200 && response.status !== 202) {
    throw new Error(`IndexNow rejected the submission: ${response.status} ${await response.text()}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
