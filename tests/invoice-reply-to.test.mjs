/*
 * Invoice emails send from an address with no mailbox (billing@drylake.com.au, verified
 * 2026-10-08: Exchange "billing wasn't found"). Replies must go to a monitored inbox instead.
 * node:test, source-level like the rest of tests/.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

describe("invoice email replies reach a person", () => {
  it("every invoice send sets replyTo to the monitored contact address", () => {
    const src = read("lib/invoices/invoice-notifications.ts");
    const sends = src.match(/emails\.send\(\{[\s\S]*?\}\)/g) ?? [];
    assert.ok(sends.length >= 1);
    for (const send of sends) assert.match(send, /replyTo: CONTACT_EMAIL,/);
    assert.match(src, /import \{ CONTACT_EMAIL \} from "@\/lib\/site";/);
  });

  it("the contact address is a real Drylake mailbox, not the send-only billing address", () => {
    const email = read("lib/site.ts").match(/CONTACT_EMAIL = "([^"]+)"/)[1];
    assert.equal(email, "hello@drylake.com.au");
  });
});
