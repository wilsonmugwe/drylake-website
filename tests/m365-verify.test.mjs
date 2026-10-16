/*
 * scripts/m365-verify.mjs, driven with a fake Graph. These prove the PASS/FAIL interpretation, that
 * denial counts as PASS, that no secret or token reaches the output, and that the write test always
 * cleans up. They do NOT prove the real tenant behaves this way: that is what the script is for.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CONSULTATION_TIMEZONE } from "../lib/consultations/rules.ts";
import { REPRESENTATIVES } from "../lib/consultations/representatives.ts";
import { IN_SCOPE, OUT_OF_SCOPE, PERTH_WINDOWS_ZONE, interpretDenied, runVerification, scheduleReadable, testSlot } from "../scripts/m365-verify.mjs";

const SECRET = "s3cret-VALUE-do-not-print";
const TOKEN = "eyJ-fake-access-token-do-not-print";
const ENV = { MS_GRAPH_TENANT_ID: "tenant-1", MS_GRAPH_CLIENT_ID: "client-1", MS_GRAPH_CLIENT_SECRET: SECRET };
const JOIN = "https://teams.microsoft.com/l/meetup-join/19%3ameeting_SECRETPATH/0";

const json = (status, body) => new Response(body === null ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const denied = () => json(403, { error: { code: "ErrorAccessDenied", message: "Access is denied." } });

/** A fake tenant. `opts` switches individual behaviours. */
function fakeGraph(opts = {}) {
  const calls = [];
  const events = new Map();
  let seq = 0;
  const fetchImpl = async (url, init = {}) => {
    const method = init.method ?? "GET";
    calls.push({ method, url: String(url) });
    if (String(url).includes("/oauth2/v2.0/token")) {
      return opts.tokenFails ? json(401, { error: "invalid_client", error_description: `bad ${SECRET}` }) : json(200, { access_token: TOKEN, expires_in: 3599 });
    }
    const m = /\/users\/([^/]+)(\/.*)$/.exec(String(url));
    const mailbox = decodeURIComponent(m?.[1] ?? "");
    const rest = m?.[2] ?? "";
    const inScope = IN_SCOPE.includes(mailbox);

    if (rest.startsWith("/calendar/getSchedule")) {
      if (!inScope) return denied();
      const asked = JSON.parse(init.body).schedules;
      return json(200, {
        value: asked.map((id) =>
          IN_SCOPE.includes(id) || opts.leak
            ? { scheduleId: id, availabilityView: "000", scheduleItems: [], workingHours: { timeZone: { name: opts.zone ?? PERTH_WINDOWS_ZONE } } }
            : { scheduleId: id, error: { responseCode: "ErrorAccessDenied", message: "denied" } }
        ),
      });
    }
    if (rest.startsWith("/calendarView")) {
      if (inScope || opts.leak) return json(200, { value: [] });
      return opts.unlicensed404 ? json(404, { error: { code: "ErrorInvalidUser" } }) : denied();
    }
    if (rest === "/events" && method === "POST") {
      if (opts.createFails) return json(500, { error: { code: "ErrorInternalServerError" } });
      const id = `evt-${++seq}`;
      const body = JSON.parse(init.body);
      events.set(id, { id, mailbox, start: body.start });
      return json(201, {
        id,
        organizer: { emailAddress: { address: opts.wrongOrganizer ? "other@drylake.com.au" : mailbox } },
        onlineMeeting: opts.noTeams ? null : { joinUrl: JOIN },
      });
    }
    const ev = /^\/events\/([^?/]+)/.exec(rest);
    if (ev) {
      const id = decodeURIComponent(ev[1]);
      if (method === "GET") {
        const e = events.get(id);
        if (!e) return json(404, { error: { code: "ErrorItemNotFound" } });
        // 12:00 UTC is 20:00 in Perth.
        const perth = String(init.headers?.Prefer ?? "").includes(PERTH_WINDOWS_ZONE);
        const dateTime = perth && !opts.badZone ? e.start.dateTime.replace("T12:00:00", "T20:00:00") : e.start.dateTime;
        return json(200, { id, start: { dateTime }, onlineMeeting: opts.noTeams ? null : { joinUrl: JOIN } });
      }
      if (method === "PATCH") {
        if (opts.patchFails) return json(500, { error: { code: "ErrorInternalServerError" } });
        return json(200, { id });
      }
      if (method === "DELETE") {
        if (opts.deleteFails) return json(500, { error: { code: "ErrorInternalServerError" } });
        events.delete(id);
        return new Response(null, { status: 204 });
      }
    }
    return json(404, { error: { code: "NotMocked" } });
  };
  return { fetchImpl, calls, events };
}

