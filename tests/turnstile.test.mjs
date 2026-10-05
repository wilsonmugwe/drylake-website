/*
 * Unit tests for server-side Turnstile verification (lib/contact/turnstile.ts).
 * Run: npm test   (Node's built-in runner; Node strips the TypeScript types, and the
 * react-server condition resolves the "server-only" guard to its no-op build.)
 *
 * Cloudflare is never contacted: global fetch is replaced per test, and each test asserts
 * both the verdict and whether (and how) Siteverify was called.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { clientIp, verifyTurnstile } from "../lib/contact/turnstile.ts";

const REAL_SECRET = "0x4AAAAAAAunit-test-secret-not-real";
const TEST_ALWAYS_PASS = "1x0000000000000000000000000000000AA";
const realFetch = globalThis.fetch;
const silence = ["error", "warn"].map((level) => [level, console[level]]);

let calls;

function mockSiteverify(responder) {
  calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init, body: new URLSearchParams(init.body) });
    return responder();
  };
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const valid = (overrides = {}) =>
  json({ success: true, hostname: "drylake.com.au", action: "contact", "error-codes": [], ...overrides });

beforeEach(() => {
  process.env.TURNSTILE_SECRET_KEY = REAL_SECRET;
  delete process.env.TURNSTILE_ALLOWED_HOSTNAMES;
  calls = [];
  for (const [level] of silence) console[level] = () => {};
});

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const [level, fn] of silence) console[level] = fn;
});

describe("verifyTurnstile: fails closed", () => {
  it("rejects when the secret is not configured, without calling Cloudflare", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    mockSiteverify(() => valid());
    assert.deepEqual(await verifyTurnstile("token", null), { ok: false, reason: "misconfigured" });
    assert.equal(calls.length, 0);
  });

  it("rejects a missing token, without calling Cloudflare", async () => {
    mockSiteverify(() => valid());
    const verdict = await verifyTurnstile("", "203.0.113.7");
    assert.equal(verdict.ok, false);
    assert.equal(verdict.reason, "rejected");
    assert.equal(calls.length, 0);
  });

  it("rejects an invalid or fake token (success:false)", async () => {
    mockSiteverify(() => json({ success: false, "error-codes": ["invalid-input-response"] }));
    const verdict = await verifyTurnstile("fake-token", null);
    assert.deepEqual(verdict, { ok: false, reason: "rejected", errorCodes: ["invalid-input-response"] });
    assert.equal(calls.length, 1);
  });

  it("rejects a reused or expired token (timeout-or-duplicate)", async () => {
    mockSiteverify(() => json({ success: false, "error-codes": ["timeout-or-duplicate"] }));
    const verdict = await verifyTurnstile("spent-token", null);
    assert.equal(verdict.ok, false);
    assert.equal(verdict.reason, "rejected");
  });

  it("treats a secret Cloudflare rejects as our misconfiguration", async () => {
    mockSiteverify(() => json({ success: false, "error-codes": ["invalid-input-secret"] }));
    assert.equal((await verifyTurnstile("token", null)).reason, "misconfigured");
  });

  it("rejects when Siteverify cannot be reached (network error or timeout)", async () => {
    calls = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    };
    assert.equal((await verifyTurnstile("token", null)).reason, "unreachable");
    assert.ok(calls[0].init.signal instanceof AbortSignal, "request carries a timeout signal");
  });

  it("reports an unrecognised secret (HTTP 400 + invalid-input-secret) as misconfigured", async () => {
    mockSiteverify(() => json({ success: false, "error-codes": ["invalid-input-secret"] }, 400));
    assert.equal((await verifyTurnstile("token", null)).reason, "misconfigured");
  });

  it("rejects when Siteverify answers with an HTTP error", async () => {
    mockSiteverify(() => new Response("oops", { status: 500 }));
    assert.equal((await verifyTurnstile("token", null)).reason, "unreachable");
  });

  it("rejects a non-JSON Siteverify body", async () => {
    mockSiteverify(() => new Response("<html>gateway</html>", { status: 200 }));
    assert.equal((await verifyTurnstile("token", null)).reason, "unreachable");
  });

  it("rejects anything but a literal success:true", async () => {
    mockSiteverify(() => json({ success: "true", hostname: "drylake.com.au", action: "contact" }));
    assert.equal((await verifyTurnstile("token", null)).ok, false);
  });

  it("rejects a valid token minted on another hostname", async () => {
    mockSiteverify(() => valid({ hostname: "evil.example" }));
    assert.deepEqual(await verifyTurnstile("token", null), { ok: false, reason: "wrong-host" });
  });

  it("rejects a valid token minted for another action", async () => {
    mockSiteverify(() => valid({ action: "login" }));
    assert.deepEqual(await verifyTurnstile("token", null), { ok: false, reason: "wrong-action" });
  });

  it("rejects a valid token with no action", async () => {
    mockSiteverify(() => valid({ action: undefined }));
    assert.equal((await verifyTurnstile("token", null)).reason, "wrong-action");
  });
});

describe("verifyTurnstile: accepts genuine tokens", () => {
  it("accepts drylake.com.au + contact, and calls Siteverify correctly", async () => {
    mockSiteverify(() => valid());
    assert.deepEqual(await verifyTurnstile("good-token", "203.0.113.7"), { ok: true });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].body.get("secret"), REAL_SECRET);
    assert.equal(calls[0].body.get("response"), "good-token");
    assert.equal(calls[0].body.get("remoteip"), "203.0.113.7");
  });

  it("accepts www.drylake.com.au", async () => {
    mockSiteverify(() => valid({ hostname: "www.drylake.com.au" }));
    assert.equal((await verifyTurnstile("token", null)).ok, true);
  });

  it("accepts extra hostnames only when configured", async () => {
    process.env.TURNSTILE_ALLOWED_HOSTNAMES = "staging.drylake.com.au";
    mockSiteverify(() => valid({ hostname: "staging.drylake.com.au" }));
    assert.equal((await verifyTurnstile("token", null)).ok, true);
  });

  it("skips hostname/action binding only for Cloudflare's published test secret", async () => {
    process.env.TURNSTILE_SECRET_KEY = TEST_ALWAYS_PASS;
    mockSiteverify(() => json({ success: true, hostname: "example.com" }));
    assert.equal((await verifyTurnstile("XXXX.DUMMY.TOKEN.XXXX", null)).ok, true);
  });
});

describe("clientIp", () => {
  it("uses the first x-forwarded-for hop", () => {
    const req = new Request("https://drylake.com.au/api/contact", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    assert.equal(clientIp(req), "203.0.113.7");
  });
});
