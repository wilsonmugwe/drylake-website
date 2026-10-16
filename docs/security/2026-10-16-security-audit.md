# Security audit, 16 October 2026 (Workstream 2)

Current-state audit of drylake.com.au at commit `6f3c636` (production `/api/health` reports the
same commit), plus the remediation made in the same pull request. It builds on the PR 2
hardening record in [README.md](README.md) and does not repeat it; where PR 2 already closed
something, this audit re-measured it.

**This is an engineering audit, not a certification.** It does not claim the platform is
secure, compliant with any standard, or free of vulnerabilities. Items that need production
access are listed as owner checks in [manual-verification-checklist.md](manual-verification-checklist.md).

## Method and confidence

| Grade | Meaning |
|---|---|
| HIGH (measured) | Observed directly: a live response header, a command run, a test that passes |
| MEDIUM (inferred) | Read from code or documentation, not proven against production |
| NONE (not established) | Needs access this audit did not have; recorded as an owner check |

Evidence gathered on 2026-10-16:

- Live, read-only GETs to `https://drylake.com.au` (headers, robots, security.txt, public pages,
  TLS handshake, crawler user agents); six POSTs to public and gated endpoints with empty or
  invalid bodies, spaced 12 s apart. No real enquiry or booking was submitted, no brute force.
- Source review: `proxy.ts`, `next.config.ts`, every file under `app/api`, `lib/auth`,
  `lib/security`, `lib/contact`, `lib/consultations`, all three migrations,
  `.github/**`, `scripts/env-registry.mjs`.
- `gitleaks` (Docker image, all refs of the main clone, 215 commits) plus a regex sweep of 293
  commits in the worktree.
- `npm audit` (full and `--omit=dev`) and a local `next build` with a search of `.next/static`
  for secret names, secret values and key prefixes.
- Not accessible: Vercel dashboard, Supabase production, Clerk dashboard, GitHub repository
  settings (write access, not admin).

## Summary

| Severity | Count | Fixed in this PR | Documented / owner action |
|---|---|---|---|
| Critical | 0 | 0 | 0 |
| High | 0 | 0 | 0 |
| Medium | 5 | 0 | 5 |
| Low | 10 | 3 | 7 |
| Info | 6 | 1 | 5 |

No Critical or High finding was **established**. That is not the same as none exist: the two
largest unknowns (database-layer isolation, and MFA on the admin accounts) are not provable from
the repository and are rated Medium with confidence NONE until the owner checks are run.

Top five (details in the register):

1. **S-03** Admin accounts: MFA and session settings in Clerk are unverified. Every admin route
   trusts the Clerk session, so an admin account takeover is full cross-tenant access.
2. **S-02** Database-layer isolation (RLS, grants, storage policies) cannot be reviewed from
   the repo: 10 core tables, policies and `current_clerk_org_id()` exist only in Supabase.
3. **S-01** The live CSP contains `script-src 'unsafe-inline' https: http:`, so it does not stop
   an injected script. Mitigated by having no path that renders user HTML.
4. **S-04** The repository is private on a plan without GitHub Advanced Security: Dependabot
   alerts are disabled, code scanning is off, and no branch protection or ruleset can exist.
5. **S-05** No alerting or long-retention logging: abuse of the enquiry and booking forms, or a
   run of failed logins, would not notify anyone.

## 1. Hosting and application protection

### 1.1 Transport and headers (live, 2026-10-16, `GET /`)

| Header | Observed | Assessment |
|---|---|---|
| TLS | TLS 1.3, TLS_AES_128_GCM_SHA256, Let's Encrypt, chain verifies; TLS 1.0 and 1.1 handshakes refused | Good. HIGH |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Good; no `preload` (Info S-16). HIGH |
| HTTP to HTTPS, `www` to apex | `http://` returns 308 to `https://drylake.com.au/`; `www` returns 308 | Good. HIGH |
| `X-Content-Type-Options` | `nosniff` | Good. HIGH |
| `X-Frame-Options` | `DENY` and CSP `frame-ancestors 'none'` | Good. HIGH |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Good. HIGH |
| `Permissions-Policy` | camera, microphone, geolocation, payment, usb, browsing-topics off | Good. HIGH |
| `Content-Security-Policy` | see 1.2 | S-01 |
| `X-Powered-By` | absent (`poweredByHeader: false`, `next.config.ts:50`) | Good. HIGH |
| `Access-Control-Allow-Origin` | `*` on the prerendered homepage | S-14 |
| Cross-Origin-Opener-Policy | absent | Info S-16 (documented in security-headers.md: Clerk popups) |