async function run(opts = {}, writeTest = false, env = ENV) {
  const out = [];
  const graph = fakeGraph(opts);
  const result = await runVerification({ env, fetchImpl: graph.fetchImpl, writeTest, log: (l) => out.push(l), now: () => new Date("2026-10-17T02:00:00Z") });
  return { ...result, out: out.join("\n"), graph };
}

const status = (result, step) => result.results.find((r) => r.step === step)?.status;

describe("roster and time zone stay in sync with the app", () => {
  it("script mailboxes equal the app's representatives", () => {
    assert.deepEqual([...IN_SCOPE].sort(), REPRESENTATIVES.map((r) => r.email).sort());
  });
  it("out-of-scope list never overlaps in-scope", () => {
    assert.equal(OUT_OF_SCOPE.filter((m) => IN_SCOPE.includes(m)).length, 0);
  });
  it("app rules use Australia/Perth, which Exchange names W. Australia Standard Time", () => {
    assert.equal(CONSULTATION_TIMEZONE, "Australia/Perth");
    assert.equal(PERTH_WINDOWS_ZONE, "W. Australia Standard Time");
  });
  it("test slot is 14+ days ahead and 20:00 Perth", () => {
    const now = new Date("2026-10-17T02:00:00Z");
    const { start, end } = testSlot(now);
    assert.ok(start.getTime() - now.getTime() >= 14 * 86_400_000);
    assert.equal(start.toISOString().slice(11, 16), "12:00");
    assert.equal(end.getTime() - start.getTime(), 30 * 60_000);
  });
});

describe("interpretation helpers", () => {
  it("403 / AccessDenied is PASS, readable is FAIL, 404 is only a WARN", () => {
    assert.equal(interpretDenied(403, "ErrorAccessDenied").status, "PASS");
    assert.equal(interpretDenied(200, "").status, "FAIL");
    assert.equal(interpretDenied(404, "ErrorInvalidUser").status, "WARN");
    assert.equal(interpretDenied(500, "").status, "FAIL");
  });
  it("scheduleReadable needs data and no error", () => {
    assert.equal(scheduleReadable({ scheduleItems: [] }), true);
    assert.equal(scheduleReadable({ error: { responseCode: "x" } }), false);
    assert.equal(scheduleReadable(undefined), false);
  });
});

describe("read-only run", () => {
  it("passes on a correctly scoped tenant and makes no write call", async () => {
    const r = await run();
    assert.equal(r.ok, true);
    assert.equal(r.exitCode, 0);
    assert.equal(status(r, "A token"), "PASS");
    for (const m of IN_SCOPE) {
      assert.equal(status(r, `B ${m} getSchedule`), "PASS");
      assert.equal(status(r, `B ${m} calendarView`), "PASS");
      assert.equal(status(r, `D ${m} time zone`), "PASS");
    }
    for (const m of OUT_OF_SCOPE) assert.equal(status(r, `C ${m} calendarView`), "PASS");
    assert.deepEqual(r.graph.calls.filter((c) => c.method === "PATCH" || c.method === "DELETE" || (c.method === "POST" && c.url.endsWith("/events"))), []);
    assert.match(r.out, /SKIP\] E write test/);
  });

  it("FAILS when an out-of-scope mailbox is readable (scope too wide)", async () => {
    const r = await run({ leak: true });
    assert.equal(r.ok, false);
    assert.equal(r.exitCode, 1);
    for (const m of OUT_OF_SCOPE) assert.equal(status(r, `C ${m} calendarView`), "FAIL");
    assert.ok(r.results.some((x) => x.step.includes("getSchedule via") && x.status === "FAIL"));
  });

  it("an unlicensed 404 mailbox is a WARN, not a pass of the least-privilege proof and not a failure", async () => {
    const r = await run({ unlicensed404: true });
    assert.equal(status(r, "C hello@drylake.com.au calendarView"), "WARN");
    assert.equal(r.ok, true);
  });

  it("a non-Perth mailbox zone is a WARN", async () => {
    const r = await run({ zone: "UTC" });
    assert.equal(status(r, "D wilson@drylake.com.au time zone"), "WARN");
    assert.equal(r.ok, true);
  });

  it("stops at step A when sign-in is refused, reporting only the short code", async () => {
    const r = await run({ tokenFails: true });
    assert.equal(r.ok, false);
    assert.equal(r.results.length, 1);
    assert.match(r.out, /invalid_client/);
    assert.ok(!r.out.includes("bad "), "error_description is never printed");
  });

  it("exits 2 naming missing variables, never values", async () => {
    const r = await run({}, false, { MS_GRAPH_TENANT_ID: "t" });
    assert.equal(r.exitCode, 2);
    assert.match(r.out, /MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET/);
  });
});

