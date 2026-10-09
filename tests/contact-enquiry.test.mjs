/*
 * Website enquiries must never arrive labelled as billing mail (2026-10-08: they shared the
 * invoice sender's display name via EMAIL_FROM), and prospects are never asked about a budget.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { ENQUIRY_SENDER_NAME, enquiryFromAddress, senderAddress } from "../lib/email/contact-enquiry-sender.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

describe("enquiry sender identity", () => {
  it("keeps the verified address but replaces the billing display name", () => {
    assert.equal(
      enquiryFromAddress({ EMAIL_FROM: "Drylake Billing <billing@drylake.com.au>" }),
      `${ENQUIRY_SENDER_NAME} <billing@drylake.com.au>`
    );
    assert.doesNotMatch(enquiryFromAddress({ EMAIL_FROM: "Drylake billing <a@drylake.com.au>" }), /billing </i);
  });

  it("accepts a bare address and prefers CONTACT_EMAIL_FROM when set", () => {
    assert.equal(enquiryFromAddress({ EMAIL_FROM: "hello@drylake.com.au" }), `${ENQUIRY_SENDER_NAME} <hello@drylake.com.au>`);
    assert.equal(
      enquiryFromAddress({ EMAIL_FROM: "Drylake Billing <b@drylake.com.au>", CONTACT_EMAIL_FROM: "Drylake <hello@drylake.com.au>" }),
      "Drylake <hello@drylake.com.au>"
    );
  });

  it("fails loudly when no usable sender is configured", () => {
    assert.throws(() => enquiryFromAddress({}), /Missing EMAIL_FROM/);
    assert.throws(() => enquiryFromAddress({ EMAIL_FROM: "Drylake Billing" }), /Missing EMAIL_FROM/);
    assert.equal(senderAddress("not an address"), null);
  });

  it("the enquiry email uses its own sender, the invoice email keeps the shared one", () => {
    assert.match(read("lib/email/contact-enquiry.ts"), /from: enquiryFromAddress\(\{ CONTACT_EMAIL_FROM: process\.env\.CONTACT_EMAIL_FROM, EMAIL_FROM: process\.env\.EMAIL_FROM \}\)/);
    assert.doesNotMatch(read("lib/email/contact-enquiry.ts"), /getEmailFromAddress/);
    assert.match(read("lib/invoices/invoice-notifications.ts"), /from: getEmailFromAddress\(\)/);
  });
});

describe("no budget wording on the enquiry path", () => {
  it("form, API and email speak of the kind of help, not a budget", () => {
    for (const file of ["components/forms/ProjectForm.tsx", "app/api/contact/route.ts", "lib/email/contact-enquiry.ts"]) {
      const code = read(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
      assert.doesNotMatch(code, /budget/i, file);
    }
    assert.match(read("lib/email/contact-enquiry-email.ts"), /\["Help wanted", enquiry\.helpType/);
  });
});
