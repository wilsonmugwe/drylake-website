/*
 * RFC 9116 security.txt (portfolio standard; Ironbark sites carry one). Required fields present,
 * contact is a real Drylake mailbox, and Expires is in the future with at least 60 days left so
 * the file is renewed before scanners start treating it as stale.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const txt = readFileSync(join(ROOT, "public/.well-known/security.txt"), "utf8");
const field = (name) => txt.match(new RegExp(`^${name}: (.+)$`, "m"))?.[1];

describe("security.txt", () => {
  it("has a Contact on the company domain and a canonical URL", () => {
    assert.equal(field("Contact"), "mailto:hello@drylake.com.au");
    assert.equal(field("Canonical"), "https://drylake.com.au/.well-known/security.txt");
  });

  it("expires in the future, with at least 60 days left", () => {
    const expires = Date.parse(field("Expires"));
    assert.ok(Number.isFinite(expires));
    assert.ok(expires - Date.now() > 60 * 24 * 3600 * 1000, `renew security.txt, Expires ${field("Expires")}`);
  });
});
