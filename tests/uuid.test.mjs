/*
 * Unit tests for route-ID validation (lib/validation/uuid.ts). Every dynamic admin/client
 * route and API calls isUuid() before querying, so a malformed ID 404s instead of raising a
 * Postgres "invalid input syntax for type uuid" error.
 * Run: npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isUuid } from "../lib/validation/uuid.ts";

describe("isUuid", () => {
  it("accepts canonical UUIDs of any version, either case", () => {
    assert.equal(isUuid("3f2b8c1e-9a4d-4c7e-8b1a-2d5e6f7a8b9c"), true);
    assert.equal(isUuid("3F2B8C1E-9A4D-4C7E-8B1A-2D5E6F7A8B9C"), true);
    assert.equal(isUuid("0190f3c2-7b1a-7e3d-9c2b-1a2b3c4d5e6f"), true); // v7
    assert.equal(isUuid("00000000-0000-0000-0000-000000000000"), true);
  });

  it("rejects malformed and hostile values", () => {
    for (const value of [
      "",
      "not-a-uuid",
      "3f2b8c1e9a4d4c7e8b1a2d5e6f7a8b9c",
      "3f2b8c1e-9a4d-4c7e-8b1a-2d5e6f7a8b9",
      "3f2b8c1e-9a4d-4c7e-8b1a-2d5e6f7a8b9cz",
      " 3f2b8c1e-9a4d-4c7e-8b1a-2d5e6f7a8b9c",
      "3f2b8c1e-9a4d-4c7e-8b1a-2d5e6f7a8b9c\n",
      "{3f2b8c1e-9a4d-4c7e-8b1a-2d5e6f7a8b9c}",
      "3f2b8c1e-9a4d-4c7e-8b1a-2d5e6f7a8b9c' OR '1'='1",
      "../../etc/passwd",
    ]) {
      assert.equal(isUuid(value), false, JSON.stringify(value));
    }
  });

  it("rejects non-strings", () => {
    for (const value of [undefined, null, 42, {}, ["3f2b8c1e-9a4d-4c7e-8b1a-2d5e6f7a8b9c"]]) {
      assert.equal(isUuid(value), false);
    }
  });
});
