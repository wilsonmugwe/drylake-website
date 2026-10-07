# Auth, navigation and workspace performance (PR 5, 2026-10-07)

Brief: Client Login and navigation inside the client experience feel slow. Find the real
bottleneck, measure before changing, fix only genuine causes, no spinners as a substitute.

Raw evidence (outside this repo): `drylake-ops/docs/review/2026-10-07-upgrade/pr5/`
(`probe-before.tsv`, `probe-post31-baseline.txt`, `nav-results-before.json`,
`nav-results-after.json`, screenshots).

## How it was measured

- **Production probes**, `curl -w` from Perth against https://drylake.com.au, every request spaced
  13 s apart (Vercel firewall rate rule). Two sets:
  - `probe-before.tsv`, 05:53-05:58 UTC. **Straddles the PR #31 deploy**: sample 1 of `/` was
    251,259 bytes (old build, Clerk in the root layout), samples 2-3 were 245,432 bytes.
  - `probe-post31-baseline.txt`, from 06:00:54 UTC, **after** #31 was live (homepage HTML: 0
    mentions of Clerk; sign-in HTML loads `clerk.browser.js` + `ui.browser.js`). This is the
    baseline this PR is built on.
- **Code analysis** of every auth and data call on the sign-in, /portal, /client and /admin paths.
- **Local production build** (`next build` + `next start`) driven by Playwright at 1440x900 and
  375x667 for navigation behaviour and request counts.
- **Not measurable here:** signed-in production flows (no credentials; local Clerk and Supabase
  keys are placeholders). Those steps are reasoned from code plus the hop timings above, and
  are labelled as estimates.

## Findings

