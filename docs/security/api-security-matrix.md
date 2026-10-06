# API and server-action security matrix

The app has **no server actions** (`"use server"` appears nowhere); every mutation is a route
handler under `app/api`. Since PR 2, every non-GET request to `/api/*` except the Stripe
webhook first passes the proxy's cross-origin refusal (`lib/security/same-origin.ts`).

Legend: **Authn** who the caller is; **Authz** what decides they may act; **Scope** how the
tenant is bounded; **Valid.** input validation; **CSRF** protection beyond the proxy;
**Rate** limiting; **Idem.** idempotency or replay behaviour; **Errors** what the caller sees.

## Admin routes (13)

All: Authn Clerk session; Authz `authorizeAdminApi()` or `isPlatformAdmin()` **before** body
parsing and before the service-role client is created (enforced by test); Scope: admin is
cross-tenant by design, so every write names its organisation or record by path UUID and the
query filters on it; Errors: generic messages, database codes logged server-side only, never
returned; CSRF: proxy + `SameSite=Lax`; Rate: none in-app (admin-only).

| Route | Valid. | Idem. / replay | Audit |
|---|---|---|---|
| `POST /api/admin/clients` | form fields validated (`lib/clients/validation.ts`) | duplicate client name refused (no twin tenants from a double submit); a Supabase failure deletes the new Clerk org | yes |
| `POST .../clients/[organizationId]/status` | UUID + allowed status set | repeat submits rewrite the same status | yes |
| `POST .../clients/[organizationId]/invitations` | UUID, email | existing member refused (409); a pending invitation for the same email is reported, not duplicated | yes |
| `POST .../invitations/[invitationId]` | UUID, action enum (resend / revoke) | revoke is terminal | yes |
| `POST .../clients/[organizationId]/billing` | UUID, billing fields | overwrite of the same values | yes |
| `POST .../clients/[organizationId]/projects` | UUID, project fields | none needed (creates a new project per submit) | yes |
| `POST .../clients/[organizationId]/invoices` | UUID, line items, server-side GST (browser tax ignored) | none needed (draft per submit) | yes |
| `POST /api/admin/invoices/[invoiceId]/issue` | UUID | conditional update on `status = DRAFT` with a lock on the amounts read, so a double submit issues once | yes |
| `POST /api/admin/invoices/[invoiceId]/resend` | UUID | sends again by design | yes (`invoice-notifications.ts`) |
| `POST /api/admin/milestones/[milestoneId]/status` | UUID + status | unchanged status skips the write | yes |
| `POST /api/admin/projects/[projectId]/documents` | UUID, 10 MB cap, MIME + extension + **byte signature (new)**, server-generated storage path | new object per upload (`upsert: false`) | yes |
| `POST /api/admin/projects/[projectId]/milestones` | UUID, fields | new row per submit | yes |
| `POST /api/admin/projects/[projectId]/updates` | UUID, fields | new row per submit | yes |

## Client routes

| Route | Authn | Authz / Scope | Valid. | CSRF | Idem. | Errors |
|---|---|---|---|---|---|---|
| `GET /api/client/documents/[documentId]/download` | Clerk | `getClientWorkspace()` ready; document read through **RLS client** with `visible_to_client = true`; project re-checked against the organisation; service role used only to sign the URL | UUID (malformed = 404) | GET, no state change | n/a | 404 for other tenants' IDs (existence not revealed); signed URL never logged; 60 s lifetime |
| `POST /api/client/invitations/complete` | Clerk | only invitations for a **verified** email on this account, client role, ACTIVE client | no input accepted | proxy **and** strict Origin equality | already-member counts as done; spent invitation revoked | generic |
| `POST /api/stripe/checkout` | Clerk + active org required | org and invoice read through RLS with explicit org filter; not DRAFT, visible, OPEN/OVERDUE | JSON only (415 otherwise), UUID | proxy + JSON-only (a cross-site form cannot send JSON without preflight) | Stripe idempotency key per invoice state; open session re-used; concurrent clicks converge | stable error codes, no Stripe detail |

## Public and server-to-server routes

| Route | Authn | Notes |
|---|---|---|
| `POST /api/contact` | none (public) | Turnstile verified server-side, single-use token store, hostname and action bound; **new** strict validation and real byte limit; HTML-escaped email; enquiry never logged; rate limit via Vercel Firewall (Wilson to confirm) |
| `POST /api/stripe/webhook` | Stripe signature (HMAC over the raw body, 300 s window) | exempt from the Origin check by design; see stripe-security.md |
| `GET /llms.txt` | none | static public text, no data |

## Input security summary

| Vector | Status |
|---|---|
| Reflected / stored XSS | React escapes all rendered values; the only raw HTML is server-built JSON-LD with `<` escaped; no user HTML is ever rendered. Invoice and enquiry emails escape every interpolated value |
| SQL / PostgREST injection | All queries use supabase-js builders with bound values. One `.or()` string (checkout session ownership) interpolates only a Stripe session id returned by Stripe's API, not user input |
| Header / email injection | Line breaks refused in Subject-bound fields (new); recipient addresses are config or validated |
| URL / redirect injection | Return paths pass `safeReturnPath()` (tightened); invitation links use the canonical origin in production |
| Malicious filenames | Display name control characters stripped; storage key is `org/project/random-uuid.ext`, never the filename |
| Oversized input | Contact 10 KB on real bytes; uploads 10 MB; field length limits on every form |
| Malformed UUIDs | `isUuid()` before every query on a path parameter; 404, never a database error |
