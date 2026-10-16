/*
 * Public-site navigation: the labels, their destinations, and what a click must do.
 * PURE (no React, no DOM): tests import it directly, components/navigation/SiteLink.tsx
 * executes the decision.
 *
 * Why this exists (PR "Drylake Public Website Visual Redesign", 2026-10-07). Four reproduced
 * defects, two root causes:
 *
 *   1. Route changes landed mid-page or at the bottom (Start a Conversation -> /contact,
 *      Back to Drylake -> /, sign-out -> /). Next 16 scrolls a new page into place with a
 *      chain of scrollIntoView() calls; the site sets `html { scroll-behavior: smooth }`, and
 *      since Next 16 the router only suspends smooth scrolling during navigation when <html>
 *      carries data-scroll-behavior="smooth". Without it the smooth scrolls ran and the
 *      first one (the footer) won. Fixed in app/layout.tsx, not here.
 *
 *   2. Clicking a section link whose URL is already current (About on "/#about") did
 *      nothing: <Link> treats an identical URL as no navigation, so nothing scrolls. Fixed
 *      here: on the homepage, section and home clicks are resolved to an explicit scroll.
 */

export const HOME_PATH = "/";
export const CONTACT_PATH = "/contact";
export const CONSULTATION_PATH = "/consultation";
export const SIGN_IN_PATH = "/sign-in";
export const PORTAL_PATH = "/portal";

/* Where every sign-out lands: ClerkScope's afterSignOutUrl and every signOut() call. */
export const SIGN_OUT_REDIRECT_URL = "/";

export type NavItem = { label: string; href: string };

/*
 * Six items maximum plus the CTA (landing-page Pattern 6). Client Login is a utility beside the
 * CTA, not a navigation item. Section anchors keep their existing homepage destinations.
 *
 * Labels come from what the pages actually contain (PR 8, 2026-10-16):
 *   - Services  = WHAT WE BUILD (five service lines; /services lists them, each has its own page).
 *   - Solutions = BUSINESS PROBLEMS (/solutions starts from the problem, then points at the
 *     service that fits). Both URLs are unchanged. The previous header label "What We Do" pointed
 *     at a homepage section and read as a third, overlapping category, so it is retired.
 *
 * The Services entry carries `menu: true`; its dropdown links are DERIVED from the services data in
 * lib/navigation/services-menu.ts. That derivation lives in its own server-side module on purpose:
 * this file is imported by client components (SiteLink), and importing the full services copy here
 * would ship it in the browser bundle (it added about 22 KB to the homepage JS budget).
 */
/*
 * prefetch: false is for a destination whose page is heavy and rarely the next click from the
 * header. Next prefetches every <Link> that is in view, and the header is always in view, so a
 * "Solutions" link made the homepage download the /solutions client chunks (the motion library,
 * 43 KB) in the background: homepage JS 168 KB -> 213 KB, over the 200 KB budget. The click still
 * navigates; it just is not paid for on every page view.
 */
export type PrimaryNavEntry = NavItem & { menu?: true; prefetch?: false };

export const PRIMARY_NAV: readonly PrimaryNavEntry[] = [
  { label: "Services", href: "/services", menu: true },
  { label: "Solutions", href: "/solutions", prefetch: false },
  { label: "Our Approach", href: "/#approach" },
  { label: "Perth", href: "/perth" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: CONTACT_PATH },
];

/*
 * Shape and copy of the Services dropdown. The LINKS are derived from the services data in
 * lib/navigation/services-menu.ts (server side). The fallback below is for client-only surfaces
 * (the error boundary, via SystemScreen) that cannot import that data without shipping it to every
 * page: it offers the index only.
 */
export type ServicesMenuData = {
  label: string;
  href: string;
  descriptor: string;
  solutionsHint: string;
  links: readonly NavItem[];
};

export const SERVICES_MENU_COPY = {
  label: "Services",
  href: "/services",
  descriptor: "What we build for your business.",
  solutionsHint: "Starting from a problem? See Solutions.",
} as const;

export const SERVICES_MENU_FALLBACK: ServicesMenuData = {
  ...SERVICES_MENU_COPY,
  links: [{ label: "All services", href: SERVICES_MENU_COPY.href }],
};

/* /portal, not /sign-in: it serves both states server-side (see ClientAccessLink). */
export const CLIENT_LOGIN: NavItem = { label: "Client Login", href: PORTAL_PATH };
/* Plain-English messaging (2026-10-13): names what the visitor is here to do. Public site only;
   the client portal keeps its own "Start a conversation" (MessageDrylake), untouched. */
/* Consultation booking (2026-10-13): the primary action books a free 30-minute consultation.
   What is free is the consultation, never the build, so every surface that carries this label
   beside body copy also shows PRIMARY_CTA_NOTE (ACL s18; pre-launch checklist C1: the condition
   sits beside the offer). The contact form stays reachable as "Contact" in the nav and as
   "Send us a message" in the closing section of every page. */
export const PRIMARY_CTA: NavItem = { label: "Start Free Consultation", href: CONSULTATION_PATH };
export const PRIMARY_CTA_NOTE = "Free 30-minute consultation. No obligation to proceed. Any work is quoted before it begins.";

export type NavAction =
  /* Let next/link navigate (different page). Next lands at the top, or at the hash target. */
  | { kind: "navigate" }
  /* Already on this page: scroll to the top ourselves; drop any stale hash from the URL. */
  | { kind: "scroll-top"; replaceUrl: string | null }
  /* Already on the homepage: scroll the section into view, every time. */
  | { kind: "scroll-section"; id: string; pushUrl: string | null };

/** Split "/#about" into { path: "/", hash: "about" }; hash is "" when absent. */
export function parseHref(href: string): { path: string; hash: string } {
  const hashIndex = href.indexOf("#");
  const path = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : href.slice(hashIndex + 1);

  return { path: path === "" ? HOME_PATH : path, hash };
}

/**
 * Decide what a plain left click on an internal link should do.
 * currentHash is location.hash without the leading "#" ("" when none).
 */
export function resolveNavClick(input: {
  href: string;
  currentPath: string;
  currentHash: string;
}): NavAction {
  const target = parseHref(input.href);

  if (target.path !== input.currentPath) {
    return { kind: "navigate" };
  }

  if (target.hash) {
    const url = `${target.path}#${target.hash}`;

    // Same section again: scroll anyway, but do not stack a duplicate history entry.
    return {
      kind: "scroll-section",
      id: target.hash,
      pushUrl: input.currentHash === target.hash ? null : url,
    };
  }

  // Same page without a hash (brand link on "/", Contact on "/contact"): top, clean URL.
  return { kind: "scroll-top", replaceUrl: input.currentHash ? target.path : null };
}

/** Modified clicks (new tab, new window, download) are the browser's, never ours. */
export function isPlainLeftClick(event: {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
}): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}
