/*
 * Consultation representatives, meeting method and Microsoft 365 integration (PURE parts).
 * Graph is driven through a fake fetch: these tests prove request shape, parsing and failure
 * handling, NOT that Drylake's real tenant accepts them (that needs the live checks in
 * docs/operations/consultations.md, "Microsoft 365 go-live checks").
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { freeRepresentativeChecker } from "../lib/consultations/availability.ts";
import { calendarRetryMinutes, reconcileBooking, runCalendarSyncPass } from "../lib/consultations/calendar-sync.ts";
import { BOOKING_PROPERTY_ID, createMicrosoftGraphProvider, eventBody, parseGraphUtc } from "../lib/consultations/calendar/microsoft-graph.ts";
import { calendarSetting } from "../lib/consultations/calendar/provider.ts";
import { CalendarEventMissingError, CalendarUnavailableError } from "../lib/consultations/calendar/types.ts";
import { CALENDAR_WAIT_MINUTES, dispatchConsultationNotifications, joinUrlFor, waitingForCalendar } from "../lib/consultations/dispatch.ts";
import { describeOutcome } from "../lib/consultations/outcomes.ts";
import { REPRESENTATIVES, REPRESENTATIVE_KEYS } from "../lib/consultations/representatives.ts";
import { buildAvailability, perthToInstant } from "../lib/consultations/rules.ts";
import { validateBookingRequest } from "../lib/consultations/validate.ts";
import { renderConsultationEmail } from "../lib/email/consultation-emails.ts";

const MIGRATION = readFileSync(new URL("../supabase/migrations/20261014090000_consultation_representatives.sql", import.meta.url), "utf8");
const [WILSON, BENEDICT] = REPRESENTATIVES;
const slot = perthToInstant(2026, 10, 19, 10, 0); // Monday 10:00 Perth
const ms = (d) => d.getTime();

/* ------------------------------------------------------------------ roster + migration */

describe("representative roster", () => {
  it("matches the database CHECK constraint and assignment order", () => {
    assert.deepEqual(REPRESENTATIVE_KEYS, ["wilson", "benedict"]);
    assert.match(MIGRATION, /check \(assigned_representative in \('wilson', 'benedict'\)\)/);
    assert.match(MIGRATION, /array_position\(array\['wilson', 'benedict'\], c\.rep\)/);
  });
  it("uses the two Drylake mailboxes", () => {
    assert.deepEqual(REPRESENTATIVES.map((r) => r.email), ["wilson@drylake.com.au", "benedict@drylake.com.au"]);
  });
  it("the migration makes overlap per representative and drops the global rule", () => {
    assert.match(MIGRATION, /exclude using gist \(assigned_representative with =, tstzrange\(start_time, end_time, '\[\)'\) with &&\)/);
    assert.match(MIGRATION, /drop constraint consultation_bookings_no_overlap/);
  });
});

/* ------------------------------------------------------------------ request validation */

describe("meeting method validation", () => {
  const good = {
    idempotencyKey: "0b8f6a52-6f1e-4d2a-9c3b-1a2b3c4d5e6f",
    start: "2026-10-19T01:00:00.000Z",
    name: "Sam Example",
    email: "sam@example.com",
    description: "Cleaning business",
    turnstileToken: "t",
  };
  it("requires a method", () => {
    assert.equal(validateBookingRequest(good).field, "method");
    assert.equal(validateBookingRequest({ ...good, method: "zoom" }).field, "method");
    assert.equal(validateBookingRequest({ ...good, method: "teams" }).fields.method, "TEAMS");
  });
  it("a phone consultation needs a callable number", () => {
    assert.equal(validateBookingRequest({ ...good, method: "PHONE" }).field, "phone");
    assert.equal(validateBookingRequest({ ...good, method: "PHONE", phone: "123" }).field, "phone");
    assert.equal(validateBookingRequest({ ...good, method: "PHONE", phone: "(08) 9000 0000" }).ok, true);
    assert.equal(validateBookingRequest({ ...good, method: "PHONE", phone: "+61 433 448 000" }).ok, true);
    assert.equal(validateBookingRequest({ ...good, method: "PHONE", phone: "1234567890123456" }).field, "phone");
  });
  it("Teams keeps the phone optional", () => {
    assert.equal(validateBookingRequest({ ...good, method: "TEAMS" }).ok, true);
  });
});

