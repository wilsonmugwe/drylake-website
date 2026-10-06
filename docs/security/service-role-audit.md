# Service-role audit

The service-role client (`createAdminSupabaseClient()`, `lib/supabase/admin.ts`) bypasses RLS.
Wherever it runs, **the application code is the only tenant boundary**, so each use must sit
behind an explicit check. `SUPABASE_SECRET_KEY` is read in exactly one file.

## Every use, grouped by justification

| Where | Files | Justification | Gate before use |
|---|---|---|---|
| Admin pages | 16 pages under `app/admin/**` | Admin manages every client, which RLS by design does not allow a single user token to see | `requirePlatformAdmin()` at the top of each page (test: every admin page) |
| Admin API routes | 13 routes under `app/api/admin/**` | Same: cross-tenant administration, Clerk and Supabase writes, storage uploads | `authorizeAdminApi()` / `isPlatformAdmin()` **before** body parsing and before the client is created (test enforces the order) |
| Admin check itself | `lib/auth/platform-admin.ts` | Reads `platform_admins`, which no user token can read | Requires a Clerk `userId`; returns false on any error |
| Workspace mapping | `lib/auth/client-context.ts` | Maps Clerk-verified org ids to `organizations` rows (id, name, status only) before the user's token is checked through RLS | Inputs come only from Clerk (session org id, Backend API memberships), never the browser; the workspace is not `ready` until the same row is re-read **through RLS** with the user's token |
| Document download | `app/api/client/documents/[documentId]/download/route.ts` | Minting a 60-second signed URL for a private bucket | Document and project already read through the **RLS client**; the service client only calls `storage.createSignedUrl` (test asserts nothing else) |
| Invitation completion | `app/api/client/invitations/complete/route.ts` | Writing the audit row | Clerk session, strict Origin, verified-email invitations only |
| Checkout | `app/api/stripe/checkout/route.ts` | Reading and recording the Stripe session id (server bookkeeping column) | Org and invoice first read through RLS; every service query filters by that invoice id **and** organisation id |
| Stripe webhook | `app/api/stripe/webhook/route.ts` | Marking invoices PAID, audit rows; there is no user token on a webhook | Stripe signature verified first; writes conditional on the status read |
| Contact form | `app/api/contact/route.ts` | Single-use Turnstile token claims (`turnstile_token_claims`) | Field validation first; only the token fingerprint table is touched |

Any new file that creates the service client outside these locations fails
`tests/security-hardening.test.mjs` ("service-role and secret confinement").

## Exposure checks

| Channel | Check | Result |
|---|---|---|
| Browser bundles | `npm run build`, then searched every file in `.next/static` (54 files) for the value of each server secret (`SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `TURNSTILE_SECRET_KEY`, `CLERK_SECRET_KEY`) and for `sk_live_`, `sk_test_`, `whsec_`, `sb_secret_`, `service_role` | **0 values found.** One chunk contains the *name* `CLERK_SECRET_KEY` inside Clerk's library (`process.env` lookup that resolves to undefined in the browser) |
| Prerendered HTML / RSC | Same value search over `.next/server` `.html`, `.rsc`, `.body` | **0** |
| `NEXT_PUBLIC_*` | No public variable name contains SECRET, SERVICE_ROLE, PRIVATE, WEBHOOK or API_KEY (tested); env registry from PR 1 also checks | Pass |
| API responses | Every route returns fixed messages and codes; no route serialises an error object, a client or an env value | Pass (read of all 18 routes) |
| Logs | Logs carry ids, codes and Supabase error messages only; signed URLs, tokens and request bodies are never logged (Turnstile logs a 12-char fingerprint) | Pass |
| Imports | `lib/supabase/admin.ts`, `lib/stripe.ts`, `lib/email/*` start with `import "server-only"` (tested); no `"use client"` file imports them or reads a non-public env var (tested) | Pass |
| Git history | All 154 commits searched for key patterns (values redacted in output) | No live keys; one placeholder string in a test |

## Recommendation (not done here)

Narrow the service role where a user token would do. The best candidate is
`lib/auth/client-context.ts`'s mapping query: once the RLS inventory confirms the
organisations policy, the mapping could use the user's token and lose its RLS bypass. That is
a behaviour change to the most sensitive code path, so it belongs in its own reviewed PR
after F3 is closed.
