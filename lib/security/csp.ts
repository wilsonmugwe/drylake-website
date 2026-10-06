/*
 * Extra Content-Security-Policy directives merged into Clerk's managed policy (proxy.ts).
 *
 * Clerk's middleware owns the CSP header so that Clerk, Stripe and Turnstile keep working;
 * it merges these with its defaults. These four are safe additions that none of those
 * providers rely on:
 *   - Turnstile's challenge iframe and script (the contact form)
 *   - object-src 'none'      no <object>/<embed> plugins anywhere on the site
 *   - base-uri 'self'        an injected <base> tag cannot re-point relative script URLs
 *   - frame-ancestors 'none' nobody may frame any page (clickjacking); matches X-Frame-Options DENY
 *
 * Known gap, deliberately NOT changed here: Clerk's default script-src contains
 * 'unsafe-inline' https: http:, so the CSP does not stop injected scripts. Closing that needs
 * Clerk's strict (nonce + 'strict-dynamic') mode, which must be proven on a preview against
 * sign-in, Stripe redirect and Turnstile first. See docs/security/security-headers.md.
 */
export const CSP_DIRECTIVES: Record<string, string[]> = {
  "frame-src": ["https://challenges.cloudflare.com"],
  "script-src": ["https://challenges.cloudflare.com"],
  "object-src": ["none"],
  "base-uri": ["self"],
  "frame-ancestors": ["none"],
};