/* ------------------------------------------------------------------ availability */

describe("free representatives", () => {
  const busy = (rep, start, minutes = 30) => [rep.email, [{ start: ms(start), end: ms(start) + minutes * 60_000 }]];

  it("no calendar: Drylake bookings decide, per representative", () => {
    const free = freeRepresentativeChecker(REPRESENTATIVES, [{ start_time: slot.toISOString(), representative: "wilson" }], null);
    assert.deepEqual(free(slot), ["benedict"]);
  });
  it("Outlook busy time removes a representative, including partial overlaps", () => {
    const map = new Map([busy(WILSON, new Date(ms(slot) + 15 * 60_000)), [BENEDICT.email, []]]);
    assert.deepEqual(freeRepresentativeChecker(REPRESENTATIVES, [], map)(slot), ["benedict"]);
  });
  it("back-to-back meetings do not block (half-open intervals)", () => {
    const map = new Map([busy(WILSON, new Date(ms(slot) - 30 * 60_000)), busy(BENEDICT, new Date(ms(slot) + 30 * 60_000))]);
    assert.deepEqual(freeRepresentativeChecker(REPRESENTATIVES, [], map)(slot), ["wilson", "benedict"]);
  });
  it("a calendar that could not be read counts as busy (fail safe)", () => {
    const map = new Map([[WILSON.email, []]]);
    assert.deepEqual(freeRepresentativeChecker(REPRESENTATIVES, [], map)(slot), ["wilson"]);
  });
  it("a slot is offered only when someone is free", () => {
    const now = perthToInstant(2026, 10, 18, 12, 0);
    const days = buildAvailability(now, [], (start) => ms(start) !== ms(slot));
    const monday = days.find((d) => d.date === "2026-10-19");
    assert.ok(monday.slots.length > 0);
    assert.ok(!monday.slots.includes(slot.toISOString()));
  });
});

/* ------------------------------------------------------------------ provider selection */

describe("calendar provider setting", () => {
  it("defaults to none", () => {
    assert.equal(calendarSetting({}).mode, "none");
    assert.equal(calendarSetting({ CONSULTATION_CALENDAR_PROVIDER: "none" }).mode, "none");
  });
  it("microsoft without credentials is misconfigured, never a silent fallback", () => {
    assert.equal(calendarSetting({ CONSULTATION_CALENDAR_PROVIDER: "microsoft" }).mode, "misconfigured");
    assert.equal(calendarSetting({ CONSULTATION_CALENDAR_PROVIDER: "google" }).mode, "misconfigured");
  });
  it("microsoft with credentials", () => {
    const s = calendarSetting({ CONSULTATION_CALENDAR_PROVIDER: "microsoft", MS_GRAPH_TENANT_ID: "t", MS_GRAPH_CLIENT_ID: "c", MS_GRAPH_CLIENT_SECRET: "s" });
    assert.equal(s.mode, "microsoft");
    assert.equal(s.provider.name, "microsoft");
  });
});

/* ------------------------------------------------------------------ Graph provider (fake fetch) */

const CONFIG = { tenantId: "tenant-1", clientId: "client-1", clientSecret: "SUPER-SECRET-VALUE" };

function fakeGraph(handler) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    const call = { url, method: init.method ?? "GET", headers: init.headers ?? {}, body: init.body ? (url.includes("/token") ? init.body : JSON.parse(init.body)) : undefined };
    calls.push(call);
    if (url.includes("login.microsoftonline.com")) return Response.json({ access_token: `tok-${calls.length}`, expires_in: 3599 });
    return handler(call, calls);
  };
  const provider = createMicrosoftGraphProvider(CONFIG, { fetch, now: () => 1_000_000, sleep: async () => {} });
  return { provider, calls };
}

const graphTime = (d) => d.toISOString().replace("Z", "0000");

