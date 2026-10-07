/*
 * Workspace deep links (polish brief 18). Pure helpers for components/client/WorkspaceAnchors.tsx
 * and the navigation, kept DOM-light so the rules are unit tested.
 *
 * A destination is a route plus an optional section id. Section ids are part of the URL
 * contract (people bookmark and share them), so they are declared once, in ClientNav.tsx,
 * and tests/workspace-polish.test.mjs checks every one of them exists in its view.
 */

/* "#to-pay" or "to-pay" -> "to-pay"; anything that is not a plain id is ignored. */
export function anchorFromHash(hash: string | null | undefined): string | null {
  if (!hash) {
    return null;
  }

  let id = hash.startsWith("#") ? hash.slice(1) : hash;

  try {
    id = decodeURIComponent(id);
  } catch {
    return null;
  }

  return /^[a-z][a-z0-9-]{0,63}$/.test(id) ? id : null;
}

/* Split "/client/billing#to-pay" into its path and section id. */
export function splitDestination(href: string): { path: string; anchor: string | null } {
  const index = href.indexOf("#");

  if (index === -1) {
    return { path: href, anchor: null };
  }

  return { path: href.slice(0, index), anchor: anchorFromHash(href.slice(index)) };
}

/*
 * A click on a section link is handled in place (no router navigation) when it targets the
 * page already on screen: Next's <Link> is a no-op for an identical URL + hash, and a
 * same-page hash change does not fire hashchange, so the Workspace moves focus itself.
 */
export function isSamePageDestination(href: string, pathname: string | null): boolean {
  const { path, anchor } = splitDestination(href);

  return anchor !== null && path === pathname;
}

/*
 * Next 16 seeds its route cache with the URL the document was loaded at, hash included, and
 * reuses it: after a full load of /client#recent-activity, a later link to /client came back
 * as /client#recent-activity and a link to /client#documents as
 * /client#recent-activity#documents (reproduced locally, 2026-10-07). A hash added after
 * hydration (history.pushState / replaceState) does not leak. So the shell's inline script
 * (ANCHOR_STASH_SCRIPT, rendered by ClientShell before the router hydrates) moves a valid
 * section hash out of the URL into window.__dlAnchor, and WorkspaceAnchors puts it back with
 * replaceState once the router is live. Back/Forward and refresh are unaffected.
 *
 * It is a fixed string (no user input), rendered as a plain <script> text child: no raw-HTML
 * API (tests/security-hardening allows raw HTML in the JSON-LD component only). React escapes
 * & < > " ' in text, which would corrupt script source, so the string contains none of them
 * (String() stands in for an empty string literal; test-pinned). It relies on the current
 * script-src allowing inline scripts (lib/security/csp.ts); if a nonce-based CSP lands, give
 * it the nonce. Without it the only loss is this workaround: deep links still work.
 */
export const ANCHOR_STASH_SCRIPT =
  "(function(){try{var h=location.hash;if(/^#[a-z][a-z0-9-]{0,63}$/.test(h)){window.__dlAnchor=h.slice(1);history.replaceState(history.state,String(),location.pathname+location.search)}}catch(e){}})();";
