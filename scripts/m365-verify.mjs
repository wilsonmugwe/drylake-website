#!/usr/bin/env node
/*
 * Microsoft 365 live verification for the consultation calendar (docs/operations/consultations.md,
 * "Microsoft 365 go-live checks"). Run by the OWNER, on their own machine, against the real tenant.
 *
 * READ-ONLY by default. Nothing is created, changed or deleted unless --write-test is passed.
 *
 * Credentials: the same variable names the app reads (MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_ID,
 * MS_GRAPH_CLIENT_SECRET). They live in Vercel only; pull them into a file OUTSIDE the repo:
 *
 *   vercel env pull ~/m365-verify.env --environment=production
 *   node --env-file=$HOME/m365-verify.env scripts/m365-verify.mjs
 *   node --env-file=$HOME/m365-verify.env scripts/m365-verify.mjs --write-test
 *   rm ~/m365-verify.env
 *
 * Steps (each prints PASS / FAIL / WARN with the HTTP status; secrets and tokens never printed):
 *   A  client-credentials token acquired
 *   B  in-scope mailboxes (wilson@, benedict@) are readable: getSchedule and calendarView
 *   C  out-of-scope mailboxes (hello@, support@, accounts@) are DENIED. Denied = PASS,
 *      readable = FAIL. This is the proof of least privilege.
 *   D  mailbox time zone vs the Perth rules (lib/consultations/rules.ts)
 *   E  (--write-test only) Teams event create, PATCH, DELETE on each in-scope calendar, no attendees
 *
 * Exit code: 0 no FAIL (WARN allowed), 1 at least one FAIL, 2 missing configuration.
 */

import { pathToFileURL } from "node:url";

export const GRAPH = "https://graph.microsoft.com/v1.0";
export const IN_SCOPE = ["wilson@drylake.com.au", "benedict@drylake.com.au"];
export const OUT_OF_SCOPE = ["hello@drylake.com.au", "support@drylake.com.au", "accounts@drylake.com.au"];
/* Windows zone id for Australia/Perth, which is what Exchange reports. */
export const PERTH_WINDOWS_ZONE = "W. Australia Standard Time";
const PERTH_ACCEPTED = new Set([PERTH_WINDOWS_ZONE, "Australia/Perth"]);
const TEST_SUBJECT = "Drylake m365-verify TEST (safe to delete)";
const TIMEOUT_MS = 15_000;

/** Classifies a response to a read of a mailbox that must NOT be readable. */
export function interpretDenied(status, code) {
  if (status === 403 || /AccessDenied/i.test(code ?? "")) return { status: "PASS", note: "denied" };
  if (status >= 200 && status < 300) return { status: "FAIL", note: "READABLE, scope is too wide" };
  if (status === 404) {
    return { status: "WARN", note: "not found / no mailbox; not readable, but the denial is not proven to come from the scope" };
  }
  return { status: "FAIL", note: "unexpected answer, expected 403 ErrorAccessDenied" };
}

/** True when a getSchedule entry for a mailbox carries free/busy data rather than an error. */
export function scheduleReadable(entry) {
  return Boolean(entry) && !entry.error && (Array.isArray(entry.scheduleItems) || typeof entry.availabilityView === "string");
}

const utc = (d) => ({ dateTime: d.toISOString().replace("Z", ""), timeZone: "UTC" });

/** An out-of-hours test slot: at least 14 days ahead, 20:00 to 20:30 Perth (12:00 UTC). */
export function testSlot(now = new Date(), daysAhead = 15) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysAhead, 12, 0, 0));
  return { start, end: new Date(start.getTime() + 30 * 60_000) };
}