describe("Microsoft Graph provider", () => {
  it("parses Graph UTC times with 7 fractional digits", () => {
    assert.equal(parseGraphUtc("2026-10-19T02:00:00.0000000"), Date.parse("2026-10-19T02:00:00Z"));
    assert.equal(parseGraphUtc("nope"), null);
  });

  it("getSchedule: one call for both mailboxes, statuses mapped, errors excluded", async () => {
    const { provider, calls } = fakeGraph(() =>
      Response.json({
        value: [
          {
            scheduleId: "Wilson@drylake.com.au",
            scheduleItems: [
              { status: "busy", start: { dateTime: graphTime(slot) }, end: { dateTime: graphTime(new Date(ms(slot) + 3_600_000)) } },
              { status: "tentative", start: { dateTime: graphTime(new Date(ms(slot) + 7_200_000)) }, end: { dateTime: graphTime(new Date(ms(slot) + 9_000_000)) } },
              { status: "workingElsewhere", start: { dateTime: graphTime(slot) }, end: { dateTime: graphTime(new Date(ms(slot) + 1_800_000)) } },
            ],
          },
          { scheduleId: "benedict@drylake.com.au", error: { message: "not in scope" } },
        ],
      })
    );
    const busy = await provider.getBusy(REPRESENTATIVES, slot, new Date(ms(slot) + 86_400_000));
    const call = calls.find((c) => c.url.includes("getSchedule"));
    assert.equal(call.method, "POST");
    assert.deepEqual(call.body.schedules, ["wilson@drylake.com.au", "benedict@drylake.com.au"]);
    assert.equal(call.body.startTime.timeZone, "UTC");
    assert.match(call.headers.Authorization, /^Bearer tok-/);
    assert.equal(busy.get("wilson@drylake.com.au").length, 2, "busy + tentative count, workingElsewhere does not");
    assert.equal(busy.has("benedict@drylake.com.au"), false, "a per-mailbox error leaves that person unknown");
  });

  it("reuses the access token across calls", async () => {
    const { provider, calls } = fakeGraph(() => Response.json({ value: [] }));
    await provider.getBusy(REPRESENTATIVES, slot, slot);
    await provider.getBusy(REPRESENTATIVES, slot, slot);
    assert.equal(calls.filter((c) => c.url.includes("/token")).length, 1);
  });

  it("retries once on 429 with a short Retry-After, then gives up as CalendarUnavailableError", async () => {
    let n = 0;
    const { provider } = fakeGraph(() => {
      n += 1;
      return n === 1 ? new Response("", { status: 429, headers: { "retry-after": "1" } }) : Response.json({ value: [] });
    });
    await provider.getBusy(REPRESENTATIVES, slot, slot);
    assert.equal(n, 2);

    const { provider: always } = fakeGraph(() => new Response("", { status: 503, headers: { "retry-after": "1" } }));
    await assert.rejects(() => always.getBusy(REPRESENTATIVES, slot, slot), CalendarUnavailableError);
  });

  it("refreshes the token once on 401", async () => {
    let n = 0;
    const { provider, calls } = fakeGraph(() => (++n === 1 ? new Response("", { status: 401 }) : Response.json({ value: [] })));
    await provider.getBusy(REPRESENTATIVES, slot, slot);
    assert.equal(calls.filter((c) => c.url.includes("/token")).length, 2);
  });

  it("network failure and refused sign-in never leak the secret", async () => {
    const provider = createMicrosoftGraphProvider(CONFIG, {
      fetch: async () => {
        throw new Error("ECONNRESET SUPER-SECRET-VALUE");
      },
    });
    await assert.rejects(
      () => provider.getBusy(REPRESENTATIVES, slot, slot),
      (error) => error instanceof CalendarUnavailableError && !error.message.includes("SUPER-SECRET")
    );
  });

  it("creates a Teams event with the customer as attendee, a booking tag and an idempotency id", async () => {
    const { provider, calls } = fakeGraph(() => Response.json({ id: "evt-1", onlineMeeting: { joinUrl: "https://teams.microsoft.com/l/meetup-join/abc" } }, { status: 201 }));
    const event = await provider.createEvent(WILSON, {
      bookingId: "b-1", transactionId: "b-1:wilson:1", reference: "DL-7KQ2MX", start: slot, end: new Date(ms(slot) + 1_800_000),
      method: "TEAMS", customerName: "Sam", customerEmail: "sam@example.com", customerPhone: null,
    });
    const call = calls.find((c) => c.url.endsWith("/users/wilson%40drylake.com.au/events"));
    assert.equal(call.body.isOnlineMeeting, true);
    assert.equal(call.body.onlineMeetingProvider, "teamsForBusiness");
    assert.equal(call.body.transactionId, "b-1:wilson:1");
    assert.deepEqual(call.body.singleValueExtendedProperties, [{ id: BOOKING_PROPERTY_ID, value: "b-1" }]);
    assert.deepEqual(call.body.attendees[0].emailAddress, { address: "sam@example.com", name: "Sam" });
    assert.equal(event.joinUrl, "https://teams.microsoft.com/l/meetup-join/abc");
  });

  it("a phone event has no Teams meeting and names the number; HTML is escaped", async () => {
    const { provider, calls } = fakeGraph(() => Response.json({ id: "evt-2" }, { status: 201 }));
    await provider.createEvent(BENEDICT, {
      bookingId: "b-2", transactionId: "b-2:benedict:1", reference: "DL-AAAAAA", start: slot, end: new Date(ms(slot) + 1_800_000),
      method: "PHONE", customerName: "<b>Sam</b>", customerEmail: "sam@example.com", customerPhone: "0400 000 000",
    });
    const body = calls.find((c) => c.method === "POST" && c.url.endsWith("/events")).body;
    assert.equal(body.isOnlineMeeting, undefined);
    assert.match(body.location.displayName, /0400 000 000/);
    assert.match(body.body.content, /Drylake will call you on 0400 000 000/);
    assert.doesNotMatch(eventBody({ method: "PHONE", reference: "<x>", customerPhone: "<script>" }), /<script>|<x>/);
  });

  it("an invitation never carries the project description or a manage link", () => {
    const html = eventBody({ method: "TEAMS", reference: "DL-7KQ2MX", customerPhone: null });
    assert.doesNotMatch(html, /consultation\/manage|token/i);
  });

  it("moving PATCHes start and end only (never the body, which would strip the Teams link)", async () => {
    const { provider, calls } = fakeGraph(() => new Response(null, { status: 200 }));
    await provider.moveEvent(WILSON, "evt-1", slot, new Date(ms(slot) + 1_800_000));
    const patch = calls.find((c) => c.method === "PATCH");
    assert.deepEqual(Object.keys(patch.body).sort(), ["end", "start"]);
  });

  it("cancelling uses the organizer cancel endpoint; an already-gone event is fine", async () => {
    const { provider, calls } = fakeGraph(() => new Response(null, { status: 404 }));
    await provider.cancelEvent(WILSON, "evt-1", "Cancelled");
    assert.match(calls.at(-1).url, /\/events\/evt-1\/cancel$/);
    const { provider: failing } = fakeGraph(() => new Response("{}", { status: 500 }));
    await assert.rejects(() => failing.cancelEvent(WILSON, "evt-1", "x"), CalendarUnavailableError);
  });

  it("finds live events by booking tag, and refuses a non-UUID id (no $filter injection)", async () => {
    const id = "4f7a5c1e-1111-4222-8333-444455556666";
    const { provider, calls } = fakeGraph(() =>
      Response.json({ value: [{ id: "evt-9", isCancelled: false, start: { dateTime: graphTime(slot) } }, { id: "evt-8", isCancelled: true }] })
    );
    const found = await provider.findEvents(WILSON, id);
    assert.deepEqual(found.map((e) => e.id), ["evt-9"]);
    assert.equal(found[0].start, ms(slot));
    assert.match(decodeURIComponent(calls.at(-1).url), new RegExp(`ep/value eq '${id}'`));
    await assert.rejects(() => provider.findEvents(WILSON, "x' or true"), CalendarUnavailableError);
  });

  it("reads one event by id; gone means null; a move of a gone event says so", async () => {
    const { provider } = fakeGraph(() => new Response("{}", { status: 404 }));
    assert.equal(await provider.getEvent(WILSON, "evt-1"), null);
    await assert.rejects(() => provider.moveEvent(WILSON, "evt-1", slot, slot), CalendarEventMissingError);
  });
});

