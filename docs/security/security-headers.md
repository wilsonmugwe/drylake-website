# Security headers

Read from production (`https://drylake.com.au/`) on 2026-10-06, before this PR, and from a
local `next start` of this branch after it.

| Header | Production before | This PR | Notes |
|---|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | unchanged | `preload` deliberately not added: hard to reverse, covers every subdomain. Ben's decision |
| `X-Content-Type-Options` | `nosniff` | unchanged | |
| `X-Frame-Options` | `DENY` | unchanged | now also `frame-ancestors 'none'` in CSP |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | unchanged | |
| `Permissions-Policy` | camera, microphone, geolocation, payment, usb, browsing-topics off | unchanged | `payment=()` is fine: Stripe Checkout is a redirect, not an embedded Payment Request |
| `Content-Security-Policy` | Clerk-managed: `default-src 'self'`, `form-action 'self'`, Clerk/Stripe/Turnstile hosts, **`script-src 'self' 'unsafe-inline' https: http:`** | adds `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'` | verified locally on this branch |
| `X-Robots-Tag` on private paths | `noindex, nofollow` | unchanged | |

## Why the CSP does not yet stop injected scripts

Clerk's middleware builds the CSP. In its default mode `script-src` includes
`'unsafe-inline' https: http:`, which allows any inline script and any script host. Clerk's
`strict: true` mode removes those and adds a per-request nonce with `'strict-dynamic'`.
Turning it on changes how every page's scripts load (Next.js must stamp the nonce on its own
inline scripts, which forces dynamic rendering), so it can break sign-in, Turnstile and the
Stripe redirect, and would turn the static marketing pages dynamic.

**Plan, not done in this PR:**
1. On a preview branch, set `contentSecurityPolicy: { strict: true, reportOnly: true, directives: CSP_DIRECTIVES }`.
2. Exercise sign-in, sign-up, invitation acceptance, the contact form (Turnstile), checkout
   redirect and the admin pages; read the browser console for report-only violations.
3. Measure the effect on static pages (they become dynamic).
4. Only then enforce, in its own PR.

The three directives added here cannot affect Clerk, Stripe or Turnstile: none of them uses
`<object>`, `<base>` or needs to be framed by us.

## Not added, with reasons

- `Cross-Origin-Opener-Policy: same-origin`: Clerk social sign-in may use popups; test with
  the strict-CSP preview rather than risk sign-in.
- `Cross-Origin-Embedder-Policy`: would block Clerk and Stripe resources; no benefit for
  this site.
