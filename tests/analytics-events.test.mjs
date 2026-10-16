/*
 * Typed analytics events (programme PR 4): booking_started, booking_completed, cta_click, and the
 * shared sender the enquiry event now uses. The load-bearing property is privacy: whatever a caller
 * passes, the payload holds only closed-set labels, never an email, name, phone number or URL.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  BOOKING_COMPLETED_EVENT,
  BOOKING_STARTED_EVENT,
  CTA_CLICK_EVENT,
  CTA_LOCATIONS,
  CTA_TARGETS,
  bookingCompletedProperties,
  ctaClickProperties,
  ctaTarget,
  inferCtaLocation,
  isCtaLocation,
  sendEvent,
  trackBookingCompleted,
  trackBookingStarted,
  trackCtaClick,
} from "../lib/analytics/events.ts";
import { ENQUIRY_EVENT, trackEnquirySubmitted } from "../lib/analytics/enquiry-event.ts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const read = (path) => readFileSync(join(ROOT, path), "utf8");

const PII = ["jane.citizen@example.com", "Jane Citizen", "0433 448 000", "+61433448000", "mailto:jane@example.com", "tel:0433448000", "https://example.com/?email=a@b.co"];
const looksPersonal = (value) => typeof value === "string" && (/@/.test(value) || /\d{6,}/.test(value.replace(/\D/g, "")) || /\s/.test(value) || /^https?:/.test(value));

function capture(fn) {
  const calls = [];
  fn((name, properties) => calls.push({ name, properties }));
  return calls;
}

describe("booking events", () => {
  it("booking_started sends the event name and no properties", () => {
    assert.deepEqual(capture((t) => trackBookingStarted(t)), [{ name: BOOKING_STARTED_EVENT, properties: undefined }]);
    assert.equal(BOOKING_STARTED_EVENT, "booking_started");
  });

  it("booking_completed carries only the meeting method", () => {
    assert.deepEqual(capture((t) => trackBookingCompleted("TEAMS", t)), [{ name: "booking_completed", properties: { method: "TEAMS" } }]);
    assert.deepEqual(bookingCompletedProperties("PHONE"), { method: "PHONE" });
    assert.equal(BOOKING_COMPLETED_EVENT, "booking_completed");
  });

  it("anything that is not exactly TEAMS or PHONE becomes 'unknown'", () => {
    for (const value of [...PII, "", undefined, null, 42, {}]) assert.deepEqual(bookingCompletedProperties(value), { method: "unknown" });
  });

  it("no personal data can reach a booking payload, whatever is passed in", () => {
    for (const value of PII) {
      const calls = capture((t) => trackBookingCompleted(value, t));
      for (const call of calls) for (const v of Object.values(call.properties ?? {})) assert.ok(!looksPersonal(v), String(v));
    }
  });
});

describe("cta_click", () => {
  it("sends a closed-set location and target", () => {
    assert.deepEqual(capture((t) => trackCtaClick("hero", "/consultation", t)), [{ name: CTA_CLICK_EVENT, properties: { location: "hero", target: "booking" } }]);
    assert.equal(CTA_CLICK_EVENT, "cta_click");
  });

  it("an unknown location label falls back to 'page'", () => {
    for (const value of [...PII, "", undefined, null, "HERO", "Hero "]) assert.equal(ctaClickProperties(value, "/x").location, "page");
    for (const value of CTA_LOCATIONS) assert.equal(isCtaLocation(value), true);
  });

  it("the target is derived from the href and never echoes it", () => {
    assert.equal(ctaTarget("/consultation"), "booking");
    assert.equal(ctaTarget("https://drylake.com.au/consultation?x=1"), "booking");
    assert.equal(ctaTarget("/contact"), "contact");
    assert.equal(ctaTarget("tel:0433448000"), "phone");
    assert.equal(ctaTarget("mailto:hello@drylake.com.au"), "email");
    assert.equal(ctaTarget("/services/websites"), "other");
    assert.equal(ctaTarget(null), "other");
  });

  it("no href, address or number can reach a cta_click payload", () => {
    for (const location of PII) {
      for (const href of PII) {
        const { location: l, target } = ctaClickProperties(location, href);
        assert.ok(CTA_LOCATIONS.includes(l));
        assert.ok(CTA_TARGETS.includes(target));
        assert.ok(!looksPersonal(l) && !looksPersonal(target));
      }
    }
    assert.deepEqual(Object.keys(ctaClickProperties("footer", "mailto:a@b.co")).sort(), ["location", "target"]);
  });

  it("location inference: explicit label, then menu, header, footer, then page type", () => {
    assert.equal(inferCtaLocation({ explicit: "hero", inHeader: true, pathname: "/perth" }), "hero");
    assert.equal(inferCtaLocation({ explicit: "not-a-label", inHeader: true }), "header");
    assert.equal(inferCtaLocation({ inMenu: true, inHeader: true }), "mobile-menu");
    assert.equal(inferCtaLocation({ inHeader: true, pathname: "/perth" }), "header");
    assert.equal(inferCtaLocation({ inFooter: true }), "footer");
    assert.equal(inferCtaLocation({ pathname: "/perth" }), "location-page");
    assert.equal(inferCtaLocation({ pathname: "/locations/fremantle" }), "location-page");
    assert.equal(inferCtaLocation({ pathname: "/services/websites" }), "service-page");
    assert.equal(inferCtaLocation({ pathname: "/" }), "page");
    assert.equal(inferCtaLocation({}), "page");
    assert.ok(CTA_LOCATIONS.includes(inferCtaLocation({ explicit: PII[0], pathname: PII[1] })));
  });
});

describe("shared sender", () => {
  it("never throws when analytics is blocked or missing", () => {
    const boom = () => {
      throw new Error("blocked");
    };
    assert.doesNotThrow(() => sendEvent("x", {}, boom));
    assert.doesNotThrow(() => trackBookingStarted(boom));
    assert.doesNotThrow(() => trackBookingCompleted("TEAMS", boom));
    assert.doesNotThrow(() => trackCtaClick("hero", "/", boom));
  });

  it("the enquiry event still goes through it unchanged", () => {
    assert.deepEqual(capture((t) => trackEnquirySubmitted("Manual processes", t)), [{ name: ENQUIRY_EVENT, properties: { surface: "public", projectType: "Manual processes" } }]);
    assert.doesNotThrow(() => trackEnquirySubmitted("Other", () => { throw new Error("blocked"); }));
  });
});

describe("wiring", () => {
  const booking = read("components/consultations/ConsultationBooking.tsx");

  it("booking_completed fires once, in the confirmed branch, with only the method", () => {
    assert.equal(booking.split("trackBookingCompleted(").length - 1, 1);
    const ok = booking.indexOf("if (result.ok) {");
    const call = booking.indexOf("trackBookingCompleted(details.method)");
    const done = booking.indexOf('setStep("done")');
    assert.ok(ok > 0 && call > ok && done > call);
  });

  it("booking_started fires once per attempt, on the first chosen time", () => {
    assert.equal(booking.split("trackBookingStarted(").length - 1, 1);
    assert.match(booking, /if \(!startTracked\.current\) \{\s+startTracked\.current = true;\s+trackBookingStarted\(\);/);
    assert.match(booking, /startTracked\.current = false;/); // a second booking in the same visit counts again
  });

  it("the manage page and its token are never tracked", () => {
    assert.doesNotMatch(read("components/consultations/ManageConsultation.tsx"), /analytics\/events/);
    assert.match(read("components/analytics/CtaClickTracker.tsx"), /pathname\.startsWith\("\/consultation\/manage"\)/);
    assert.match(read("components/analytics/SiteAnalytics.tsx"), /beforeSend=\{scrubAnalyticsEvent\}/);
  });

  it("the tracker is mounted once, from SiteAnalytics, and reads only closed-set inputs", () => {
    assert.match(read("components/analytics/SiteAnalytics.tsx"), /<CtaClickTracker \/>/);
    const tracker = read("components/analytics/CtaClickTracker.tsx");
    assert.match(tracker, /trackCtaClick\(location, cta\.getAttribute\("href"\)\)/);
    assert.doesNotMatch(tracker, /textContent|innerText|innerHTML|value/);
  });

  it("PrimaryCta exposes the location label; hero and closing CTAs declare theirs", () => {
    assert.match(read("components/ui/PrimaryCta.tsx"), /data-cta-location=\{location\}/);
    assert.match(read("components/sections/Hero.tsx"), /location="hero"/);
    assert.match(read("components/sections/ContactCTA.tsx"), /location="closing"/);
  });
});
