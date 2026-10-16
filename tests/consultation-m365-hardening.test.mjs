/*
 * Consultation booking x Microsoft 365 hardening (PR 2). MOCKED: Microsoft Graph is a fake fetch,
 * so these prove request shape, classification and orchestration, NOT that Drylake's real tenant
 * accepts them. The live proof is docs/operations/consultation-live-test.md.
 *
 * Covers: assigned-representative availability, Teams only for TEAMS, phone events with no online
 * meeting, organiser = representative mailbox, Graph failure classes (401/403/404/429/5xx and the
 * expired-secret AADSTS7000222), retry timing, the repeated-auth-failure alert, and the secret
 * never appearing in an error, a stored text or an email.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { freeRepresentativeChecker } from "../lib/consultations/availability.ts";
import { calendarAuthAlertKey, renderCalendarAuthAlert } from "../lib/consultations/calendar-alert.ts";
import { AUTH_ALERT_AFTER_ATTEMPTS, calendarRetryMinutes, reconcileBooking, runCalendarSyncPass } from "../lib/consultations/calendar-sync.ts";
import { classifyTokenFailure, createMicrosoftGraphProvider, eventPayload } from "../lib/consultations/calendar/microsoft-graph.ts";
import { CalendarUnavailableError, classifyStoredError, isAuthFailure } from "../lib/consultations/calendar/types.ts";
import { REPRESENTATIVES } from "../lib/consultations/representatives.ts";
import { perthToInstant } from "../lib/consultations/rules.ts";
import { redactSensitive } from "../lib/security/redact.ts";

const [WILSON, BENEDICT] = REPRESENTATIVES;
const slot = perthToInstant(2026, 10, 19, 10, 0); // Monday 10:00 Perth
const ms = (d) => d.getTime();
const SECRET = "SUPER-SECRET-VALUE-0123456789abcdef";
const CONFIG = { tenantId: "tenant-1", clientId: "client-1", clientSecret: SECRET };
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

function graphWith({ token, graph }) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    const body = init.body ? (url.includes("/token") ? init.body : JSON.parse(init.body)) : undefined;
    const call = { url, method: init.method ?? "GET", headers: init.headers ?? {}, body };
    calls.push(call);
    if (url.includes("login.microsoftonline.com")) return token ? token(call, calls) : Response.json({ access_token: `tok-${calls.length}`, expires_in: 3599 });
    return graph(call, calls);
  };
  return { calls, provider: createMicrosoftGraphProvider(CONFIG, { fetch, now: () => 1_000_000, sleep: async () => {} }) };
}

const input = (over = {}) => ({
  bookingId: "4f7a5c1e-1111-4222-8333-000000000001",
  transactionId: "t-1",
  reference: "DL-7KQ2MX",
  start: slot,
  end: new Date(ms(slot) + 1_800_000),
  method: "TEAMS",
  customerName: "Sam Example",
  customerEmail: "hello@drylake.com.au",
  customerPhone: null,
  ...over,
});

/* ------------------------------------------------------------------ availability: the assigned representative */

describe("availability uses each representative's own calendar", () => {
  const busyMap = (entries) => new Map(entries.map(([rep, intervals]) => [rep.email, intervals]));
  const hour = { start: ms(slot), end: ms(slot) + 3_600_000 };

  it("Benedict busy in Outlook: only Wilson is a candidate for the slot", () => {
    const free = freeRepresentativeChecker(REPRESENTATIVES, [], busyMap([[WILSON, []], [BENEDICT, [hour]]]));
    assert.deepEqual(free(slot), ["wilson"]);
  });

  it("Wilson booked in Drylake's own table and Benedict busy in Outlook: nobody, the slot is not offered", () => {
    const free = freeRepresentativeChecker(REPRESENTATIVES, [{ start_time: slot.toISOString(), representative: "wilson" }], busyMap([[WILSON, []], [BENEDICT, [hour]]]));
    assert.deepEqual(free(slot), []);
  });

  it("a representative whose calendar could not be read is never treated as free", () => {
    const free = freeRepresentativeChecker(REPRESENTATIVES, [], busyMap([[WILSON, []]]));
    assert.deepEqual(free(slot), ["wilson"], "Benedict is missing from the map, so he is excluded");
  });

  it("getSchedule is asked for exactly the two representative mailboxes, from the first mailbox's own endpoint", async () => {
    const { provider, calls } = graphWith({ graph: () => Response.json({ value: [] }) });
    await provider.getBusy(REPRESENTATIVES, slot, new Date(ms(slot) + 86_400_000));
    const call = calls.find((c) => c.url.includes("getSchedule"));
    assert.deepEqual(call.body.schedules, [WILSON.email, BENEDICT.email]);
    assert.ok(call.url.includes(`/users/${encodeURIComponent(WILSON.email)}/calendar/getSchedule`));
  });

  it("the route re-checks the calendar for the exact slot before the database write (source contract)", () => {
    const route = strip(read("app/api/consultations/route.ts"));
    assert.ok(route.indexOf("freeRepresentativesAt(") > 0 && route.indexOf("freeRepresentativesAt(") < route.indexOf("createConsultation("));
    assert.match(route, /calendar_unavailable/, "an unverifiable calendar refuses the booking instead of guessing");
    const service = strip(read("lib/consultations/service.ts"));
    assert.match(service, /busy\.size === 0/, "no readable calendar at all is an error, never 'everyone is free'");
  });
});

