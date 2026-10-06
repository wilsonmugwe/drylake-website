# Production readiness (PR 1 of 4)

Programme: PR 1 Production Readiness + E2E Acceptance, then PR 2 Security Hardening, PR 3
Backup + Disaster Recovery, PR 4 Codebase Professionalisation. Each is reviewed by Wilson and
merged before the next starts.

**PR 1 objective:** prove the existing production application can carry the complete client
lifecycle, and give Wilson an exact procedure to confirm it on production. Not a security
refactor, not a cleanup, not a redesign.

| Document | Contents |
|---|---|
| [architecture.md](architecture.md) | Production architecture, dependencies, data flows |
| [lifecycle-acceptance.md](lifecycle-acceptance.md) | Every lifecycle step: code, automated coverage, verification status. Failure states |
| [configuration-audit.md](configuration-audit.md) | Environment-variable registry and audit, production URLs, region |
| [wilson-production-acceptance.md](wilson-production-acceptance.md) | The exact production acceptance checklist |
| [deferred-findings.md](deferred-findings.md) | Findings recorded for PR 2, 3 and 4 and deliberately not fixed here |

## Verification legend

Every claim in these documents carries one of these labels. A step is only "verified" at the
level stated; nothing is promoted.

| Label | Meaning |
|---|---|
| **AUTOMATED** | Covered by `npm test` (node:test, pure modules and source guards). Runs in CI and locally |
| **LOCAL** | Checked against a local `next build` with placeholder keys (no real Clerk, Supabase, Stripe or Resend) |
| **PROD-PROBE** | Observed on https://drylake.com.au with anonymous HTTP requests only (no account, no payment) |
| **PREVIEW** | Requires a Vercel preview with test keys. Not available to this PR: previews are blocked for commits not authored by Wilson |
| **WILSON-PROD** | Requires a real signed-in production session, real email, or Stripe. Not performed by the PR author |

**No real external production flow (Clerk invitation, sign-in, email delivery, Stripe
payment, webhook) was executed for this PR.** The author holds no production accounts or
keys. Those steps are WILSON-PROD in the checklist.

## Changes in this PR

1. **Invitation links always use the canonical domain in production** (`lib/clients/invitations.ts`
   `invitationOrigin`, used by the three invitation routes). Previously the link took the host
   of the admin's request, so an admin on the vercel.app production alias would mail a client a
   link where the production Clerk instance (bound to drylake.com.au) cannot sign them in. Same
   defect class the invoice email already fixed. Preview and local behaviour unchanged.
2. **Root error boundary** (`app/global-error.tsx`). An error thrown by the root layout (for
   example ClerkProvider with a missing key) showed Next's unbranded default page. It now shows a
   branded page with a reference digest and no error detail.
3. **Environment-variable registry and audit** (`scripts/env-registry.mjs`,
   `scripts/check-env.mjs`). Names and value classes only, never values. A test fails if the code
   reads a variable that is not registered.
4. **Regression tests** `tests/production-readiness.test.mjs` (19 tests).
5. These documents.

No behaviour changes to auth, RLS, onboarding, projects, invoices, GST, Stripe, email, the
portal, Admin or the discoverability work, beyond change 1 in production only.