Headers are set in `next.config.ts:21-48` and applied to `/(.*)` (line 62); the CSP comes from
Clerk's middleware (`proxy.ts:101-105`). Private prefixes also carry `X-Robots-Tag: noindex`
(measured on `/sign-in`).

### 1.2 CSP quality (S-01, Medium, HIGH)

Live policy, abbreviated: `default-src 'self'; script-src 'self' 'unsafe-inline' https: http:
https://*.js.stripe.com https://js.stripe.com https://maps.googleapis.com
https://*.protect.clerk.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline';
object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; frame-src ...`.

- `'unsafe-inline'` plus the bare `https:` and `http:` schemes means any injected inline script,
  and any script from any host (including plaintext `http:`), is permitted. The CSP is not a
  second line of defence against XSS today.
- `maps.googleapis.com` appears in `script-src` and `connect-src` but nothing in the code
  uses Google Maps; it is a Clerk default.
- Good parts: `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`,
  `frame-ancestors 'none'`.
- **Why not fixed here:** Clerk's strict (nonce plus `strict-dynamic`) mode makes every page
  dynamic and can break sign-in, Stripe and Turnstile. The plan in
  [security-headers.md](security-headers.md) (report-only on a preview first) stands. Changing
  it blind would violate this workstream's constraint not to risk Clerk/Turnstile/Analytics.
- **Remediation (owner/next PR):** run strict mode in `reportOnly` on a preview for one week,
  then enforce. Expect static pages to become dynamic (performance cost to measure).

### 1.3 XSS (Low risk, MEDIUM)

- One `dangerouslySetInnerHTML`, `components/seo/JsonLd.tsx:8`, fed by `jsonLd(nodes)` which
  escapes `<`. Test `security-hardening.test.mjs` asserts it is the only one.
- No `eval`, `new Function`, or `"use server"` anywhere in `app`, `lib`, `components`.
- The Markdown route (`app/api/markdown/route.ts`) fetches only an exact allowlist of public
  paths from its own origin (live probe with `?path=https://evil.example/` returned 404).
  Its `innerHTML` use (`lib/discovery/markdown.ts:85-128`) reads server-rendered public HTML,
  not user input.
- Emails: enquiry and invoice emails escape every interpolated value (tested).

### 1.4 CSRF (good, HIGH)

`proxy.ts:35-52` refuses cross-origin and same-site-but-not-same-origin mutations to `/api/*`
before any handler (Stripe and Clerk webhooks exempt, `lib/security/same-origin.ts`). Measured:
`POST /api/contact` with `Origin: https://evil.example` returned 403 `Forbidden`. Clerk's
session cookie is `SameSite=Lax`. The invitation-completion route additionally requires an
exact Origin match.

### 1.5 Input validation and errors (good, MEDIUM)

- Public forms: byte-limited JSON reads (`lib/security/read-json.ts`, `lib/contact/validate-enquiry.ts`),
  line breaks refused in Subject-bound fields, UUID checks on every path parameter.
- Live probes with empty bodies: `/api/contact` 400, `/api/consultations` 400,
  `/api/consultations/manage` 400 (all generic messages, no stack, no framework strings).
- Unauthenticated: `/api/admin/clients` 401, `/api/stripe/checkout` 401,
  `/api/client/documents/<uuid>/download` 401, `/api/cron/...` 401, unsigned Stripe webhook 400.
- `app/error.tsx` and `app/global-error.tsx` show only the opaque digest. `/.env` and
  `/.git/config` return 404.

### 1.6 Vercel WAF, DDoS, bot mitigation, rate limiting