| # | Area | Finding | Evidence | Verdict |
|---|---|---|---|---|
| F1 | Function region | Server functions already run in **Sydney** (`vercel.json` `regions: ["syd1"]`, guarded by `tests/deploy-region.test.mjs`). RSC responses carry `x-vercel-id: syd1::...`. A function 307 (`/portal` signed out) answers Perth in **TTFB 0.167-0.218 s**, the same as the edge-cached homepage (**0.166-0.173 s**). The 0.44-0.49 s iad1 figure from 2026-10-06 no longer applies | probes | **Not a bottleneck any more.** No infra change in this PR |
| F2 | Client Login after PR #31 | Public pages no longer run Clerk's browser SDK, so nothing refreshes the 60 s Clerk session token while a signed-in client reads the marketing site. Client Login was a `next/link`, i.e. an **RSC fetch** (`sec-fetch-dest: empty`). Clerk's middleware only handshakes **document** requests (`isRequestEligibleForHandshake`, `@clerk/backend`), so an expired token reads as signed out and `proxy.ts` sends the user to sign-in | Production, simulated stale session (`__client_uat` set, no `__session`): RSC `/portal` -> **307 `/sign-in?redirect_url=/portal`** (3/3 samples, 0.194-0.239 s). Document `/portal` -> **307 to `clerk.drylake.com.au/v1/client/handshake`** (3/3, 0.192-0.206 s) | **Root cause of the `/portal -> /sign-in -> /portal -> /client` chain.** Fixed |
| F3 | Prefetch through the proxy | Every public page prefetched `/portal` (the header Client Login link), a proxy run and a 307 per page view, for a link most visitors never click | Local prod build: 1 `/portal?_rsc=...` prefetch request on homepage load before, **0 after** | Fixed (same change as F2) |
| F4 | Duplicate admin check | `isPlatformAdmin()` was not memoised. A full load of any admin page ran the `platform_admins` query **twice** (layout + the page's own `requirePlatformAdmin`); `/portal -> /admin` ran it **3 times** | Code: `app/admin/layout.tsx`, `lib/auth/guards.ts`, `app/portal/page.tsx` | Fixed: `cache()`, now 1 per render (2 across the `/portal -> /admin` chain, one per request). Latency win is small because layout and page already ran in parallel; this halves the DB work |
| F5 | Client workspace resolution | Already a one-query fast path for established clients (`establishedWorkspace`), memoised per request with `cache()`, shared by layout and page | `lib/auth/client-context.ts`, existing `tests/portal-ux-performance.test.mjs` | Already good. No change |
| F6 | Client data waterfalls | `/client`: resolution (1 RLS query) -> projects -> one `Promise.all` of 4. Project, billing and invoice pages: resolution -> one wave. With functions and Supabase both in Sydney each wave is a same-region round trip | Code counts: dashboard 3 dependent waves, project 2, billing 2, invoice 2-3 | Not the bottleneck. Removing the projects wave needs PostgREST embedded joins that cannot be verified without a real database: deferred |
| F7 | force-dynamic | Only on `/admin/*`, `/client/*`, `/portal/*` and API routes, all of which read the session. Every public page is static (`○`/`●` in the build) | `next build` route table | Correct as is. Guard test added |
| F8 | Proxy auth | `proxy.ts` reads `auth()` only after deciding the request is a private page, verifies the JWT locally (`CLERK_JWT_KEY`), no network call | Code | Good. Guard test added |
| F9 | Sign-in page | `/sign-in/[[...sign-in]]` is dynamic (`ƒ`, optional catch-all) and `x-vercel-cache: MISS`, but TTFB is **0.165-0.197 s** (total 0.25-0.32 s, 41 KB). It then needs Clerk JS: `clerk.browser.js` **83 KB** + `ui.browser.js` **46 KB** on the wire, each behind a 307 version redirect | probes | Small; deferred (see below) |
| F10 | Clerk FAPI handshake | The handshake hop on `clerk.drylake.com.au` took **0.70-1.29 s** (3 samples) | probes | The dominant cost of any session refresh. Clerk-hosted, not ours to tune |
| F11 | Feedback | Workspace nav links already show a pending mark via `useLinkStatus`, each `/client` route has a `loading.tsx` skeleton, admin has `loading.tsx` at `/admin`, `/admin/clients`, `/admin/clients/[id]` (covering nested routes) | Code | Already in place. No spinner added |

## What changed

1. **Client Login is a document navigation** (`components/navigation/ClientAccessLink.tsx`: a
   plain `<a href="/portal">` instead of `next/link`). An expired session is now refreshed by
   clerkMiddleware's handshake and lands on `/portal` directly; no sign-in screen, no Clerk JS
   download before progress. Also removes the per-page-view `/portal` prefetch (F3).
2. **`isPlatformAdmin()` memoised per request** with React `cache()` (`lib/auth/platform-admin.ts`).
   Same query, same fail-closed behaviour, same session key; `cache()` never crosses requests and
   does not memoise in route handlers.
3. **Regression tests:** `tests/auth-navigation-performance.test.mjs` (11 tests).

## Before vs after

| Path | Before (post-#31 production + code) | After | Basis |
|---|---|---|---|
| Returning client, token expired (any visit more than 60 s after Clerk last ran), clicks Client Login | RSC `/portal` 307 (0.19-0.24 s) -> `/sign-in` render (0.17-0.20 s TTFB) -> download Clerk JS (83 + 46 KB, two 307s, ~0.13 s each) -> Clerk init + FAPI session refresh -> SignIn sees the session -> `/portal` RSC -> 307 `/client` -> render. **Sign-in screen flashes; 4 app requests + 2 script downloads + FAPI before the workspace starts rendering** | Document `/portal` 307 to handshake (0.19-0.21 s) -> FAPI handshake (0.70-1.29 s) -> `/portal` 307 `/client` (~0.2 s) -> render. **No sign-in screen, no Clerk JS needed first** | Hops measured individually; end-to-end signed-in time not measurable without credentials. Estimated saving: the sign-in render + Clerk JS fetch/parse + one RSC round trip, roughly 0.5-1 s, plus the visible "log in again" detour |
| Public page view | 1 `/portal` prefetch through the proxy | 0 | Measured, local prod build |
| Admin full page load (`platform_admins` queries) | 2 | 1 | Code |
| `/portal -> /admin` chain (`platform_admins` queries) | 3 | 2 (one per request) | Code |
| Signed-out Client Login | RSC `/portal` 307 -> soft nav `/sign-in` | Document `/portal` 307 -> `/sign-in` | Measured locally: both land on `/sign-in?redirect_url=/portal`. Similar cost; the sign-in page needs Clerk JS either way |

**Trade-off, stated plainly:** a client whose token is still fresh (left the workspace less than
60 s ago) now gets a full document load of `/client` instead of an RSC soft navigation. Static
chunks are cached, so this costs HTML + hydration, and it is the uncommon case: after #31 the
token on a public page is almost always stale.

## Navigation behaviour (local production build, Playwright)

21 checks, `nav-results-before.json` **19/21**, `nav-results-after.json` **21/21**. The two
before-failures were both F2/F3 (Client Login was an RSC fetch; `/portal` prefetched). Every
navigation defect listed in the brief was already fixed by PR #29 and verified here:

| Check | Before | After |
|---|---|---|
| Start a Conversation (header) from a scrolled homepage -> `/contact` at `scrollY 0` | PASS | PASS |
| About from `/contact` -> `/#about`, section 84 px from top (under the header) | PASS | PASS |
| About again with `/#about` already in the URL after scrolling to the bottom | PASS | PASS |
| About after Our Approach | PASS | PASS |
| Back / forward walk `#approach` / `#about` history | PASS | PASS |
| Brand link on `/` -> top, hash dropped | PASS | PASS |
| Client Login signed out -> `/sign-in?redirect_url=/portal` | PASS | PASS |
| Client Login is a document request | **FAIL** (RSC fetch) | PASS |
| No `/portal` request while reading the homepage | **FAIL** (prefetch) | PASS |
| Back to Drylake (sign-in footer, page scrolled) -> `/` at `scrollY 0` | PASS | PASS |
| Sign-in brand-panel DRYLAKE link -> `/` at top | PASS | PASS |
| `/portal`, `/client`, `/admin` signed out -> 307 sign-in with return URL | PASS x3 | PASS x3 |
| Mobile 375: About from menu closes menu, releases scroll lock, lands on section | PASS | PASS |
| Mobile: About from menu again (same URL) | PASS | PASS |
| Mobile: Start a Conversation from menu -> `/contact` top, menu closed | PASS | PASS |
| Mobile: back from `/contact` -> `/#about` | PASS | PASS |
| Mobile: Client Login from menu -> sign-in with `/portal` return | PASS | PASS |
| Mobile: Back to Drylake -> `/` at top | PASS | PASS |

Admin vs client routing (`/portal` sends platform admins to `/admin`, everyone else to `/client`;
`/client` sends an admin with no client membership to `/admin`) is unchanged and needs a signed-in
production test (see the PR body).

## Deferred

- **Static sign-in shell.** `/sign-in` could be prerendered (`generateStaticParams` for the empty
  catch-all) to serve from the edge cache. Measured TTFB is already 0.17-0.20 s, so the gain is
  small and Clerk's path routing needs a real-key check first.
- **Admin page waterfalls** (pages are Wilson's UI, not `lib/`): sequential awaits counted at
  `/admin/projects/[projectId]` 5, `/admin/invoices/[invoiceId]` 4, `/admin/clients/[organizationId]` 3.
  Same-region round trips; parallelise when those pages are next touched.
- **Dashboard projects wave** (F6): needs embedded joins verified against the real schema and RLS.
- **Server-Timing header:** the existing `client.portal.timing` log line (allowlisted payload,
  `lib/perf/portal-timing.ts`) already gives per-phase numbers in Vercel logs. Read those after
  deploy rather than adding a response header.
