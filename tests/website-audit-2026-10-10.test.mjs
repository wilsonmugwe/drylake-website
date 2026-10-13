/*
 * Website audit, SEO and production hardening (2026-10-10). One regression test per confirmed
 * defect fixed in this PR, so none of them can quietly return. Runs under `npm test`.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { PUBLIC_PAGES, pageLastUpdated } from "../lib/discovery/entity.ts";
import { SERVICES } from "../lib/discovery/entity.ts";
import { PAGE_SEO } from "../lib/seo-pages.ts";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const read = (path) => readFileSync(join(root, path), "utf8");

describe("legal pages: the visible date is the sitemap date", () => {
  it("formats lastModified as a plain date", () => {
    const privacy = PUBLIC_PAGES.find((page) => page.path === "/privacy");
    const [y, m, d] = privacy.lastModified.split("-").map(Number);
    assert.match(pageLastUpdated("/privacy"), new RegExp(`^${d} [A-Z][a-z]+ ${y}$`));
    assert.equal(pageLastUpdated("/terms").endsWith("2026"), true);
    assert.equal(m >= 1 && m <= 12, true);
  });

  it("refuses a page that is not public rather than printing a wrong date", () => {
    assert.throws(() => pageLastUpdated("/admin"));
  });

  for (const path of ["app/privacy/page.tsx", "app/terms/page.tsx"]) {
    it(`${path} has no hard-coded "Last updated" date`, () => {
      const page = read(path);
      assert.match(page, /Last updated: \{pageLastUpdated\(/);
      assert.doesNotMatch(page, /Last updated: \d/);
    });
  }
});

describe("Privacy Policy covers what the site actually does (APP 1.4)", () => {
  const page = read("app/privacy/page.tsx");

  it("names every provider that handles personal information", () => {
    for (const provider of ["Vercel", "Clerk", "Supabase", "Stripe", "Resend", "Cloudflare", "Microsoft 365"]) {
      assert.ok(page.includes(provider), provider);
    }
  });

  it("states overseas disclosure with a likely country", () => {
    assert.match(page, /Overseas disclosure/);
    assert.match(page, /United States/);
  });

  it("covers cookies, AI, Workspace, payments, access, correction and complaints", () => {
    for (const topic of ["Cookies", "Artificial intelligence", "Drylake Workspace", "card", "Access and correction", "oaic.gov.au"]) {
      assert.ok(page.includes(topic), topic);
    }
  });

  it("publishes no unverified retention period or data-residency claim", () => {
    assert.doesNotMatch(page, /\b\d+\s+(days|months|years)\b/i);
    assert.doesNotMatch(page, /stored (only )?in Australia|never leaves Australia/i);
  });

  it("uses the shared business constants, never typed-in identity details", () => {
    assert.match(page, /DRYLAKE_BUSINESS\.legalName/);
    assert.match(page, /BUSINESS_PHONE\.display/);
    // 2026-10-13: the street address was a residence and is gone; city-level location only.
    assert.match(page, /PUBLIC_LOCATION/);
    assert.doesNotMatch(page, /POSTAL_ADDRESS/);
  });
});

describe("enquiry form carries a collection notice (APP 5)", () => {
  it("links the Privacy Policy next to the submit button", () => {
    const form = read("components/forms/ProjectForm.tsx");
    assert.match(form, /data-testid="enquiry-privacy-notice"/);
    assert.match(form, /<Link href="\/privacy"/);
  });
});

describe("marketing does not promise services that are scope-dependent", () => {
  it("backups, monitoring and recovery are described as agreed per project", () => {
    const copy = read("components/sections/Production.tsx") + read("lib/discovery/services.ts");
    assert.doesNotMatch(copy, /Data is backed up, so/);
    assert.doesNotMatch(copy, /planned from the first release/);
    assert.match(copy, /tailored to your project and agreed scope/);
  });
});

describe("search titles", () => {
  it("the homepage title names Perth and the hero h1 says what Drylake builds", () => {
    assert.match(PAGE_SEO.home.title, /Perth/);
    const hero = read("components/sections/Hero.tsx");
    // Plain-English headline (2026-10-13), inside the page's only h1.
    assert.match(hero, /<h1[^>]*>[\s\S]*We build websites, business software and automations that make[\s\S]*running your business easier\.[\s\S]*<\/h1>/);
  });

  it("every service with a Perth FAQ answers it with a fact the page states", () => {
    const perthFaqs = SERVICES.flatMap((service) => service.faqs).filter((faq) => /Perth/.test(faq.question));
    assert.ok(perthFaqs.length >= 4, String(perthFaqs.length));
    for (const faq of perthFaqs) assert.match(faq.answer, /Perth/);
  });
});

describe("Clerk webhook responses are never cached", () => {
  it("its json() helper sends Cache-Control: no-store", () => {
    assert.match(read("app/api/clerk/webhook/route.ts"), /"Cache-Control": "no-store"/);
  });
});
