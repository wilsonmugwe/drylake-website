"use client";

import { useEffect } from "react";

import { inferCtaLocation, trackCtaClick } from "@/lib/analytics/events";

/*
 * One delegated click listener that reports `cta_click` for the site's primary calls to action,
 * so no navigation component needs touching. A CTA is a link or button that either uses the
 * canonical .btn-primary style (components/ui/PrimaryCta.tsx) or carries data-cta-location.
 *
 * Where it sits comes from lib/analytics/events.ts (inferCtaLocation): an explicit
 * data-cta-location label, else the surrounding dialog / <header> / <footer>, else the page type.
 * The payload is two closed-set labels (location, target). No text, href, name or address is sent.
 *
 * Not on /consultation/manage: that page is one customer's own appointment.
 */
export default function CtaClickTracker() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.button !== 0 || !(event.target instanceof Element)) return;
      const pathname = window.location.pathname;
      if (pathname.startsWith("/consultation/manage")) return;

      const cta = event.target.closest("a, button");
      if (!cta || !(cta.matches(".btn-primary") || cta.closest("[data-cta-location]") !== null)) return;

      const location = inferCtaLocation({
        explicit: cta.closest("[data-cta-location]")?.getAttribute("data-cta-location"),
        inMenu: cta.closest('[role="dialog"]') !== null,
        inHeader: cta.closest("header") !== null,
        inFooter: cta.closest("footer") !== null,
        pathname,
      });
      trackCtaClick(location, cta.getAttribute("href"));
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
