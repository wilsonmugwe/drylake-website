# Findings deferred to later PRs

Recorded during PR 1 and deliberately **not** fixed here, per the programme rule.

## PR 2: Security hardening
- **RLS policies are not in the repo**, so tenant isolation cannot be reviewed or tested from
  source. `tests/tenant-isolation.test.mjs` tests application-layer scoping only. PR 2 needs a
  read-only policy dump (`pg_policies`, grants) from production.
- `docs/operations/sql/2026-10-06-portal-rls-check.sql` and the token-claims SQL exist, but no
  automated cross-tenant test runs against a real database.
- Service role is used in 37 files. PR 2 should inventory and justify each.
- Clerk middleware adds a CSP fragment for Turnstile only; full security-header review (CSP,
  HSTS, Permissions-Policy) is PR 2.
- `/api/client/invitations/complete` uses an Origin equality check; review CSRF posture of the
  other mutation routes in PR 2.

## PR 3: Backup, disaster recovery, resilience
- **Only one migration (`20261005120000_client_status_lifecycle.sql`) is committed.** Tables,
  RLS policies, functions (including invoice numbering) and grants exist only in Supabase. A
  lost project cannot be rebuilt from Git. Highest-priority PR 3 item.
- No test or staging database: nothing exercises queries end to end before production.
- Production environment variables live only in the Vercel dashboard (registry now names them).

## PR 4: Codebase professionalisation
- `drylake-v3-source.txt` and `drylake-tree.txt` at the repo root look like generated dumps.
- No `.env.example`; README has no environment or local-development section.
- Mixed import styles (`@/` alias vs relative `.ts`) driven by the node test runner.
- Several routes write `audit_logs` inline instead of `writeAuditLog`.
- Repeated bespoke `jsonError` helpers across routes.
