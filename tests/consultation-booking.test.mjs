/*
 * Free consultation booking: rules, tokens, validation, emails, the outbox worker and the
 * security contracts of the routes. Database behaviour (overlap, concurrency, reminders,
 * privileges) is tested against real Postgres in tests/db/run-consultation-db-tests.sh.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  HORIZON_DAYS,
  MIN_NOTICE_MINUTES,
  buildAvailability,
  checkSlot,
  formatPerthDate,
  formatPerthRange,
  formatPerthTime,
  perthParts,
  perthToInstant,
} from "../lib/consultations/rules.ts";
import { deriveManageToken, hashManageToken, isWellFormedToken, manageUrl, tokenMatches, tokenSecret } from "../lib/consultations/token.ts";
import { validateBookingRequest, validateManageRequest } from "../lib/consultations/validate.ts";
import { SLOT_TAKEN_MESSAGE, describeOutcome } from "../lib/consultations/outcomes.ts";
import { BOOKING_REFERENCE_PATTERN, FOUNDER_NOTIFICATION_EMAILS, newBookingReference } from "../lib/consultations/config.ts";
import { CONSULTATION_SUBJECTS, renderConsultationEmail } from "../lib/email/consultation-emails.ts";
import { dispatchConsultationNotifications, retryDelayMinutes, skipReason } from "../lib/consultations/dispatch.ts";
import { createRateLimiter } from "../lib/security/rate-limit.ts";
import { readJsonBody } from "../lib/security/read-json.ts";
import { describeEvent, perthWeekBounds } from "../lib/consultations/admin-view.ts";
import { CONSULTATION_INTRO, MESSAGE_ALTERNATIVE } from "../lib/consultations/copy.ts";
import { RESPONSE_TIME } from "../lib/site.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

/* A fixed "now": Tuesday 13 October 2026, 08:00 Perth (00:00 UTC). */
const NOW = new Date("2026-10-13T00:00:00Z");
const perth = (y, m, d, h, min) => perthToInstant(y, m, d, h, min);

describe("Perth time helpers", () => {
  it("convert Perth wall-clock to UTC (+08:00, no daylight saving)", () => {
    assert.equal(perth(2026, 10, 19, 9, 0).toISOString(), "2026-10-19T01:00:00.000Z");
    assert.equal(perth(2027, 1, 15, 16, 30).toISOString(), "2027-01-15T08:30:00.000Z");
  });

  it("read the Perth weekday of an instant regardless of the host timezone", () => {
    // 23:30 UTC Sunday is 07:30 Monday in Perth.
    const p = perthParts(new Date("2026-10-18T23:30:00Z"));
    assert.deepEqual([p.isoWeekday, p.hour, p.minute], [1, 7, 30]);
  });

  it("format dates and ranges for people in Perth time", () => {
    const start = perth(2026, 10, 19, 9, 30);
    assert.equal(formatPerthDate(start), "Monday 19 October 2026");
    assert.equal(formatPerthTime(start), "9:30 am");
    assert.equal(formatPerthRange(perth(2026, 10, 19, 16, 30)), "4:30 pm to 5:00 pm");
  });
});

describe("slot rules (the brief's test list)", () => {
  const ok = (y, m, d, h, min) => checkSlot(perth(y, m, d, h, min), NOW);
  it("Monday, Tuesday and Friday succeed", () => {
    assert.deepEqual(ok(2026, 10, 19, 10, 0), { ok: true }); // Monday
    assert.deepEqual(ok(2026, 10, 20, 10, 0), { ok: true }); // Tuesday
    assert.deepEqual(ok(2026, 10, 23, 10, 0), { ok: true }); // Friday
  });
  it("Wednesday, Thursday, Saturday and Sunday fail", () => {
    for (const day of [21, 22, 24, 25]) assert.equal(ok(2026, 10, day, 10, 0).reason, "invalid_slot", `day ${day}`);
  });
  it("before 9:00 fails, 4:30 pm succeeds, 5:00 pm fails, off the half hour fails", () => {
    assert.equal(ok(2026, 10, 19, 8, 30).reason, "invalid_slot");
    assert.deepEqual(ok(2026, 10, 19, 9, 0), { ok: true });
    assert.deepEqual(ok(2026, 10, 19, 16, 30), { ok: true });
    assert.equal(ok(2026, 10, 19, 17, 0).reason, "invalid_slot");
    assert.equal(ok(2026, 10, 19, 10, 15).reason, "invalid_slot");
  });
  it("past dates and the notice period fail; beyond the horizon fails", () => {
    assert.equal(ok(2026, 10, 12, 10, 0).reason, "too_soon"); // yesterday
    assert.equal(checkSlot(new Date(NOW.getTime() + 60 * 60_000), NOW).reason, "too_soon"); // 09:00 today: a real slot, inside the notice
    assert.equal(checkSlot(perth(2026, 10, 13, 9, 30), NOW).reason, "too_soon"); // 90 minutes away
    assert.deepEqual(checkSlot(perth(2026, 10, 13, 10, 0), NOW), { ok: true }); // exactly 2h away
    assert.equal(ok(2026, 11, 13, 10, 0).reason, "too_far");
  });
});

