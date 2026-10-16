/*
 * Admin consultation surface: who can reach it and what each action requires. The repo has no
 * Clerk test harness (real sessions need real Clerk keys), so this is the SOURCE-contract half of
 * the auth story; the signed-out ROUTE half runs against a built server in
 * tests/e2e/admin-consultations.spec.ts. A signed-in non-admin 403 is proven by the single shared
 * gate (lib/auth/admin-api.ts) that every admin route uses, asserted below, and listed as a
 * production check in docs/operations/consultation-live-test.md.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const ROUTE = strip(read("app/api/admin/consultations/[bookingId]/route.ts"));
const GATE = strip(read("lib/auth/admin-api.ts"));
const LIST = strip(read("app/admin/consultations/page.tsx"));
const DETAIL = strip(read("app/admin/consultations/[bookingId]/page.tsx"));

describe("the shared admin API gate", () => {
  it("answers 401 for signed-out fetches, a sign-in redirect for browser navigation, and 403 for a signed-in non-admin", () => {
    assert.match(GATE, /jsonError\("Unauthorized", 401\)/);
    assert.match(GATE, /NextResponse\.redirect\(/);
    assert.match(GATE, /303/);
    assert.match(GATE, /isPlatformAdmin\(\)/);
    assert.match(GATE, /jsonError\("Forbidden", 403\)/);
    // The 403 branch is only reachable after the 401 branch: signed-out never reaches the role check.
    assert.ok(GATE.indexOf("Unauthorized") < GATE.indexOf("Forbidden"));
  });

  it("admin responses are never cached", () => {
    assert.match(GATE, /private, no-store/);
  });
});

describe("admin consultation route", () => {
  it("checks the admin before reading the body, creating the service client or touching the database", () => {
    const gate = ROUTE.indexOf("authorizeAdminApi(");
    assert.ok(gate > 0);
    for (const later of ["readJsonBody(", "createAdminSupabaseClient()", "cancelConsultation(", "rescheduleConsultation(", "completeConsultation("]) {
      assert.ok(gate < ROUTE.indexOf(later), `${later} must come after the gate`);
    }
    assert.match(ROUTE, /if \(!gate\.ok\) return gate\.response/);
  });

  it("only the four known actions are accepted, and changes need the booking version (stale screens are refused)", () => {
    assert.match(ROUTE, /new Set\(\["reschedule", "cancel", "complete", "retry_calendar"\]\)/);
    assert.match(ROUTE, /version === 0 && action !== "retry_calendar"/);
    assert.match(ROUTE, /isUuid\(bookingId\)/);
  });

  it("reschedule needs a valid new time and re-checks Microsoft 365 for that slot before committing", () => {
    assert.match(ROUTE, /Choose a new consultation time/);
    assert.ok(ROUTE.indexOf("freeRepresentativesAt(") < ROUTE.indexOf("rescheduleConsultation("));
  });

  it("every action is performed as an ADMIN actor with the admin's Clerk id, so it is audited", () => {
    assert.match(ROUTE, /type: "ADMIN" as const, clerkUserId: gate\.userId/);
    assert.match(ROUTE, /clerkUserId: gate\.userId/);
  });

  it("cancel and reschedule queue the calendar update and the notification emails after the response", () => {
    assert.match(ROUTE, /after\(async \(\) => \{\s*await runCalendarSync\(supabase, \{ bookingId, limit: 1 \}\);\s*await runConsultationDispatch\(supabase\);/);
  });

  it("an unexpected failure says nothing was changed and logs no body, email or token", () => {
    assert.match(ROUTE, /Nothing was changed/);
    assert.doesNotMatch(ROUTE, /console\.(log|error)\([^)]*(body|email|token)/i);
  });
});

describe("admin consultation pages", () => {
  it("both pages call the page-level platform-admin gate before any data access", () => {
    for (const [name, src] of [["list", LIST], ["detail", DETAIL]]) {
      const gate = src.indexOf("requirePlatformAdmin(");
      assert.ok(gate > 0, `${name}: no gate`);
      assert.ok(gate < src.indexOf("createAdminSupabaseClient()"), `${name}: client created before the gate`);
    }
  });

  it("the list shows both representatives' bookings with a calendar flag, the detail shows reconciliation and the retry control", () => {
    assert.match(LIST, /calendarListFlag\(/);
    assert.match(LIST, /CONSULTATION_REPRESENTATIVE_OPTIONS/);
    assert.match(DETAIL, /data-testid="admin-calendar-status"/);
    assert.match(DETAIL, /calendarStatusView\(/);
    assert.match(DETAIL, /AdminCalendarRetry/);
  });

  it("both admins are admins: access is the platform-admin role, not a per-representative filter", () => {
    assert.doesNotMatch(LIST, /currentUser|clerkUserId|userId/);
    assert.doesNotMatch(DETAIL, /assigned_representative\s*===\s*["']/);
  });
});
