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
export const SIGN_IN_PATH = "/sign-in";
export const PORTAL_PATH = "/portal";

/* Where every sign-out lands: ClerkScope's afterSignOutUrl and every signOut() call. */
export const SIGN_OUT_REDIRECT_URL = "/";

export type NavItem = { label: string; href: string };

/*
 * Wording chosen by Wilson (option B). Destinations are the existing ones: the homepage
 * sections What We Do (#solutions), How We Work (#approach) and Founder-Led (#about),
 * and the Contact page. Labels changed, URLs did not.
 */
export const PRIMARY_NAV: readonly NavItem[] = [
  { label: "What We Do", href: "/#solutions" },
  { label: "Our Approach", href: "/#approach" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: CONTACT_PATH },
];

/* /portal, not /sign-in: it serves both states server-side (see ClientAccessLink). */
export const CLIENT_LOGIN: NavItem = { label: "Client Login", href: PORTAL_PATH };
/* Plain-English messaging (2026-10-13): names what the visitor is here to do. Public site only;
   the client portal keeps its own "Start a conversation" (MessageDrylake), untouched. */
/* Final corrections (2026-10-13): "Get Started for Free". What is free is the first enquiry and
   conversation, never the build, so every surface that carries this label beside body copy also
   shows PRIMARY_CTA_NOTE (ACL s18; pre-launch checklist C1: the condition sits beside the offer). */
export const PRIMARY_CTA: NavItem = { label: "Get Started for Free", href: CONTACT_PATH };
export const PRIMARY_CTA_NOTE = "Your first enquiry and conversation are free. Any build is quoted before work starts.";

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
