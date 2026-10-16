# Manual verification checklist (owner steps)

Everything here needs access the 2026-10-16 audit did not have (Vercel, Supabase, Clerk and
GitHub settings). Each step says what passes. **Nothing here should change production data;
steps that change a setting say so.** Record results (pass/fail, date, who) in the pull request
thread or `decisions.md`, then update the register in
[2026-10-16-security-audit.md](2026-10-16-security-audit.md).

Space any scripted request at least 12 seconds apart.

## 1. Vercel (Wilson, dashboard)

| # | Step | Pass |
|---|---|---|
| V1 | Project > Firewall > Rules: list the rules | A rate-limit rule covers `POST /api/contact` (for example 5 per minute per IP) and one covers `POST /api/consultations`; both enabled. If none exist, add them (this changes a setting; note the values). Hobby has a small rule allowance, so prefer 2 or 3 targeted rules |
| V2 | Firewall > **Attack Challenge Mode** | Currently **off** for normal operation. Know where the switch is; turn it on only during an attack. **Warning:** while on, it challenges every visitor and can block search and AI crawlers; turn it off afterwards and run the Discoverability workflow |
| V3 | Firewall > Bot Protection / AI bots managed rules, if offered on the plan | If enabled, confirm Googlebot, Bingbot and the AI search agents (OAI-SearchBot, PerplexityBot, Claude-SearchBot) are **not** blocked, and that `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/.well-known/*` stay reachable. Then run `node scripts/discoverability-check.mjs` |
| V4 | Settings > Environment Variables | No secret has a `NEXT_PUBLIC_` name. Secrets (`SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `CRON_SECRET`, `CONSULTATION_TOKEN_SECRET`) are Production-scoped and not exposed to Preview unless needed. `TURNSTILE_SECRET_KEY` is the real secret, not a `1x000...AA` test value |
| V5 | Settings > Deployment Protection | Preview deployments require Vercel authentication or a bypass token you control |
| V6 | Settings > Team / Members and Tokens | Only the people who need access; no stale access tokens |
| V7 | Logs: note the retention shown | Record it. Hobby retention is short; decide if a log drain or plan upgrade is wanted (audit S-05) |
| V8 | Domains | `www` redirects to the apex; certificate valid; no unexpected domains attached |

## 2. Supabase (Wilson, dashboard; read-only SQL)

| # | Step | Pass |
|---|---|---|
| S1 | SQL editor: run [`sql/rls-inventory.sql`](sql/rls-inventory.sql) section by section (read-only) and send the result grids to Claude | `rls_enabled = true` on every table in the matrix in [rls-and-tenant-isolation.md](rls-and-tenant-isolation.md); no `anon` grants on client-data tables; no client INSERT/UPDATE/DELETE policies; policies keyed on `current_clerk_org_id()`; `client-documents` bucket not public; no `SECURITY DEFINER` function executable by `anon` |
| S2 | Also run `docs/operations/sql/2026-10-06-portal-rls-check.sql` | Policy `roles` are as the matrix expects |
| S3 | Read-only check of the consultation tables: `select relname, relrowsecurity from pg_class where relname like 'consultation_%';` and `select grantee, privilege_type from information_schema.role_table_grants where table_name like 'consultation_%' and grantee in ('anon','authenticated');` | RLS true; the second query returns **no rows** |
| S4 | Project Settings > API: the secret key is only in Vercel; the publishable key is the only key in the browser; note the key type (new `sb_` keys vs legacy JWT keys) | As described |
| S5 | Organization > Billing and Database > Backups | Record the plan, whether daily backups exist and their dates, and whether PITR is enabled. Storage objects are **not** in database backups: confirm the off-site dump routine in `supabase-backup-and-restore.md` is actually scheduled |
| S6 | Restore test (once, to a **new** project; do not restore over production) | Follow `supabase-backup-and-restore.md`; record the time taken |
| S7 | Auth settings (if Supabase Auth is unused) | Email sign-ups disabled so the Supabase Auth endpoint cannot be used to create users |
| S8 | Network / Database settings | Direct database access restricted if the plan allows; the pg_cron job uses the current `CRON_SECRET` |

## 3. Clerk (Wilson, dashboard) and browser

| # | Step | Pass |
|---|---|---|
| C1 | User & Authentication > Multi-factor | MFA enabled. Every user in `platform_admins` has an authenticator app or passkey enrolled. List the admins with `select clerk_user_id from platform_admins;` (service role / SQL editor) and match each to a Clerk user |
| C2 | Sessions > session lifetime and inactivity timeout | Set deliberately (for example 7 days maximum lifetime, shorter inactivity for admin if offered). Record the values |
| C3 | Restrictions > sign-up mode | **Restricted / invitation only**: no one can create an account without an invitation |
| C4 | Attack protection | Bot protection on; lockout after repeated failed sign-ins on; password policy at least the default (breached-password check on) |
| C5 | Email and password reset | Reset requires a code sent to a verified email; the sender and templates are the Drylake ones |
| C6 | Webhooks | One endpoint `https://drylake.com.au/api/clerk/webhook`; signing secret matches Vercel; recent deliveries are 200 |
| C7 | Cookies, in a browser (DevTools > Application > Cookies, signed in) | `__client` is HttpOnly and Secure; `__session` is Secure and `SameSite=Lax`; no Drylake cookie lacks `Secure` |
| C8 | Sign-out | After signing out, a request to `/client` redirects to sign-in, and the old `__session` value no longer works when replayed (use a private window with a copied value; or confirm in Clerk > Sessions that the session shows as ended) |
| C9 | Open redirect | `https://drylake.com.au/sign-in?redirect_url=https://example.com` lands on a drylake.com.au page after sign-in |

## 4. GitHub (Ben or Wilson as owner)

Wilson has write access but not admin, so the repository owner does these in
Settings > Code security and Settings > Branches.

| # | Step | Pass |
|---|---|---|
| G1 | Enable **Dependabot alerts** and **Dependabot security updates** (free on private repos) | Both on. The audit found alerts reported as disabled |
| G2 | Secret scanning and push protection | If the plan offers them for private repositories, enable both. If not, record that gitleaks was run manually on 2026-10-16 (3 false positives, none live) and schedule a re-run each quarter: `docker run --rm -v "$PWD":/repo zricethezav/gitleaks:latest detect --source /repo --redact --log-opts="--all"` |
| G3 | Branch protection or ruleset for `main` | On a free private repo this may be unavailable. If unavailable, agree the rule "everything through a PR, no direct pushes" and record it; consider GitHub Pro/Team if the business wants enforcement |
| G4 | Settings > Actions > General | Workflow permissions "Read repository contents" by default; no secrets in repository settings that no workflow uses |
| G5 | Collaborators and deploy keys | Only Ben and Wilson; no stale keys or apps |
| G6 | Code scanning (CodeQL) | Not available on this plan (the audit found it disabled). If the repository becomes public or Advanced Security is bought, add the standard CodeQL workflow for JavaScript/TypeScript |
| G7 | Confirm after this PR merges | `.github/dependabot.yml` shows npm and github-actions both weekly in Insights > Dependency graph > Dependabot; `SECURITY.md` shows under the Security tab |

## 5. Monitoring (Wilson)

| # | Step | Pass |
|---|---|---|
| M1 | Create a free uptime monitor for `https://drylake.com.au/api/health` (expects 200 and `"status":"ok"`) with an email alert | Alert reaches both owners; test it once |
| M2 | Clerk > notifications for sign-in from new devices (end users) and the admin email for suspicious activity | On |
| M3 | Stripe > Developers > Webhooks: email alert on failing endpoint | On |
| M4 | Resend: domain verified (SPF/DKIM), bounce and complaint notices go to a monitored inbox | Yes |

## 6. Public checks anyone can run (read-only, 12 s apart)

```bash
curl -sI https://drylake.com.au/ | grep -iE "strict-transport|content-security|x-frame|x-content-type|referrer|permissions"
curl -s -w ' %{http_code}\n' -X POST -H 'Origin: https://evil.example' -H 'Content-Type: application/json' -d '{}' https://drylake.com.au/api/contact   # expect 403
curl -s -w ' %{http_code}\n' https://drylake.com.au/api/cron/consultation-notifications                                            # expect 401
curl -s -w ' %{http_code}\n' -X POST -H 'Content-Type: application/json' -d '{}' https://drylake.com.au/api/admin/clients          # expect 401
curl -s https://drylake.com.au/.well-known/security.txt                                                                           # Expires still in the future
```

After the Vercel rule changes in V1 to V3, repeat the crawler check:

```bash
for ua in "Googlebot/2.1" "bingbot/2.0" "OAI-SearchBot/1.0" "PerplexityBot/1.0" "Claude-SearchBot/1.0"; do
  curl -s -o /dev/null -w "$ua %{http_code}\n" -A "$ua" https://drylake.com.au/services; sleep 1; done
```

All must be 200.

## 7. Recording the result

For each failed step, add a row to the register in the audit with the owner and a date.
Review this checklist after any change to Clerk, Supabase, Vercel or GitHub settings, and at
least quarterly.
