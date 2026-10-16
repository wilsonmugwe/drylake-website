# Security incident response

For a suspected security incident on drylake.com.au: a leaked secret, a suspected account
takeover, unauthorised access to client data, abuse of the forms, a malicious dependency, or a
defaced or hijacked site. Operational failures with no security element (bad deploy, broken
migration) use [the disaster runbooks](../operations/disaster-recovery/runbooks.md).

Who: **Wilson** leads technical containment and recovery. **Ben** owns client communication,
legal and regulatory notification decisions, and DNS/registrar. Two people: if one is
unreachable, the other acts and tells the first. Write timestamps in AWST and keep a running
log in a private note (not in the repository if it names a client).

This is a plan, not proof of readiness. Rehearse it once (tabletop) and fix what is unclear.

## 1. Severity

| Level | Examples | Target response |
|---|---|---|
| SEV1 | Confirmed access to client data by an unauthorised party; live secret exposed publicly; admin account taken over; payment tampering | Start within the hour, contain same day |
| SEV2 | Credible but unconfirmed compromise; secret exposed in a private place; sustained abuse of public forms | Start same business day |
| SEV3 | Vulnerability report with no evidence of exploitation; dependency advisory affecting production | Triage within 2 business days |

When unsure, treat it as one level higher until disproved.

## 2. First 30 minutes (all severities)

1. **Write down** what was seen, by whom, when, and where (URL, log line, email). Do not delete
   evidence.
2. **Do not discuss details in public channels** or in email to the reporter beyond an
   acknowledgement. Reporters write to `hello@drylake.com.au` (see `SECURITY.md`); reply within
   2 business days, thank them, and do not promise a bounty.
3. Decide severity and who leads.
4. Contain before you investigate (section 3), unless containment would destroy evidence you
   cannot get elsewhere.

## 3. Containment by incident type

| Situation | Contain |
|---|---|
| **Leaked secret** (key in git, chat, a log, a screenshot) | Rotate it now, at the provider, then update Vercel env vars and redeploy. Order of impact: `SUPABASE_SECRET_KEY` (Supabase > Project Settings > API keys), `CLERK_SECRET_KEY` and `CLERK_WEBHOOK_SIGNING_SECRET` (Clerk), `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (Stripe; roll the key), `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `CRON_SECRET` (also update the pg_cron job that calls the endpoint), `CONSULTATION_TOKEN_SECRET` (rotating **revokes every customer appointment link**; customers must use the "email me a new link" path or contact us). Treat the old value as public forever. Remove it from git history only after rotating; history rewriting does not un-leak it |
| **Admin or client account takeover** | Clerk dashboard > Users: revoke sessions, reset or disable the user, require MFA. If an admin: remove the row from `platform_admins` (service role / SQL editor) until the account is secured. Review `audit_logs` for that Clerk user id for the window |
| **Unauthorised data access** (a client saw another client's data) | Put the site in maintenance by rolling back to the last deployment before the cause (Vercel Instant Rollback) or, if the cause is data not code, disable the affected route by deploying a fix; take a fresh `db dump` first for evidence. Run `docs/security/sql/rls-inventory.sql` and diff against the expected matrix |
| **Form abuse** (spam flood, enquiry or booking bombing) | Vercel > Firewall > turn on **Attack Challenge Mode** (temporary, challenges all visitors; see the crawler warning in the checklist), add a rate-limit or IP-block rule for the offending path. Check Resend usage and the consultation outbox for queued junk; cancel junk bookings through the admin page |
| **Malicious or vulnerable dependency** | Pin or remove the package, `npm ci`, run `npm test`, redeploy. Check whether production ran the bad version (`/api/health` commit, lockfile in that commit). Rotate any secret the build or runtime could read |
| **Site defaced / DNS hijack / registrar compromise** | Ben: Synergy Wholesale account, lock the domain, check DNS records against `dns-and-domain-recovery.md`. Wilson: Vercel > Deployments, roll back to a known-good production deployment, review recent collaborator and token activity |
| **Payment anomaly** | Stripe dashboard: pause the webhook endpoint only if events are being forged (signature failures spike); reconcile with `stripe-reconciliation.md`. Invoices are only marked PAID by the signed webhook |

## 4. Investigate

Evidence sources (note that Vercel Hobby runtime logs are short-lived, so capture them
immediately):

- Vercel > project > Logs: filter by path and status; copy relevant lines to the private note.
  `x-vercel-id` ties a request to its log entry.
- Supabase > Logs (API, Postgres, Auth); `audit_logs` and `consultation_booking_events` (the
  latter is append-only and records the actor).
- Clerk > Users > Activity, and Clerk webhook delivery history (Svix).
- Stripe > Developers > Events and Webhooks deliveries.
- Resend > Logs for emails sent.
- GitHub > Settings > Security log is not available on this plan; use `git log --all`, PR and
  Actions history, and the collaborator list.

Questions to answer: what data or capability was exposed, for which clients, from when to when,
and is it still possible. Log everything you ruled out.

## 5. Notify

Ben decides; take legal advice early for SEV1.

- **Notifiable Data Breaches (Privacy Act 1988, Part IIIC).** If personal information was
  accessed or disclosed without authorisation and serious harm is likely, the OAIC and affected
  individuals must be notified as soon as practicable after the assessment, which must be done
  within 30 days of suspecting an eligible breach. Drylake is a small business; whether it is
  covered by the Act is a legal question to confirm, but act as if it is.
- **Clients:** tell affected clients what happened, what data, what we did, what they should do.
  Plain language, no blame, no speculation.
- **Providers:** report a platform-level issue to Clerk, Supabase, Stripe or Vercel through
  their security contacts.
- **Reporter:** tell them when it is fixed.

## 6. Recover and verify

1. Fix the cause on a branch with a failing test first; PR; merge; confirm the production
   commit on `/api/health`.
2. Rotate anything that could have been exposed, even if the evidence is weak.
3. Verify: signed-out `/admin` redirects to sign-in; unauthenticated `POST /api/admin/clients`
   returns 401; `/api/cron/consultation-notifications` without the secret returns 401; the
   public contact form still works; the Discoverability workflow is green.
4. Restore data only if needed, following `supabase-backup-and-restore.md`. Take a fresh dump
   first.

## 7. After the incident

Within a week: a short written post-mortem (timeline, cause, what worked, what did not),
a regression test for the cause, an update to the audit's risk register
(`2026-10-16-security-audit.md`), and any new alert or rule that would have caught it sooner.
Keep client-identifying detail out of the repository.

## 8. Contacts and where things are

| Need | Where |
|---|---|
| Report inbox | `hello@drylake.com.au` (security.txt Contact) |
| Hosting | Vercel project, region syd1; `vercel-recovery.md` |
| Auth | Clerk dashboard; `clerk-recovery.md` |
| Database | Supabase project; `supabase-backup-and-restore.md` |
| Secrets inventory | `docs/operations/disaster-recovery/secrets-recovery-inventory.md` |
| Domain and DNS | Synergy Wholesale; `dns-and-domain-recovery.md` |
| Payments | Stripe; `stripe-reconciliation.md`, `docs/security/stripe-security.md` |
