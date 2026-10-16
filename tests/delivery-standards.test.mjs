/*
 * The /faq answers describe Drylake's delivery standard (docs/delivery/client-delivery-standards.md).
 * These tests keep the public claims, the standard and the site's own test widths in step.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { FAQ_ITEMS } from "../lib/faqs.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const standard = readFileSync(join(ROOT, "docs/delivery/client-delivery-standards.md"), "utf8");
const helpers = readFileSync(join(ROOT, "tests/e2e/helpers.ts"), "utf8");
const answer = (id) => FAQ_ITEMS.find((item) => item.id === id).answer;

describe("delivery standard backs the FAQ claims", () => {
  it("lists exactly the e2e WIDTH_MATRIX widths", () => {
    const matrix = helpers.match(/WIDTH_MATRIX = \[([^\]]+)\]/)[1].replace(/\s/g, "");
    assert.ok(standard.replace(/\s/g, "").includes(`\`${matrix.replace(/,/g, ",")}\``), "widths differ from WIDTH_MATRIX");
  });

  it("the phones answer states the smallest tested width and that testing is part of delivery", () => {
    const smallest = helpers.match(/WIDTH_MATRIX = \[(\d+)/)[1];
    assert.match(answer("web-mobile"), new RegExp(`${smallest} pixels`));
    assert.match(standard, /Responsive testing \(required, every delivery\)/);
  });

  it("Google Search Console is an available service, not a universal deliverable", () => {
    assert.match(answer("web-google"), /Search Console for your business is available/);
    assert.doesNotMatch(answer("web-google"), /Search Console set up and/);
    assert.match(standard, /available service, not a default deliverable/);
  });

  it("the AI privacy answer is qualified and matches the switched-off assistant", () => {
    const ai = answer("ai-privacy");
    assert.match(ai, /assistant is switched off/);
    assert.match(ai, /Some providers offer Australian hosting for some models/);
    assert.doesNotMatch(ai, /never|always|guarantee|no data leaves Australia/i);
  });
});