| Control | Finding | Confidence |
|---|---|---|
| Platform DDoS mitigation | Provided by Vercel on every plan; not configurable by the site | MEDIUM |
| Vercel Firewall custom and rate-limit rules | Cannot be read without the dashboard. The repo expects a rate-limit rule on `POST /api/contact` (S7 in production-security-acceptance.md); not proven | NONE |
| Attack Challenge Mode / Bot Protection | Owner setting; state unknown. Owner step in the checklist | NONE |
| In-app rate limits | Per-instance fixed window (`lib/security/rate-limit.ts`): bookings 5 per 10 min per IP, availability 60 per min, manage 30 per 10 min, **contact 10 per 10 min (new in this PR)**. Per-instance, so it bounds a burst against one warm function, not a distributed attack | HIGH (code) |
| Login rate limiting | Clerk-managed (sign-in attempt limits, bot protection). No app code. Owner confirms in Clerk | NONE |

S-06 (Low): in-memory limiters do not share state across Vercel instances; the shared-bucket
fallback key `"unknown"` means a request with no client IP header shares one bucket (Info S-19).
Vercel sets `x-forwarded-for` itself, so the first hop is the connecting client, not
caller-supplied.

**Crawler cross-check.** Live GETs to `/services` with Googlebot, bingbot, OAI-SearchBot,
PerplexityBot, ChatGPT-User, Claude-SearchBot and GPTBot user agents all returned 200;
`/sitemap.xml` and `/llms.txt` return 200. So no firewall rule blocks legitimate search or AI
crawlers (note a spoofed UA from one IP does not prove Vercel's verified-bot handling, only the
absence of UA-based blocks). `robots.txt` disallows GPTBot, ClaudeBot, CCBot, meta-externalagent,
Amazonbot and Applebot-Extended by policy and allows Google-Extended; the WAF does not enforce
that (policy only). This PR does not touch robots.txt or `scripts/discoverability-check.mjs`;
`/api`, `/admin`, `/client`, `/portal`, `/sign-in`, `/sign-up`, `/consultation/manage` stay
disallowed and noindex. Any firewall rule an owner adds must exempt verified bots and the
paths `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/llms-full.txt`, `/.well-known/*`, and the
IndexNow key file.

## 2. Supabase

| Area | Finding | Confidence |
|---|---|---|
| Consultation tables | `consultation_bookings`, `consultation_booking_events` (append-only trigger), `consultation_notifications`: RLS enabled, all privileges revoked from `anon` and `authenticated`, only `service_role` granted (`20261013120000_consultation_bookings.sql:144-164`) | HIGH (migration text) |
| Consultation functions | Every function in the two migrations' revoke lists (10 each, some replaced by the second migration), all `set search_path = ''`, none `SECURITY DEFINER`, `EXECUTE` revoked from public/anon/authenticated and granted to `service_role` only (migration 1 lines 696-721, migration 2 lines 735-762). The representative table and `consultation_rank_representatives` are covered by the same blocks | HIGH (migration text) |
| Core tables (`organizations`, `projects`, `milestones`, `documents`, `project_updates`, `invoices`, `invoice_notifications`, `audit_logs`, `platform_admins`, `turnstile_token_claims`) and `current_clerk_org_id()` | **Not in the repository.** Only 3 migrations are committed; `docs/operations/disaster-recovery/schema-as-code.md` records the baseline as outstanding. RLS state, grants and any `SECURITY DEFINER` function are unverified | NONE (S-02) |
| Storage `client-documents` | Bucket privacy and `storage.objects` policies unverified. Code only mints 60 s signed URLs after an RLS read | NONE |
| Service-role paths | `createAdminSupabaseClient()` in one file; every use is behind an admin gate, a verified signature, or a prior RLS read ([service-role-audit.md](service-role-audit.md)); confinement is a test | HIGH |
| SQL injection | supabase-js builders and `rpc` with bound parameters only; one `.or()` string interpolates a Stripe-returned session id, not user input | MEDIUM |
| Cross-client isolation | Resolver and explicit `organization_id` filters tested (`tests/tenant-isolation.test.mjs`); the DB layer is the unproven half | MEDIUM |
| Booking data access | Customers reach one booking only through an HMAC management token (256-bit, bound to booking id and version, only SHA-256 stored, token in URL fragment, POST body only); admins through the admin gate; unknown, malformed and expired tokens get the same 404 (`app/api/consultations/manage/route.ts`) | HIGH (code) |
| Backups and PITR | Plan unknown; docs state Free has none and Pro has 7 days daily, PITR is a paid add-on, and storage objects are not in database backups (`supabase-backup-and-restore.md`) | NONE (S-11) |

