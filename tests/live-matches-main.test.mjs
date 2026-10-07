import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publicFiles } from "../scripts/live-matches-main.mjs";

test("publicFiles lists every public/ file as a site path, brand assets included", () => {
  const paths = publicFiles();
  assert.ok(paths.length > 0);
  assert.ok(paths.every((p) => p.startsWith("/") && !p.includes("\\")));
  assert.ok(paths.includes("/brand/drylake-mark-512.png"));
  assert.ok(paths.includes("/brand/drylake-wordmark-light-bg.svg"));
});

test("the live-matches-main job runs on production deploys against main's HEAD", () => {
  const wf = readFileSync(".github/workflows/discoverability.yml", "utf8");
  const job = wf.slice(wf.indexOf("live-matches-main:"), wf.indexOf("indexnow:"));
  assert.match(job, /environment == 'Production'/);
  assert.match(job, /ref: main/);
  assert.match(job, /node scripts\/live-matches-main\.mjs/);
});
