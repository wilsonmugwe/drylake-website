/*
 * Unit tests for draft invoice validation and insert-error mapping
 * (lib/invoice-creation/validate.ts). Run: npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CREATE_ERROR_MESSAGES,
  classifyInsertError,
  isCreateErrorCode,
  isValidIsoDate,
  parseMoneyToCents,
  validateDraftInvoice,
} from "../lib/invoice-creation/validate.ts";

const UUID = "3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90";
const OTHER_UUID = "0b6d2c4e-1a3f-4b5c-8d7e-9f0a1b2c3d4e";

describe("parseMoneyToCents", () => {
  it("parses whole and decimal amounts as integer cents", () => {
    assert.equal(parseMoneyToCents("1000"), 100_000);
    assert.equal(parseMoneyToCents("1000.5"), 100_050);
    assert.equal(parseMoneyToCents("0.01"), 1);
    assert.equal(parseMoneyToCents(" 12.30 "), 1_230);
  });

  it("rejects formats that could be misread", () => {
    for (const bad of ["", "abc", "1,000", "-5", "1.234", "1e3", "12345678", ".5", null, 5]) {
      assert.equal(parseMoneyToCents(bad), null, String(bad));
    }
  });
});

describe("isValidIsoDate", () => {
  it("accepts real calendar dates only", () => {
    assert.equal(isValidIsoDate("2026-10-31"), true);
    assert.equal(isValidIsoDate("2028-02-29"), true);
    assert.equal(isValidIsoDate("2026-02-30"), false);
    assert.equal(isValidIsoDate("31/10/2026"), false);
  });
});

describe("validateDraftInvoice", () => {
  const base = { subtotal: "1500.00", tax: "0", dueDate: "", projectId: "", visibleToClient: "true" };

  it("computes totals server-side and ignores browser tax when GST does not apply", () => {
    const result = validateDraftInvoice({ ...base, tax: "999" }, { gstApplies: false });

    assert.equal(result.ok, true);
    assert.equal(result.value.subtotalCents, 150_000);
    assert.equal(result.value.taxCents, 0);
    assert.equal(result.value.totalCents, 150_000);
    assert.equal(result.value.currency, "AUD");
  });

  it("calculates 10% GST itself when GST applies: $1,000.00 -> $100.00 -> $1,100.00", () => {
    const result = validateDraftInvoice({ ...base, subtotal: "1000.00" }, { gstApplies: true });

    assert.equal(result.ok, true);
    assert.equal(result.value.subtotalCents, 100_000);
    assert.equal(result.value.taxCents, 10_000);
    assert.equal(result.value.totalCents, 110_000);
  });

  it("ignores a tampered browser GST value when GST applies", () => {
    for (const tax of ["0", "999.99", "-5", "abc"]) {
      const result = validateDraftInvoice({ ...base, subtotal: "1500.00", tax }, { gstApplies: true });
      assert.equal(result.ok, true, tax);
      assert.equal(result.value.taxCents, 15_000, tax);
      assert.equal(result.value.totalCents, 165_000, tax);
    }
  });

  it("rounds GST half up on a fractional cent and keeps subtotal + GST = total", () => {
    const result = validateDraftInvoice({ ...base, subtotal: "10.05" }, { gstApplies: true });
    assert.equal(result.value.taxCents, 101);
    assert.equal(result.value.subtotalCents + result.value.taxCents, result.value.totalCents);
  });

  it("rejects zero, negative and malformed amounts", () => {
    for (const subtotal of ["0", "0.00", "-1", "abc"]) {
      const result = validateDraftInvoice({ ...base, subtotal }, { gstApplies: false });
      assert.deepEqual([result.ok, result.code, result.field], [false, "invalid_amount", "subtotal"]);
    }
  });

  it("allows an empty or past due date but rejects an invalid one", () => {
    assert.equal(validateDraftInvoice({ ...base, dueDate: "" }, { gstApplies: false }).value.dueDate, null);
    assert.equal(validateDraftInvoice({ ...base, dueDate: "2020-01-01" }, { gstApplies: false }).ok, true);

    const bad = validateDraftInvoice({ ...base, dueDate: "2026-13-01" }, { gstApplies: false });
    assert.equal(bad.code, "invalid_date");
  });

  it("treats browser ids as untrusted: project and request ids must be UUIDs", () => {
    const project = validateDraftInvoice({ ...base, projectId: "1 OR 1=1" }, { gstApplies: false });
    assert.equal(project.code, "invalid_project");

    const request = validateDraftInvoice({ ...base, requestId: "not-a-uuid" }, { gstApplies: false });
    assert.equal(request.code, "invalid_request");

    const ok = validateDraftInvoice({ ...base, projectId: UUID, requestId: OTHER_UUID }, { gstApplies: false });
    assert.equal(ok.value.projectId, UUID);
    assert.equal(ok.value.requestId, OTHER_UUID);
  });

  it("only the exact string 'true' makes an invoice visible to the client", () => {
    assert.equal(validateDraftInvoice({ ...base, visibleToClient: "on" }, { gstApplies: false }).value.visibleToClient, false);
    assert.equal(validateDraftInvoice({ ...base, visibleToClient: null }, { gstApplies: false }).value.visibleToClient, false);
  });
});

describe("classifyInsertError", () => {
  it("retries only a unique violation (concurrent invoice number collision)", () => {
    assert.deepEqual(classifyInsertError("23505"), { code: "numbering_failed", retryable: true });
    assert.equal(classifyInsertError("57014").retryable, false);
  });

  it("maps database failures to safe codes", () => {
    assert.equal(classifyInsertError("57014").code, "database_timeout");
    assert.equal(classifyInsertError("23502").code, "numbering_failed");
    assert.equal(classifyInsertError("42883").code, "numbering_failed");
    assert.equal(classifyInsertError(undefined).code, "database_error");
  });

  it("every code has a user-facing message without raw database text", () => {
    for (const [code, message] of Object.entries(CREATE_ERROR_MESSAGES)) {
      assert.equal(isCreateErrorCode(code), true);
      assert.doesNotMatch(message, /violates|constraint|PGRST|relation|syntax/i);
      assert.doesNotMatch(message, /—/, "no em dashes in user copy");
    }

    assert.equal(isCreateErrorCode("<script>"), false);
    assert.equal(isCreateErrorCode("toString"), false);
  });
});
