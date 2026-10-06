# Manual actions for Wilson (PR 3)

None of these change production data. Items marked **decision** need Ben and Wilson to agree and
a line in `drylake-ops/decisions.md` before anything is enabled or paid for.

| # | Action | Where | Expected result | Tell Claude |
|---|---|---|---|---|
| W1 | Confirm the Supabase plan and that daily backups exist | Supabase > Organization > Billing; Project > Database > Backups | Plan name and the date of the newest backup. Free plan = no backups: go to W1b | Plan + newest backup date |
| W1b | **Decision:** Free plan has no backups. Either upgrade to Pro (daily, 7 days) or run the weekly off-site dump | Billing | One of the two in place | Which |
| W2 | Produce the schema baseline from a real dump and open a PR with it | `schema-as-code.md` steps 1 to 5 | `node scripts/check-migrations.mjs` prints `status: OK` | PR link |
| W3 | Run the restore test into a throwaway project, record time taken, delete the project | `supabase-backup-and-restore.md` | Counts and policies match; time = real RTO | Result and minutes taken |
| W4 | Take a first off-site copy of the `client-documents` bucket | Supabase Storage | Encrypted folder outside the repo | Done/date |
| W5 | Export Clerk users (CSV) and list organisations/memberships; keep with the off-site backup | Clerk dashboard / Backend API | File in the encrypted folder | Done/date |
| W6 | Run `node scripts/stripe-reconcile.mjs --days 90` once against production | Your terminal, keys exported in the shell | `RESULT: Stripe and invoices agree` or a list to work through | The RESULT line |
| W7 | Add Ben as a second owner/admin (with MFA) on Supabase, Vercel, Clerk, Stripe, Resend, Cloudflare, M365, and as a second `platform_admins` row | Each dashboard | No single-person dependency | Done list |
| W8 | Confirm the Vercel plan (Hobby rolls back only one deployment) | Vercel > Settings > Billing | Plan name | Plan |
| W9 | After any DNS change, ask Claude to re-snapshot the zone | n/a | `dns-and-domain-recovery.md` current | n/a |
| W10 | **Decision:** protect `main` (GitHub Pro, about US$4/month, require PR + checks) or accept the risk | GitHub > Settings > Branches | Protection rule on `main`, or an ADR accepting it | Which |
| W11 | Review and merge this PR | GitHub | `Schema` workflow runs on the PR | n/a |
