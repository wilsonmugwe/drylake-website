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
