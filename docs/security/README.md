# Security hardening (PR 2)

Adversarial review of the Drylake production application, done on `main` after PR #22
(production readiness) merged. Scope and method follow the PR 2 brief: assume the attacker
can create accounts, edit URLs and request bodies, call APIs directly, know valid UUIDs,
read our browser JavaScript, replay requests and try to cross tenants. The UI is never
treated as a security boundary.

| Document | Covers |
|---|---|
| this file | threat model, findings, fixes, residual risks, deferred items |
| [rls-and-tenant-isolation.md](rls-and-tenant-isolation.md) | table inventory, RLS matrix, tenant-isolation tests |
| [api-security-matrix.md](api-security-matrix.md) | every API route: authn, authz, scoping, validation, CSRF, limits |
| [service-role-audit.md](service-role-audit.md) | every service-role use, why, and bundle/log exposure proof |
| [stripe-security.md](stripe-security.md) | Checkout amount authority, webhook authentication and replay |
| [security-headers.md](security-headers.md) | CSP, HSTS and the other headers, current and planned |
| [production-security-acceptance.md](production-security-acceptance.md) | exact checks for Wilson on production |
| [sql/rls-inventory.sql](sql/rls-inventory.sql) | read-only SQL that dumps RLS, policies, grants, storage, functions |

## Threat model

| Asset | Threat | Primary control | Second control |
|---|---|---|---|
| Client A's projects, documents, updates, invoices | Client B reads them by ID (URL or API tampering) | Supabase RLS on the user's Clerk token | Explicit `organization_id` filters + single workspace resolver (`lib/auth/access.ts`) |
| Admin functions (create clients, invoices, uploads) | A client, or anyone, calls admin APIs directly | `authorizeAdminApi()` / `isPlatformAdmin()` server-side on every route and page, before any input or service-role use | Static test enforces the ordering (`tests/security-hardening.test.mjs`) |
| Invoice payment state | Browser or forged request marks an invoice PAID or changes the amount | Only the signature-verified Stripe webhook writes PAID; amount comes from the stored invoice | Conditional writes, PAID is terminal, anomalies audited |
| Service-role key | Key reaches the browser, HTML, responses or logs | `server-only` modules; never `NEXT_PUBLIC_*` | Build output scanned (see service-role audit) |
| Signed-in session | CSRF from another site or a sibling subdomain | **New:** proxy refuses cross-origin mutations | Clerk `SameSite=Lax` session cookie, JSON-only checkout |
| Contact form / inbox | Spam, header injection, oversized bodies, token replay | Turnstile with single-use token store | **New:** strict field validation, byte limit on the real body |
| Client downloads | Malicious file served to clients as a PDF | Admin-only upload, private bucket, 60 s signed URLs | **New:** file signature must match the declared type |
| Redirects | Open redirect after sign-in | Relative-path-only return paths | **New:** one rule for all return paths, control characters refused |