describe("availability", () => {
  const days = buildAvailability(NOW, [perth(2026, 10, 19, 9, 0).toISOString()]);
  it("offers only Monday, Tuesday and Friday within the horizon", () => {
    for (const day of days) {
      const weekday = perthParts(perth(...day.date.split("-").map(Number), 12, 0)).isoWeekday;
      assert.ok([1, 2, 5].includes(weekday), day.date);
    }
    assert.ok(days.length >= 11 && days.length <= 13, `days: ${days.length}`);
    const last = days.at(-1).date;
    assert.ok(new Date(`${last}T00:00:00+08:00`).getTime() - NOW.getTime() <= (HORIZON_DAYS + 1) * 86_400_000);
  });
  it("lists the 16 starts 9:00 to 4:30 pm on a free day", () => {
    const friday = days.find((d) => d.date === "2026-10-23");
    assert.equal(friday.slots.length, 16);
    assert.equal(formatPerthTime(new Date(friday.slots[0])), "9:00 am");
    assert.equal(formatPerthTime(new Date(friday.slots.at(-1))), "4:30 pm");
  });
  it("removes booked starts and today's slots inside the notice period", () => {
    const monday = days.find((d) => d.date === "2026-10-19");
    assert.equal(monday.slots.length, 15);
    assert.ok(!monday.slots.includes(perth(2026, 10, 19, 9, 0).toISOString()));
    const today = days.find((d) => d.date === "2026-10-13");
    assert.equal(formatPerthTime(new Date(today.slots[0])), "10:00 am"); // 08:00 + 2h notice
    assert.equal(MIN_NOTICE_MINUTES, 120);
  });
});

