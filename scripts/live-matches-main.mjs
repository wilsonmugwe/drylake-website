#!/usr/bin/env node
/*
 * Is the LIVE site serving the latest main, or an older build that finished last?
 *
 *   node scripts/live-matches-main.mjs                       (drylake.com.au)
 *   node scripts/live-matches-main.mjs --base=<url>
 *
 * Why it exists (2026-10-07): PRs #25 and #26 merged 27 seconds apart. Both production builds
 * succeeded, but #25's finished LAST and took the domain, so #26's wordmark, favicon set and
 * apple icon 404'd live while every check and deployment status was green.
 *
 * Every file in this checkout's public/ is served at its own path, so if the live domain 404s
 * any of them, the domain is not serving this commit. The job checks out main's HEAD (not the
 * deployment's sha) on purpose: an older build going live is exactly what this must catch.
 * The production alias can lag the deployment status, so a miss is retried before failing.
 */
import { readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const baseArg = process.argv.find((arg) => arg.startsWith("--base="));
const BASE = baseArg ? baseArg.slice("--base=".length).replace(/\/$/, "") : "https://drylake.com.au";
const ATTEMPTS = Number(process.env.LIVE_CHECK_ATTEMPTS ?? 6);
const WAIT_MS = Number(process.env.LIVE_CHECK_WAIT_MS ?? 30_000);

export function publicFiles(dir = "public") {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...publicFiles(path));
    else out.push("/" + relative("public", path).split(sep).join("/"));
  }
  return out.sort();
}

async function missing(paths) {
  const results = await Promise.all(
    paths.map(async (path) => {
      const res = await fetch(BASE + path, { method: "HEAD", redirect: "follow", cache: "no-store" });
      return res.ok ? null : `${res.status} ${path}`;
    }),
  );
  return results.filter(Boolean);
}

async function main() {
  const paths = publicFiles();
  if (paths.length === 0) throw new Error("no files under public/: run from the repo root");
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const bad = await missing(paths);
    if (bad.length === 0) {
      console.log(`OK: ${BASE} serves all ${paths.length} public files of this commit`);
      return;
    }
    console.log(`attempt ${attempt}/${ATTEMPTS}: ${bad.length} of ${paths.length} not served\n  ${bad.join("\n  ")}`);
    if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, WAIT_MS));
  }
  console.error(
    `FAIL: ${BASE} is not serving this commit of main. An older production build probably finished ` +
      "last and took the domain. Fix: Vercel > Deployments > the newest main deployment > Promote to Production.",
  );
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
