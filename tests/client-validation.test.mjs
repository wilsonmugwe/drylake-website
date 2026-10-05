/*
 * Client onboarding input validation (lib/clients/validation.ts).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isChecked,
  normalizeClientName,
  normalizeContactName,
  parseOptionalEmail,
  parseRequiredEmail,
} from "../lib/clients/validation.ts";

describe("normalizeClientName", () => {
  it("collapses whitespace and trims", () => {
    assert.deepEqual(normalizeClientName("  Acme   Pty  Ltd "), { ok: true, value: "Acme Pty Ltd" });
  });

  it("rejects too short, too long, non-string and control characters", () => {
    assert.equal(normalizeClientName("A").ok, false);
    assert.equal(normalizeClientName("x".repeat(101)).ok, false);
    assert.equal(normalizeClientName(null).ok, false);
    assert.equal(normalizeClientName("Acme\u0000Ltd").ok, false);
  });
});

describe("normalizeContactName", () => {
  it("treats empty as not provided", () => {
    assert.deepEqual(normalizeContactName("   "), { ok: true, value: null });
    assert.deepEqual(normalizeContactName(null), { ok: true, value: null });
  });

  it("rejects over-long names", () => {
    assert.equal(normalizeContactName("x".repeat(101)).ok, false);
  });
});

describe("emails", () => {
  it("lower-cases and validates", () => {
    assert.deepEqual(parseRequiredEmail(" Alex@Example.COM "), { ok: true, value: "alex@example.com" });
  });

  it("rejects malformed addresses", () => {
    for (const value of ["", "alex", "alex@", "@example.com", "a b@example.com", "a@b"]) {
      assert.equal(parseRequiredEmail(value).ok, false, value);
    }
  });

  it("optional email: empty is null, bad is an error", () => {
    assert.deepEqual(parseOptionalEmail(""), { ok: true, value: null });
    assert.equal(parseOptionalEmail("nope").ok, false);
  });
});

describe("isChecked", () => {
  it("follows HTML checkbox semantics", () => {
    assert.equal(isChecked("on"), true);
    assert.equal(isChecked("true"), true);
    assert.equal(isChecked(null), false);
    assert.equal(isChecked("false"), false);
  });
});