Owner check: run [`docs/security/sql/rls-inventory.sql`](sql/rls-inventory.sql) read-only in the
SQL editor (it is in the checklist) and compare to the matrix in
[rls-and-tenant-isolation.md](rls-and-tenant-isolation.md). Next engineering step: the
baseline dump (S-02 closes only when it is committed and reviewed).

## 3. Authentication and authorisation

Sessions, cookie flags, password reset, MFA and lockout are **Clerk-managed**; none is
configured in this repository (`proxy.ts` only passes `jwtKey` and CSP directives). Their
state is NONE confidence and is an owner check (S-03).

### 3.1 Every privileged handler

There are **no server actions** (`"use server"` appears nowhere). Every mutation is a route
handler. `proxy.ts` only answers "is anyone signed in" for private pages; each handler and page
authorises itself. The new test `tests/security-audit-2026-10-16.test.mjs` classifies every
file under `app/api` so a new unclassified route fails the build.

| Route | Method | Check performed |
|---|---|---|
| `/api/admin/clients` | POST | `authorizeAdminApi` (401 signed out, 403 non-admin) before body or service role |
| `/api/admin/clients/[organizationId]/status` | POST | `authorizeAdminApi`, UUID check |
| `/api/admin/clients/[organizationId]/invitations` | POST | `authorizeAdminApi`, UUID |
| `/api/admin/clients/[organizationId]/invitations/[invitationId]` | POST | `authorizeAdminApi`, UUID |
| `/api/admin/clients/[organizationId]/billing` | POST | `auth()` userId then `isPlatformAdmin()` |
| `/api/admin/clients/[organizationId]/projects` | POST | `auth()` then `isPlatformAdmin()` |
| `/api/admin/clients/[organizationId]/invoices` | POST | `auth()` then `isPlatformAdmin()`; GST computed server-side |
| `/api/admin/invoices/[invoiceId]/issue` | POST | `authorizeAdminApi`; conditional update on DRAFT |
| `/api/admin/invoices/[invoiceId]/resend` | POST | `authorizeAdminApi` |
| `/api/admin/milestones/[milestoneId]/status` | POST | `auth()` then `isPlatformAdmin()` |
| `/api/admin/projects/[projectId]/documents` | POST | `auth()` then `isPlatformAdmin()`; 10 MB cap, MIME plus byte signature |
| `/api/admin/projects/[projectId]/milestones` | POST | `auth()` then `isPlatformAdmin()` |
| `/api/admin/projects/[projectId]/updates` | POST | `auth()` then `isPlatformAdmin()` |
| `/api/admin/consultations/[bookingId]` | POST | `authorizeAdminApi`; action allowlist; version-checked SQL function |
| `/api/client/documents/[documentId]/download` | GET | Clerk session via `getClientWorkspace()`, document read through RLS with `visible_to_client`, 404 for other tenants, 60 s signed URL |
| `/api/client/invitations/complete` | POST | Clerk session, exact Origin match, verified-email invitations only |
| `/api/stripe/checkout` | POST | Clerk session plus active org; JSON only; invoice read through RLS with explicit org filter |
| `/api/stripe/webhook` | POST | Stripe signature over the raw body, 300 s tolerance, CSRF-exempt by design |
| `/api/clerk/webhook` | POST | Svix signature before the body is used, CSRF-exempt by design |
| `/api/cron/consultation-notifications` | GET, POST | `Authorization: Bearer CRON_SECRET`, secret must be 16+ chars, constant-time compare (`route.ts:14-19`); measured 401 without it |
| `/api/consultations` | POST | Public: field rules, rate limit, Turnstile (single-use, hostname and action bound), DB-enforced per-email and slot limits |
| `/api/consultations/availability` | GET | Public read, rate limited, returns slot times only |
| `/api/consultations/manage` | POST | Public: HMAC management token, rate limited, same 404 for all bad tokens |
| `/api/contact` | POST | Public: validation, rate limit (new), Turnstile, byte limit |
| `/api/health` | GET | Public, `no-store`, returns status, region, environment, commit, no variable names |
| `/api/markdown` | GET | Public, exact allowlist of public paths |

Pages: every `app/admin/**` page calls `requirePlatformAdmin()` or `auth()` plus
`isPlatformAdmin()` itself (layouts do not re-run on soft navigation; this is enforced by
`tests/tenant-isolation.test.mjs`). Every `app/client/**` page resolves the workspace from the
session via `getClientWorkspace()` and never takes an organisation id from the URL.

