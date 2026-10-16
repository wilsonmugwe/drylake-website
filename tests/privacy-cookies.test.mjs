/*
 * Privacy workstream (2026-10-16): cookie and storage preferences, the analytics opt-out, the
 * single processor list, the Security and Privacy page and its links.
 *
 * Load-bearing properties:
 *   - switching analytics off makes beforeSend (page views AND custom events) drop everything;
 *   - a missing or corrupt stored value never breaks the site and never turns analytics off by
 *     accident (the default is "on" only because Vercel Web Analytics is cookieless);
 *   - the Privacy Policy and the Security and Privacy page render the SAME processor list;
 *   - no unsupported security claim, no em dash, on any visitor-facing source file.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
  clearPreferences,
  isAnalyticsAllowed,
  parsePreferences,
  readPreferences,
  savePreferences,
  serialisePreferences,
} from "../lib/privacy/cookie-preferences.ts";
import { COOKIE_CATEGORIES, STORAGE_INVENTORY, inventoryFor } from "../lib/privacy/storage-inventory.ts";
import { PROCESSORS, processorRegionText } from "../lib/privacy/processors.ts";
import { PUBLIC_PAGES, pageLastUpdated } from "../lib/discovery/entity.ts";
import { llmsText } from "../lib/discovery/llms.ts";
import { PAGE_SEO } from "../lib/seo-pages.ts";
import { scrubAnalyticsEvent } from "../lib/analytics/scrub-event.ts";
import { sendEvent } from "../lib/analytics/events.ts";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const read = (path) => readFileSync(join(ROOT, path), "utf8");

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
    dump: () => Object.fromEntries(map),
  };
}

const throwingStorage = {
  getItem() {
    throw new Error("blocked");
  },
  setItem() {
    throw new Error("blocked");
  },
  removeItem() {
    throw new Error("blocked");
  },
};

const PAGE_VIEW = { type: "pageview", url: "https://drylake.com.au/about#top" };
const CUSTOM = { type: "event", url: "https://drylake.com.au/consultation", name: "cta_click", data: { location: "hero", target: "booking" } };

describe("preference store", () => {
  it("defaults to analytics on (cookieless, no personal data) when nothing is stored", () => {
    assert.deepEqual(readPreferences(memoryStorage()), { analytics: true });
    assert.deepEqual(DEFAULT_PREFERENCES, { analytics: true });
  });

  it("honours a Global Privacy Control signal until the visitor chooses", () => {
    assert.deepEqual(readPreferences(memoryStorage(), { gpc: true }), { analytics: false });
    const chosen = memoryStorage();
    savePreferences({ analytics: true }, chosen);
    assert.deepEqual(readPreferences(chosen, { gpc: true }), { analytics: true });
  });

  it("round-trips a saved choice", () => {
    const storage = memoryStorage();
    assert.equal(savePreferences({ analytics: false }, storage), true);
    assert.deepEqual(readPreferences(storage), { analytics: false });
    assert.equal(isAnalyticsAllowed(storage), false);
    savePreferences({ analytics: true }, storage);
    assert.equal(isAnalyticsAllowed(storage), true);
  });

  it("stores one small versioned JSON value and nothing else", () => {
    const storage = memoryStorage();
    savePreferences({ analytics: false }, storage);
    assert.deepEqual(Object.keys(storage.dump()), [PREFERENCES_STORAGE_KEY]);
    assert.deepEqual(JSON.parse(serialisePreferences({ analytics: false })), { v: 1, analytics: false });
  });

  it("treats corrupt, foreign or wrong-typed values as 'no choice made'", () => {
    for (const raw of [null, "", "not json", "[]", "null", '{"v":1}', '{"v":1,"analytics":"no"}', '{"v":99,"analytics":false}', '{"analytics":false}']) {
      assert.deepEqual(parsePreferences(raw), { analytics: true }, String(raw));
    }
  });

  it("clearing returns to the default", () => {
    const storage = memoryStorage();
    savePreferences({ analytics: false }, storage);
    clearPreferences(storage);
    assert.deepEqual(storage.dump(), {});
    assert.equal(isAnalyticsAllowed(storage), true);
  });

  it("never throws when storage is blocked (private mode, disabled site data)", () => {
    assert.deepEqual(readPreferences(throwingStorage), { analytics: true });
    assert.equal(savePreferences({ analytics: false }, throwingStorage), false);
    assert.doesNotThrow(() => clearPreferences(throwingStorage));
    assert.equal(isAnalyticsAllowed(throwingStorage), true);
  });

  it("outside a browser (no storage at all) analytics stays at the default", () => {
    assert.equal(isAnalyticsAllowed(), true);
  });
});

describe("analytics opt-out (beforeSend)", () => {
  const off = memoryStorage({ [PREFERENCES_STORAGE_KEY]: serialisePreferences({ analytics: false }) });
  const on = memoryStorage();

  it("drops page views and custom events when analytics is off", () => {
    assert.equal(scrubAnalyticsEvent(PAGE_VIEW, off), null);
    assert.equal(scrubAnalyticsEvent(CUSTOM, off), null);
  });

  it("still scrubs the URL fragment and drops the manage page when analytics is on", () => {
    assert.equal(scrubAnalyticsEvent(PAGE_VIEW, on).url, "https://drylake.com.au/about");
    assert.equal(scrubAnalyticsEvent({ ...PAGE_VIEW, url: "https://drylake.com.au/consultation/manage#t=secret" }, on), null);
  });

  it("is read live, so a switch takes effect without a reload", () => {
    const storage = memoryStorage();
    assert.notEqual(scrubAnalyticsEvent(PAGE_VIEW, storage), null);
    savePreferences({ analytics: false }, storage);
    assert.equal(scrubAnalyticsEvent(PAGE_VIEW, storage), null);
  });

  it("sendEvent does not call track when analytics is off", () => {
    const calls = [];
    sendEvent("cta_click", { location: "hero" }, (name) => calls.push(name), off);
    assert.deepEqual(calls, []);
    sendEvent("cta_click", { location: "hero" }, (name) => calls.push(name), on);
    assert.deepEqual(calls, ["cta_click"]);
  });

  it("the layout still mounts the beforeSend-guarded Analytics component", () => {
    assert.match(read("components/analytics/SiteAnalytics.tsx"), /<Analytics beforeSend=\{scrubAnalyticsEvent\} \/>/);
    assert.match(read("components/analytics/SiteAnalytics.tsx"), /from "@\/lib\/analytics\/scrub-event"/);
  });
});

describe("storage inventory (what the audit found)", () => {
  it("uses the four standard categories and every entry belongs to one", () => {
    assert.deepEqual([...COOKIE_CATEGORIES.map((c) => c.id)], ["essential", "analytics", "functional", "marketing"]);
    for (const entry of STORAGE_INVENTORY) {
      assert.ok(COOKIE_CATEGORIES.some((c) => c.id === entry.category), entry.name);
      for (const field of ["name", "provider", "purpose", "duration", "kind"]) assert.ok(entry[field], `${entry.name} ${field}`);
    }
  });

  it("lists no marketing or advertising storage, because none exists", () => {
    assert.deepEqual(inventoryFor("marketing"), []);
  });

  it("lists the preference entry as functional and analytics as cookieless", () => {
    const preference = STORAGE_INVENTORY.find((e) => e.name === PREFERENCES_STORAGE_KEY);
    assert.equal(preference.category, "functional");
    assert.equal(preference.kind, "localStorage");
    for (const entry of inventoryFor("analytics")) assert.equal(entry.kind, "none", entry.name);
  });

  it("the sign-in cookies are essential and attributed to their provider", () => {
    const clerk = STORAGE_INVENTORY.filter((e) => e.provider === "Clerk");
    assert.ok(clerk.length >= 3);
    for (const entry of clerk) assert.equal(entry.category, "essential", entry.name);
  });
});

describe("processor list: one source of truth", () => {
  it("names the providers the code actually uses, and no AI service", () => {
    const names = PROCESSORS.map((p) => p.name);
    for (const expected of ["Vercel", "Supabase", "Clerk", "Resend", "Cloudflare Turnstile", "Stripe", "Microsoft 365"]) {
      assert.ok(names.includes(expected), expected);
    }
    assert.equal(new Set(names).size, names.length);
  });

  it("states a region only where it is known, otherwise says so", () => {
    for (const processor of PROCESSORS) {
      const text = processorRegionText(processor);
      assert.ok(text.length > 5, processor.name);
      if (processor.region) assert.doesNotMatch(text, /not stated/i, processor.name);
      else assert.match(text, /not stated/i, processor.name);
    }
    assert.match(processorRegionText(PROCESSORS.find((p) => p.name === "Clerk")), /United States/);
    assert.match(processorRegionText(PROCESSORS.find((p) => p.name === "Supabase")), /Sydney/);
  });

  it("the Privacy Policy and the Security and Privacy page render the same list component", () => {
    for (const file of ["app/privacy/page.tsx", "app/security-privacy/page.tsx"]) {
      const source = read(file);
      assert.match(source, /import ProcessorList from "@\/components\/privacy\/ProcessorList"/, file);
      assert.match(source, /<ProcessorList/, file);
      // The list itself must not be typed out again on a page.
      for (const processor of PROCESSORS) assert.ok(!source.includes(`<li>${processor.name}`), `${file} hand-lists ${processor.name}`);
    }
    assert.match(read("components/privacy/ProcessorList.tsx"), /PROCESSORS/);
  });

  it("built pages, when a production build exists, both carry every processor name", (t) => {
    const dir = join(ROOT, ".next/server/app");
    if (!existsSync(join(dir, "security-privacy.html")) || !existsSync(join(dir, "privacy.html"))) return t.skip("no build with both pages");
    for (const file of ["privacy.html", "security-privacy.html"]) {
      const html = readFileSync(join(dir, file), "utf8");
      for (const processor of PROCESSORS) assert.ok(html.includes(processor.name), `${file} ${processor.name}`);
    }
  });
});

describe("Security and Privacy page wiring", () => {
  it("is a public page in the sitemap source with a visible date from the same source", () => {
    assert.ok(PUBLIC_PAGES.some((page) => page.path === "/security-privacy"));
    assert.match(pageLastUpdated("/security-privacy"), /^\d+ [A-Z][a-z]+ 2026$/);
    assert.match(read("app/security-privacy/page.tsx"), /Last updated: \{pageLastUpdated\("\/security-privacy"\)\}/);
  });

  it("has its own SEO entry and share card", () => {
    assert.equal(PAGE_SEO.securityPrivacy.path, "/security-privacy");
    assert.ok(existsSync(join(ROOT, "public", PAGE_SEO.securityPrivacy.image)), "share card exists");
    assert.notEqual(PAGE_SEO.securityPrivacy.image, PAGE_SEO.privacy.image);
  });

  it("is listed in llms.txt", () => {
    assert.match(llmsText(), /\[Security and privacy\]\(https:\/\/drylake\.com\.au\/security-privacy\)/);
  });

  it("is linked from the policy, the contact form and the consultation form", () => {
    assert.match(read("app/privacy/page.tsx"), /href="\/security-privacy/);
    assert.match(read("components/forms/ProjectForm.tsx"), /href="\/security-privacy/);
    assert.match(read("components/consultations/ConsultationBooking.tsx"), /href="\/security-privacy/);
    assert.match(read("app/consultation/page.tsx"), /href="\/security-privacy"/);
  });

  it("anchors the preference control so a footer link can point straight at it", () => {
    assert.match(read("app/security-privacy/page.tsx"), /id="cookie-settings"/);
  });

  it("the policy states the preference entry and links the control", () => {
    const policy = read("app/privacy/page.tsx");
    assert.match(policy, /\/security-privacy#cookie-settings/);
    assert.match(read("lib/privacy/storage-inventory.ts"), /drylake-privacy-preferences|PREFERENCES_STORAGE_KEY/);
  });
});

describe("copy rules on every visitor-facing file of this workstream", () => {
  const FILES = [
    "app/security-privacy/page.tsx",
    "app/privacy/page.tsx",
    "components/privacy/ProcessorList.tsx",
    "components/privacy/CookieSettings.tsx",
    "lib/privacy/processors.ts",
    "lib/privacy/storage-inventory.ts",
    "lib/privacy/cookie-preferences.ts",
  ];
  const UNSUPPORTED = /bank-grade|military-grade|certified|ISO 27001|SOC 2|fully encrypted|100% secure/i;

  for (const file of FILES) {
    it(`${file}: no unsupported security claim, no em dash`, () => {
      const source = read(file);
      assert.doesNotMatch(source, UNSUPPORTED);
      assert.ok(!source.includes("—"), "em dash");
    });
  }

  it("no competitor names", () => {
    const competitors = /\b(AWS Amplify|Netlify|Auth0|Okta|Firebase|Mailchimp|SendGrid|Postmark)\b/;
    for (const file of FILES) assert.doesNotMatch(read(file), competitors, file);
  });

  it("the page asserts at-rest encryption only as the provider's own documented measure", () => {
    const source = read("app/security-privacy/page.tsx");
    assert.doesNotMatch(source, /\bwe encrypt\b/i);
    assert.match(source, /Supabase documents|provider documents|documented by/i);
  });

  it("the page promises no response time or breach SLA beyond the shared constant", () => {
    const source = read("app/security-privacy/page.tsx");
    assert.doesNotMatch(source, /within \d+ (hours|days)|24 hours|72 hours/i);
  });
});

describe("no street address anywhere in the new files", () => {
  const STREET = /\b\d{1,4}\s+[A-Z][a-z]+\s+(Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Way|Place|Pl|Terrace|Crescent)\b/;
  it("passes", () => {
    for (const file of ["app/security-privacy/page.tsx", "lib/privacy/processors.ts", "components/privacy/CookieSettings.tsx"]) {
      assert.doesNotMatch(read(file), STREET, file);
    }
  });
});

describe("source tree sanity", () => {
  it("lib/privacy files stay small and framework free", () => {
    const dir = join(ROOT, "lib/privacy");
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (!statSync(path).isFile() || !name.endsWith(".ts")) continue;
      const source = readFileSync(path, "utf8");
      assert.ok(source.split("\n").length < 220, name);
      assert.doesNotMatch(source, /from "(react|next)/, name);
    }
  });
});
