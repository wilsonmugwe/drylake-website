/*
 * /api/health consultation block (lib/consultations/health.ts, health-server.ts, the route) and
 * the admin calendar-status wording (lib/consultations/admin-view.ts). MOCKED / pure: the
 * database queries in health-server.ts are exercised for real by tests/db/consultation-health.sql.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { calendarErrorText, calendarListFlag, calendarStatusView, describeEvent } from "../lib/consultations/admin-view.ts";
import { classifyStoredError } from "../lib/consultations/calendar/types.ts";
import { consultationNeedsAttention, credentialStatus, summariseConsultationHealth } from "../lib/consultations/health.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const NOW = new Date("2026-10-19T02:00:00Z");
const minutesAgo = (m) => new Date(NOW.getTime() - m * 60_000).toISOString();
const base = {
  provider: "microsoft",
  lastSentAt: minutesAgo(3),
  lastAttemptAt: minutesAgo(1),
  oldestDueSendAfter: null,
  failedNotifications: 0,
  unresolvedCalendarErrors: [],
  probe: "ok",
};

describe("dispatch liveness", () => {
  it("healthy: recent attempt means the trigger is running, nothing is waiting", () => {
    const h = summariseConsultationHealth(base, NOW);
    assert.equal(h.dispatch.minuteTrigger, "running");
    assert.equal(h.dispatch.oldestPendingAgeSeconds, null);
    assert.equal(h.dispatch.lastSuccessfulAt, base.lastSentAt);
    assert.equal(h.calendar.credentials, "ok");
  });

  it("reports how long the oldest due email has waited", () => {
    const h = summariseConsultationHealth({ ...base, oldestDueSendAfter: minutesAgo(4) }, NOW);
    assert.equal(h.dispatch.oldestPendingAgeSeconds, 240);
  });

  it("due email waiting more than 10 minutes with no recent attempt means the minute trigger has stalled", () => {
    const h = summariseConsultationHealth({ ...base, lastAttemptAt: minutesAgo(45), oldestDueSendAfter: minutesAgo(30) }, NOW);
    assert.equal(h.dispatch.minuteTrigger, "stalled");
  });

  it("an idle outbox cannot prove or disprove the trigger: unknown, not a false 'running' or 'stalled'", () => {
    const h = summariseConsultationHealth({ ...base, lastAttemptAt: minutesAgo(600), oldestDueSendAfter: null }, NOW);
    assert.equal(h.dispatch.minuteTrigger, "unknown");
    assert.equal(summariseConsultationHealth({ ...base, lastAttemptAt: null, lastSentAt: null }, NOW).dispatch.minuteTrigger, "unknown");
  });

  it("a recent attempt wins over an old due row (retry backoff rows are not 'stalled')", () => {
    const h = summariseConsultationHealth({ ...base, lastAttemptAt: minutesAgo(2), oldestDueSendAfter: minutesAgo(30) }, NOW);
    assert.equal(h.dispatch.minuteTrigger, "running");
  });

  it("a stalled trigger is reported but does not turn the endpoint degraded", () => {
    const stalled = summariseConsultationHealth({ ...base, lastAttemptAt: minutesAgo(45), oldestDueSendAfter: minutesAgo(30) }, NOW);
    assert.equal(consultationNeedsAttention(stalled), false);
  });

  it("carries no personal data: only timestamps, counts and status words", () => {
    const json = JSON.stringify(
      summariseConsultationHealth({ ...base, unresolvedCalendarErrors: ["[auth] Event creation failed (403 ErrorAccessDenied) for sam@example.com"], failedNotifications: 2 }, NOW)
    );
    assert.ok(!json.includes("@"), "no email");
    assert.ok(!json.includes("ErrorAccessDenied"), "stored error text is classified, then dropped");
    assert.deepEqual(Object.keys(JSON.parse(json)).sort(), ["available", "calendar", "dispatch"]);
  });
});

describe("Microsoft 365 credential status", () => {
  const tag = (kind) => `[${kind}] Microsoft sign-in refused (401 invalid_client AADSTS7000222)`;

  it("no calendar connected is not an error", () => {
    assert.equal(credentialStatus({ provider: "none", probe: "skipped", unresolvedCalendarErrors: [] }), "not_connected");
    assert.equal(consultationNeedsAttention(summariseConsultationHealth({ ...base, provider: "none", probe: "skipped" }, NOW)), false);
  });

  it("a misconfigured provider is surfaced as a failure", () => {
    assert.equal(credentialStatus({ provider: "misconfigured", probe: "skipped", unresolvedCalendarErrors: [] }), "auth_failed");
  });

  it("the live sign-in probe reporting an expired secret is 'expired' and degrades the endpoint", () => {
    const h = summariseConsultationHealth({ ...base, probe: "credential_expired" }, NOW);
    assert.equal(h.calendar.credentials, "expired");
    assert.equal(consultationNeedsAttention(h), true);
  });

  it("stored credential errors show 'expired' even when the probe could not run", () => {
    assert.equal(credentialStatus({ provider: "microsoft", probe: "skipped", unresolvedCalendarErrors: [tag("credential_expired")] }), "expired");
  });

  it("sign-in fine but Graph refused (RBAC removed) shows 'auth_failed', which a token probe alone cannot see", () => {
    assert.equal(credentialStatus({ provider: "microsoft", probe: "ok", unresolvedCalendarErrors: ["[auth] Event creation failed (403 ErrorAccessDenied)"] }), "auth_failed");
  });

  it("a passing probe with no stored auth errors is 'ok', even if old credential errors are still queued", () => {
    assert.equal(credentialStatus({ provider: "microsoft", probe: "ok", unresolvedCalendarErrors: [tag("credential_expired")] }), "ok");
  });

  it("an outage (probe unavailable) with no stored errors is 'unknown', never a false 'ok'", () => {
    assert.equal(credentialStatus({ provider: "microsoft", probe: "unavailable", unresolvedCalendarErrors: [] }), "unknown");
    assert.equal(credentialStatus({ provider: "microsoft", probe: "skipped", unresolvedCalendarErrors: [null, "Event creation failed (503)"] }), "unknown");
  });
});

describe("/api/health route and loader (source contract)", () => {
  const route = strip(read("app/api/health/route.ts"));
  const server = strip(read("lib/consultations/health-server.ts"));

  it("keeps the existing fields and the 200/503 mapping", () => {
    assert.match(route, /\.\.\.base/);
    assert.match(route, /status: report\.status === "ok" \? 200 : 503/);
    assert.match(route, /"Cache-Control": "no-store"/);
  });

  it("degrades only through consultationNeedsAttention and survives a missing database", () => {
    assert.match(route, /consultationNeedsAttention\(consultations\)/);
    assert.match(route, /available: false/);
    assert.match(server, /catch \{\s*return \{ available: false \}/);
  });

  it("reads timestamps and counts only: no customer columns are selected", () => {
    for (const column of ["customer_name", "customer_email", "customer_phone", "project_description", "recipient", "payload", "management_token_hash", "reference"]) {
      assert.ok(!server.includes(column), `health-server must not select ${column}`);
    }
    assert.match(server, /calendar_last_error/);
  });

  it("the Microsoft sign-in probe is rate-limited per instance and never cached on a timeout", () => {
    assert.match(server, /PROBE_TTL_MS/);
    assert.match(server, /result !== "skipped"/);
  });
});

describe("admin calendar status (rendering fixtures)", () => {
  const view = (over = {}) => calendarStatusView({ mode: "microsoft", state: "PENDING", version: 2, syncedVersion: 1, lastError: null, attempts: 1, ...over });

  it("in sync", () => {
    const v = view({ state: "SYNCED", syncedVersion: 2 });
    assert.deepEqual([v.label, v.reconciliation, v.needsAttention], ["In calendar", "in_sync", false]);
  });

  it("queued for retry shows as pending, not as a failure", () => {
    const v = view({ lastError: "[unavailable] Event creation failed (503)" });
    assert.deepEqual([v.label, v.reconciliation, v.needsAttention], ["Calendar update pending", "retrying", false]);
  });

  it("an expired credential is named, flagged and distinct from an outage, even while still retrying", () => {
    const expired = view({ lastError: "[credential_expired] Microsoft sign-in refused (401 invalid_client AADSTS7000222)" });
    assert.match(expired.label, /credential expired or invalid/);
    assert.equal(expired.kind, "credential_expired");
    assert.equal(expired.needsAttention, true);
    assert.equal(expired.reconciliation, "retrying");
    assert.notEqual(expired.label, view({ lastError: "[unavailable] x" }).label);
  });

  it("gave up (FAILED) is flagged, with its reason when known", () => {
    const v = view({ state: "FAILED", attempts: 10, lastError: "[auth] Event creation failed (403 ErrorAccessDenied)" });
    assert.deepEqual([v.reconciliation, v.needsAttention, v.kind], ["gave_up", true, "auth"]);
    assert.match(v.label, /refused access/);
  });

  it("integration off or misconfigured says so", () => {
    assert.match(view({ mode: "none" }).label, /integration is off/);
    const m = view({ mode: "misconfigured" });
    assert.match(m.label, /misconfigured/);
    assert.equal(m.needsAttention, true);
  });

  it("list flag: credential problems show immediately, ordinary failures only once FAILED", () => {
    assert.match(calendarListFlag("PENDING", "[credential_expired] x"), /credential expired/);
    assert.equal(calendarListFlag("PENDING", "[unavailable] x"), null);
    assert.equal(calendarListFlag("FAILED", "[unavailable] x"), "Calendar sync failed");
    assert.equal(calendarListFlag("SYNCED", null), null);
  });

  it("the stored tag is not shown to the admin as text", () => {
    assert.equal(calendarErrorText("[auth] Event creation failed (403)"), "Event creation failed (403)");
    assert.equal(classifyStoredError("[auth] x"), "auth");
  });

  it("history lines for calendar failures read in plain words", () => {
    const event = (final) => ({ id: 1, action: "CALENDAR_SYNC_FAILED", actor_type: "SYSTEM", actor_clerk_user_id: null, previous: null, next: { final }, created_at: "2026-10-19T00:00:00Z" });
    assert.match(describeEvent(event(false)), /will retry/);
    assert.match(describeEvent(event(true)), /gave up/);
  });
});
