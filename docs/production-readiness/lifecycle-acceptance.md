# Client lifecycle: status per step

Labels: see [README](README.md#verification-legend). "Code" is where the behaviour lives;
"Automated" names the test file that guards the decision logic.

| # | Step | Code | Automated | Status |
|---|---|---|---|---|
| 1 | Admin creates client | `app/api/admin/clients/route.ts` | `client-validation`, `client-status` | AUTOMATED (validation, duplicate guard logic). WILSON-PROD for the real call |
| 2 | Internal organisation created and linked | same route, `organizations` insert with `clerk_org_id` | `client-workspace` | WILSON-PROD |
| 3 | Clerk organisation created and linked | `clerk.organizations.createOrganization`, rollback on DB failure | none (SDK call) | WILSON-PROD |
| 4 | Invitation generated | `lib/auth/client-onboarding.ts` `createClientInvitation` | `client-invitations`, `production-readiness` (canonical origin) | AUTOMATED (role, expiry, redirect URL). WILSON-PROD for delivery |
| 5 | Client receives and accepts invitation | Clerk email; `/portal/accept-invitation` | `client-invitations` (`invitationLandingTarget`) | AUTOMATED (ticket forwarding). WILSON-PROD |
| 6 | Client signs in | Clerk `<SignIn>` / `<SignUp>`, `fallbackRedirectUrl=/portal` | none | PROD-PROBE: `/sign-in` 200, production instance `pk_live_`, `signInUrl=/sign-in`, `signUpUrl=/sign-up`. WILSON-PROD |
| 7 | Correct workspace resolves | `lib/auth/client-context.ts` `getClientWorkspace`, `/api/client/invitations/complete` | `client-workspace` (38), `supabase-token-shape` | AUTOMATED (resolution rules). WILSON-PROD |
| 8 | Admin creates project, assigned to organisation | `app/api/admin/clients/[organizationId]/projects/route.ts` | `tenant-isolation` | WILSON-PROD |
| 9 | Project appears for client | `app/client/page.tsx`, `app/client/projects/[projectId]` | `portal-ux-performance`, `tenant-isolation` | WILSON-PROD |
| 10 | Milestone appears | `.../projects/[projectId]/milestones/route.ts` | none specific | WILSON-PROD |
| 11 | Permitted document appears | `.../documents/route.ts`, `/api/client/documents/[documentId]/download` | `uuid` | WILSON-PROD |
| 12 | Published update appears | `.../updates/route.ts` | none specific | WILSON-PROD |
| 13 | Admin creates invoice | `app/api/admin/clients/[organizationId]/invoices/route.ts` | `invoice-creation` | AUTOMATED (validation). WILSON-PROD. **Numbering cause still unconfirmed** (`docs/operations/sql/invoice-creation-diagnostics.sql`) |
| 14 | GST calculated correctly | `lib/invoices/gst.ts`, `lib/business.ts` | `gst` (17) | AUTOMATED. **See blocker B1 below** |
| 15 | Invoice issued | `app/api/admin/invoices/[invoiceId]/issue/route.ts` | `invoice-lifecycle` | AUTOMATED (`canIssue`). WILSON-PROD |
| 16 | Invoice email generated | `lib/invoices/invoice-notifications.ts`, `lib/email/invoice-email.ts` | `invoice-email` | AUTOMATED (content). WILSON-PROD (delivery) |
| 17 | Invoice URL correct | `lib/invoices/invoice-url.ts` | `invoice-email`, `invoice-payment-flow` | AUTOMATED: canonical `https://drylake.com.au/client/billing/<uuid>` |
| 18 | Signed-out link preserves destination | `proxy.ts`, `lib/auth/guards.ts` | `auth-access` | PROD-PROBE: `/client/billing/<uuid>` signed out returns 307 to `/sign-in?redirect_url=%2Fclient%2Fbilling%2F<uuid>` (2026-10-06) |
| 19 | Correct invoice opens after sign-in | `app/client/billing/[invoiceId]/page.tsx` | `invoice-payment-flow` | WILSON-PROD |
| 20 | Checkout receives the stored total | `app/api/stripe/checkout/route.ts`, `evaluateCheckout` | `invoice-lifecycle`, `stripe-payment`, `invoice-payment-flow` | AUTOMATED (amount only from stored invoice, breakdown check, AUD only). WILSON-PROD (test mode first) |
| 21 | Payment completes | Stripe | none | WILSON-PROD |
| 22 | Webhook processes payment | `app/api/stripe/webhook/route.ts` | `stripe-payment` (16) | AUTOMATED (classification, settlement, idempotency). PROD-PROBE: endpoint deployed (GET 405 from a `syd1::syd1` function). WILSON-PROD |
| 23 | Invoice becomes PAID | webhook `settle` | `stripe-payment` | WILSON-PROD |
| 24 | Client sees PAID / Admin sees PAID | client billing pages, admin invoice pages | `invoice-lifecycle` (`displayStatus`) | WILSON-PROD |
| 25 | Client signs out, Clerk session ends, lands on `/` at the top | `components/client/ClientNav.tsx` `signOut({ redirectUrl: "/" })` | none | WILSON-PROD (needs a real Clerk session) |

**Automated coverage summary:** 403 tests across 19 files, all decision logic for steps 4, 5,
7, 13 to 17, 20 and 22. The SDK calls and the database itself are not exercised by `npm test`
(no test database exists; see PR 3).

## Blockers and risks found

**B1. GST is charged on every new invoice, but Drylake is not GST-registered.**
`lib/business.ts` sets `gstRegistered: true` and the issue route recalculates 10% GST at issue.
That reflects a decision that registration would be effective before the first invoice; as of
2026-10-06 it is not. **Do not issue an invoice from production until the ATO registration is
effective**, or until the flag is changed by a separate, reviewed decision. Not changed in this
PR: it is a business decision, not a defect in the code.

**B2. Invoice numbering failure root cause unconfirmed.** Needs Section 1 of
`docs/operations/sql/invoice-creation-diagnostics.sql` run in Supabase.

**B3. Database constraints may reject newer audit actions** (`CLIENT_INVITATION_ACCEPTED`,
payment anomaly actions). `writeAuditLog` logs and continues, so the flow works, but the
audit row is lost. Checklist step P0.4 verifies.

## Failure states

Reviewed for each: what the user sees, what is logged. "Safe" means no raw provider, database or
stack detail reaches the browser.

| Failure | User-facing result | Logged | Verdict |
|---|---|---|---|
| Client creation fails (DB) | Admin: "Unable to create client organisation." (500) | code + message, server only | Safe |
| Clerk organisation creation fails | Same message (502) | Clerk message, server only | Safe |
| Supabase insert fails after Clerk org exists | Same message; Clerk org deleted | `CRITICAL` line if the rollback also fails | Safe. Orphan possible only if both fail; the log line names it |
| Invitation fails | Client still created; Admin lands on the client with `invite=failed` and can resend; messages mapped from Clerk codes (`invitationErrorMessage`) | Clerk code | Safe |
| Workspace cannot resolve | Portal state card (no membership, inactive, choose workspace), never a raw error | Workspace state | Safe |
| Project unavailable or another tenant's id | 404 / not-found card; UUID guards on 21 routes | none needed | Safe |
| Invoice creation fails | Admin error notice with a code | code | Safe |
| Invoice email fails | Invoice stays issued; Admin sees `ISSUED_EMAIL_FAILED` and can resend | delivery code | Safe |
| Stripe Checkout fails | "Unable to start payment. Please try again." with a code; processing states return 409 with a plain message | Stripe/DB code | Safe |
| Webhook processing fails | Stripe receives 5xx and retries; permanent problems recorded as `INVOICE_PAYMENT_ANOMALY` | event id + type | Safe |
| Contact delivery fails | Generic failure naming the `hello@drylake.com.au` fallback | delivery cause | Safe |
| Root layout throws | **Was** Next's unbranded default. **Now** `app/global-error.tsx` with reference digest | digest | Fixed in this PR |
| Page render throws (public, admin, portal) | `app/error.tsx` (public and admin) or `app/client/error.tsx` (portal), digest only | digest | Safe |