/* ------------------------------------------------------------------ events: Teams vs phone, organiser, attendees */

describe("calendar events", () => {
  it("Teams: online meeting requested, created on the representative's own mailbox (organiser), customer is the only attendee", async () => {
    const { provider, calls } = graphWith({
      graph: () => Response.json({ id: "evt-1", start: { dateTime: slot.toISOString().replace("Z", "0000") }, onlineMeeting: { joinUrl: "https://teams.microsoft.com/l/meetup-join/abc" } }),
    });
    const event = await provider.createEvent(BENEDICT, input());
    const call = calls.find((c) => c.method === "POST" && c.url.includes("/events"));
    assert.ok(call.url.includes(`/users/${encodeURIComponent(BENEDICT.email)}/events`), "organiser is the assigned representative");
    assert.equal(call.body.isOnlineMeeting, true);
    assert.equal(call.body.onlineMeetingProvider, "teamsForBusiness");
    assert.deepEqual(call.body.attendees.map((a) => a.emailAddress.address), ["hello@drylake.com.au"], "customer only; the representative owns the event");
    assert.equal(call.body.showAs, "busy");
    assert.equal(event.joinUrl, "https://teams.microsoft.com/l/meetup-join/abc");
  });

  it("phone: isOnlineMeeting is explicitly false, no provider, the number is in the invitation, and no join link is ever returned", async () => {
    // Worst case: the tenant defaults every event to an online meeting and Graph answers with a link.
    const { provider, calls } = graphWith({
      graph: () => Response.json({ id: "evt-2", start: { dateTime: slot.toISOString().replace("Z", "0000") }, isOnlineMeeting: true, onlineMeeting: { joinUrl: "https://teams.microsoft.com/l/meetup-join/should-not-leak" } }),
    });
    const event = await provider.createEvent(WILSON, input({ method: "PHONE", customerPhone: "0400 000 000" }));
    const create = calls.filter((c) => c.method === "POST" && c.url.includes("/events"));
    assert.equal(create.length, 1);
    assert.equal(create[0].body.isOnlineMeeting, false);
    assert.equal("onlineMeetingProvider" in create[0].body, false);
    assert.match(create[0].body.location.displayName, /0400 000 000/);
    assert.match(create[0].body.body.content, /phone consultation/i);
    assert.match(create[0].body.body.content, /0400 000 000/);
    assert.doesNotMatch(create[0].body.body.content, /Teams/);
    assert.equal(event.joinUrl, null);
    assert.equal(calls.filter((c) => c.method === "GET" && c.url.includes("/events/")).length, 0, "no follow-up read hunting for a Teams link");
  });

  it("a phone payload built directly never requests an online meeting", () => {
    const payload = eventPayload(input({ method: "PHONE", customerPhone: "0400 000 000" }));
    assert.equal(payload.isOnlineMeeting, false);
    assert.equal(payload.onlineMeetingProvider, undefined);
  });

  it("an event carries the booking id tag so a retry finds it instead of duplicating it", () => {
    const payload = eventPayload(input());
    assert.equal(payload.singleValueExtendedProperties[0].value, "4f7a5c1e-1111-4222-8333-000000000001");
    assert.equal(payload.transactionId, "t-1");
  });

  it("reconcile: a phone booking is created on the assigned representative's calendar with no join link recorded", async () => {
    const created = [];
    const provider = {
      name: "fake",
      async findEvents() { return []; },
      async getEvent() { return null; },
      async createEvent(rep, i) { created.push([rep.key, i.method]); return { id: "evt-p", joinUrl: null, start: ms(i.start) }; },
      async moveEvent() {},
      async cancelEvent() {},
      async getBusy() { return new Map(); },
    };
    const result = await reconcileBooking(provider, {
      id: "b-1", reference: "DL-7KQ2MX", version: 1, status: "CONFIRMED", start_time: slot.toISOString(), end_time: new Date(ms(slot) + 1_800_000).toISOString(),
      assigned_representative: "benedict", meeting_method: "PHONE", customer_name: "Sam", customer_email: "hello@drylake.com.au", customer_phone: "0400 000 000",
      calendar_event_id: null, calendar_event_owner: null, calendar_join_url: null, calendar_sync_attempts: 1, calendar_lease_until: null,
    });
    assert.deepEqual(created, [["benedict", "PHONE"]]);
    assert.equal(result.joinUrl, null);
    assert.equal(result.owner, "benedict");
  });
});

