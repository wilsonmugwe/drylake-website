/*
 * .env.example is generated from scripts/env-registry.mjs and must match it exactly, with names
 * only (no value after any "=").
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { renderEnvExample } from "../scripts/generate-env-example.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const committed = readFileSync(join(ROOT, ".env.example"), "utf8");

describe(".env.example", () => {
  it("matches the registry (run node scripts/generate-env-example.mjs)", () => {
    assert.equal(committed, renderEnvExample());
  });

  it("carries names only, never a value", () => {
    for (const line of committed.split("\n").filter((l) => l && !l.startsWith("#"))) {
      assert.match(line, /^[A-Z0-9_]+=$/, line);
    }
  });
});