### 3.2 Findings

- No missing server-side authorisation was found on any handler or page. HIGH for the code
  paths above; the database half is S-02.
- **S-03 (Medium, NONE):** the platform admin allow-list is the `platform_admins` table keyed by
  Clerk user id, so an admin's Clerk account is the single key to every client. Owner checks:
  MFA required (or at least enrolled) for every account in `platform_admins`; session lifetime
  and inactivity timeout set deliberately; sign-out ends the session server-side; password
  reset requires email verification; sign-up restrictions (invitation-only) on; bot
  protection on. The checklist has the exact Clerk steps.
- **S-13 (Low):** any platform admin can act on every client (single trust tier). Acceptable for
  two people; revisit at the first hire.
- Logout invalidation, cookie `Secure`/`HttpOnly`/`SameSite` flags: Clerk issues `__session`
  (readable by design for Supabase tokens) and `__client` (HttpOnly). Confirm in the browser
  (checklist step). Not provable here.

## 4. Secrets and dependencies

| Check | Result | Confidence |
|---|---|---|
| gitleaks, all refs, 215 commits | 3 findings, all false positives: two `idempotencyKey` test fixtures and the public IndexNow key (`lib/discovery/indexnow.ts:12`, published at `/<key>.txt` by design) | HIGH |
| Regex sweep, 293 commits, for Stripe, Supabase, Resend, AWS, GitHub, Slack keys, JWTs and private-key blocks | 0 matches | HIGH |
| Tracked env files | only `.env.example`; `.gitignore` ignores `.env*` | HIGH |
| `NEXT_PUBLIC_*` review | Public names in use: Clerk publishable key and sign-in/up URLs, Supabase URL and publishable key, Turnstile site key. None contains SECRET, SERVICE, PRIVATE, WEBHOOK or API_KEY (tested; env registry classifies exposure) | HIGH |
| Client bundle | `next build` locally; searched 63 files in `.next/static` and `.next/server` for each server secret value from `.env.local` (placeholders) and for `sk_live_`, `sk_test_`, `whsec_`, `sb_secret_`, `service_role`, PEM headers: **0**. Three chunks contain the literal name `CLERK_SECRET_KEY` inside Clerk's library (no value). Local keys are placeholders, so this proves the build does not inline server variables, not that production values are absent | HIGH for mechanism |
| `npm audit --omit=dev` | **0 vulnerabilities** in production dependencies | HIGH |
| `npm audit` (all) | 5 "high": `eslint-config-next` chain (`@next/eslint-plugin-next`, `braces`, `fast-glob`, `micromatch`). Build and lint tooling only; not shipped, not reachable at runtime. npm's suggested fix (a major downgrade) is wrong; wait for the upstream release | HIGH |
| GitHub Actions | `permissions: contents: read`, no secrets used, actions pinned by major tag (`@v7`) not commit SHA | HIGH |

S-10 (Low): the dev-toolchain advisories. S-09 (Low): actions pinned by tag; Dependabot now
updates Actions weekly (it was monthly), which is the practical control. Pinning to SHAs is an
optional hardening for a later PR.

**Secret rotation.** No exposed secret was found, so no rotation is recommended by this audit.
The existing inventory is [secrets-recovery-inventory.md](../operations/disaster-recovery/secrets-recovery-inventory.md).

## 5. Monitoring and incident response