/* ------------------------------------------------------------------ Graph failure classes */

describe("Graph failure classification", () => {
  const tokenError = (status, body, headers = {}) => () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

  it("AADSTS7000222 (expired client secret) is credential_expired and leaks neither the secret nor Microsoft's description", async () => {
    const { provider } = graphWith({
      token: tokenError(401, {
        error: "invalid_client",
        error_codes: [7000222],
        error_description: `AADSTS7000222: The provided client secret keys for app 'client-1' are expired. Trace ID: abc ${SECRET}`,
      }),
      graph: () => Response.json({}),
    });
    await assert.rejects(
      () => provider.getBusy(REPRESENTATIVES, slot, slot),
      (error) => {
        assert.ok(error instanceof CalendarUnavailableError);
        assert.equal(error.kind, "credential_expired");
        assert.ok(isAuthFailure(error.kind));
        assert.ok(!error.message.includes(SECRET) && !error.message.includes("Trace ID") && !error.message.includes("client-1"), error.message);
        assert.match(error.message, /^\[credential_expired\] /);
        assert.match(error.message, /AADSTS7000222/);
        return true;
      }
    );
  });

  it("plain invalid_client and the invalid-secret code both read as a credential problem", () => {
    assert.equal(classifyTokenFailure(401, { error: "invalid_client" }), "credential_expired");
    assert.equal(classifyTokenFailure(401, { error: "invalid_client", error_codes: [7000215] }), "credential_expired");
    assert.equal(classifyTokenFailure(400, { error: "unauthorized_client" }), "auth");
    assert.equal(classifyTokenFailure(503, null), "unavailable");
    assert.equal(classifyTokenFailure(429, null), "throttled");
  });

  it("an expired secret on the 401 token refresh is still credential_expired (the token endpoint is the source of truth)", async () => {
    let tokens = 0;
    const { provider } = graphWith({
      token: () => (++tokens === 1 ? Response.json({ access_token: "t1", expires_in: 3599 }) : new Response(JSON.stringify({ error: "invalid_client", error_codes: [7000222] }), { status: 401 })),
      graph: () => new Response("", { status: 401 }),
    });
    await assert.rejects(() => provider.getBusy(REPRESENTATIVES, slot, slot), (e) => e.kind === "credential_expired");
  });

  it("Graph 401 that survives a fresh token, and 403 (RBAC removed), are auth failures", async () => {
    const { provider: p401 } = graphWith({ graph: () => new Response("", { status: 401 }) });
    await assert.rejects(() => p401.getBusy(REPRESENTATIVES, slot, slot), (e) => e.kind === "auth" && e.status === 401);

    const { provider: p403 } = graphWith({ graph: () => Response.json({ error: { code: "ErrorAccessDenied", message: `Access is denied for ${SECRET}` } }, { status: 403 }) });
    await assert.rejects(
      () => p403.createEvent(WILSON, input()),
      (e) => e.kind === "auth" && e.status === 403 && /ErrorAccessDenied/.test(e.message) && !e.message.includes(SECRET) && !/Access is denied/.test(e.message)
    );
  });

  it("404 on the mailbox is its own kind; a missing EVENT stays 'gone', not an outage", async () => {
    const { provider } = graphWith({ graph: () => Response.json({ error: { code: "ErrorInvalidUser" } }, { status: 404 }) });
    await assert.rejects(() => provider.findEvents(WILSON, "4f7a5c1e-1111-4222-8333-000000000001"), (e) => e.kind === "mailbox" && e.status === 404);
    assert.equal(await provider.getEvent(WILSON, "evt-1"), null, "a deleted event reads as absent");
  });

  it("429 with a long Retry-After is not retried in-call and carries the wait; a short one is retried once", async () => {
    let n = 0;
    const { provider } = graphWith({ graph: () => { n += 1; return new Response("", { status: 429, headers: { "retry-after": "120" } }); } });
    await assert.rejects(() => provider.getBusy(REPRESENTATIVES, slot, slot), (e) => e.kind === "throttled" && e.retryAfterSeconds === 120);
    assert.equal(n, 1, "waiting two minutes inside a web request would hold it open: queue it instead");

    let short = 0;
    const { provider: ok } = graphWith({ graph: () => (++short === 1 ? new Response("", { status: 429, headers: { "retry-after": "1" } }) : Response.json({ value: [] })) });
    await ok.getBusy(REPRESENTATIVES, slot, slot);
    assert.equal(short, 2);
  });

  it("5xx is 'unavailable' and carries no personal text", async () => {
    const { provider } = graphWith({ graph: () => Response.json({ error: { code: "ErrorInternalServerError", message: "boom for hello@drylake.com.au" } }, { status: 500 }) });
    await assert.rejects(() => provider.getBusy(REPRESENTATIVES, slot, slot), (e) => e.kind === "unavailable" && !e.message.includes("hello@"));
  });

  it("the failure kind survives redaction and storage, so the admin can show it later", () => {
    const stored = redactSensitive(new CalendarUnavailableError("Microsoft sign-in refused (401 invalid_client AADSTS7000222)", { kind: "credential_expired" }).message);
    assert.equal(classifyStoredError(stored), "credential_expired");
    assert.equal(classifyStoredError("Event creation failed (503)"), null, "older untagged text is simply unclassified");
    assert.equal(classifyStoredError(null), null);
  });

  it("checkCredentials reports the sign-in outcome without touching the calendar", async () => {
    const ok = graphWith({ graph: () => { throw new Error("must not be called"); } });
    assert.equal(await ok.provider.checkCredentials(), "ok");
    assert.equal(ok.calls.filter((c) => !c.url.includes("/token")).length, 0);

    const expired = graphWith({ token: () => new Response(JSON.stringify({ error: "invalid_client", error_codes: [7000222] }), { status: 401 }), graph: () => Response.json({}) });
    assert.equal(await expired.provider.checkCredentials(), "credential_expired");
  });
});

