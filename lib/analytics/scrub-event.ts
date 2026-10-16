import type { BeforeSendEvent } from "@vercel/analytics";

import { isAnalyticsAllowed, type StorageLike } from "../privacy/cookie-preferences.ts";

/*
 * The one gate every Vercel Analytics event (page views AND custom events) passes through
 * before it leaves the browser. Three rules, in order:
 *   1. If the visitor switched analytics off (Security and Privacy page, lib/privacy), nothing is
 *      sent. Read live on each event, so the switch works without a reload.
 *   2. The manage page is not recorded at all: it is one customer's own appointment.
 *   3. The URL fragment is always removed. /consultation/manage#t=... carries a customer's
 *      appointment-management credential, and analytics must never receive it.
 * Pure (storage injectable) so tests/privacy-cookies.test.mjs and tests/consultation-booking.test.mjs
 * can exercise it without a browser.
 */
export function scrubAnalyticsEvent(event: BeforeSendEvent, storage?: StorageLike | null): BeforeSendEvent | null {
  if (!isAnalyticsAllowed(storage)) return null;

  try {
    const url = new URL(event.url);
    if (url.pathname.startsWith("/consultation/manage")) return null;
    url.hash = "";
    return { ...event, url: url.toString() };
  } catch {
    return null;
  }
}
