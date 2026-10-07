"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { anchorFromHash } from "./section-anchor";

/*
 * Deep-link arrival for the Workspace (polish brief 18). Mounted once in ClientShell, so it
 * survives client-side navigation between /client routes.
 *
 * On arrival at a URL with a section id (/client#recent-activity, /client/billing#to-pay),
 * whether by a full load, a refresh, a link from another Workspace page, a same-page section
 * link, or browser Back/Forward:
 *   1. wait for the section if the page is still streaming (the route's skeleton shows
 *      first, so the target can appear a moment after the URL changes);
 *   2. scroll it into view, smoothly only when motion is allowed; `scroll-margin-top` keeps
 *      it clear of the sticky mobile bar;
 *   3. move keyboard and screen-reader focus to the section's heading (tabIndex -1), so the
 *      next Tab continues from there and the heading is announced;
 *   4. briefly mark the section (a fading outline, none under reduced motion).
 * A section that does not exist (an empty workspace shows a welcome panel instead) falls
 * back to the page heading, never to nothing.
 *
 * Presentation only: it reads the URL and moves focus. It grants and hides nothing.
 */

const WAIT_MS = 6000;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* The element focus lands on: the section's visible heading, else the section itself. */
function focusTarget(section: HTMLElement): HTMLElement {
  const heading = section.matches("h1, h2, h3")
    ? section
    : section.querySelector<HTMLElement>("h2, h3");

  if (heading && !heading.classList.contains("sr-only")) {
    return heading;
  }

  return section;
}

function land(section: HTMLElement, smooth: boolean) {
  section.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "instant" });

  const target = focusTarget(section);

  if (!target.hasAttribute("tabindex")) {
    target.setAttribute("tabindex", "-1");
  }

  target.focus({ preventScroll: true });

  if (!prefersReducedMotion()) {
    section.setAttribute("data-arrived", "");
    window.setTimeout(() => section.removeAttribute("data-arrived"), 1600);
  }
}

/* No such section on this page: start the reader at the page heading instead. */
function landOnPage() {
  const heading = document.querySelector<HTMLElement>("#portal-main h1");
  const target = heading ?? document.getElementById("portal-main");

  if (!target) {
    return;
  }

  if (!target.hasAttribute("tabindex")) {
    target.setAttribute("tabindex", "-1");
  }

  target.focus({ preventScroll: true });
}

let pending: (() => void) | null = null;

/*
 * Bring a section into view and focus, waiting for it while the page streams. A newer call
 * cancels an older wait (rapid clicks never fight over the scroll position).
 */
export function revealSection(id: string, { smooth = false }: { smooth?: boolean } = {}) {
  pending?.();
  pending = null;

  const found = document.getElementById(id);

  if (found) {
    land(found, smooth && !prefersReducedMotion());
    return;
  }

  const root = document.getElementById("portal-main") ?? document.body;
  let timer = 0;

  const observer = new MutationObserver(() => {
    const element = document.getElementById(id);

    // The skeleton is gone and the section exists: land on it.
    if (element && !root.querySelector(".cp-skeleton")) {
      cleanup();
      land(element, false);
    }
  });

  function cleanup() {
    observer.disconnect();
    window.clearTimeout(timer);
    pending = null;
  }

  observer.observe(root, { childList: true, subtree: true });
  timer = window.setTimeout(() => {
    cleanup();

    const element = document.getElementById(id);

    if (element) {
      land(element, false);
    } else {
      landOnPage();
    }
  }, WAIT_MS);

  pending = cleanup;
}

/*
 * A same-page section link: record it in history (so Back returns to where the reader was)
 * and move there. Runs after the mobile drawer has closed and released its scroll lock
 * (two frames), because a scroll started under `overflow: hidden` lands short.
 */
export function goToSection(id: string) {
  if (window.location.hash !== `#${id}`) {
    window.history.pushState(null, "", `#${id}`);
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => revealSection(id, { smooth: true }));
  });
}

export default function WorkspaceAnchors() {
  const pathname = usePathname();

  // Full load, refresh, or arrival from another Workspace page with a section in the URL.
  useEffect(() => {
    const id = anchorFromHash(window.location.hash);

    if (id) {
      revealSection(id);
    }

    return () => {
      pending?.();
    };
  }, [pathname]);

  // Back / Forward between section entries, and a hash typed into the address bar.
  useEffect(() => {
    function onHistory() {
      const id = anchorFromHash(window.location.hash);

      if (id) {
        revealSection(id);
      }
    }

    window.addEventListener("popstate", onHistory);
    window.addEventListener("hashchange", onHistory);

    return () => {
      window.removeEventListener("popstate", onHistory);
      window.removeEventListener("hashchange", onHistory);
    };
  }, []);

  return null;
}