export async function runVerification({ env, fetchImpl = fetch, writeTest = false, log = console.log, now = () => new Date() }) {
  const tenant = env.MS_GRAPH_TENANT_ID?.trim();
  const clientId = env.MS_GRAPH_CLIENT_ID?.trim();
  const secret = env.MS_GRAPH_CLIENT_SECRET?.trim();
  if (!tenant || !clientId || !secret) {
    const missing = ["MS_GRAPH_TENANT_ID", "MS_GRAPH_CLIENT_ID", "MS_GRAPH_CLIENT_SECRET"].filter((k) => !env[k]?.trim());
    log(`Missing configuration: ${missing.join(", ")}. See the header of scripts/m365-verify.mjs.`);
    return { ok: false, exitCode: 2, results: [] };
  }

  let accessToken = "";
  const redact = (text) => {
    let out = String(text);
    for (const secretValue of [secret, accessToken]) if (secretValue) out = out.split(secretValue).join("[redacted]");
    return out;
  };
  const say = (line) => log(redact(line));

  const results = [];
  const record = (step, status, message) => {
    results.push({ step, status, message });
    say(`[${status}] ${step}  ${message}`);
  };

  const call = async (method, path, { body, headers = {}, raw = false } = {}) => {
    try {
      const response = await fetchImpl(raw ? path : `${GRAPH}${path}`, {
        method,
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Prefer: 'outlook.timezone="UTC"', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const json = response.status === 204 ? null : await response.json().catch(() => null);
      return { status: response.status, json, code: json?.error?.code ?? "" };
    } catch {
      return { status: 0, json: null, code: "NetworkError" };
    }
  };
  const tag = (r) => `${r.status || "no response"}${r.code ? ` ${r.code}` : ""}`;

  /* ---------------------------------------------------------------- A: token */
  let tokenResponse;
  try {
    tokenResponse = await fetchImpl(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: secret, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }).toString(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    record("A token", "FAIL", "Microsoft sign-in unreachable");
    return finish();
  }
  const tokenBody = await tokenResponse.json().catch(() => null);
  if (!tokenResponse.ok || !tokenBody?.access_token) {
    // Only the short error code (e.g. invalid_client = wrong or expired secret); never the description.
    record("A token", "FAIL", `sign-in refused (${tokenResponse.status} ${tokenBody?.error ?? ""})`.trim());
    return finish();
  }
  accessToken = tokenBody.access_token;
  record("A token", "PASS", `client-credentials token acquired (${tokenResponse.status})`);

  /* ---------------------------------------------------------------- B: in-scope reads */
  const from = now();
  const to = new Date(from.getTime() + 24 * 3600_000);
  const zones = new Map();
  for (const mailbox of IN_SCOPE) {
    const user = `/users/${encodeURIComponent(mailbox)}`;
    const schedule = await call("POST", `${user}/calendar/getSchedule`, {
      body: { schedules: IN_SCOPE, startTime: utc(from), endTime: utc(to), availabilityViewInterval: 30 },
    });
    const entries = Array.isArray(schedule.json?.value) ? schedule.json.value : [];
    const own = entries.find((e) => String(e.scheduleId ?? "").toLowerCase() === mailbox);
    const readable = schedule.status === 200 && scheduleReadable(own);
    record(`B ${mailbox} getSchedule`, readable ? "PASS" : "FAIL", readable ? `free/busy readable (${schedule.status})` : `not readable (${tag(schedule)})`);
    const zone = own?.workingHours?.timeZone?.name;
    if (zone) zones.set(mailbox, zone);

    const view = await call("GET", `${user}/calendarView?startDateTime=${encodeURIComponent(from.toISOString())}&endDateTime=${encodeURIComponent(to.toISOString())}&$top=1&$select=id`);
    record(`B ${mailbox} calendarView`, view.status === 200 ? "PASS" : "FAIL", view.status === 200 ? `calendar readable (${view.status})` : `not readable (${tag(view)})`);
  }

  /* ---------------------------------------------------------------- C: out-of-scope denied */
  for (const mailbox of OUT_OF_SCOPE) {
    const user = `/users/${encodeURIComponent(mailbox)}`;
    const view = await call("GET", `${user}/calendarView?startDateTime=${encodeURIComponent(from.toISOString())}&endDateTime=${encodeURIComponent(to.toISOString())}&$top=1&$select=id`);
    const verdict = interpretDenied(view.status, view.code);
    record(`C ${mailbox} calendarView`, verdict.status, `${verdict.note} (${tag(view)})`);
  }
  // The app asks one in-scope mailbox for several schedules; an out-of-scope one must not leak through that route.
  const probe = await call("POST", `/users/${encodeURIComponent(IN_SCOPE[0])}/calendar/getSchedule`, {
    body: { schedules: OUT_OF_SCOPE, startTime: utc(from), endTime: utc(to), availabilityViewInterval: 30 },
  });
  if (probe.status === 200) {
    for (const mailbox of OUT_OF_SCOPE) {
      const entry = (probe.json?.value ?? []).find((e) => String(e.scheduleId ?? "").toLowerCase() === mailbox);
      if (scheduleReadable(entry)) record(`C ${mailbox} getSchedule via ${IN_SCOPE[0]}`, "FAIL", "free/busy LEAKED, scope is too wide");
      else record(`C ${mailbox} getSchedule via ${IN_SCOPE[0]}`, "PASS", `denied in the per-mailbox result (${entry?.error?.responseCode ?? "no data"})`);
    }
  } else {
    const verdict = interpretDenied(probe.status, probe.code);
    record(`C out-of-scope getSchedule via ${IN_SCOPE[0]}`, verdict.status, `${verdict.note} (${tag(probe)})`);
  }

  /* ---------------------------------------------------------------- D: time zone */
  for (const mailbox of IN_SCOPE) {
    const zone = zones.get(mailbox);
    if (!zone) record(`D ${mailbox} time zone`, "WARN", "not reported by getSchedule; check Outlook settings by hand");
    else if (PERTH_ACCEPTED.has(zone)) record(`D ${mailbox} time zone`, "PASS", `${zone}, matches CONSULTATION_TIMEZONE Australia/Perth (UTC+8, no daylight saving)`);
    else record(`D ${mailbox} time zone`, "WARN", `${zone}. The app sends UTC so bookings stay correct, but Outlook would display this zone and working hours may not be Perth's`);
  }

  /* ---------------------------------------------------------------- E: write test */
  if (!writeTest) {
    say("[SKIP] E write test  not requested (read-only run). Re-run with --write-test to prove Teams create, move and delete.");
    return finish();
  }
  for (const mailbox of IN_SCOPE) await writeTestFor(mailbox);
  return finish();

  async function writeTestFor(mailbox) {
    const user = `/users/${encodeURIComponent(mailbox)}`;
    const slot = testSlot(now());
    let eventId = null;
    try {
      const created = await call("POST", `${user}/events`, {
        body: {
          subject: TEST_SUBJECT,
          start: utc(slot.start),
          end: utc(slot.end),
          isOnlineMeeting: true,
          onlineMeetingProvider: "teamsForBusiness",
          showAs: "free",
          isReminderOn: false,
        },
      });
      if (created.status !== 201 || !created.json?.id) {
        record(`E ${mailbox} create`, "FAIL", `event not created (${tag(created)})`);
        return;
      }
      eventId = created.json.id;
      record(`E ${mailbox} create`, "PASS", `event created (${created.status}), no attendees`);

      let joinUrl = created.json.onlineMeeting?.joinUrl;
      if (!joinUrl) {
        const again = await call("GET", `${user}/events/${encodeURIComponent(eventId)}?$select=id,onlineMeeting,organizer`);
        joinUrl = again.json?.onlineMeeting?.joinUrl;
      }
      if (typeof joinUrl === "string" && joinUrl) {
        let host = "unknown host";
        try {
          host = new URL(joinUrl).host;
        } catch {}
        record(`E ${mailbox} Teams link`, "PASS", `joinUrl present (${host}, path not printed)`);
      } else {
        record(`E ${mailbox} Teams link`, "FAIL", "event exists but has NO Teams meeting: likely the user has no Teams service plan, or Teams is not enabled for this mailbox. Check Microsoft 365 admin center > Users > Licenses and apps");
      }

      const organizer = String(created.json.organizer?.emailAddress?.address ?? "").toLowerCase();
      record(`E ${mailbox} organizer`, organizer === mailbox ? "PASS" : "FAIL", organizer === mailbox ? "organizer is this representative" : `organizer is ${organizer || "missing"}`);

      const view = await call("GET", `${user}/events/${encodeURIComponent(eventId)}?$select=id,start`, { headers: { Prefer: `outlook.timezone="${PERTH_WINDOWS_ZONE}"` } });
      const perthStart = String(view.json?.start?.dateTime ?? "");
      const expected = "T20:00:00";
      record(`E ${mailbox} Perth rendering`, perthStart.includes(expected) ? "PASS" : "FAIL", perthStart.includes(expected) ? "12:00 UTC reads as 20:00 in W. Australia Standard Time (UTC+8)" : `expected 20:00 Perth, got ${perthStart || "no value"}`);

      const moved = new Date(slot.start.getTime() + 30 * 60_000);
      const patch = await call("PATCH", `${user}/events/${encodeURIComponent(eventId)}`, { body: { start: utc(moved), end: utc(new Date(moved.getTime() + 30 * 60_000)) } });
      record(`E ${mailbox} move`, patch.status === 200 ? "PASS" : "FAIL", patch.status === 200 ? "start/end PATCH accepted (200)" : `PATCH failed (${tag(patch)})`);
      if (patch.status === 200 && joinUrl) {
        const after = await call("GET", `${user}/events/${encodeURIComponent(eventId)}?$select=id,onlineMeeting`);
        const kept = typeof after.json?.onlineMeeting?.joinUrl === "string";
        record(`E ${mailbox} Teams link after move`, kept ? "PASS" : "FAIL", kept ? "link survived the move" : "link was lost by the move");
      }
    } finally {
      if (eventId) {
        const del = await call("DELETE", `${user}/events/${encodeURIComponent(eventId)}`);
        const gone = del.status === 204 || del.status === 404;
        record(`E ${mailbox} delete`, gone ? "PASS" : "FAIL", gone ? `test event removed (${del.status})` : `COULD NOT DELETE (${tag(del)}). Delete "${TEST_SUBJECT}" by hand in this calendar (${slot.start.toISOString().slice(0, 10)})`);
      }
    }
  }

  function finish() {
    const failed = results.filter((r) => r.status === "FAIL").length;
    const warned = results.filter((r) => r.status === "WARN").length;
    say(`\n${results.length} checks: ${results.length - failed - warned} PASS, ${warned} WARN, ${failed} FAIL`);
    return { ok: failed === 0, exitCode: failed === 0 ? 0 : 1, results };
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const { exitCode } = await runVerification({ env: process.env, writeTest: process.argv.includes("--write-test") });
  process.exit(exitCode);
}
