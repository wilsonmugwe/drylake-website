/*
 * Cross-site request refusal for state-changing API calls. PURE: no Next or Clerk imports,
 * so it is unit-tested directly (tests/security-hardening.test.mjs) and called from proxy.ts.
 *
 * Why this exists although Clerk's session cookie is SameSite=Lax: Lax still sends the
 * cookie on requests from any SAME-SITE origin (any *.drylake.com.au host), and a browser
 * that ever falls back to Lax+POST would send it cross-site too. Every mutation in this app
 * is posted by our own pages, so a browser request that says it came from anywhere else is
 * refused before a handler runs. Defence in depth: each handler still authenticates and
 * authorises on its own.
 *
 * What it does NOT block: requests with no browser provenance headers at all (curl,
 * server-to-server). Those carry no victim's cookies, so they are not CSRF; they still hit
 * the handler's own auth checks. The Stripe and Clerk webhooks are exempt because both are
 * cross-site senders by design and authenticate with their signatures.
 */

export const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/* Server-to-server endpoints authenticated by their own signature, never by cookies. */
export const CROSS_SITE_EXEMPT_PATHS = new Set(["/api/stripe/webhook", "/api/clerk/webhook"]);

export type MutationRequest = {
  method: string;
  pathname: string;
  /* The origin this request was addressed to (request.nextUrl.origin). */
  requestOrigin: string;
  /* Origin header, if the browser sent one. */
  origin: string | null;
  /* Sec-Fetch-Site header, if the browser sent one. */
  secFetchSite: string | null;
};

/* True when the request must be refused with 403 before it reaches a route handler. */
export function isCrossSiteMutation(request: MutationRequest): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    return false;
  }

  if (!request.pathname.startsWith("/api/") || CROSS_SITE_EXEMPT_PATHS.has(request.pathname)) {
    return false;
  }

  // Fetch Metadata is the most reliable signal in modern browsers. "same-site" is refused
  // too: a sibling subdomain is a different origin and never posts to our API.
  if (request.secFetchSite && request.secFetchSite !== "same-origin" && request.secFetchSite !== "none") {
    return true;
  }

  // Browsers send Origin on every cross-origin POST (and "null" from sandboxed or
  // privacy-redirected contexts). Anything other than our own origin is refused.
  if (request.origin !== null && request.origin !== request.requestOrigin) {
    return true;
  }

  return false;
}