/* ------------------------------------------------------------------ retry + alert */

describe("sync retry timing and the repeated-auth-failure alert", () => {
  const row = (attempts) => ({
    id: "b-1", reference: "DL-7KQ2MX", version: 1, status: "CONFIRMED", start_time: slot.toISOString(), end_time: new Date(ms(slot) + 1_800_000).toISOString(),
    assigned_representative: "wilson", meeting_method: "TEAMS", customer_name: "Sam", customer_email: "hello@drylake.com.au", customer_phone: null,
    calendar_event_id: null, calendar_event_owner: null, calendar_join_url: null, calendar_sync_attempts: attempts, calendar_lease_until: null,
  });
  const failing = (error) => ({
    name: "fake",
    async getBusy() { return new Map(); },
    async findEvents() { throw error; },
    async getEvent() { return null; },
    async createEvent() { throw error; },
    async moveEvent() {},
    async cancelEvent() {},
  });
  async function run(error, attempts) {
    const finished = [];
    const alerts = [];
    let handed = 0;
    await runCalendarSyncPass({
      provider: failing(error),
      claimOne: async () => (handed++ === 0 ? [row(attempts)] : []),
      finish: async (r, outcome, result, message, retry) => finished.push({ outcome, message, retry }),
      alertAuthFailure: async (kind) => { alerts.push(kind); },
    });
    return { finished, alerts };
  }

  it("backoff follows Retry-After when Microsoft asks for longer", () => {
    assert.equal(calendarRetryMinutes(1), 1);
    assert.equal(calendarRetryMinutes(1, 300), 5);
    assert.equal(calendarRetryMinutes(5, 30), 16, "our own backoff wins when it is longer");
    assert.equal(calendarRetryMinutes(1, 99_999), 60, "capped at an hour");
  });

  it("a throttled booking is queued for the Retry-After wait, not retried within the minute", async () => {
    const { finished, alerts } = await run(new CalendarUnavailableError("Free/busy lookup failed (429)", { kind: "throttled", retryAfterSeconds: 240 }), 1);
    assert.equal(finished[0].retry, 4);
    assert.deepEqual(alerts, []);
  });

  it(`auth failure alerts from attempt ${AUTH_ALERT_AFTER_ATTEMPTS}, not before`, async () => {
    const error = new CalendarUnavailableError("Microsoft sign-in refused (401 invalid_client AADSTS7000222)", { kind: "credential_expired" });
    assert.deepEqual((await run(error, AUTH_ALERT_AFTER_ATTEMPTS - 1)).alerts, []);
    const hit = await run(error, AUTH_ALERT_AFTER_ATTEMPTS);
    assert.deepEqual(hit.alerts, ["credential_expired"]);
    assert.equal(hit.finished[0].outcome, "retry");
    assert.equal(classifyStoredError(hit.finished[0].message), "credential_expired", "the admin screen can name the problem");
  });

  it("an RBAC refusal (403) alerts as 'auth'", async () => {
    assert.deepEqual((await run(new CalendarUnavailableError("Event creation failed (403 ErrorAccessDenied)", { kind: "auth", status: 403 }), 4)).alerts, ["auth"]);
  });

  it("ordinary outages never alert (they retry and, if they persist, the per-booking alert fires)", async () => {
    for (const kind of ["unavailable", "throttled", "mailbox"]) {
      assert.deepEqual((await run(new CalendarUnavailableError("x", { kind }), 9)).alerts, [], kind);
    }
    assert.deepEqual((await run(new Error("not a calendar error"), 9)).alerts, []);
  });

  it("a failing alert is contained: the booking is still recorded as retrying", async () => {
    const finished = [];
    let handed = 0;
    const summary = await runCalendarSyncPass({
      provider: failing(new CalendarUnavailableError("x", { kind: "credential_expired" })),
      claimOne: async () => (handed++ === 0 ? [row(5)] : []),
      finish: async (r, outcome) => finished.push(outcome),
      alertAuthFailure: async () => { throw new Error("Resend down"); },
    });
    assert.deepEqual(finished, ["retry"]);
    assert.equal(summary.retried, 1);
  });
});

