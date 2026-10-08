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

/* Next 16 keeps a load-time hash in its route cache: see ANCHOR_STASH_SCRIPT (section-anchor.ts). */
declare global {
  interface Window {
    __dlAnchor?: string;
  }
}

/* A section is ready once it is laid out (not still inside React's hidden streaming slot). */
function rendered(element: HTMLElement | null): element is HTMLElement {
  return (
    element !== null &&
    element.getClientRects().length > 0 &&
    !document.querySelector("#portal-main .cp-skeleton")
  );
}

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

function focusSection(section: HTMLElement) {
  const target = focusTarget(section);

  if (!target.hasAttribute("tabindex")) {
    target.setAttribute("tabindex", "-1");
  }

  target.focus({ preventScroll: true });
}

function land(section: HTMLElement, smooth: boolean) {
  section.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "instant" });
  focusSection(section);

  // React can still be settling a just-streamed boundary, which drops focus to <body> a few
  // milliseconds later (measured locally). Re-apply ONCE per check, and only if nothing
  // else has taken focus since: a reader who has already moved on is never pulled back.
  const id = section.id;
  for (const delay of [60, 250]) {
    window.setTimeout(() => {
      const current = id ? document.getElementById(id) : null;

      if (current && (document.activeElement === document.body || document.activeElement === null)) {
        focusSection(current);
      }
    }, delay);
  }

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

// Module-level on purpose: there is one Workspace frame per document, and a newer reveal must
// cancel an older wait even when it comes from goToSection in ClientNav, outside the component.
let pending: (() => void) | null = null;

/*
 * Bring a section into view and focus, waiting for it while the page streams. A newer call
 * cancels an older wait (rapid clicks never fight over the scroll position).
 */
export function revealSection(id: string, { smooth = false }: { smooth?: boolean } = {}) {
  pending?.();
  pending = null;

  const found = document.getElementById(id);

  if (rendered(found)) {
    land(found, smooth && !prefersReducedMotion());
    return;
  }

  const root = document.getElementById("portal-main") ?? document.body;
  let timer = 0;

  const observer = new MutationObserver(() => {
    const element = document.getElementById(id);

    // The skeleton is gone and the section is laid out: land on it.
    if (rendered(element)) {
      cleanup();
      land(element, false);
    }
  });

  function cleanup() {
    observer.disconnect();
    window.clearTimeout(timer);
    pending = null;
  }

  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "style"] });
  timer = window.setTimeout(() => {
    cleanup();

    const element = document.getElementById(id);

    if (rendered(element)) {
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
    const stashed = anchorFromHash(window.__dlAnchor);

    if (stashed) {
      // Put the section back in the URL now that the router owns history (ANCHOR_STASH_SCRIPT).
      delete window.__dlAnchor;
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}#${stashed}`
      );
    }

    const id = stashed ?? anchorFromHash(window.location.hash);

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
