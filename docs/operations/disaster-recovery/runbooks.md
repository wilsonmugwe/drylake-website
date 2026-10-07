# Disaster runbooks

Each runbook: **Detection** > **Containment** > **Recovery** > **Verification** > **Post-incident**.
Who: Wilson leads technical recovery; Ben owns client communication and DNS. Write a short note
in `drylake-ops/decisions.md` (or an incident file) for anything that affected a client.

---

## 1. Bad deployment

**Detection:** errors after a deploy (Vercel function logs, 500s, the Discoverability workflow
failing, a client report).
**Containment:** Vercel > Instant Rollback to the last good production deployment (seconds).
**Recovery:** fix on a branch, PR, merge. Then **Undo Rollback** (or `vercel promote`), because
after a rollback new pushes do not go live automatically.
**Verification:** home 200, `/admin` and `/portal` redirect signed-out users to sign-in,
`x-vercel-id` shows `syd1`, Discoverability workflow green.
**Post-incident:** add a regression test for the cause; note it in the PR.

## 2. Broken database migration

**Detection:** errors referencing a column/constraint right after applying SQL; failing admin or
portal pages.
**Containment:** stop applying further migrations. If the app is broken, roll back the
deployment that depends on the migration (runbook 1).
**Recovery:** write a forward fix migration (preferred; migrations in this repo are written to be
idempotent). If data was destroyed, restore (runbook 3). Never edit a migration that has already
run on production; add a new one.
**Verification:** `node scripts/check-migrations.mjs`, the affected flow end to end, and
`docs/security/sql/rls-inventory.sql` unchanged apart from the intended change.
**Post-incident:** test the next migration on the restore-test project first
(`supabase-backup-and-restore.md`).

## 3. Accidental deletion or data corruption

**Detection:** missing clients/projects/invoices, wrong totals, a client report, `audit_logs`
showing an unexpected delete.
**Containment:** stop writes to the affected area (pause admin work; if severe, roll the site to
maintenance by rolling back to a deployment without the feature). Take a fresh `db dump` of the
current state before restoring anything, so nothing more is lost.
**Recovery:** small scope: re-enter from the dump of the last good backup into production by hand,
row by row, with an audit note. Large scope: restore the latest backup to a NEW project, verify,
then copy the affected rows back (or switch env vars to the new project if the whole DB is bad).
Payments: rebuild paid state from Stripe (`stripe-reconciliation.md`).
**Verification:** critical table counts (restore-test step 4), `scripts/stripe-reconcile.mjs`
shows no HIGH findings, affected client can see their data.
**Post-incident:** record the RPO actually achieved; consider PITR if loss exceeded 24 h of work.

## 4. Compromised credential

**Detection:** unexpected Stripe refunds/charges, Clerk orgs or invitations nobody created,
unusual Supabase queries, a key seen in a repo, chat or log.
**Containment:** rotate the key at the vendor immediately (`secrets-recovery-inventory.md`); for
the Stripe webhook secret use the 24-hour overlap. Update Vercel, redeploy.
**Recovery:** review `audit_logs`, Stripe, Clerk and Supabase logs for what the key did; undo
unauthorised changes; replay any webhooks rejected during the swap.
**Verification:** old key rejected (vendor shows it revoked), app works with the new one,
`scripts/check-env.mjs` clean.
**Post-incident:** if personal information was exposed, assess under the Notifiable Data
Breaches scheme within 30 days (Privacy Act); notify affected clients.

## 5. Supabase outage

**Detection:** status.supabase.com, database errors across admin and portal.
**Containment:** nothing to roll back. The public site still loads; sign-in works (Clerk) but the
portal cannot read data. Tell active clients by email if longer than an hour.
**Recovery:** wait for Supabase. If the project itself is lost, restore to a new project (paid
plan) or from our latest dump (`supabase-backup-and-restore.md`), then update the three Supabase
env vars in Vercel and redeploy.
**Verification:** admin client list loads, one client portal loads, contact form claims a token.
**Post-incident:** if the outage exceeded the RTO, revisit plan and backups.

## 6. Clerk outage

**Detection:** status.clerk.com, sign-in pages failing, `/admin` unreachable.
**Containment:** the public site and contact form keep working. Pause invitations.
**Recovery:** wait for Clerk. Instance loss: `clerk-recovery.md`.
**Verification:** admin sign-in, one client sign-in, an invitation round trip.
**Post-incident:** none unless clients were affected.

## 7. Stripe webhook outage

**Detection:** client says they paid but the invoice shows unpaid; Stripe > Webhooks shows failed
deliveries; reconciliation reports `PAID_IN_STRIPE_NOT_IN_DB`.
**Containment:** do not mark invoices paid by hand. Stripe retries automatically for 3 days.
**Recovery:** fix the cause (endpoint URL, signing secret mismatch, deploy error), then resend the
failed events (dashboard up to 15 days, CLI up to 30 days).
**Verification:** `node scripts/stripe-reconcile.mjs` reports no HIGH findings; the invoice shows
PAID for client and admin.
**Post-incident:** run the reconciliation monthly.

## 8. Vercel outage or deployment failure

**Detection:** status.vercel.com, site down, or a failed build.
**Containment:** a failed build does not replace production; nothing to do. A platform outage
cannot be worked around quickly.
**Recovery:** wait; for a build failure follow `vercel-recovery.md`. Long outage: the site is
static enough to stand up elsewhere, but Clerk, Stripe and Supabase settings name drylake.com.au,
so the move is a DNS change, not a rebuild.
**Verification:** as runbook 1.
**Post-incident:** none.

## 9. Lost environment variables

**Detection:** errors such as missing Supabase/Clerk/Stripe configuration after an env change or
project re-creation; `scripts/check-env.mjs` reports MISSING.
**Containment:** roll back to the last deployment built with the right values (rollbacks keep
their build-time env).
**Recovery:** reissue each missing secret at its vendor (`secrets-recovery-inventory.md`), set it in
Vercel Production, redeploy, then undo the rollback.
**Verification:** `vercel env pull` + `node scripts/check-env.mjs` shows no MISSING; sign-in,
invoice view, contact form all work.
**Post-incident:** none; this is why values are not stored elsewhere.

## 10. DNS or domain problem

**Detection:** site or email unreachable, Clerk sign-in fails, Resend/M365 bounce, DMARC reports
showing failures.
**Containment:** check the domain status and balance at Synergy first (expiry takes everything
down at once).
**Recovery:** compare the live zone with `dns-and-domain-recovery.md` and re-enter missing or
changed records; renew the domain if needed.
**Verification:** site 200, test email from benedict@ arrives at an external address, Clerk
sign-in works, a Resend test email delivers.
**Post-incident:** re-snapshot the zone in `dns-and-domain-recovery.md`.