/* ------------------------------------------------------------------ calendar sync */

function fakeProvider(initial = {}, { hiddenFromSearch = false } = {}) {
  const events = new Map(Object.entries(initial)); // id -> { rep, bookingId, start }
  const log = [];
  let n = 0;
  return {
    events,
    log,
    provider: {
      name: "fake",
      async getBusy() { return new Map(); },
      async findEvents(rep, bookingId) {
        if (hiddenFromSearch) return [];
        return [...events].filter(([, e]) => e.rep === rep.key && e.bookingId === bookingId).map(([id, e]) => ({ id, joinUrl: e.joinUrl ?? null, start: e.start }));
      },
      async getEvent(rep, id) {
        const e = events.get(id);
        return e && e.rep === rep.key ? { id, joinUrl: e.joinUrl ?? null, start: e.start } : null;
      },
      async createEvent(rep, input) {
        const id = `evt-${++n}`;
        events.set(id, { rep: rep.key, bookingId: input.bookingId, start: ms(input.start), joinUrl: input.method === "TEAMS" ? `https://teams/${id}` : null });
        log.push(["create", rep.key, input.transactionId]);
        return { id, joinUrl: events.get(id).joinUrl, start: ms(input.start) };
      },
      async moveEvent(rep, id, start) {
        if (!events.has(id)) throw new CalendarEventMissingError();
        events.get(id).start = ms(start);
        log.push(["move", rep.key, id]);
      },
      async cancelEvent(rep, id) {
        events.delete(id);
        log.push(["cancel", rep.key, id]);
      },
    },
  };
}