Out of scope by design: Clerk's and Stripe's own infrastructure, Supabase platform security,
and denial-of-service beyond request-size limits (Vercel's edge handles volumetric traffic).

## Findings

Severity follows the brief: CRITICAL / HIGH / MEDIUM / LOW / INFORMATIONAL. **No CRITICAL or
HIGH issue was found in the code.** The largest open risk is not a code defect: the database
layer (RLS) cannot be proven from the repo at all.

| # | Severity | Finding | Status |
|---|---|---|---|
| F1 | MEDIUM | State-changing API routes (13 admin, checkout, contact) relied on `SameSite=Lax` alone against CSRF. Lax still sends the session cookie from any `*.drylake.com.au` origin. Only `/api/client/invitations/complete` checked Origin | **Fixed.** `proxy.ts` refuses cross-origin and same-site-but-not-same-origin mutations to `/api/*` before any handler runs (Stripe webhook exempt). Tested |
| F2 | MEDIUM | The live CSP (Clerk-managed) has `script-src 'unsafe-inline' https: http:`, so it does not stop injected scripts | **Partly fixed:** added `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`. Strict nonce mode is **not** enabled: it must be proven on a preview against Clerk sign-in, Stripe and Turnstile first (plan in security-headers.md) |
| F3 | MEDIUM (unverified) | RLS policies, grants and functions live only in Supabase. Tenant isolation at the database layer cannot be reviewed or tested from the repo | **Wilson action:** run `sql/rls-inventory.sql`, return results. Committing the schema is PR 3 |
| F4 | LOW | Contact `name`, `company`, `projectType`, `budget` accepted CR/LF; name and company go into the email Subject (header-injection attempt; Resend's JSON API makes it unlikely to work, but it was never refused) | **Fixed.** Line breaks refused in single-line fields (`lib/contact/validate-enquiry.ts`). Tested |
| F5 | LOW | Contact size limit checked only the optional `Content-Length` header; a chunked body skipped it | **Fixed.** Limit enforced on the bytes actually read. Tested |
| F6 | LOW | `signInUrl()` allowed `/\host`; `safeReturnPath()` allowed tab/newline, which browsers strip into `//host`. Not exploitable today (all callers pass server-built paths), but one future caller away from an open redirect | **Fixed.** One rule for both, control characters and whitespace refused. Tested |
| F7 | LOW | Admin uploads checked the browser MIME label and extension, not the bytes. Clients download these files | **Fixed.** PDF / PNG / DOCX signature must match. Tested |
| F8 | LOW | No application-level rate limiting. Contact relies on single-use Turnstile tokens; other routes are authenticated | **Wilson action:** confirm Vercel Firewall rate-limit rules (acceptance step S7) |
| F9 | LOW | `npm audit`: `source-map-js` (build-time DoS) and `braces` via `eslint-config-next` (dev-only) | `source-map-js` **fixed** (lockfile patch 1.2.1 to 1.2.2). `braces` **accepted**: dev-only, and the only fix is a breaking downgrade of `eslint-config-next`. **Production dependencies: 0 vulnerabilities** |
| F10 | LOW | Clerk's own validation of `redirect_url` on `/sign-in` is relied on, not configured explicitly | **Wilson action:** acceptance step S3 proves a foreign `redirect_url` is ignored |
| F11 | INFO | Clerk's browser bundle references the *name* `CLERK_SECRET_KEY` (library code reading `process.env`). The value is not present | No action. Verified on the build output |
| F12 | INFO | Secret scan of the working tree and all 154 commits: no live keys. One Turnstile-shaped string is a test placeholder (`...unit-test-secret-not-real`) | No action |
| F13 | INFO | HSTS has no `preload`. Preload is hard to reverse and covers every subdomain | Decision for Ben; not changed |
| F14 | INFO | Webhook signature verification moved into a tested helper with an explicit 300 s replay window | Done (behaviour unchanged except the webhook no longer needs `STRIPE_SECRET_KEY` to verify) |

## What changed in this PR

| File | Change | Why |
|---|---|---|
| `lib/security/same-origin.ts` (new), `proxy.ts` | Refuse cross-origin mutations to `/api/*` | F1 |
| `lib/security/csp.ts` (new), `proxy.ts` | Extra CSP directives passed to Clerk | F2 |
| `lib/contact/validate-enquiry.ts` (new), `app/api/contact/route.ts` | Pure validator; real byte limit; line breaks refused | F4, F5 |
| `lib/auth/request-kind.ts`, `lib/auth/guards.ts` | Single return-path rule | F6 |
| `lib/validation/file-signature.ts` (new), admin documents route | Byte signature check before storage | F7 |
| `lib/invoices/webhook-verification.ts` (new), webhook route | Tested signature verification | F14 |
| `package-lock.json` | `source-map-js` 1.2.2 | F9 |
| `tests/security-hardening.test.mjs` (new) | 49 regression tests | all of the above, plus confinement rules |

Behaviour preserved: all 403 pre-existing tests pass unchanged. User-visible changes: a
cross-origin POST to the API now gets 403 (no legitimate caller does this); a contact
enquiry with a line break in the name or company is refused with "Invalid characters
detected."; an upload whose bytes do not match its type is refused with 415.

## Accepted residual risks

1. **CSP does not block inline or third-party scripts** until strict mode is proven (F2).
   Mitigated by: no user HTML is rendered anywhere (React escaping; one
   `dangerouslySetInnerHTML`, JSON-LD built server-side with `<` escaped).
2. **Database-layer isolation unproven** until the SQL inventory comes back (F3). Mitigated
   by explicit organisation filters in every client query and the single resolver.
3. **Rate limiting depends on Vercel configuration** (F8).
4. **`braces` in the ESLint toolchain** (F9), dev-only.
5. **Admin is a single trust tier.** Any platform admin can act on every client; there is no
   per-admin scoping. Acceptable for a two-person company; revisit with the first hire.

## Deferred to later PRs

| Item | PR |
|---|---|
| Commit the full schema, RLS policies, grants and functions as migrations | PR 3 |
| A staging or scratch database so RLS can be tested automatically against real Postgres | PR 3 |
| Repeated `jsonError` helpers and inline `audit_logs` writes (pattern consistency, no security effect) | PR 4 |
