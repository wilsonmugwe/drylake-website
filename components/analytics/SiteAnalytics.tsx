"use client";

import { Analytics } from "@vercel/analytics/next";

import CtaClickTracker from "@/components/analytics/CtaClickTracker";
import { scrubAnalyticsEvent } from "@/lib/analytics/scrub-event";

/*
 * Vercel Web Analytics (cookieless), with every event passed through scrubAnalyticsEvent
 * (lib/analytics/scrub-event.ts) before it leaves the browser: it honours the visitor's
 * analytics switch on the Security and Privacy page, skips the private manage page and strips
 * the URL fragment. beforeSend covers page views and custom events alike.
 */
export default function SiteAnalytics() {
  return (
    <>
      <Analytics beforeSend={scrubAnalyticsEvent} />
      <CtaClickTracker />
    </>
  );
}
