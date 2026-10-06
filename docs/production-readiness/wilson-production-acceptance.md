# Wilson: production acceptance checklist (PR 1)

Run after PR 1 is merged and deployed. Record each result (PASS / FAIL + note) in the PR
thread. Use a **test client** owned by Drylake, never a real client. Two browsers or one normal
plus one private window: **A** = Admin (your platform-admin account), **C** = the test client
contact (a mailbox you control, for example a `+test` alias).

Never paste a secret value anywhere in the PR thread.

## P0. Preconditions

| # | Action | Expected |
|---|---|---|
| P0.1 | `vercel env pull .env.production.check --environment=production`, then `node scripts/check-env.mjs .env.production.check production`, then **delete the file** | Exit 0, "No problems found". Paste the output (names only) |
| P0.2 | Vercel > Deployments: production deployment is the PR 1 merge commit | Commit matches |
| P0.3 | `curl -sI https://drylake.com.au/api/stripe/webhook` | `405` and `x-vercel-id: syd1::syd1::...` |
| P0.4 | Supabase SQL editor (read only): `select pg_get_constraintdef(oid) from pg_constraint where conname ilike '%audit_logs%action%';` | Constraint absent, or it lists every action in `docs/production-readiness/lifecycle-acceptance.md` B3 |
| P0.5 | Stripe dashboard > Developers > Webhooks: endpoint `https://drylake.com.au/api/stripe/webhook` | Enabled; events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `payment_intent.payment_failed` |
| P0.6 | Clerk > Organizations settings | "Users can create organizations" OFF; default role `org:member`; `https://drylake.com.au/portal/accept-invitation` allowed as a redirect |
| P0.7 | Decide B1 (GST): is ATO GST registration effective today? | If **no**, skip P4 to P6 on production and run them on a preview with test keys instead |

## P1. Onboarding

| # | Action (window) | Expected |
|---|---|---|
| P1.1 | A: `/admin/clients/new`, name "Drylake Acceptance Test", contact = test mailbox | Lands on the client page with "created" and `invite=sent` |
| P1.2 | A: Clerk dashboard > Organizations | One new org "Drylake Acceptance Test", no Drylake admin as member |
| P1.3 | Supabase: `select id, clerk_org_id, status from organizations where name = 'Drylake Acceptance Test';` | One row, `ACTIVE`, `clerk_org_id` = the Clerk org id |
| P1.4 | Test mailbox | Clerk invitation email arrives; link host is `drylake.com.au` |
| P1.5 | C: open the link, sign up | Lands in the client portal overview for "Drylake Acceptance Test" |
| P1.6 | Supabase: `select action from audit_logs where entity_id = '<org id>' order by created_at;` | `CLIENT_ORGANIZATION_CREATED`, `CLIENT_INVITATION_SENT`, `CLIENT_INVITATION_ACCEPTED` |

## P2. Delivery content

| # | Action | Expected |
|---|---|---|
| P2.1 | A: create project "Acceptance project" for the test client | Saved |
| P2.2 | A: add a milestone; upload a small PDF marked visible; upload one marked hidden; add one client-visible update and one internal-only update | Saved |
| P2.3 | C: refresh portal | Project, milestone, visible PDF and client-visible update appear. **Hidden PDF and internal-only update do not** |
| P2.4 | C: download the visible PDF | Downloads; file name correct |
| P2.5 | Vercel logs: filter `client.portal.timing` | Lines present for C's requests; record `totalMs` per route |

## P3. Tenant spot check (full matrix is PR 2)

| # | Action | Expected |
|---|---|---|
| P3.1 | A: copy a project URL of a **different** client; C: open it | Not-found card, no data |
| P3.2 | C: open `/admin` | Not admitted (redirect or not-authorised), no admin data |

## P4. Invoice (only if P0.7 allows, otherwise on preview)

| # | Action | Expected |
|---|---|---|
| P4.1 | A: create a DRAFT invoice for the test client, one line, A$1.00 | DRAFT saved with a number |
| P4.2 | C: billing page | DRAFT not visible |
| P4.3 | A: issue it | `ISSUED` notice; GST line correct for the registration state; total = subtotal + GST |
| P4.4 | Test mailbox | Invoice email arrives; button and plain link both `https://drylake.com.au/client/billing/<uuid>` |
| P4.5 | C: sign out, then open the email link | Sign-in page; after sign-in the **same** invoice opens |

## P5. Payment (production uses LIVE Stripe: this is a real A$1.10 or A$1.00 charge, refund after)

| # | Action | Expected |
|---|---|---|
| P5.1 | C: Pay | Stripe Checkout shows exactly the stored total and the GST description |
| P5.2 | Pay with a real card you own | Returns to the invoice |
| P5.3 | Stripe > Webhooks > the endpoint > recent deliveries | `checkout.session.completed` delivered, `200` |
| P5.4 | C and A: invoice status | Both show PAID |
| P5.5 | Stripe > Webhooks: "Resend" the same event | `200`; invoice still PAID; no second payment audit row |
| P5.6 | Supabase: audit rows for the invoice | `INVOICE_CREATED`, `INVOICE_ISSUED`, `INVOICE_EMAIL_SENT`, `INVOICE_PAYMENT_RECEIVED` |
| P5.7 | Stripe: refund the payment | Refunded (the app does not track refunds; note it) |

## P6. Sign-out

| # | Action | Expected |
|---|---|---|
| P6.1 | C: scroll down in the portal, then Sign out | Homepage `/`, at the top of the page |
| P6.2 | C: browser Back, or open `/client` | Sent to sign-in; no portal content |

## P7. Failure-state spot checks

| # | Action | Expected |
|---|---|---|
| P7.1 | Open `https://drylake.com.au/this-does-not-exist` | Branded 404 |
| P7.2 | C: open `/client/billing/00000000-0000-4000-8000-000000000000` | Not-found card, no detail |
| P7.3 | A: create a client with the same name again | "A client with this name already exists" |

## Clean-up
Archive the test client (Admin status control), revoke its pending invitations, keep the
records (audit history is append-only by design).

## Report back
P0 to P7 results, the P0.1 output, P2.5 timing numbers, and any FAIL with the time (AWST) so
the log line can be found.
