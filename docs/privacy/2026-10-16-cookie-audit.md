# Cookie and browser-storage audit, 2026-10-16

Scope: drylake.com.au public pages, the consultation and contact flows, and the sign-in screen.
Method: code review, then a real Chromium (Playwright 1.64) loading each page in a **fresh browser
context** against (a) a local production build of `origin/main` @ `6f3c636` and (b) the live site,
read-only. Script: `scripts/cookie-audit.mjs` (re-runnable: `node scripts/cookie-audit.mjs <base-url>`).
For each page it records cookies set by response headers (`context.cookies()`, which includes
HttpOnly), `document.cookie`, `localStorage`, `sessionStorage`, iframes and every cross-origin request.

## Result in one line

**The public site sets no cookies and writes nothing to browser storage. Cookies appear only on the
sign-in screen, and all of them are essential. No marketing or advertising technology exists.**

## Evidence by page

| Page | Cookies (live) | Cookies (local build) | localStorage | sessionStorage | Third-party origins contacted |
|---|---|---|---|---|---|
| `/` | none | none | none | none | none |
| `/about` | none | none | none | none | none |
| `/services` | none | none | none | none | none |
| `/contact` | none | none | none | none | `challenges.cloudflare.com` (Turnstile script); live also `brunhild.challenges.cloudflare.com` |
| `/consultation` | none | none | none | none | none on load (Turnstile loads at the confirm step, same widget as `/contact`) |
| `/privacy`, `/terms` | none | none | none | none | none |
| `/sign-in` | **6, see below** | none (placeholder Clerk key) | `__clerk_environment` | none | `clerk.drylake.com.au`, `img.clerk.com` |

Also checked with `curl -I` on the live site: no `Set-Cookie` header on `/`, `/contact`,
`/consultation`, `/privacy`. `http://` redirects (308) to `https://`.

Live `/sign-in`, signed out:

| Name | Domain | Lifetime observed |
|---|---|---|
| `__client` | `.clerk.drylake.com.au` | 400 days (browser cap) |
| `__client_uat` | `.drylake.com.au` | 400 days |
| `__client_uat_yM2XPbzG` | `.drylake.com.au` | 400 days |
| `__cf_bm` | `.clerk.drylake.com.au` | 30 minutes |
| `_cfuvid` | `.clerk.drylake.com.au` | session |
| `__cf_bm` | `.img.clerk.com` | 30 minutes |

The signed-in `__session` cookie was **not observed** (no test account in this audit); it is
documented by Clerk and listed with that caveat.

## Classification

| Item | Type | Category | Provider | Purpose | Duration |
|---|---|---|---|---|---|
| `__client`, `__client_uat`, `__client_uat_<id>` | cookie | **Essential** | Clerk | Sign-in session, whether a user is signed in | up to ~13 months |
| `__session` | cookie | **Essential** | Clerk | Short-lived proof of sign-in on each request (signed in only; not observed) | short, renewed |
| `__clerk_environment` | localStorage | **Essential** | Clerk | Caches sign-in screen settings | until site data cleared |
| `__cf_bm`, `_cfuvid` | cookie | **Essential** (security) | Cloudflare, on Clerk's domains | Bot protection for the sign-in service | 30 min / session |
| Turnstile form check | none observed | **Essential** (security) | Cloudflare | Confirms a human submits the contact/booking form | not stored |
| Vercel Web Analytics | none (cookieless) | **Analytics** | Vercel | Aggregate page views and four anonymous events | not stored in the browser |
| `drylake-privacy-preferences` | localStorage | **Functional** | Drylake | Remembers the analytics choice. **Written only after a visitor changes the setting** | until reset or site data cleared |
| (none) | | **Marketing** | | | |

Code review agrees with the browser: no `document.cookie` writes, no `localStorage`/`sessionStorage`
use in `app/`, `components/` or `lib/` before this change, no ad, pixel, tag-manager or social SDK in
`package.json`. Analytics events carry closed-set labels only (`lib/analytics/events.ts`).

## Decision

1. **No blocking consent banner.** The Privacy Act 1988 has no general cookie-consent rule; consent
   matters where optional non-essential cookies or trackers are used (and for EU visitors under
   GDPR/ePrivacy). The site uses none: the only optional technology is Vercel Web Analytics, which
   is cookieless and carries no personal information. A banner would cost conversion and create a
   consent obligation to honour, for nothing.
2. **Instead:** a Cookies section and a settings control on the new `/security-privacy` page
   (`#cookie-settings`) listing the categories and what is in use, with an **Analytics** switch.
   Switching it off makes the analytics `beforeSend` gate return `null` for page views and custom
   events, so nothing is sent (`lib/analytics/scrub-event.ts`; `@vercel/analytics` 2.0.1 applies
   `beforeSend` to both). The choice is one localStorage item, written only when the visitor changes
   the setting, and a Global Privacy Control signal starts analytics off until the visitor chooses.
3. **Default is on**, and the page says why: it is cookieless and holds no personal information.
4. **If an optional cookie is ever added** (advertising pixel, embedded video, chat widget), this
   decision is void: add a real consent interface that blocks the tracker until the visitor opts in,
   with accept, reject, choose and revisit, and re-run this audit. The audit script is the check.

## Not verified

- The live site made **no request to `/_vercel/insights/script.js`** in the headless run, though the
  script URL returns 200. The production deployment may predate the analytics wiring in `main`, or
  Web Analytics may need checking in the Vercel project. The opt-out is proven against a stand-in
  that implements the vendor contract, not against Vercel's live script.
- Signed-in cookies (`__session`, organisation cookies) were not observed.
- Cookie lifetimes are as observed by Chromium (it caps at 400 days); Clerk's stated lifetime may differ.
