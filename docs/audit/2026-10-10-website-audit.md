# Website audit, SEO/GEO and production hardening (2026-10-10)

Branch `drylake/website-audit-seo-production-hardening`, from `main` at `34b7c9f` (production at
the time of the audit, confirmed by `/api/health`). **Not a redesign.** Hero headline, layout,
colours, type, animation and service structure are unchanged.

Labels used throughout: **PASS**, **FAIL**, **NOT TESTED**, **MANUAL** (needs a person or an
account this audit did not have). Every number below was measured in this session; nothing is
estimated.

---

## 1. Executive summary

The site was already in good technical shape: earlier PRs (#3 to #60) fixed SEO, accessibility,
security headers and the contact form. Production desktop Lighthouse is 100/100/100 on all 13
public pages, mobile performance 94 to 100 on 12 of them, and accessibility 100 everywhere.

The real defects were **accuracy** defects, not technical ones:

1. **The Privacy Policy did not meet APP 1.4.** It named no service provider, said nothing about
   overseas disclosure, cookies, Drylake Workspace, payments or AI, and gave no phone or postal
   contact. Rewritten from what the code actually does.
2. **The enquiry form collected personal information with no collection notice (APP 5).** Added
   one line with a Privacy Policy link next to the submit button.
3. **The Terms page showed "Last updated: 8 October 2026"** although its GST wording changed on
   9 October (PR #60). Both legal pages now read their date from the sitemap data, so the two
   cannot disagree again.
4. **Marketing promised backups, monitoring and recovery unconditionally** ("Data is backed up,
   so a bad day stays recoverable"), while the MSA (cl 13.2) leaves hosting and support to each
   SOW. Reworded: homepage strata "Backup and recovery arranged to your agreed scope"; service page
   "Monitoring, backups and recovery arrangements tailored to your project and agreed scope".
5. **One production dependency advisory** (`sharp` 0.35.4 via Next, CVE-2026-96889, low real
   exposure). Pinned to 0.35.5; `npm audit --omit=dev` now reports 0.

SEO change, backed by keyword data rather than guesswork: the homepage title now names Perth
(see section 3). The approved hero headline is untouched and guarded by a new test.

Two contractual inconsistencies were found **outside this repo** and need Ben's decision (section 10):
the MSA says "Drylake is registered for GST", and its data schedule promises Client Data is stored
in Australia while Drylake Workspace uses US-hosted Clerk and a Supabase project whose region is
unverified.

---

## 2. Issues resolved

| # | Defect (confirmed) | Evidence | Fix | Guard |
|---|---|---|---|---|
| D1 | Privacy Policy missing APP 1.4 content (providers, overseas disclosure, cookies, Workspace, payments, AI, contact details) | `app/privacy/page.tsx` at 34b7c9f: 11 generic sections, no provider or country named | Rewritten; facts sourced from code and listed in the file header | `tests/website-audit-2026-10-10.test.mjs` |
| D2 | No collection notice on the enquiry form (APP 5) | `components/forms/ProjectForm.tsx` submit area | One-line notice + `/privacy` link | same test file |
| D3 | Terms "Last updated" wrong (8 Oct; content changed 9 Oct) | PR #60 merged 9 Oct 11:12 UTC | `pageLastUpdated()` reads `PUBLIC_PAGES.lastModified`; terms 2026-10-09 | test: no hard-coded dates |
| D4 | Stale code comment in Terms: "GST stated as registered (D31)" | `app/terms/page.tsx:20` | Comment corrected to D39 and the flag | n/a (comment) |
| D5 | Unconditional backup/monitoring claims | `components/sections/Production.tsx:15-16`, `lib/discovery/services.ts:119` | Scope-qualified wording | test |
| D6 | `sharp` advisory (high by advisory, low exposure: no SVG optimisation enabled) | `npm audit --omit=dev`: 1 high | `overrides.sharp ^0.35.5` | `npm audit` 0 |
| D7 | Clerk webhook responses lacked `Cache-Control: no-store` (every other API helper sends it) | `app/api/clerk/webhook/route.ts:40` | Header added | test |
| D8 | Clerk webhook missing from the API security matrix | `docs/security/api-security-matrix.md` | Row added | doc |
| D9 | Four dead components (no importers) | grep of import paths | Deleted `About`, `Capabilities`, `WhatWeAreNot`, `CapabilityVisual` | tsc + build |
| D10 | Code-quality doc said no `eslint-disable` exists (two do, both justified) | `docs/code-quality/2026-10-08-review.md` | Status note | doc |

Investigated and **not** a defect (no change made):

- **Mobile `/contact` LCP 7.14 s** in the baseline sweep. Re-measured 3x: 2.01 / 2.16 / 2.01 s,
  score 99. The outlier was a heavy Cloudflare Turnstile challenge (~700 KB) in one run; the LCP
  element is the server-rendered h1. Not changed. Turnstile adds variance on this page only.
- **"Inconsistent phone numbers, unavailable email statements, header/footer differences" in the
  Privacy Policy:** none found at 34b7c9f. The phone lives in one constant (`BUSINESS_PHONE`),
  the footer is shared, and no "unavailable email" sentence exists. The policy's real problem was
  missing content (D1), not contradictory content.
- **Naming:** "Drylake Workspace" (27 uses) and "Client Login" (nav) are already consistent.
  "Client portal" appears only in code comments and as a service Drylake builds for its clients,
  which is correct.
- **Founder credentials:** Wilson, "Bachelor of Computer Science, majoring in Software
  Engineering" (completed September 2026, per the brief); Benedict, "Master of Project
  Management". Both accurate; no change.

---

## 3. SEO report

**Baseline (production, Lighthouse 12, 2026-10-10):** SEO 92 on all 13 pages, 26 runs. The only
failing audit is `robots-txt`: Lighthouse reports the two `Content-Signal:` lines as "Unknown
directive". That directive was added on purpose (D20, PR #56: Cloudflare content signals, Gemini
may train). Google ignores unknown robots lines, so indexing is unaffected. **Not changed**: it is
a business decision (section 10). Removing those two lines would take SEO to 100.

| Check | Result | Evidence |
|---|---|---|
| Titles unique, <= 65 chars | PASS | crawl of 13 pages; unit test |
| Meta descriptions unique, 140-160 | PASS | crawl; unit test (new home description 151) |
| Canonicals self-referencing, no trailing slash | PASS | crawl |
| `noindex` on public pages | PASS (none) | crawl |
| Private routes not indexable | PASS | `/client` `/admin` `/portal` 307 + `X-Robots-Tag: noindex, nofollow`; `/sign-in` `/sign-up` meta + header noindex; robots `Disallow` |
| Broken internal links | PASS (0) | every `href` on 13 pages, 22 distinct targets, all 200 (`/portal` 307 by design) |
| Redirects | PASS | http->https, www->apex, trailing slash: single 308 hop |
| Unknown URL status | PASS | 404 |
| Sitemap | PASS | 13 URLs, all 200, no private routes |
| robots.txt | PARTIAL | valid for Google; Lighthouse flags `Content-Signal` |
| One h1 per page | PASS | crawl |
| OG/Twitter image per page | PASS | per-page 1200x630 cards |
| Image alt text | PASS | Lighthouse `image-alt` passing on all pages |
| `drylake.au` | FAIL (outside code) | does not resolve; should 301 to drylake.com.au (DNS, section 10) |
| Search Console | NOT TESTED | no access in this session; owner/sitemap submission still on Ben's list |
| Rich Results Test | MANUAL | needs Google's UI; JSON-LD is parsed and shape-tested in CI |

**Keyword evidence** (DataForSEO Google Ads volumes, Australia, pulled 2026-10-10, cost US$0.09):

| Query | Monthly volume |
|---|---|
| web developer perth | 260 |
| app developers perth | 210 |
| web application development perth | 140 |
| software company perth | 110 |
| software development perth / software developers perth / custom software perth | 90 each |
| custom software development perth | 70 |
| business technology solutions perth, business automation perth, ai automation perth, systems integration perth, software development western australia | no measurable volume |

Changes made on that evidence, without stuffing:

- Homepage title `Drylake | Operational Software & Automation Australia` -> `Drylake | Custom
  Software & Automation, Perth WA`; description now opens "Drylake is a Perth software company".
  "Operational software" has no search demand; "custom software" + Perth does.
- Perth FAQ added to custom software and web development (automation and AI pages already had one),
  each answering with a fact the page states. Visible, and emitted in the page's FAQPage JSON-LD.
- Perth-in-titles cap raised from 2 to 3 (homepage, `/perth`, `/about`); a new test keeps every
  service title Perth-free so the cap cannot creep.

Not done, deliberately: no city or suburb pages, no keyword lists, no `meta keywords` (none present),
no new homepage sections.

**Structured data:** Organization (legal name, ABN/ACN identifiers, phone, email, `areaServed`
Perth/WA/Australia, founders, LinkedIn `sameAs`), WebSite, WebPage/AboutPage/ContactPage/
CollectionPage, Service + OfferCatalog, BreadcrumbList, FAQPage only where FAQs are visible. No
ratings, reviews, prices or certifications. `ProfessionalService`/`LocalBusiness` **not added**:
both expect a street address that clients visit, and D19/D25 chose locality-only (section 10).

**Internal linking:** homepage, `/solutions`, `/services`, each service, `/perth`, `/about`,
`/contact` are all linked from navigation or footer and contextually (counts in the crawl: `/` 87
links across pages, `/contact` 56, each service 21-27, `/perth` 20). No change needed.

---

## 4. GEO (AI search) report

Reported separately from SEO, and with the limits stated: none of this guarantees an AI citation.

| Signal | State |
|---|---|
| Server-rendered content | PASS: every public page's text is in the initial HTML (curl, no JS) |
| AI crawler access | Search and answer crawlers allowed; training crawlers GPTBot, ClaudeBot, CCBot, meta-externalagent, Amazonbot, Applebot-Extended disallowed; Google-Extended allowed to train (D20) |
| `llms.txt` + `llms-full.txt` | Present, dated, list services and Perth page |
| Markdown negotiation | `Accept: text/markdown` served by `app/api/markdown` |
| Entity consistency | One `ENTITY` source feeds footer, JSON-LD, llms.txt; legal name, ABN and phone identical everywhere |
| Factual answers | Service FAQs answer "who / what / where" directly; two Perth answers added |
| Privacy page | Now states providers and data handling plainly, which is what assistants quote for "is Drylake safe" style questions |

Limitations: ClaudeBot and GPTBot are blocked from **training**, by decision. This audit did not
measure AI citations; the free Ahrefs AI Visibility Checker is the monthly read (docs/search).

---

## 5. Performance report

Production, Lighthouse 12, default throttling, 2026-10-10 (before this PR; the PR changes copy
only and adds no script, image or font).

| Page | Mobile perf | Mobile LCP | Mobile TBT | Desktop perf | Desktop LCP | CLS |
|---|---|---|---|---|---|---|
| / | 94 | 2.38 s | 189 ms | 100 | 0.55 s | 0 |
| /solutions | 97 | 2.30 s | 125 ms | 100 | 0.54 s | 0 |
| /services | 97 | 1.87 s | 165 ms | 100 | 0.50 s | 0 |
| /services/custom-software-development | 95 | 2.36 s | 173 ms | 100 | 0.55 s | 0 |
| /services/business-automation | 99 | 1.84 s | 106 ms | 100 | 0.52 s | 0 |
| /services/systems-integration | 96 | 2.32 s | 153 ms | 100 | 0.52 s | 0 |
| /services/ai-automation | 100 | 1.58 s | 42 ms | 100 | 0.54 s | 0 |
| /services/web-development | 99 | 1.85 s | 54 ms | 100 | 0.50 s | 0 |
| /perth | 97 | 2.17 s | 132 ms | 100 | 0.50 s | 0 |
| /about | 99 | 1.86 s | 94 ms | 100 | 0.46 s | 0 |
| /contact | 74 (outlier; re-runs 99/99/99, LCP 2.01-2.16 s) | 7.14 s | 45 ms | 100 | 0.54 s | 0 |
| /privacy | 99 | 1.69 s | 92 ms | 100 | 0.50 s | 0 |
| /terms | 97 | 1.85 s | 167 ms | 100 | 0.49 s | 0 |

Targets: LCP <= 2.5 s met on every page (contact on re-run); CLS 0 everywhere; performance >= 90
everywhere except the one contact outlier. **INP: NOT TESTED** (needs field data: Vercel Speed
Insights or CrUX; the site has too little traffic for CrUX). JS transfer 166-218 KB per page.
No animation was removed. Raw JSON: `~/qa-tmp/audit/lh-before/` on the audit machine.

**Post-merge step:** re-run `bash ~/qa-tmp/audit/lh-baseline.sh after` against production and
compare with `lh-before-summary.txt`.

---

## 6. Security report

Headers on production (curl, 2026-10-10): HSTS `max-age=31536000; includeSubDomains`,
`X-Frame-Options: DENY` + CSP `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, Permissions-Policy denying camera, microphone,
geolocation, payment, usb, topics. Public pages set **no cookies**. All 21 API handlers check
sign-in and role before reading input or touching the database (code review this session).

Fixed in this PR: D6, D7, D8. Outstanding (decisions, not silent):

| Risk | Status | Why not fixed here |
|---|---|---|
| CSP `script-src` contains `'unsafe-inline' https: http:` (generated by Clerk's automatic CSP) | Previously known (F2) | Our directives can only add to Clerk's list. Removing `https:` needs Clerk's `strict` nonce mode, which makes every page under the proxy dynamic (performance cost) and needs the nonce passed to the inline script in `ClientShell`. Recommended: ship a Report-Only host allowlist first (must include `clerk.drylake.com.au`), then decide |
| HSTS without `preload` | F13, known | Preload is hard to undo; Ben's call |
| Rate limiting relies on the Vercel Firewall rule | F8, known | Confirmed working on prod (6th rapid POST 429) in earlier QA |
| `/api/health` shows environment and short commit SHA | New, low | Useful for the live-matches-main check; decide whether to keep |
| Upload cap 10 MB vs Vercel 4.5 MB body limit | S3, known | Behaviour change; needs Wilson |
| Supabase project region | Unknown | Not visible from code; Wilson to read it in the Supabase dashboard |

No secrets or environment values appear in this report.

---

## 7. Accessibility report

Baseline: Lighthouse accessibility **100 on all 26 runs** (13 pages x mobile/desktop). The e2e
suite runs axe (WCAG A/AA) on every public page at 1440 and 375 px, plus keyboard, skip link,
focus, reduced motion and touch target checks; results in section 8.

This PR's only new interactive element is the Privacy Policy link in the form notice (text
`black/60` on white, same token the surrounding helper text already passes contrast with;
underlined, so not colour-only).

MANUAL: a screen reader pass (NVDA/VoiceOver) on the contact form, and Safari/WebKit (cannot run in
WSL; Windows Playwright WebKit is available at `C:\Users\DELL\qa-pr3-win`).

---

## 8. Functional testing report

`npm run test:e2e` on this branch (production build, Chromium desktop 1440 + mobile 375 +
responsive matrix 320-1440 px): **266 passed, 1 failed, 22 skipped** (skips are the
production-only tests). The one failure was the page-height guard on `/privacy`, which grew by
design (11 short sections to 12 full ones). Re-baselined in `tests/e2e/page-height-baseline.ts`
with the measured heights, then the matrix project re-ran **15/15 passed**. axe WCAG A/AA: no
violations on any page at either width.

Lighthouse on the local build of this branch, changed pages (`/`, `/contact`, `/privacy`, `/terms`,
mobile + desktop): accessibility **100** on all 8 runs, SEO 92 (robots `Content-Signal` only, as
production), best practices 96 locally because `/_vercel/insights/script.js` only exists on Vercel
(production is 100).

Contact journey covered locally with Cloudflare's test keys and **no email sent**
(`RESEND_API_KEY` empty): required fields, email format, Turnstile token required, single POST on
double click, success state, failure state keeps typed answers, 403 on missing/invalid token.

Not tested in this PR, and why:

- **Live delivery to the inbox:** production only, needs Turnstile in a real browser (Ben).
- **Client invitation, Workspace access, invoice email, Stripe payment and receipt:** need test
  accounts on production Clerk/Stripe; the local `.env.local` uses placeholder keys. The live
  invitation test is already on Ben's list (drylake-ops todo, 9 Oct). No real client, record or
  charge was touched.
- **Acknowledgement email to the enquirer:** recommended, not built (new outbound mail needs
  approval, and the M365 tenant currently cannot send external mail; Resend could).

The "reply within 1 business day" promise is one constant (`RESPONSE_TIME`), rendered on the form,
FAQ and llms.txt. Whether it is realistic is Ben and Wilson's call (section 10).

---

## 9. Code review summary

| File | Change | Behaviour preserved |
|---|---|---|
| `app/privacy/page.tsx` | Content rewrite, same layout component | Yes (copy only) |
| `app/terms/page.tsx` | Date from data; comment fix | Yes (date text only) |
| `components/forms/ProjectForm.tsx` | Collection notice + `Link` | Yes (no logic change) |
| `components/sections/Production.tsx` | Two sentences, kept to one line each so the strata keep their rhythm (screenshot) | Yes |
| `lib/discovery/services.ts` | One bullet, two FAQs | Yes (FAQ schema derives automatically) |
| `lib/discovery/entity.ts` | `pageLastUpdated()`; lastModified dates for changed pages | Yes |
| `lib/seo-pages.ts` | Home title + description | Yes |
| `lib/site.ts` | `POSTAL_ADDRESS` constant | n/a (new) |
| `app/api/clerk/webhook/route.ts` | `no-store` header | Yes |
| `package.json`, `package-lock.json` | `sharp` override | Yes |
| 4 components deleted | Dead code | Yes (no importers) |
| `tests/seo-search-visibility.test.mjs` | Perth cap 2 -> 3, service titles Perth-free | n/a |
| `tests/website-audit-2026-10-10.test.mjs` | 14 regression tests | n/a |
| docs | this report, API matrix row, code-quality status | n/a |

Checks run: `npx tsc --noEmit` exit 0, `npx eslint .` exit 0, `npm test` 1038/1038 pass,
`npm audit --omit=dev` 0 vulnerabilities, `next build` exit 0, e2e as in section 8.

---

## 10. Outstanding decisions (Ben / Wilson)

| # | Decision | Who | Notes |
|---|---|---|---|
| 1 | **Approve the Privacy Policy wording**, especially sections 7 (overseas) and 9 (retention, no periods stated) | Ben + Wilson | Not legal advice; DUAL's free contract review or a lawyer could read it |
| 2 | **Is the street address on the Privacy Policy a residence? (Yes: removed 2026-10-13.)** It is published on the Privacy Policy only, as a postal address. If it is a home, remove it before merge (email + phone satisfy APP 1.4) | Ben | Earlier D19/D25 kept the street address off every public surface |
| 3 | **MSA cl 5.8 says "Drylake is registered for GST"** (drylake-ops `06-legal/02`). False until ABN Lookup shows registration; fix before any MSA is signed | Ben | Contractual; not edited |
| 4 | **MSA data schedule cl 2 says Client Data hosted by Drylake is stored in Australia.** Drylake Workspace uses Clerk (US) and Supabase (region unverified). Either confirm Supabase is Sydney and carve Clerk out, or reword | Ben + Wilson | Contractual; not edited |
| 5 | Keep `Content-Signal` in robots.txt (Lighthouse SEO 92) or drop it (100)? | Ben | Recommendation: keep; Google ignores it |
| 6 | CSP hardening path (Report-Only first) | Wilson | Section 6 |
| 7 | Point `drylake.au` at the site with a 301 | Ben | Synergy DNS |
| 8 | Founder name on the site is "Benedict Wambugu"; ASIC/ABR use "Benedict Wambugu Gathii" and Ben is changing his M365 display name to "Benedict Gathii". Which public name? | Ben | Changes `/about`, JSON-LD `@id` fragments |
| 9 | Is "Drylake" itself registered as a business name? Not needed if trading as the company's own name minus "Pty Ltd"; confirm the footer wording "trading name of DRYLAKE PTY LTD" | Ben | ASIC Connect |
| 10 | Is "reply within 1 business day" realistic for two founders? | Ben + Wilson | One constant to change |
| 11 | Acknowledgement email to enquirers | Ben + Wilson | Recommended; needs approval |
| 12 | Search Console ownership + sitemap submission | Ben | Already queued |