const syncRow = (over = {}) => ({
  id: "b-1", reference: "DL-7KQ2MX", version: 1, status: "CONFIRMED",
  start_time: slot.toISOString(), end_time: new Date(ms(slot) + 1_800_000).toISOString(),
  assigned_representative: "wilson", meeting_method: "TEAMS",
  customer_name: "Sam", customer_email: "sam@example.com", customer_phone: null,
  calendar_event_id: null, calendar_event_owner: null, calendar_join_url: null, calendar_sync_attempts: 1,
  calendar_lease_until: "2026-10-14T04:05:00.123456+00:00",
  ...over,
});

describe("calendar reconciliation", () => {
  it("creates the event on the assigned representative's calendar", async () => {
    const f = fakeProvider();
    const result = await reconcileBooking(f.provider, syncRow());
    assert.deepEqual(f.log, [["create", "wilson", "b-1:wilson:1"]]);
    assert.equal(result.owner, "wilson");
    assert.match(result.joinUrl, /^https:\/\/teams\//);
  });
  it("adopts an event a crashed worker already created instead of duplicating it", async () => {
    const f = fakeProvider({ "evt-old": { rep: "wilson", bookingId: "b-1", start: ms(slot) } });
    const result = await reconcileBooking(f.provider, syncRow());
    assert.equal(result.eventId, "evt-old");
    assert.deepEqual(f.log, []);
  });
  it("moves the event on a reschedule with the same representative", async () => {
    const later = new Date(ms(slot) + 3_600_000);
    const f = fakeProvider({ "evt-1": { rep: "wilson", bookingId: "b-1", start: ms(slot) } });
    await reconcileBooking(f.provider, syncRow({ version: 2, start_time: later.toISOString(), end_time: new Date(ms(later) + 1_800_000).toISOString(), calendar_event_id: "evt-1", calendar_event_owner: "wilson" }));
    assert.deepEqual(f.log, [["move", "wilson", "evt-1"]]);
    assert.equal(f.events.get("evt-1").start, ms(later));
  });
  it("on reassignment cancels the old invitation and creates a new one", async () => {
    const f = fakeProvider({ "evt-1": { rep: "wilson", bookingId: "b-1", start: ms(slot) } });
    const result = await reconcileBooking(f.provider, syncRow({ version: 2, assigned_representative: "benedict", calendar_event_id: "evt-1", calendar_event_owner: "wilson" }));
    assert.deepEqual(f.log.map((l) => l.slice(0, 2)), [["cancel", "wilson"], ["create", "benedict"]]);
    assert.equal(result.owner, "benedict");
    assert.equal(f.events.size, 1);
  });
  it("a crash mid-reassignment never produces a second invitation (recorded id is only a hint)", async () => {
    // Attempt 1 cancelled Wilson's E1 and created Benedict's E2, then died before recording it.
    const f = fakeProvider({ "evt-2": { rep: "benedict", bookingId: "b-1", start: ms(slot) } });
    const result = await reconcileBooking(f.provider, syncRow({ version: 2, assigned_representative: "benedict", calendar_event_id: "evt-1", calendar_event_owner: "wilson" }));
    assert.deepEqual(f.log, [], "adopts E2, creates nothing");
    assert.equal(result.eventId, "evt-2");
  });
  it("duplicates in the assigned calendar are cancelled, keeping the recorded one", async () => {
    const f = fakeProvider({ "evt-a": { rep: "wilson", bookingId: "b-1", start: ms(slot) }, "evt-b": { rep: "wilson", bookingId: "b-1", start: ms(slot) } });
    const result = await reconcileBooking(f.provider, syncRow({ calendar_event_id: "evt-b", calendar_event_owner: "wilson" }));
    assert.equal(result.eventId, "evt-b");
    assert.deepEqual(f.log, [["cancel", "wilson", "evt-a"]]);
  });
  it("an event deleted in Outlook is recreated instead of failing forever", async () => {
    const later = new Date(ms(slot) + 3_600_000);
    const f = fakeProvider();
    const result = await reconcileBooking(f.provider, syncRow({ version: 2, start_time: later.toISOString(), end_time: new Date(ms(later) + 1_800_000).toISOString(), calendar_event_id: "evt-gone", calendar_event_owner: "wilson" }));
    assert.deepEqual(f.log.map((l) => l[0]), ["create"]);
    assert.ok(result.eventId);
  });
  it("if the tag search misses, the recorded event is still found and moved (no duplicate)", async () => {
    const later = new Date(ms(slot) + 3_600_000);
    const f = fakeProvider({ "evt-1": { rep: "wilson", bookingId: "b-1", start: ms(slot) } }, { hiddenFromSearch: true });
    await reconcileBooking(f.provider, syncRow({ version: 2, start_time: later.toISOString(), end_time: new Date(ms(later) + 1_800_000).toISOString(), calendar_event_id: "evt-1", calendar_event_owner: "wilson" }));
    assert.deepEqual(f.log, [["move", "wilson", "evt-1"]]);
  });
  it("on cancellation cancels the event, found by tag when no id was recorded", async () => {
    const f = fakeProvider({ "evt-x": { rep: "benedict", bookingId: "b-1", start: ms(slot) } });
    const result = await reconcileBooking(f.provider, syncRow({ status: "CANCELLED", version: 2 }));
    assert.deepEqual(f.log, [["cancel", "benedict", "evt-x"]]);
    assert.equal(result.eventId, null);
  });
  it("a failure is recorded as a retry with backoff; others in the pass still run", async () => {
    const f = fakeProvider();
    const broken = { ...f.provider, createEvent: async () => { throw new CalendarUnavailableError("Event creation failed (503)"); } };
    const finished = [];
    let handed = 0;
    const summary = await runCalendarSyncPass({
      provider: broken,
      claimOne: async () => (handed++ === 0 ? [syncRow({ calendar_sync_attempts: 3 })] : []),
      finish: async (row, outcome, result, error, retry) => finished.push({ outcome, error, retry }),
    });
    assert.deepEqual(summary, { claimed: 1, synced: 0, retried: 1 });
    assert.deepEqual(finished, [{ outcome: "retry", error: "Event creation failed (503)", retry: 4 }]);
    assert.equal(calendarRetryMinutes(20), 60);
  });
  it("claims ONE booking at a time (each lease only covers one booking's Graph calls)", async () => {
    const f = fakeProvider();
    const claims = [];
    const queue = [syncRow({ id: "4f7a5c1e-1111-4222-8333-000000000001" }), syncRow({ id: "4f7a5c1e-1111-4222-8333-000000000002" })];
    const summary = await runCalendarSyncPass({
      provider: f.provider,
      claimOne: async (bookingId) => {
        claims.push(bookingId);
        return queue.length ? [queue.shift()] : [];
      },
      finish: async () => {},
    }, { limit: 10 });
    assert.equal(summary.synced, 2);
    assert.equal(claims.length, 3, "one claim per booking, plus the empty one that ends the pass");
  });
});

/* ------------------------------------------------------------------ email gating + content */

const NOW = perthToInstant(2026, 10, 14, 12, 0);
const booking = {
  id: "b-1", reference: "DL-7KQ2MX", customer_name: "Sam Example", customer_email: "sam@example.com", customer_phone: "0400 000 000",
  business_name: null, project_description: "x", start_time: slot.toISOString(), status: "CONFIRMED", version: 1,
  cancellation_reason: null, management_token_hash: "0".repeat(64), assigned_representative: "wilson", meeting_method: "TEAMS",
  calendar_join_url: null, calendar_synced_version: 0, calendar_sync_state: "PENDING", calendar_last_error: null,
};
const confirmation = { id: "n-1", booking_id: "b-1", event_key: "b-1:created:customer_confirmation", kind: "CUSTOMER_CONFIRMATION",
  recipient: "sam@example.com", payload: { start_time: slot.toISOString() }, attempts: 1, max_attempts: 8, created_at: NOW.toISOString() };

describe("Teams link gating", () => {
  it("a Teams confirmation waits while the event is being created", () => {
    assert.equal(waitingForCalendar(confirmation, booking, true, NOW), true);
    assert.equal(waitingForCalendar(confirmation, booking, false, NOW), false, "no calendar connected: never waits");
    assert.equal(waitingForCalendar(confirmation, { ...booking, meeting_method: "PHONE" }, true, NOW), false);
    assert.equal(waitingForCalendar(confirmation, { ...booking, calendar_sync_state: "FAILED" }, true, NOW), false);
  });
  it(`stops waiting after ${CALENDAR_WAIT_MINUTES} minutes`, () => {
    const later = new Date(ms(NOW) + CALENDAR_WAIT_MINUTES * 60_000 + 1);
    assert.equal(waitingForCalendar(confirmation, booking, true, later), false);
  });
  it("only a link from the CURRENT version is used", () => {
    assert.equal(joinUrlFor({ ...booking, calendar_join_url: "https://t/1", calendar_synced_version: 1 }), "https://t/1");
    assert.equal(joinUrlFor({ ...booking, version: 2, calendar_join_url: "https://t/1", calendar_synced_version: 1 }), null);
    assert.equal(joinUrlFor({ ...booking, status: "CANCELLED", calendar_join_url: "https://t/1", calendar_synced_version: 1 }), null);
  });
  it("the dispatcher defers instead of sending, and spends no attempt", async () => {
    const deferred = [];
    const summary = await dispatchConsultationNotifications({
      claim: async () => [confirmation],
      loadBookings: async () => [booking],
      finish: async () => assert.fail("must not finish a deferred email"),
      send: async () => assert.fail("must not send yet"),
      defer: async (id, minutes) => deferred.push([id, minutes]),
      calendarConnected: true,
      tokenSecret: () => "s".repeat(40),
      baseUrl: "https://drylake.com.au",
      replyTo: "hello@drylake.com.au",
      now: () => NOW,
    });
    assert.equal(summary.deferred, 1);
    assert.deepEqual(deferred, [["n-1", 1]]);
  });
});

describe("consultation emails with method and representative", () => {
  const base = { reference: "DL-7KQ2MX", customerName: "Sam Example", customerEmail: "sam@example.com", customerPhone: "0400 000 000",
    businessName: null, projectDescription: "x", start: slot, assetOrigin: "https://drylake.com.au", representativeName: "Wilson" };

  it("Teams confirmation carries the join button when the link exists", () => {
    const e = renderConsultationEmail({ ...base, kind: "CUSTOMER_CONFIRMATION", method: "TEAMS", joinUrl: "https://teams.microsoft.com/l/meetup-join/abc" });
    assert.match(e.html, /Join Microsoft Teams Meeting/);
    assert.match(e.text, /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/abc/);
    assert.match(e.html, /Microsoft Teams video call/);
    assert.match(e.html, /Wilson/);
    assert.match(e.html, /2 hours before/);
  });
  it("Teams without a link never claims an invitation was already sent", () => {
    for (const calendarConnected of [true, false]) {
      const text = renderConsultationEmail({ ...base, kind: "CUSTOMER_CONFIRMATION", method: "TEAMS", calendarConnected }).text;
      assert.match(text, /will follow in a calendar invitation/);
      assert.doesNotMatch(text, /is in the calendar invitation sent/);
    }
  });
  it("with no calendar connected, founders are told to send the Teams invitation by hand", () => {
    assert.match(renderConsultationEmail({ ...base, kind: "FOUNDER_NEW_BOOKING", method: "TEAMS", calendarConnected: false }).text, /Calendar integration is off/);
    assert.doesNotMatch(renderConsultationEmail({ ...base, kind: "FOUNDER_NEW_BOOKING", method: "TEAMS", calendarConnected: true }).text, /Calendar integration is off/);
  });
  it("phone confirmation says Drylake will call, with the number, and no Teams wording", () => {
    const e = renderConsultationEmail({ ...base, kind: "CUSTOMER_CONFIRMATION", method: "PHONE" });
    assert.match(e.text, /We will call you on 0400 000 000/);
    assert.doesNotMatch(e.html, /Teams/);
  });
  it("founder notice names the representative and method", () => {
    const e = renderConsultationEmail({ ...base, kind: "FOUNDER_NEW_BOOKING", method: "PHONE" });
    assert.match(e.html, /Representative/);
    assert.match(e.html, /Phone call/);
  });
  it("calendar failure alert renders for founders", () => {
    const e = renderConsultationEmail({ ...base, kind: "FOUNDER_CALENDAR_FAILED", method: "TEAMS", calendarError: "Event creation failed (403 ErrorAccessDenied)" });
    assert.match(e.subject, /Calendar Sync Failed/);
    assert.match(e.text, /Retry calendar sync/);
    assert.match(e.text, /ErrorAccessDenied/);
    const cancelled = renderConsultationEmail({ ...base, kind: "FOUNDER_CALENDAR_FAILED", method: "TEAMS", bookingCancelled: true });
    assert.match(cancelled.text, /CANCELLED, but Drylake could not cancel its Outlook event/);
    assert.doesNotMatch(cancelled.text, /booking itself stands/);
  });
  it("no em dashes in any consultation email", () => {
    for (const kind of ["CUSTOMER_CONFIRMATION", "CUSTOMER_REMINDER", "CUSTOMER_RESCHEDULED", "CUSTOMER_CANCELLED", "FOUNDER_NEW_BOOKING", "FOUNDER_RESCHEDULED", "FOUNDER_CANCELLED", "FOUNDER_CALENDAR_FAILED"]) {
      for (const method of ["TEAMS", "PHONE"]) {
        const e = renderConsultationEmail({ ...base, kind, method, previousStart: slot, joinUrl: "https://t/x" });
        assert.doesNotMatch(`${e.subject}${e.html}${e.text}`, /—/, `${kind} ${method}`);
      }
    }
  });
});

describe("outcome messages", () => {
  it("the 2-hour cut-off and calendar failures have customer-safe messages", () => {
    assert.equal(describeOutcome("change_window_closed").status, 409);
    assert.match(describeOutcome("change_window_closed").message, /2 hours/);
    assert.equal(describeOutcome("calendar_unavailable").status, 503);
    assert.match(describeOutcome("calendar_unavailable").message, /Nothing has been booked/);
  });
});
