/*
 * Residential address guard (owner rule 2026-10-16, lib/privacy/residential-address.ts).
 * 1. The patterns catch every form of the address and leave Joondalup service-area SEO alone.
 * 2. No tracked file outside tests/ contains an address component or a "based in Joondalup" claim.
 * 3. If a production build exists (.next), none of its output does either.
 * The live site is swept after every production deploy by scripts/privacy-address-sweep.mjs.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { ENTITY } from "../lib/discovery/entity.ts";
import {
  findPhysicalBaseClaim,
  findPrivacyViolations,
  findResidentialAddress,
} from "../lib/privacy/residential-address.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BINARY = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".woff", ".woff2", ".ttf", ".mp4", ".webm", ".pdf", ".zip"]);
/* The pattern module describes the address shape in comments; it is the one allowed exception. */
const SELF = "lib/privacy/residential-address.ts";

describe("residential address patterns", () => {
  const leaks = [
    "10/53 Davidson Terrace",
    "10 / 53 Davidson Tce, Joondalup WA 6027",
    "Unit 10, 53 Davidson Terrace",
    "U10 53 DAVIDSON TCE",
    "Davidson Terrace",
    "Joondalup WA 6027",
    '"streetAddress":"10/53 Davidson Terrace"',
  ];
  for (const text of leaks) {
    it(`catches: ${text}`, () => assert.ok(findResidentialAddress(text).length > 0, text));
  }

  const allowed = [
    "Web development in Joondalup",
    "Drylake has no office in Joondalup. We work with Joondalup businesses remotely.",
    "Do I need a web developer based in Joondalup?",
    "Businesses from Joondalup and Wanneroo in the north to Rockingham in the south.",
    "Drylake is a technology company based in Perth, Western Australia.",
    "A 10/50 split", // a different number shape
    "Call 0433 448 000",
  ];
  for (const text of allowed) {
    it(`allows: ${text}`, () => assert.deepEqual(findPrivacyViolations(text), [], text));
  }

  const claims = [
    "Drylake is based in Joondalup.",
    "We are located in Joondalup",
    "Our office is in Joondalup",
    "Visit our Joondalup office",
    "Drylake, headquartered in Joondalup, builds websites",
  ];
  for (const text of claims) {
    it(`catches physical-base claim: ${text}`, () => assert.ok(findPhysicalBaseClaim(text).length > 0, text));
  }

  it("the business identity names Perth, not Joondalup, as the locality", () => {
    assert.equal(ENTITY.locality, "Perth");
  });
});

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" })
    .split("\0")
    .filter(Boolean)
    .filter((path) => !path.startsWith("tests/") && path !== SELF && !BINARY.has(extname(path).toLowerCase()));
}

describe("repository contains no residential address", () => {
  it("no tracked file outside tests/ leaks an address component or a Joondalup base claim", () => {
    const hits = [];
    for (const path of trackedFiles()) {
      const full = join(ROOT, path);
      if (!existsSync(full)) continue;
      for (const finding of findPrivacyViolations(readFileSync(full, "utf8"))) hits.push(`${path}: ${finding.name}: ${finding.excerpt}`);
    }
    assert.deepEqual(hits, []);
  });
});

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) yield* walk(full);
    else if (!BINARY.has(extname(entry).toLowerCase()) && stat.size < 5_000_000) yield full;
  }
}

describe("production build output contains no residential address", () => {
  /* Server-rendered HTML, RSC payloads, route bodies and client chunks: everything the site serves. */
  const targets = [join(ROOT, ".next", "server", "app"), join(ROOT, ".next", "static")].filter(existsSync);
  it("scans .next when a build exists", { skip: targets.length === 0 ? "no .next build in this checkout" : false }, () => {
    const hits = [];
    for (const dir of targets) {
      for (const file of walk(dir)) {
        for (const finding of findResidentialAddress(readFileSync(file, "utf8"))) hits.push(`${file.slice(ROOT.length)}: ${finding.name}`);
      }
    }
    assert.deepEqual(hits, []);
  });
});
