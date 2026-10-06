# Production configuration audit (names only, never values)

## Registry
The authoritative list is `scripts/env-registry.mjs`. `tests/production-readiness.test.mjs`
fails if any code reads `process.env.X` for an unregistered `X`, if a `NEXT_PUBLIC_` variable is
classed secret, or if a secret has a public name.

| Variable | Exposure | Category | Read by |
|---|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | public | required | `lib/supabase/*` |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | public | required | `lib/supabase/server.ts` |
| SUPABASE_SECRET_KEY | secret | required | `lib/supabase/admin.ts` (server-only) |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | public | required | @clerk/nextjs |
| CLERK_SECRET_KEY | secret | required | @clerk/nextjs |
| NEXT_PUBLIC_CLERK_SIGN_IN_URL | public | required | @clerk/nextjs (must be `/sign-in`) |
| NEXT_PUBLIC_CLERK_SIGN_UP_URL | public | required | @clerk/nextjs (must be `/sign-up`) |
| CLERK_JWT_KEY | server | optional | `proxy.ts` |
| STRIPE_SECRET_KEY | secret | required | `lib/stripe.ts` |
| STRIPE_WEBHOOK_SECRET | secret | required | webhook route |
| RESEND_API_KEY | secret | required | `lib/email/resend.ts` |
| EMAIL_FROM | server | required | `lib/email/resend.ts` |
| CONTACT_TO_EMAIL | server | required | `lib/email/contact-enquiry.ts` |
| NEXT_PUBLIC_TURNSTILE_SITE_KEY | public | required | contact + portal forms |
| TURNSTILE_SECRET_KEY | secret | required | `lib/contact/turnstile.ts` |
| TURNSTILE_ALLOWED_HOSTNAMES | server | optional | `lib/contact/turnstile.ts` |
| APP_BASE_URL | server | optional, **leave unset in production** | invoice + invitation links |
| GOOGLE_SITE_VERIFICATION / BING_SITE_VERIFICATION | server | optional | `app/layout.tsx` |
| VERCEL_ENV / VERCEL_REGION | platform | set by Vercel | invitations, timing logs |

## Findings

| Finding | Evidence | Status |
|---|---|---|
| **Production env could not be read by the PR author.** Missing / obsolete / duplicated / incorrectly-public cannot be stated for production without it | No Vercel access (D16) | **WILSON-PROD**: run `scripts/check-env.mjs` (checklist P0.1) |
| Clerk sign-in/up URLs are set in production | PROD-PROBE: `/sign-in` HTML carries `signInUrl=/sign-in`, `signUpUrl=/sign-up`, `pk_live_`, frontend API `clerk.drylake.com.au` | OK |
| No `.env.example` in the repo; the variables were documented nowhere | repo | Registry added (this PR). `.env.example` itself is a PR 4 item |
| Code reads no unregistered variable; no secret is `NEXT_PUBLIC_` | AUTOMATED | OK |
| `NEXT_PUBLIC_SUPABASE_URL` is used by the server-only admin client too | `lib/supabase/admin.ts` | OK: a URL, not a secret |

## Production URLs

| Check | Result |
|---|---|
| Hard-coded `localhost`, `127.0.0.1`, `*.vercel.app`, stale Drylake domains in app/lib/components | None outside `lib/invoices/invoice-url.ts` (local-dev allowance, guarded) and an IndexNow comment. AUTOMATED |
| Invoice email links | Always `APP_BASE_URL` or `https://drylake.com.au`; https only. AUTOMATED |
| Invitation links | **Fixed in this PR**: production always uses the canonical origin. AUTOMATED |
| Stripe success/cancel URLs | Request origin on purpose (the client's session cookie lives there); path from the shared builder. Acceptable: in production the client is on drylake.com.au |
| SEO canonical, sitemap, robots, JSON-LD | `SITE_URL = https://drylake.com.au` constant |
| `www.drylake.com.au` | 308 to apex. PROD-PROBE |
| `http://drylake.com.au` | 308 to https. PROD-PROBE |
| `drylake.au` | Does not serve (connection failed). Held domain, not configured. Informational |

## Region

| Check | Result |
|---|---|
| `vercel.json` `regions: ["syd1"]` | AUTOMATED (`deploy-region.test.mjs`) |
| Production function execution | PROD-PROBE 2026-10-06: `GET /api/stripe/webhook` 405 with `x-vercel-id: syd1::syd1::...` (edge syd1, function syd1) |
| Supabase region | ap-southeast-2, per Ben 2026-10-06 (dashboard, not independently verified) |
| Portal timing instrumentation | Unchanged (`lib/perf/portal-timing.ts`, `request-timing.ts` reads `VERCEL_REGION`) |
