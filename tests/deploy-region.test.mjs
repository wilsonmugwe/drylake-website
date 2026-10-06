/*
 * Server functions run in Sydney (syd1), next to the Supabase project (also Sydney).
 *
 * Without this file Vercel uses its default region (iad1, Washington DC): measured
 * 2026-10-06, an empty function answered Perth in 0.44-0.49 s against 0.20 s for an edge
 * page, and every Supabase query crossed the Pacific. Keeping client data processing in
 * Australia is also part of Drylake's data-sovereignty position, so this is guarded.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const config = JSON.parse(readFileSync(fileURLToPath(new URL("../vercel.json", import.meta.url)), "utf8"));

describe("deploy region", () => {
  it("every server function is pinned to Sydney only", () => {
    assert.deepEqual(config.regions, ["syd1"]);
  });

  it("no function overrides the region elsewhere in vercel.json", () => {
    for (const fn of Object.values(config.functions ?? {})) {
      assert.equal(fn.regions, undefined);
    }
  });
});
