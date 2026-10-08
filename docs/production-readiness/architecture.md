# Production architecture (as implemented, 2026-10-06)

Describes the code on `main` at e976427 plus this PR. Where something lives only in a
dashboard, it says so. Corrected 2026-10-08 for `main` at f18270d (PR #53, Markdown for agents)
and the enquiry analytics event; the developer-facing walkthrough is
[../developer-guide.md](../developer-guide.md).

## Components

| Component | What it does here | Where configured |
|---|---|---|
| **Next.js 16** (App Router, `next@^16.3.8`, React 19.2) | Public site, Admin (`/admin`), client portal (`/client`, `/portal`), API routes (`app/api/**`) | Repo |
| **Vercel** | Hosting. Functions pinned to `syd1` (`vercel.json`, guarded by `tests/deploy-region.test.mjs`). Domains: `drylake.com.au` (primary), `www` 308 to apex, http 308 to https | Vercel dashboard + `vercel.json` |
| **Clerk** (`@clerk/nextjs` 7, production instance `pk_live_`, frontend API `clerk.drylake.com.au`) | Identity, sessions, one Clerk **organisation per client**, invitations as `org:member` (14-day expiry). Clerk data (users, organisations, memberships) is hosted in the United States; Clerk offers no region choice | Clerk dashboard; `proxy.ts` |
| **Supabase / PostgreSQL** (ap-southeast-2, confirmed by Ben 2026-10-06) | System of record: `organizations`, `projects`, `milestones`, `documents`, `project_updates`, `invoices`, `invoice_notifications`, `audit_logs`, `platform_admins`, `turnstile_token_claims`. Private storage bucket `client-documents` | Supabase dashboard. **Only one migration is in the repo** (see deferred findings, PR 3) |
| **Supabase RLS** | Tenant boundary for every client read. The client uses the publishable key with the caller's Clerk session JWT (`lib/supabase/server.ts`, fails closed when the token is missing) | Policies live in Supabase only |
| **Service role** (`SUPABASE_SECRET_KEY`, `lib/supabase/admin.ts`, `server-only`) | Admin pages and APIs (after the platform-admin gate: `requirePlatformAdmin` / `isPlatformAdmin` on pages, `authorizeAdminApi` or an inline admin check on APIs), the `platform_admins` lookup itself, the Stripe webhook, workspace mapping lookups, signing document URLs after an RLS-scoped authorisation, and the contact route's Turnstile token claims | Audited in PR 2 |
| **Stripe** (`stripe` 23) | Checkout Sessions for one invoice at a time; webhook `/api/stripe/webhook` is the only writer of `PAID` | Stripe dashboard (webhook endpoint, events) |
| **Resend** (`resend` 6) | Invoice issued/resent email, contact enquiry delivery | Resend dashboard + DNS (`send.`, `rsend.` subdomains) |
| **Cloudflare Turnstile** | Bot gate on the public contact form and the portal "Message Drylake" form; single-use tokens via `turnstile_token_claims` | Cloudflare dashboard |
| **Vercel Analytics** (`@vercel/analytics`) | Page analytics (`<Analytics />` in `app/layout.tsx`), plus one custom event, `enquiry_submitted`, sent from the browser only after `/api/contact` confirms delivery (`lib/analytics/enquiry-event.ts`, called from `lib/contact/submit-enquiry.ts`). Properties are a closed set (`surface`, `projectType`), never personal data. Custom events report only on a Vercel Pro plan | Vercel |
| **Agent-readable surfaces** (PR #53) | `robots.txt` is a route handler (`app/robots.txt/route.ts`) so it can carry a `Content-Signal` line; public pages requested with `Accept: text/markdown` are rewritten by `proxy.ts` to `app/api/markdown/route.ts` (exact public-path allowlist, self-fetch only); `/.well-known/api-catalog` (RFC 9727); homepage `Link` header in `next.config.ts` | Repo (`lib/discovery/`) |

## Request layers

1. **`proxy.ts`** (Clerk middleware). Only answers "who is this". First it refuses cross-site
   mutations to `/api/*` with 403 (`lib/security/same-origin.ts`, Stripe webhook exempt), then
   rewrites a public page asked for as Markdown to `/api/markdown` and sets `Vary: Accept` on
   public pages (PR #53). Signed-out requests to
   `/admin`, `/client`, `/portal` pages redirect to `/sign-in?redirect_url=<full path>`;
   `/portal/accept-invitation` stays public so Clerk's ticket survives. API routes are not
   redirected; they return their own 401/403.
2. **Page and route guards.** Admin: `requirePlatformAdmin` or an inline `isPlatformAdmin()`
   (pages), and `authorizeAdminApi` or an inline `auth()` + `isPlatformAdmin()` check (APIs),
   all checking `platform_admins` server-side before the service-role client is created. Client: `getClientWorkspace()`
   (`lib/auth/client-context.ts`) resolves the caller's Clerk organisation to one Supabase
   `organizations` row, then every query is scoped to it and re-checked by RLS.
3. **RLS** in Supabase as the final tenant boundary for client reads.

## Data flows

### A. Client onboarding
`Admin form` -> `POST /api/admin/clients` -> duplicate-name guard -> Clerk
`createOrganization` -> Supabase `organizations` insert (`clerk_org_id`, `status=ACTIVE`,
billing contact) -> on insert failure the Clerk org is deleted (no orphan) -> Clerk org
private metadata back-reference -> audit `CLIENT_ORGANIZATION_CREATED` -> Clerk invitation
(`org:member`, redirect `<canonical>/portal/accept-invitation`) -> audit
`CLIENT_INVITATION_SENT`. An invitation failure never rolls back the client; Admin can resend.

### B. Invitation acceptance and workspace resolution
Email link -> `/portal/accept-invitation` forwards `__clerk_ticket` to `<SignIn>` or `<SignUp>`
-> Clerk creates the membership -> `/portal` -> `POST /api/client/invitations/complete`
(same-origin check) accepts any further pending invitations for the user -> audit
`CLIENT_INVITATION_ACCEPTED` -> `getClientWorkspace()` returns `ready` with one organisation,
or a not-ready state (no membership, inactive client, several workspaces -> `/portal/workspaces`).

### C. Projects, milestones, documents, updates
Admin creates via `app/api/admin/clients/[organizationId]/projects`,
`projects/[projectId]/milestones`, `.../documents` (server-generated storage path, private
bucket `client-documents`), `.../updates`. The client reads through the RLS-bound client,
scoped to the workspace organisation. Documents download through
`/api/client/documents/[documentId]/download`: authorised with the RLS client, then a 60-second
signed URL is minted with the service role.

### D. Invoicing and GST
Admin creates a DRAFT (`.../clients/[organizationId]/invoices`). Amounts are integer cents;
`lib/invoices/gst.ts` computes GST, `lib/business.ts` declares registration
(`gstRegistered: true`). `POST /api/admin/invoices/[invoiceId]/issue` moves DRAFT to OPEN with
an optimistic lock on the stored total, recalculates GST, audits `INVOICE_ISSUED`, then sends
the email whose links are built from `APP_BASE_URL` (default `https://drylake.com.au`), never
from the request host. Clients only ever see non-DRAFT invoices with `visible_to_client`.

### E. Payment
Client opens the invoice (signed-out link goes to sign-in and returns to the invoice) ->
`POST /api/stripe/checkout` -> `evaluateCheckout` takes the amount and currency ONLY from the
stored invoice, refuses a total that disagrees with subtotal + tax, reuses or expires a prior
session, creates a session with an idempotency key and Drylake metadata -> Stripe Checkout ->
`checkout.session.completed` / `async_payment_succeeded` -> `/api/stripe/webhook` verifies the
signature and settles with a status-conditional update (PAID is terminal; duplicates
converge) -> audit `INVOICE_PAYMENT_RECEIVED`. The success redirect is never authoritative.

### F. Contact and messaging
Public form and portal "Message Drylake" -> `POST /api/contact` -> size, content-type and field
validation -> Turnstile verification bound to action and hostname -> single-use token claim ->
Resend to `CONTACT_TO_EMAIL`. Enquiries are not stored in the database (only the token
fingerprint claim is). Failures return generic messages that offer the
`hello@drylake.com.au` fallback. On a confirmed `{ success: true }` the browser sends the
Vercel Analytics event `enquiry_submitted`.

### G. Sign-out
Portal and Admin sign-out call Clerk `signOut({ redirectUrl: "/" })`, which ends the Clerk
session and client-side navigates to the homepage.

## Observability in place (kept as is)
`client.portal.timing` log lines (`lib/perf/portal-timing.ts`, allowlisted fields, no ids),
structured `console.error` with codes only on every failure path, `audit_logs` rows for every
admin mutation and payment event, `GET /api/health` (missing required variable count, region,
commit; 503 when degraded). A monitoring system is out of scope for PR 1.
