# Production data inventory and backup coverage

Status key: **Known** = verified from the repo, public DNS or vendor docs on 2026-10-06.
**Unverified** = depends on a dashboard setting or plan nobody has confirmed (see `wilson-actions.md`).

## Systems holding authoritative data

| System | What it holds | Drylake owns / can export? | Backup mechanism | Retention | Restore | Depends on | Limits |
|---|---|---|---|---|---|---|---|
| **Supabase Postgres** (ap-southeast-2) | System of record: `organizations`, `projects`, `milestones`, `documents` (metadata), `project_updates`, `invoices`, `invoice_notifications`, `audit_logs`, `platform_admins`, `turnstile_token_claims`; RLS policies, function `current_clerk_org_id`, invoice numbering function, grants | Yes. Full export with `supabase db dump` / `pg_dump` (`supabase-backup-and-restore.md`) | **Unverified.** Free plan: none. Pro: daily, 7 days. Team: 14. Enterprise: up to 30. PITR add-on only on paid plans | Plan-dependent | Dashboard restore (same project, downtime) or restore to a new project (paid plans), or `psql` from a dump | Supabase account access (who holds it: Wilson) | **Schema exists only in Supabase**: one migration in Git. Physical backups are not downloadable |
| **Supabase Storage**, bucket `client-documents` (private) | Client documents uploaded by Admin | Yes, via the Storage API (download every object) | **None.** Database backups do not include Storage objects (Supabase docs) | n/a | Re-upload from an off-site copy, if one exists | Supabase account | **No backup exists today.** Losing the project loses the files. Metadata rows in `documents` would point at nothing |
| **Clerk** (production instance, `clerk.drylake.com.au`) | Users, sessions, MFA, one organisation per client, memberships, invitations, org private metadata (back-reference to the Supabase org id) | Users: CSV export from the dashboard (includes password hashes) or Backend API. Organisations and memberships: Backend API only | Clerk-operated; no customer-side backup | n/a | Re-create orgs and re-invite from Supabase `organizations` (`clerk-recovery.md`) | Clerk account access (Wilson) | Organisations/memberships are not in the CSV export |
| **Stripe** | Checkout Sessions, Payment Intents, charges, refunds, events, payouts | Yes: dashboard export, API. Independent of our database | Stripe-operated, permanent payment records | Events API: 30 days; payments: permanent | Read back with `scripts/stripe-reconcile.mjs`; replay webhooks (`stripe-reconciliation.md`) | Stripe account access | Webhook auto-retry 3 days; dashboard resend 15 days; CLI resend 30 days |
| **Vercel** | Deployments (immutable builds), production env vars, domain config, firewall rules, analytics | Deployments: kept by Vercel. Env vars: `vercel env pull` (sensitive values may not be readable back) | Every deployment is retained and can be re-promoted | Per Vercel plan | Instant Rollback, `vercel promote`, redeploy from Git | Vercel team access (Wilson) | **Env var values exist only in Vercel** and in each person's head; Hobby plan rolls back only to the previous deployment |
| **Resend** | Sending domain config, delivery logs | Logs: dashboard | n/a (no customer data stored long term) | Plan-dependent | Re-verify domain via DNS records (`dns-and-domain-recovery.md`) | Resend account, DNS | Losing it stops invoice and enquiry email only |
| **Cloudflare Turnstile** | Site key and secret for the contact forms | Keys reissuable | n/a | n/a | Create a new widget, update two env vars | Cloudflare account | Hostname list must include drylake.com.au and www |
| **DNS: Synergy Wholesale** (registrar AND DNS host, `ns1-3.nameserver.net.au`) | All records for drylake.com.au: Vercel apex/www, Clerk, Resend, Microsoft 365 mail, verification TXT | Yes: full record set captured in `dns-and-domain-recovery.md` | **That document is the backup** | Until the next DNS change | Re-enter records at Synergy or any DNS host | Synergy reseller account (Ben), domain renewal (auto-renew, prepaid balance) | Domain expiry or a lapsed prepaid balance takes everything down at once |
| **Microsoft 365** (tenant "Drylake") | Company mailboxes (benedict@, hello@ if configured) | Yes: Microsoft export / eDiscovery | **Unverified.** Microsoft retains deleted items for a period; no third-party backup | Microsoft default | Microsoft admin centre | M365 admin (Wilson) | Not part of the app, but enquiries and Stripe receipts land there |
| **GitHub** `wilsonmugwe/drylake-website` (private) | All source, migrations, docs, CI | Yes: every clone is a full copy (this machine has one) | Distributed copies: Wilson's machine, Ben's WSL clone, GitHub | Permanent | Push any clone to a new remote | GitHub account `wilsonmugwe` (owner) | **No branch protection** on `main` (free private repo; see `source-control.md`) |
| **Environment variables / secrets** | Keys for Supabase, Clerk, Stripe, Resend, Turnstile | Names: `scripts/env-registry.mjs`. Values: issuing dashboards | None outside Vercel | n/a | Reissue at each vendor (`secrets-recovery-inventory.md`) | Each vendor account | Rotating a key means updating Vercel and redeploying |

## Backup coverage matrix

| Data | Backed up? | Restorable? | Tested? | Gap |
|---|---|---|---|---|
| Database rows | Unverified (plan) | Unverified | **No** | W1: confirm plan; W3: run the restore test |
| Database schema, RLS, functions, grants | **No** (not in Git) | Only via a Supabase backup | **No** | W2: commit a baseline from a real dump |
| Storage objects (`client-documents`) | **No** | **No** | No | W4: periodic off-site copy |
| Auth (Clerk users, orgs) | Vendor-side only | Partly: rebuild orgs from Supabase, users re-invited | No | Documented; acceptable at this size |
| Payments | Yes (Stripe) | Yes (reconciliation script) | Script tested offline | Run against production once (W6) |
| Code | Yes (Git, several clones) | Yes | Yes (every deploy) | Branch protection missing |
| DNS | Yes (this document) | Yes | No | Re-snapshot after every DNS change |
| Env var values | **No** | Reissue only | No | Accept: reissuing is safer than storing |
| Email (M365) | Vendor retention only | Partly | No | Out of scope for the app; note only |

## Single-person dependencies

| Dependency | Person | Risk | Mitigation |
|---|---|---|---|
| Supabase, Vercel, Clerk, Stripe, Resend, Cloudflare, GitHub owner, M365 admin | **Wilson** | If Wilson is unavailable, nobody can restore, roll back or rotate keys | W7: add Ben as a second owner/admin on each, with MFA, recorded in `secrets-recovery-inventory.md` |
| Synergy Wholesale (registrar + DNS), domain renewals | **Ben** | If Ben is unavailable, DNS cannot be changed and renewals depend on prepaid balance | Add Wilson as a contact on the reseller account; keep auto-renew and balance |
