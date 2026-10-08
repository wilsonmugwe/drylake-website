/*
 * GET /api/health (lib/health/health-report.ts): ok/degraded from the env registry, never leaks
 * a variable name or value, reports the region, and the route maps degraded to 503 uncached.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { healthReport } from "../lib/health/health-report.ts";
import { ENV_REGISTRY } from "../scripts/env-registry.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const required = ENV_REGISTRY.filter((e) => e.required && e.exposure !== "platform").map((e) => e.name);
const full = Object.fromEntries(required.map((name) => [name, `value-of-${name}`]));
const NOW = new Date("2026-10-08T00:00:00Z");

describe("health report", () => {
  it("is ok when every required variable is set, with region, environment and short commit", () => {
    const report = healthReport({ ...full, VERCEL_REGION: "syd1", VERCEL_ENV: "production", VERCEL_GIT_COMMIT_SHA: "abcdef1234567" }, NOW);
    assert.deepEqual(report, {
      status: "ok",
      missingRequired: 0,
      region: "syd1",
      environment: "production",
      commit: "abcdef1",
      timestamp: "2026-10-08T00:00:00.000Z",
    });
  });

  it("is degraded with a count when required variables are missing or blank", () => {
    const env = { ...full, [required[0]]: undefined, [required[1]]: "   " };
    const report = healthReport(env, NOW);
    assert.equal(report.status, "degraded");
    assert.equal(report.missingRequired, 2);
    assert.equal(report.region, "unknown");
  });

  it("never includes a variable name or value in its output", () => {
    const text = JSON.stringify(healthReport({ ...full, [required[0]]: undefined }, NOW));
    for (const name of required) {
      assert.ok(!text.includes(name), name);
      assert.ok(!text.includes(`value-of-${name}`), name);
    }
  });

  it("the route returns 503 when degraded and is never cached", () => {
    const route = readFileSync(join(ROOT, "app/api/health/route.ts"), "utf8");
    assert.match(route, /status: report\.status === "ok" \? 200 : 503/);
    assert.match(route, /"Cache-Control": "no-store"/);
    assert.match(route, /export const dynamic = "force-dynamic"/);
  });
});