describe("management tokens", () => {
  const secret = "x".repeat(40);
  const id = "4f7a5c1e-1111-4222-8333-444455556666";
  it("are deterministic per booking and version, unguessable without the secret", () => {
    const t1 = deriveManageToken(secret, id, 1);
    assert.equal(t1, deriveManageToken(secret, id, 1));
    assert.notEqual(t1, deriveManageToken(secret, id, 2));
    assert.notEqual(t1, deriveManageToken("y".repeat(40), id, 1));
    assert.ok(isWellFormedToken(t1));
    assert.ok(tokenMatches(secret, t1, id, 1));
    assert.ok(!tokenMatches(secret, t1, id, 2));
  });
  it("only a SHA-256 hash is stored (64 hex characters, not the token)", () => {
    const t = deriveManageToken(secret, id, 1);
    assert.match(hashManageToken(t), /^[0-9a-f]{64}$/);
    assert.notEqual(hashManageToken(t), t);
  });
  it("travel in the URL fragment, never the query string", () => {
    const url = manageUrl("https://drylake.com.au", deriveManageToken(secret, id, 1));
    assert.match(url, /^https:\/\/drylake\.com\.au\/consultation\/manage#t=[A-Za-z0-9_-]{43}$/);
    assert.doesNotMatch(url, /\?/);
  });
  it("require a configured secret of at least 32 characters", () => {
    assert.throws(() => tokenSecret({}), /CONSULTATION_TOKEN_SECRET/);
    assert.throws(() => tokenSecret({ CONSULTATION_TOKEN_SECRET: "short" }), /CONSULTATION_TOKEN_SECRET/);
    assert.equal(tokenSecret({ CONSULTATION_TOKEN_SECRET: secret }), secret);
  });
  it("reject malformed values before any lookup", () => {
    for (const bad of ["", "abc", null, 42, "a".repeat(44), "../../etc"]) assert.equal(isWellFormedToken(bad), false);
  });
});

describe("booking request validation", () => {
  const good = {
    idempotencyKey: "0b8f6a52-6f1e-4d2a-9c3b-1a2b3c4d5e6f",
    start: "2026-10-19T01:00:00.000Z",
    name: "Sam Example",
    email: "Sam@Example.com",
    description: "We run a cleaning business and lose bookings in email.",
    method: "TEAMS",
    turnstileToken: "t",
  };
  it("accepts a complete request and normalises the email", () => {
    const v = validateBookingRequest(good);
    assert.equal(v.ok, true);
    assert.equal(v.fields.email, "sam@example.com");
    assert.equal(v.fields.start.toISOString(), good.start);
  });
  it("requires name, email, description, a start time and an idempotency key", () => {
    for (const [key, field] of [["name", "name"], ["email", "email"], ["description", "description"], ["start", "start"]]) {
      const v = validateBookingRequest({ ...good, [key]: "" });
      assert.equal(v.ok, false, key);
      assert.equal(v.field, field);
    }
    assert.equal(validateBookingRequest({ ...good, idempotencyKey: "nope" }).ok, false);
  });
  it("refuses header injection, bad phones, bad emails and oversized fields", () => {
    assert.equal(validateBookingRequest({ ...good, name: "Sam\r\nBcc: x@y.z" }).ok, false);
    assert.equal(validateBookingRequest({ ...good, phone: "call me maybe" }).field, "phone");
    assert.equal(validateBookingRequest({ ...good, phone: "+61 433 448 000" }).ok, true);
    assert.equal(validateBookingRequest({ ...good, email: "not-an-email" }).field, "email");
    assert.equal(validateBookingRequest({ ...good, description: "x".repeat(2001) }).ok, false);
    assert.equal(validateBookingRequest({ ...good, start: "2026-10-19 09:00" }).field, "start");
  });
  it("manage requests need a version for changes and a new time to reschedule", () => {
    assert.equal(validateManageRequest({ token: "t", action: "view" }).ok, true);
    assert.equal(validateManageRequest({ token: "t", action: "cancel" }).ok, false);
    assert.equal(validateManageRequest({ token: "t", action: "cancel", version: 2 }).ok, true);
    assert.equal(validateManageRequest({ token: "t", action: "reschedule", version: 2 }).ok, false);
    assert.equal(validateManageRequest({ token: "t", action: "delete", version: 2 }).ok, false);
  });
});

describe("outcomes", () => {
  it("a taken slot gives the brief's exact message with 409", () => {
    assert.deepEqual(describeOutcome("slot_taken"), { status: 409, message: SLOT_TAKEN_MESSAGE, known: true });
    assert.equal(SLOT_TAKEN_MESSAGE, "This time has just been booked. Please choose another available time.");
  });
  it("an unknown outcome is a generic 500, never echoed", () => {
    assert.equal(describeOutcome("whatever").status, 500);
  });
});

describe("references and recipients", () => {
  it("references are DL- plus 6 unambiguous characters", () => {
    for (let i = 0; i < 200; i += 1) assert.match(newBookingReference(), BOOKING_REFERENCE_PATTERN);
  });
  it("both founders are notified", () => {
    assert.deepEqual([...FOUNDER_NOTIFICATION_EMAILS].sort(), ["benedict@drylake.com.au", "wilson@drylake.com.au"]);
  });
});

describe("consultation emails", () => {
  const base = {
    reference: "DL-7KQ2MX",
    customerName: "Sam Example",
    customerEmail: "sam@example.com",
    customerPhone: null,
    businessName: "Example Cleaning",
    projectDescription: "Bookings <b>lost</b> in email",
    start: perth(2026, 10, 19, 9, 30),
    manageUrl: "https://drylake.com.au/consultation/manage#t=abc",
    assetOrigin: "https://drylake.com.au",
  };
  const kinds = Object.keys(CONSULTATION_SUBJECTS);

  it("use the subjects from the brief", () => {
    assert.equal(renderConsultationEmail({ ...base, kind: "CUSTOMER_CONFIRMATION" }).subject, "Your Free Consultation with Drylake is Confirmed");
    assert.equal(renderConsultationEmail({ ...base, kind: "CUSTOMER_REMINDER" }).subject, "Reminder: Your Drylake Consultation is Tomorrow");
    assert.equal(renderConsultationEmail({ ...base, kind: "FOUNDER_NEW_BOOKING" }).subject, "New Drylake Consultation Booking: Sam Example");
  });
  it("every kind shows Perth time, the reference, no em dash, and escapes customer text", () => {
    for (const kind of kinds) {
      const email = renderConsultationEmail({ ...base, kind, previousStart: perth(2026, 10, 20, 11, 0), actor: "ADMIN", cancellationReason: "Illness" });
      for (const part of [email.html, email.text]) {
        assert.match(part, /DL-7KQ2MX/, kind);
        assert.match(part, /Monday 19 October 2026/, kind);
        assert.match(part, /9:30 am to 10:00 am/, kind);
        assert.doesNotMatch(part, /—/, `${kind} contains an em dash`);
      }
      assert.match(email.html, /Perth time \(AWST\)/, kind);
      assert.doesNotMatch(email.html, /<b>lost<\/b>/, `${kind} did not escape customer text`);
    }
  });
  it("customer confirmation carries what to expect, duration and the Manage Booking button", () => {
    const email = renderConsultationEmail({ ...base, kind: "CUSTOMER_CONFIRMATION" });
    assert.match(email.html, /Manage Booking/);
    assert.match(email.html, /What to expect/);
    assert.match(email.html, /30 minutes/);
    assert.match(email.html, /no obligation/i);
    assert.match(email.html, /hello@drylake\.com\.au/);
    assert.doesNotMatch(email.html, /4f7a5c1e|uuid/i);
  });
  it("founder notices carry the customer's details and description", () => {
    const email = renderConsultationEmail({ ...base, kind: "FOUNDER_NEW_BOOKING", customerPhone: "0400 000 000" });
    for (const s of ["sam@example.com", "0400 000 000", "Example Cleaning", "Bookings &lt;b&gt;lost"]) assert.ok(email.html.includes(s), s);
  });
  it("a reschedule by Drylake says so, with old and new times", () => {
    const email = renderConsultationEmail({ ...base, kind: "CUSTOMER_RESCHEDULED", actor: "ADMIN", previousStart: perth(2026, 10, 20, 11, 0) });
    assert.match(email.html, /Drylake has rescheduled your consultation/);
    assert.match(email.text, /Previous time: Tuesday 20 October 2026, 11:00 am/);
    const own = renderConsultationEmail({ ...base, kind: "CUSTOMER_RESCHEDULED", actor: "CUSTOMER", previousStart: perth(2026, 10, 20, 11, 0) });
    assert.doesNotMatch(own.html, /Drylake has rescheduled/);
  });
  it("a cancellation by Drylake includes the reason; no manage link on cancellations", () => {
    const email = renderConsultationEmail({ ...base, kind: "CUSTOMER_CANCELLED", actor: "ADMIN", cancellationReason: "Founder unwell", manageUrl: null });
    assert.match(email.html, /Founder unwell/);
    assert.doesNotMatch(email.html, /Manage Booking/);
  });
});

/* -------------------------------------------------------------- outbox worker with fakes */

function fakeDeps({ rows, bookings, send }) {
  const finished = [];
  const sent = [];
  return {
    finished,
    sent,
    deps: {
      claim: async () => rows,
      loadBookings: async (ids) => bookings.filter((b) => ids.includes(b.id)),
      finish: async (id, outcome, providerId, error, retryAfter) => finished.push({ id, outcome, providerId, error, retryAfter }),
      send: async (email) => {
        sent.push(email);
        return send ? send(email) : { id: `msg_${sent.length}` };
      },
      tokenSecret: () => "s".repeat(40),
      baseUrl: "https://drylake.com.au",
      replyTo: "hello@drylake.com.au",
      now: () => NOW,
      defer: async (id, minutes) => finished.push({ id, outcome: "deferred", minutes }),
      calendarConnected: false,
    },
  };
}

const booking = {
  id: "4f7a5c1e-1111-4222-8333-444455556666",
  reference: "DL-7KQ2MX",
  customer_name: "Sam Example",
  customer_email: "sam@example.com",
  customer_phone: null,
  business_name: null,
  project_description: "x",
  start_time: perth(2026, 10, 19, 9, 30).toISOString(),
  status: "CONFIRMED",
  version: 1,
  cancellation_reason: null,
  management_token_hash: hashManageToken(deriveManageToken("s".repeat(40), "4f7a5c1e-1111-4222-8333-444455556666", 1)),
  assigned_representative: "wilson",
  meeting_method: "TEAMS",
  calendar_join_url: null,
  calendar_synced_version: 0,
  calendar_sync_state: "PENDING",
  calendar_last_error: null,
};

const row = (over) => ({
  id: `n-${Math.random()}`,
  booking_id: booking.id,
  event_key: `${booking.id}:created:${over.kind.toLowerCase()}`,
  recipient: "sam@example.com",
  payload: { start_time: booking.start_time, end_time: booking.start_time, actor_type: "CUSTOMER" },
  attempts: 1,
  max_attempts: 8,
  created_at: NOW.toISOString(),
  ...over,
});

describe("outbox worker", () => {
  it("sends the customer confirmation and both founder notices, each with its stable idempotency key", async () => {
    const rows = [
      row({ kind: "CUSTOMER_CONFIRMATION" }),
      ...FOUNDER_NOTIFICATION_EMAILS.map((to) => row({ kind: "FOUNDER_NEW_BOOKING", recipient: to, event_key: `${booking.id}:created:founder:${to}` })),
    ];
    const { deps, sent, finished } = fakeDeps({ rows, bookings: [booking] });
    const summary = await dispatchConsultationNotifications(deps);
    assert.deepEqual(summary, { claimed: 3, sent: 3, retried: 0, skipped: 0, deferred: 0 });
    assert.deepEqual(sent.map((s) => s.to).sort(), ["benedict@drylake.com.au", "sam@example.com", "wilson@drylake.com.au"]);
    assert.deepEqual(sent.map((s) => s.idempotencyKey), rows.map((r) => r.event_key));
    assert.ok(finished.every((f) => f.outcome === "sent"));
    // Customer replies go to Drylake; founder replies go to the customer.
    assert.equal(sent[0].replyTo, "hello@drylake.com.au");
    assert.equal(sent[1].replyTo, "sam@example.com");
    // The customer's email carries a working manage link for the CURRENT version.
    assert.ok(sent[0].html.includes(deriveManageToken("s".repeat(40), booking.id, 1)));
  });

  it("a provider failure is retried with backoff, never lost", async () => {
    const { deps, finished } = fakeDeps({
      rows: [row({ kind: "CUSTOMER_CONFIRMATION", attempts: 3 })],
      bookings: [booking],
      send: () => {
        throw new Error("application_error: Resend is down");
      },
    });
    const summary = await dispatchConsultationNotifications(deps);
    assert.equal(summary.retried, 1);
    assert.equal(finished[0].outcome, "retry");
    assert.equal(finished[0].retryAfter, retryDelayMinutes(3));
    assert.match(finished[0].error, /Resend is down/);
  });

  it("backoff doubles and is capped at six hours", () => {
    assert.deepEqual([1, 2, 3, 8, 12].map(retryDelayMinutes), [2, 4, 8, 256, 360]);
  });

  it("no reminder for a cancelled or moved booking, or after the start", () => {
    const reminder = row({ kind: "CUSTOMER_REMINDER" });
    assert.equal(skipReason(reminder, booking, NOW), null);
    assert.match(skipReason(reminder, { ...booking, status: "CANCELLED" }, NOW), /no longer active/);
    assert.match(skipReason(reminder, { ...booking, start_time: perth(2026, 10, 20, 9, 30).toISOString() }, NOW), /changed/);
    assert.match(skipReason(reminder, booking, new Date("2026-10-20T00:00:00Z")), /already started/);
  });

  it("omits the manage link when the token secret no longer matches the stored hash (rotation)", async () => {
    const { deps, sent } = fakeDeps({
      rows: [row({ kind: "CUSTOMER_CONFIRMATION" })],
      bookings: [{ ...booking, management_token_hash: "0".repeat(64) }],
    });
    await dispatchConsultationNotifications(deps);
    assert.equal(sent.length, 1);
    assert.doesNotMatch(sent[0].html, /consultation\/manage#t=/);
  });

  it("a confirmation or reschedule notice superseded by a later change is not sent late", () => {
    const moved = { ...booking, start_time: perth(2026, 10, 20, 9, 30).toISOString(), status: "RESCHEDULED", version: 2 };
    assert.match(skipReason(row({ kind: "CUSTOMER_CONFIRMATION" }), moved, NOW), /changed/);
    assert.match(skipReason(row({ kind: "CUSTOMER_RESCHEDULED" }), { ...booking, status: "CANCELLED" }, NOW), /no longer active/);
    // History still goes: founders and the cancellation notice.
    assert.equal(skipReason(row({ kind: "FOUNDER_NEW_BOOKING" }), { ...booking, status: "CANCELLED" }, NOW), null);
    assert.equal(skipReason(row({ kind: "CUSTOMER_CANCELLED" }), { ...booking, status: "CANCELLED" }, NOW), null);
  });

  it("a reminder for a rescheduled booking is skipped, the new one is sent", async () => {
    const moved = {
      ...booking,
      start_time: perth(2026, 10, 20, 9, 30).toISOString(),
      status: "RESCHEDULED",
      version: 2,
      management_token_hash: hashManageToken(deriveManageToken("s".repeat(40), booking.id, 2)),
    };
    const oldReminder = row({ kind: "CUSTOMER_REMINDER" });
    const newReminder = row({ kind: "CUSTOMER_REMINDER", payload: { start_time: moved.start_time } });
    const { deps, sent, finished } = fakeDeps({ rows: [oldReminder, newReminder], bookings: [moved] });
    await dispatchConsultationNotifications(deps);
    assert.equal(sent.length, 1);
    assert.match(sent[0].html, /Tuesday 20 October 2026/);
    assert.equal(finished.find((f) => f.id === oldReminder.id).outcome, "skipped");
  });
});

describe("rate limiter and body reader", () => {
  it("allows the limit then refuses until the window passes", () => {
    const limiter = createRateLimiter(2, 1000);
    assert.equal(limiter.take("ip", 0), true);
    assert.equal(limiter.take("ip", 10), true);
    assert.equal(limiter.take("ip", 20), false);
    assert.equal(limiter.take("other", 20), true);
    assert.equal(limiter.take("ip", 1001), true);
  });
  it("reads JSON only, within the byte limit", async () => {
    const req = (body, type = "application/json") => new Request("https://x.test", { method: "POST", headers: { "content-type": type }, body });
    assert.deepEqual(await readJsonBody(req('{"a":1}'), 100), { ok: true, body: { a: 1 } });
    assert.equal((await readJsonBody(req("a=1", "text/plain"), 100)).status, 415);
    assert.equal((await readJsonBody(req("x".repeat(200)), 100)).status, 413);
    assert.equal((await readJsonBody(req("{bad"), 100)).status, 400);
  });
});

describe("admin helpers", () => {
  it("describe history in plain words", () => {
    const e = (action, actor_type, next = null) => describeEvent({ id: 1, action, actor_type, actor_clerk_user_id: null, previous: null, next, created_at: "" });
    assert.equal(e("RESCHEDULED", "CUSTOMER"), "Rescheduled by customer");
    assert.equal(e("CANCELLED", "ADMIN", { reason_given: true }), "Cancelled by drylake admin (reason given)");
    assert.equal(e("NOTIFICATION_FAILED", "SYSTEM", { kind: "CUSTOMER_REMINDER", final: true }), "Email delivery failed: 24-hour reminder (gave up after retries)");
  });
  it("the dashboard week is Monday to Monday in Perth", () => {
    const { from, to } = perthWeekBounds(NOW);
    assert.equal(from.toISOString(), "2026-10-11T16:00:00.000Z"); // Mon 12 Oct 00:00 Perth
    assert.equal(to.toISOString(), "2026-10-18T16:00:00.000Z");
  });
});

describe("copy", () => {
  it("uses the brief's supporting text and the site-wide reply time", () => {
    assert.equal(
      CONSULTATION_INTRO,
      "Book a free 30-minute consultation to discuss your business, explore your ideas and see how Drylake may be able to help. No obligation to proceed."
    );
    assert.ok(MESSAGE_ALTERNATIVE.endsWith(`within ${RESPONSE_TIME}.`));
  });
});

/* -------------------------------------------------------------- source contracts */

describe("route security contracts", () => {
  it("the admin consultation route checks the admin before reading the body or the database", () => {
    const src = read("app/api/admin/consultations/[bookingId]/route.ts");
    const gate = src.indexOf("authorizeAdminApi(");
    assert.ok(gate > 0);
    for (const later of ["readJsonBody(", "createAdminSupabaseClient()"]) assert.ok(src.indexOf(later) > gate, later);
  });
  it("admin consultation pages call the page-level admin gate first", () => {
    for (const file of ["app/admin/consultations/page.tsx", "app/admin/consultations/[bookingId]/page.tsx"]) {
      const src = read(file);
      assert.ok(src.indexOf("requirePlatformAdmin(") > 0 && src.indexOf("requirePlatformAdmin(") < src.indexOf("createAdminSupabaseClient()"), file);
    }
  });
  it("public booking verifies Turnstile with the consultation action before the database write", () => {
    const src = read("app/api/consultations/route.ts");
    assert.match(src, /verifyTurnstile\(fields\.turnstileToken, clientIp\(request\), supabase, CONSULTATION_ACTION\)/);
    assert.ok(src.indexOf("verifyTurnstile(") < src.indexOf("createConsultation("));
  });
  it("the cron endpoint requires the bearer secret, compared in constant time", () => {
    const src = read("app/api/cron/consultation-notifications/route.ts");
    assert.match(src, /timingSafeEqual/);
    assert.match(src, /Bearer \$\{secret\}/);
  });
  it("no consultation route logs a token, a body or an email address", () => {
    for (const file of ["app/api/consultations/route.ts", "app/api/consultations/manage/route.ts", "lib/consultations/dispatch.ts", "lib/consultations/dispatch-server.ts"]) {
      for (const line of read(file).split("\n").filter((l) => /console\.(log|info|warn|error)/.test(l))) {
        assert.doesNotMatch(line, /token|fields\.|email\.to|recipient|body\b|customer_/i, `${file}: ${line.trim()}`);
      }
    }
  });
  it("analytics never receives the URL fragment, and skips the manage page", () => {
    assert.match(read("app/layout.tsx"), /<SiteAnalytics \/>/);
    assert.doesNotMatch(read("app/layout.tsx"), /<Analytics \/>/);
    const wrapper = read("components/analytics/SiteAnalytics.tsx");
    assert.match(wrapper, /beforeSend=\{scrubAnalyticsEvent\}/);
    // The pure scrubber moved to lib/analytics/scrub-event.ts (privacy workstream) so it can be unit tested.
    const scrub = read("lib/analytics/scrub-event.ts");
    assert.match(scrub, /url\.hash = ""/);
    assert.match(scrub, /startsWith\("\/consultation\/manage"\)\) return null/);
  });

  it("the availability API returns start times only", () => {
    assert.match(read("lib/consultations/service.ts"), /rpc\("consultation_busy_slots"/);
    assert.doesNotMatch(read("app/api/consultations/availability/route.ts"), /customer_|from\("consultation_bookings"\)/);
  });
  it("the manage page is private: noindex, no referrer, disallowed in robots", () => {
    const page = read("app/consultation/manage/page.tsx");
    assert.match(page, /index: false/);
    assert.match(page, /referrer: "no-referrer"/);
    assert.match(read("lib/discovery/entity.ts"), /"\/consultation\/manage"/);
  });
  it("the migration enforces overlap, slot rules and locked-down access", () => {
    const sql = read("supabase/migrations/20261013120000_consultation_bookings.sql");
    assert.match(sql, /exclude using gist \(tstzrange\(start_time, end_time, '\[\)'\) with &&\)/);
    assert.match(sql, /isodow from start_time at time zone 'Australia\/Perth'\) in \(1, 2, 5\)/);
    assert.match(sql, /time '16:30'/);
    assert.match(sql, /enable row level security/);
    assert.match(sql, /revoke all on public\.consultation_bookings from %I/);
  });
  it("the TypeScript rules and the SQL agree on days and hours", () => {
    const rules = read("lib/consultations/rules.ts");
    assert.match(rules, /CONSULTATION_WEEKDAYS: readonly number\[\] = \[1, 2, 5\]/);
    assert.match(rules, /LAST_START_MINUTES = 16 \* 60 \+ 30/);
    assert.match(read("lib/consultations/service.ts"), /p_horizon: `\$\{HORIZON_DAYS \+ 1\} days`/);
  });
});
