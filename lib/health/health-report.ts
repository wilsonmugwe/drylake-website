import { ENV_REGISTRY } from "../../scripts/env-registry.mjs";

/*
 * Health report for GET /api/health (uptime monitors, post-deploy checks). PURE: tested in
 * tests/health.test.mjs.
 *
 * Contract:
 * - "ok" (HTTP 200) when every REQUIRED, non-platform variable in scripts/env-registry.mjs is
 *   set; "degraded" (HTTP 503) otherwise, so a free uptime monitor alerts on a broken deploy.
 * - Never names a variable or returns a value: only how many are missing. The endpoint is
 *   public, and a list of absent secrets is an enumeration aid.
 * - Reports the Vercel region the function ran in (VERCEL_REGION). That answers "where does
 *   server code run" from production itself, which the privacy policy needs (drylake-ops D35
 *   follow-up: the registry expects syd1, measurements on 2026-10-06 showed iad1).
 * - No database or third-party calls: liveness and configuration only, cheap enough to poll.
 */

type Env = Record<string, string | undefined>;

export type HealthReport = {
  status: "ok" | "degraded";
  missingRequired: number;
  region: string;
  environment: string;
  commit: string | null;
  timestamp: string;
};

const REQUIRED = ENV_REGISTRY.filter((entry) => entry.required && entry.exposure !== "platform").map((entry) => entry.name);

export function healthReport(env: Env, now: Date = new Date()): HealthReport {
  const missingRequired = REQUIRED.filter((name) => !env[name]?.trim()).length;

  return {
    status: missingRequired === 0 ? "ok" : "degraded",
    missingRequired,
    region: env.VERCEL_REGION || "unknown",
    environment: env.VERCEL_ENV || "unknown",
    commit: env.VERCEL_GIT_COMMIT_SHA ? env.VERCEL_GIT_COMMIT_SHA.slice(0, 7) : null,
    timestamp: now.toISOString(),
  };
}