| Area | State | Confidence |
|---|---|---|
| What is logged | `console.*` to Vercel runtime logs: error codes, ids, outcome codes, booking reference. Never request bodies, enquiry text, recipients, signed URLs or tokens (Turnstile logs a 12-char fingerprint) | MEDIUM (grep of all `console.*` calls) |
| PII in logs | Provider error text (Resend, Microsoft Graph) was logged and stored in outbox `last_error` verbatim and could echo a recipient. **Fixed (S-08):** `lib/security/redact.ts` strips emails, phone numbers, bearer tokens and long tokens, collapses newlines, caps at 300 chars; applied in `lib/consultations/dispatch.ts`, `lib/consultations/calendar-sync.ts` and the contact route | HIGH |
| Audit trail | `audit_logs` (admin actions, invoices, uploads) and the append-only `consultation_booking_events` with actor | MEDIUM |
| Failed-login monitoring | Clerk dashboard only; nothing alerts | NONE |
| Abuse detection on enquiry and booking | Turnstile single-use tokens, rate limits, DB per-email/slot limits. No alert when they trigger | HIGH |
| Alerts | None configured. `/api/health` exists for an uptime monitor, but no monitor is documented as active | MEDIUM |
| Log retention | Vercel Hobby runtime logs are short-lived (about one hour on Hobby per Vercel's plan limits; verify in the dashboard). No log drain | MEDIUM |
| Incident runbook | New: [incident-response.md](incident-response.md). Operational disaster recovery already in `docs/operations/disaster-recovery/runbooks.md` | HIGH |
| Backup restore | Documented but untested on a restore-test project; plan unverified | NONE |

S-05 (Medium): with about an hour of log retention and no alerting, an attack or a run of
failures is only seen if someone is looking. Free options (owner decision): a free uptime
monitor on `/api/health`; Clerk email notifications for suspicious sign-ins; a Vercel log
drain or Pro plan if the business wants retention.

## 6. Repository and supply chain controls

`gh api` (write access only): the repository is **private**; branch protection, rulesets and
code scanning return not-found or "upgrade" responses; Dependabot alerts report "disabled";
secret scanning could not be read. For a private repository these controls (secret scanning,
push protection, code scanning/CodeQL, rulesets) need a paid GitHub plan or Advanced Security.
Consequently:

- **CodeQL was not added.** A workflow would fail on this repository ("Code scanning is not
  enabled"). If the repository is ever made public or Advanced Security is bought, add the
  standard `github/codeql-action` JavaScript/TypeScript workflow.
- `main` can be pushed to directly by anyone with write access; the only gates are team
  discipline and the post-merge `Checks` workflow. Owner decision recorded in S-04.
- **Fixed:** `.github/dependabot.yml` now updates `github-actions` weekly (was monthly); npm was
  already weekly. `SECURITY.md` added, pointing at `/.well-known/security.txt`.
- **Free action:** enable "Dependabot alerts" and "Dependabot security updates" in
  Settings > Code security (free on private repos).

## 7. Risk register

| ID | Severity | Finding | Evidence | Confidence | Status / remediation |
|---|---|---|---|---|---|
| S-01 | Medium | CSP allows `'unsafe-inline'`, `https:` and `http:` for scripts; style `'unsafe-inline'` | Live `content-security-policy` header on `/`; `lib/security/csp.ts` | HIGH | Open. Report-only strict mode on a preview first (security-headers.md) |
| S-02 | Medium | Core table RLS, grants, storage policies and `current_clerk_org_id()` live only in Supabase; 3 migrations committed | `supabase/migrations/`, schema-as-code.md | NONE | Open. Owner runs rls-inventory.sql; then commit baseline |
| S-03 | Medium | Clerk MFA, session lifetime, lockout and sign-up restrictions for admin and client accounts unverified | Not in repo | NONE | Open. Owner steps in checklist section 3 |
| S-04 | Medium | Private repo on a plan without Advanced Security: Dependabot alerts disabled, no code scanning, secret scanning and push protection unavailable, no branch protection or rulesets | `gh api` responses 403/404 | HIGH | Open. Enable Dependabot alerts (free); decide on plan or going public (public needs an ADR) |
| S-05 | Medium | No alerting; short log retention; no failed-login or abuse notification | No monitor config; Vercel plan | MEDIUM | Open. Owner decision, free uptime monitor first |
| S-06 | Low | Rate limits are per instance; Vercel Firewall rate-limit rule not verified | `lib/security/rate-limit.ts`; S7 acceptance step | MEDIUM | Open. Owner adds Firewall rules (checklist) |
| S-07 | Low | `/api/contact` had no in-app rate limit (bookings did) | `app/api/contact/route.ts` before this PR | HIGH | **Fixed**: 10 per 10 min per IP, after validation, before Turnstile; test added |
| S-08 | Low | Provider error text logged and stored in outbox could echo a recipient or phone number | `dispatch.ts:215`, `calendar-sync.ts:142`, contact route | HIGH | **Fixed**: `redactSensitive`; test added |
| S-09 | Low | Actions workflow dependencies pinned by tag; Dependabot for Actions was monthly | `.github/workflows/*.yml`, `dependabot.yml` | HIGH | **Fixed** (weekly). SHA pinning optional later |
| S-10 | Low | `npm audit`: 5 high, all in the `eslint-config-next` dev chain; production 0 | `npm audit` output | HIGH | Accepted; revisit when upstream ships |
| S-11 | Low | Supabase plan, backups and PITR unverified; storage objects not in DB backups; restore never rehearsed | supabase-backup-and-restore.md | NONE | Open. Owner checks plan and runs a restore test |
| S-12 | Low | A Cloudflare Turnstile test secret in production would only log, not refuse | `lib/contact/turnstile.ts:89-91` | HIGH | Accepted (log only is deliberate); checklist verifies the real secret |
| S-13 | Low | Single admin trust tier | `lib/auth/platform-admin.ts` | HIGH | Accepted for two people |
| S-14 | Low | `Access-Control-Allow-Origin: *` on prerendered public pages (Vercel static default) | Live header on `/` | HIGH | Accepted: public content only; no credentialed route sends it |
| S-15 | Info | `/api/health` discloses commit SHA, region, environment | Live response | HIGH | Accepted: matches the deploy-verification tests; no secrets |
| S-16 | Info | HSTS has no `preload`; no COOP header | Live headers | HIGH | Owner decision (preload is hard to reverse) |
| S-17 | Info | robots.txt disallows several AI training crawlers by policy; WAF does not enforce or block any crawler | robots.txt; crawler UA probes | HIGH | Policy unchanged |
| S-18 | Info | gitleaks reports 3 false positives (test fixtures, public IndexNow key) | gitleaks run | HIGH | None; allowlist if gitleaks is added to CI |
| S-19 | Info | Requests without a client IP share one rate-limit bucket (`"unknown"`) | route limiters | MEDIUM | Accepted; Vercel always supplies the header |
| S-20 | Info | No `SECURITY.md` | repo root before this PR | HIGH | **Fixed** |
| S-21 | Low | No static analysis in CI (CodeQL unavailable on this plan) | `.github/workflows` | HIGH | Open: documented; consider running free Semgrep OSS in CI later |

## 8. What changed in this PR

| Change | Findings | Test |
|---|---|---|
| `lib/security/redact.ts`; used in `lib/consultations/dispatch.ts`, `lib/consultations/calendar-sync.ts`, `app/api/contact/route.ts` | S-08 | `tests/security-audit-2026-10-16.test.mjs` |
| Rate limiter on `POST /api/contact` | S-07 | same file (wiring and order) |
| API route classification test (every route declares how it authenticates; stale entries fail) | audit 3.1 | same file |
| `.github/dependabot.yml` Actions weekly | S-09 | same file |
| `SECURITY.md` | S-20 | same file |
| Three docs: this audit, incident response, manual verification checklist | all | same file (existence) |

Not changed, by constraint: robots.txt policy, the CSP, booking and email business logic, any
environment variable or dashboard setting.

## 9. Residual risk

After this PR, with every owner check passed, the remaining risks are those of a small
Next.js, Clerk, Supabase and Stripe application run by two people: a vulnerability in a
dependency or in Clerk/Supabase/Vercel themselves; a compromised admin device or account
despite MFA; a bug in application authorisation logic that tests did not anticipate; a
misconfiguration made in a dashboard after this audit; and abuse that stays under the
per-instance rate limits. The CSP will not contain a script-injection bug until strict mode
ships. No penetration test by an external party has been done, and none of this constitutes a
security certification. Re-run this audit after any change to authentication, the database
schema, the CSP, or the hosting plan.

## 10. Owner actions (summary)

Full steps in [manual-verification-checklist.md](manual-verification-checklist.md).

1. Clerk: MFA on every platform admin, session lifetime, invitation-only sign-up (S-03).
2. Supabase: run `sql/rls-inventory.sql`, check plan, backups, PITR, bucket privacy (S-02, S-11).
3. Vercel: Firewall rate-limit rules, Attack Challenge Mode decision, verified-bot exemption,
   env var scoping, log retention (S-05, S-06).
4. GitHub: enable Dependabot alerts and security updates; decide on plan, secret scanning and
   protection for `main` (S-04).
5. Add a free uptime monitor on `/api/health` and an alert email (S-05).
6. Decide on the strict-CSP rollout (S-01) and HSTS preload (S-16).