describe("credential alert email", () => {
  it("is deduplicated per kind per Perth day", () => {
    const morning = perthToInstant(2026, 10, 19, 6, 0);
    const evening = perthToInstant(2026, 10, 19, 23, 30);
    const tomorrow = perthToInstant(2026, 10, 20, 0, 5);
    assert.equal(calendarAuthAlertKey("credential_expired", morning), calendarAuthAlertKey("credential_expired", evening));
    assert.notEqual(calendarAuthAlertKey("credential_expired", evening), calendarAuthAlertKey("credential_expired", tomorrow));
    assert.notEqual(calendarAuthAlertKey("credential_expired", morning), calendarAuthAlertKey("auth", morning));
  });

  it("says what to renew and where, never carries a secret, and uses no em dash", () => {
    for (const kind of ["credential_expired", "auth"]) {
      const mail = renderCalendarAuthAlert(kind, "https://drylake.com.au");
      const all = `${mail.subject}\n${mail.text}\n${mail.html}`;
      assert.ok(!all.includes("—"), `${kind}: em dash`);
      assert.ok(!all.includes(SECRET));
      assert.match(mail.text, /api\/health/);
      assert.match(mail.text, /no secrets/);
    }
    assert.match(renderCalendarAuthAlert("credential_expired", "https://drylake.com.au").text, /MS_GRAPH_CLIENT_SECRET/);
    assert.match(renderCalendarAuthAlert("auth", "https://drylake.com.au").text, /Application Calendars\.ReadWrite/);
    assert.match(renderCalendarAuthAlert("auth", "https://drylake.com.au").text, /must not be restored/);
  });

  it("only auth failures render an alert", () => {
    for (const kind of ["unavailable", "throttled", "mailbox"]) assert.equal(renderCalendarAuthAlert(kind, "https://drylake.com.au"), null);
  });

  it("every path that can see an auth failure reports it (source contract)", () => {
    for (const file of [
      "app/api/consultations/route.ts",
      "app/api/consultations/availability/route.ts",
      "app/api/consultations/manage/route.ts",
      "app/api/admin/consultations/[bookingId]/route.ts",
    ]) {
      assert.match(strip(read(file)), /after\(\(\) => reportCalendarFailure\(error\)\)/, file);
    }
    assert.match(strip(read("lib/consultations/calendar-sync-server.ts")), /alertAuthFailure: alertCalendarAuthFailure/);
    const server = strip(read("lib/consultations/calendar-alert-server.ts"));
    assert.match(server, /idempotencyKey: key/);
    assert.match(server, /redactSensitive\(/);
  });
});
