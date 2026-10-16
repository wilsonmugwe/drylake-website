import { track } from "@vercel/analytics";

import { isAnalyticsAllowed, type StorageLike } from "../privacy/cookie-preferences.ts";

/*
 * The one typed place Drylake sends analytics events from (programme PR 4, 2026-10-16).
 * Same vendor and same call as the enquiry event (Vercel Analytics `track`); no new dependency.
 *
 * Events:
 *   enquiry_submitted  see lib/analytics/enquiry-event.ts (a form delivered)
 *   booking_started    a visitor chose their first consultation time on /consultation
 *   booking_completed  the server confirmed a consultation booking
 *   cta_click          a primary call to action was clicked (which one, and where)
 *
 * PRIVACY RULE, enforced here and by tests/analytics-events.test.mjs: every property is built by
 * a function below that maps its input onto a CLOSED SET, so a name, email, phone number, message
 * or URL can never reach the payload even if a caller passes one. Never add a free-text property.
 * Custom events need Vercel Pro; on Hobby the call is accepted and simply not reported.
 */

export type EventProperties = Record<string, string | number | boolean | null>;

/** Injectable for tests; defaults to Vercel Analytics' `track`. */
export type TrackImpl = (name: string, properties?: EventProperties) => void;

export const BOOKING_STARTED_EVENT = "booking_started";
export const BOOKING_COMPLETED_EVENT = "booking_completed";
export const CTA_CLICK_EVENT = "cta_click";

/**
 * Sends one event. Never throws: analytics must not break a booking or a click, so a missing or
 * blocked script (ad blockers, privacy extensions) is ignored.
 */
export function sendEvent(
  name: string,
  properties?: EventProperties,
  trackImpl: TrackImpl = track,
  storage?: StorageLike | null,
): void {
  // The visitor's analytics switch (lib/privacy). beforeSend enforces it too; this stops the call earlier.
  if (!isAnalyticsAllowed(storage)) return;
  try {
    trackImpl(name, properties);
  } catch {
    // Deliberately ignored, see above.
  }
}

/* ------------------------------------------------------------------ booking */

const METHODS: ReadonlySet<string> = new Set(["TEAMS", "PHONE"]);

export type BookingCompletedProperties = { method: "TEAMS" | "PHONE" | "unknown" };

/** The meeting method only; anything that is not exactly TEAMS or PHONE is "unknown". */
export function bookingCompletedProperties(method: unknown): BookingCompletedProperties {
  return { method: typeof method === "string" && METHODS.has(method) ? (method as "TEAMS" | "PHONE") : "unknown" };
}

export function trackBookingStarted(trackImpl?: TrackImpl): void {
  sendEvent(BOOKING_STARTED_EVENT, undefined, trackImpl);
}

export function trackBookingCompleted(method: unknown, trackImpl?: TrackImpl): void {
  sendEvent(BOOKING_COMPLETED_EVENT, bookingCompletedProperties(method), trackImpl);
}

/* ------------------------------------------------------------------ CTA clicks */

export const CTA_LOCATIONS = ["header", "mobile-menu", "hero", "closing", "footer", "location-page", "service-page", "page"] as const;
export type CtaLocation = (typeof CTA_LOCATIONS)[number];

export const CTA_TARGETS = ["booking", "contact", "phone", "email", "other"] as const;
export type CtaTarget = (typeof CTA_TARGETS)[number];

export type CtaClickProperties = { location: CtaLocation; target: CtaTarget };

const LOCATION_SET: ReadonlySet<string> = new Set(CTA_LOCATIONS);

/** True for a value that is one of the closed set of CTA location labels. */
export function isCtaLocation(value: unknown): value is CtaLocation {
  return typeof value === "string" && LOCATION_SET.has(value);
}

/** What the CTA leads to, from its href. The href itself (which could hold an address) is never sent. */
export function ctaTarget(href: unknown): CtaTarget {
  if (typeof href !== "string") return "other";
  const value = href.trim().toLowerCase();
  if (value.startsWith("tel:")) return "phone";
  if (value.startsWith("mailto:")) return "email";
  const path = value.replace(/^https?:\/\/[^/]+/, "").split(/[?#]/)[0];
  if (path === "/consultation" || path.startsWith("/consultation/")) return "booking";
  if (path === "/contact" || path.startsWith("/contact/")) return "contact";
  return "other";
}

export type CtaContext = {
  /** Value of the nearest data-cta-location attribute, if the page declared one. */
  explicit?: string | null;
  inMenu?: boolean;
  inHeader?: boolean;
  inFooter?: boolean;
  pathname?: string;
};

/**
 * Where on the site a CTA sits. An explicit, valid label wins; otherwise the surrounding landmark
 * decides, then the page type. Always returns a member of CTA_LOCATIONS.
 */
export function inferCtaLocation(context: CtaContext): CtaLocation {
  if (isCtaLocation(context.explicit)) return context.explicit;
  if (context.inMenu) return "mobile-menu";
  if (context.inHeader) return "header";
  if (context.inFooter) return "footer";
  const path = context.pathname ?? "";
  if (path === "/perth" || path.startsWith("/perth/") || path === "/locations" || path.startsWith("/locations/")) return "location-page";
  if (path.startsWith("/services/")) return "service-page";
  return "page";
}

export function ctaClickProperties(location: unknown, href: unknown): CtaClickProperties {
  return { location: isCtaLocation(location) ? location : "page", target: ctaTarget(href) };
}

export function trackCtaClick(location: unknown, href: unknown, trackImpl?: TrackImpl): void {
  sendEvent(CTA_CLICK_EVENT, ctaClickProperties(location, href), trackImpl);
}
