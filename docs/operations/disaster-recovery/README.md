# Backup, disaster recovery and operational resilience (PR 3)

**The question this answers:** if something goes seriously wrong tomorrow, can Drylake recover
safely? Short answer as of 2026-10-06: **only partly.** Code, DNS records and payments can be
recovered today. **The database cannot be rebuilt from Git**, and whether a restorable Supabase
backup exists depends on the plan, which nobody has confirmed from the dashboard yet. Closing those
two gaps is the first job (`wilson-actions.md`, items W1 to W3).

| Document | Covers |
|---|---|
| `data-inventory.md` | Every system holding production data: what, who owns it, export, backup, retention, restore, limits. Backup coverage matrix and gaps |
| `supabase-backup-and-restore.md` | Supabase backup/PITR facts (cited), manual dumps, restore-test procedure into an isolated project |
| `schema-as-code.md` | Turning the dashboard-built schema into committed migrations; the CI drift check |
| `stripe-reconciliation.md` | Rebuilding payment state from Stripe; the read-only reconciliation script |
| `clerk-recovery.md` | Users, organisations, memberships, invitations: what lives only in Clerk |
| `vercel-recovery.md` | Rollback, redeploy, domains, environment variables |
| `secrets-recovery-inventory.md` | Which secrets exist (names only), where they are issued, who can reissue them |
| `dns-and-domain-recovery.md` | drylake.com.au at Synergy Wholesale: the full record set and how to rebuild it |
| `source-control.md` | GitHub assumptions: remote, branch protection, migrations committed |
| `runbooks.md` | Ten disaster runbooks: detection, containment, recovery, verification, post-incident |
| `wilson-actions.md` | Every manual step this PR needs, in order |

## Recommended initial targets

| Target | Value | Why this and not tighter |
|---|---|---|
| **RPO** (data loss accepted) | **24 hours** for the database, **0** for payments | A daily backup is what a Supabase Pro plan gives without add-ons. Payments cannot be lost because Stripe holds an independent record and the reconciliation script rebuilds paid state from it. PITR (2-minute worst-case RPO) costs about US$100/month on top of a Small compute add-on; not justified at current client volume (2026-10) |
| **RTO** (downtime accepted) | **4 hours** for a bad deploy or broken config (realistically minutes), **1 business day** for a database restore | Two people, no on-call rota. A Vercel rollback is instant; a restore to a new Supabase project then repointing env vars and re-checking RLS is a half-day job done carefully |
| **Review** | Revisit when monthly recurring revenue passes A$5,000 or a client contract names an RPO/RTO | At that point PITR and a staging project pay for themselves |

These targets are only true once W1 (confirm the Supabase plan has daily backups) and W2 (commit
the schema) are done. Until then the honest database RPO is "unknown" and RTO is "days".

## What this PR adds in code

- `scripts/check-migrations.mjs` + `.github/workflows/schema.yml`: CI fails on badly named
  migrations, and, once a baseline migration lands, on any table, RPC or bucket the app uses that
  no migration defines.
- `scripts/stripe-reconcile.mjs`: read-only report of where Stripe and the invoices table disagree.
- `tests/disaster-recovery.test.mjs`: both scripts, the never-writes guarantee, and that these
  docs keep covering every scenario.

No production data, setting or plan was touched.
