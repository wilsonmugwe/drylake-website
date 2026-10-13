"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/*
 * Vercel Web Analytics with two privacy rules applied before anything leaves the browser:
 *   1. The URL fragment is always removed. /consultation/manage#t=... carries a customer's
 *      appointment-management credential, and analytics must never receive it.
 *   2. The manage page is not recorded at all: it is one customer's own appointment.
 * Pure function exported for tests (tests/consultation-booking.test.mjs).
 */
export function scrubAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    const url = new URL(event.url);
    if (url.pathname.startsWith("/consultation/manage")) return null;
    url.hash = "";
    return { ...event, url: url.toString() };
  } catch {
    return null;
  }
}

export default function SiteAnalytics() {
  return <Analytics beforeSend={scrubAnalyticsEvent} />;
}