describe("no secret in output", () => {
  for (const [label, opts, write] of [
    ["read-only", {}, false],
    ["write test", {}, true],
    ["failed sign-in", { tokenFails: true }, false],
    ["leaky scope", { leak: true }, true],
  ]) {
    it(`${label}: never contains the secret, the token or the Teams join path`, async () => {
      const r = await run(opts, write);
      assert.ok(!r.out.includes(SECRET));
      assert.ok(!r.out.includes(TOKEN));
      assert.ok(!r.out.includes("SECRETPATH"));
    });
  }

  it("redacts a secret even if it leaks into a message", async () => {
    const out = [];
    const base = fakeGraph();
    const fetchImpl = async (url, init) => (String(url).includes("/oauth2/") ? base.fetchImpl(url, init) : json(500, { error: { code: `Echo${TOKEN}` } }));
    await runVerification({ env: ENV, fetchImpl, writeTest: false, log: (l) => out.push(l) });
    assert.ok(!out.join("\n").includes(TOKEN));
  });
});

describe("--write-test", () => {
  it("creates a Teams event with no attendees, checks link/organizer/Perth time, moves it, deletes it", async () => {
    const r = await run({}, true);
    assert.equal(r.ok, true);
    for (const m of IN_SCOPE) {
      for (const s of ["create", "Teams link", "organizer", "Perth rendering", "move", "Teams link after move", "delete"]) {
        assert.equal(status(r, `E ${m} ${s}`), "PASS", `${m} ${s}`);
      }
    }
    const posts = r.graph.calls.filter((c) => c.method === "POST" && c.url.endsWith("/events"));
    assert.equal(posts.length, 2);
    assert.equal(r.graph.events.size, 0, "nothing left behind");
  });

  it("sends no attendees and requests a Teams meeting", async () => {
    const seen = [];
    const base = fakeGraph();
    const fetchImpl = async (url, init = {}) => {
      if (init.method === "POST" && String(url).endsWith("/events")) seen.push(JSON.parse(init.body));
      return base.fetchImpl(url, init);
    };
    await runVerification({ env: ENV, fetchImpl, writeTest: true, log: () => {}, now: () => new Date("2026-10-17T02:00:00Z") });
    assert.equal(seen.length, 2);
    for (const body of seen) {
      assert.equal(body.attendees, undefined);
      assert.equal(body.isOnlineMeeting, true);
      assert.equal(body.onlineMeetingProvider, "teamsForBusiness");
    }
  });

  it("reports a missing Teams meeting as a likely Teams service-plan problem, and still deletes", async () => {
    const r = await run({ noTeams: true }, true);
    assert.equal(r.ok, false);
    assert.equal(status(r, "E wilson@drylake.com.au Teams link"), "FAIL");
    assert.match(r.out, /Teams service plan/);
    assert.equal(r.graph.events.size, 0);
  });

  it("cleans up when the move fails part way", async () => {
    const r = await run({ patchFails: true }, true);
    assert.equal(status(r, "E wilson@drylake.com.au move"), "FAIL");
    assert.equal(status(r, "E wilson@drylake.com.au delete"), "PASS");
    assert.equal(r.graph.events.size, 0);
  });

  it("cleans up when the organizer check fails", async () => {
    const r = await run({ wrongOrganizer: true }, true);
    assert.equal(status(r, "E benedict@drylake.com.au organizer"), "FAIL");
    assert.equal(r.graph.events.size, 0);
  });

  it("names the event to delete by hand if deletion itself fails", async () => {
    const r = await run({ deleteFails: true }, true);
    assert.equal(status(r, "E wilson@drylake.com.au delete"), "FAIL");
    assert.match(r.out, /Delete "Drylake m365-verify TEST \(safe to delete\)" by hand/);
  });

  it("a failed create leaves nothing to delete", async () => {
    const r = await run({ createFails: true }, true);
    assert.equal(status(r, "E wilson@drylake.com.au create"), "FAIL");
    assert.equal(r.graph.calls.filter((c) => c.method === "DELETE").length, 0);
  });

  it("never runs writes without the flag", async () => {
    const r = await run({}, false);
    assert.equal(r.graph.calls.filter((c) => c.method === "POST" && c.url.endsWith("/events")).length, 0);
  });
});
