# Apply the collaboration and review migrations (owner runbook, 2026-10-16)

Status: **NOT applied in production** as far as this repo knows. Do not record them as applied until
section 3 returns the expected rows against production.

Until both are applied:
- `/collaborate` submissions answer 502, and the visitor is told to email `hello@drylake.com.au` (the
  email fallback stays in place);
- `/admin/collaborations` and `/admin/reviews` show an error panel.

Both files are re-runnable and touch only their own new objects.

| File | Creates |
|---|---|
| `supabase/migrations/20261016120000_collaboration_proposals.sql` | table `collaboration_proposals`, trigger function `collaboration_proposals_touch` |
| `supabase/migrations/20261016140000_review_requests.sql` | tables `review_requests`, `review_feedback`, `review_suppressions`; functions `review_create_request`, `review_lookup`, `review_submit_feedback`, `review_unsubscribe` |

## 1. Review findings (read before applying)

| Check | Result |
|---|---|
| Row Level Security | Enabled on all 4 tables, with no policies. A browser session (`anon`, `authenticated`) can read nothing |
| Privileges | `revoke all` from `anon` and `authenticated`. `service_role` gets select/insert/update only (`review_suppressions`: select/insert) |
| Functions | All `security invoker` with `set search_path = ''`, which blocks search-path hijack. `revoke all ... from public, anon, authenticated` and `grant execute ... to service_role` only |
| Concurrency | Feedback tokens are single use: the row is locked `for update`, and the token is spent in the same transaction. Duplicate requests are blocked by a unique index on (kind, engagement, lower(email)). Both are tested against Postgres 17 (`tests/db/run-*-db-tests.sh`) |
| Publication rule | A testimonial can be approved only with publish consent, comments, and no removal. This is enforced by the database constraint `review_feedback_approved_only_if_consented` |
| Secrets at rest | Only SHA-256 hashes of the feedback and unsubscribe tokens are stored |
| Compatibility | Uses `gen_random_uuid()` and expression indexes, standard on Supabase Postgres 15+. No foreign key to `organizations` (that table is managed outside the committed migrations) |
| **Gap: no DELETE grant** | No table grants DELETE to `service_role`, so a privacy deletion request is done by the owner in the SQL editor (section 5). This is deliberate, to keep an app bug from destroying records. It is not exposed anywhere |
| **Gap: no admin opt-out action** | A "please remove me" reply is added by SQL (section 5) until an admin button exists |

## 2. Apply (Supabase dashboard, about 3 minutes)

1. Supabase > project `drylake` (production) > **SQL Editor** > New query.
2. Paste the **entire** contents of `supabase/migrations/20261016120000_collaboration_proposals.sql` from `main`, then **Run**. Expect `Success. No rows returned`.
3. New query. Paste the whole of `supabase/migrations/20261016140000_review_requests.sql`, then **Run**. Expect the same.
4. If either errors, stop and copy the error text. Both are re-runnable, so a second run after a fix is safe.

(CLI alternative, if the project is linked locally: `supabase db push`. The dashboard route is preferred here because the earlier tables are not all in committed migrations.)

## 3. Verify (read-only, run in the SQL editor, paste the results back)

```sql
-- RLS on all four, expect 4 rows with rls = true
select c.relname, c.relrowsecurity as rls
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('collaboration_proposals','review_requests','review_feedback','review_suppressions')
order by 1;

-- Table privileges: expect service_role only (no anon, no authenticated)
select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('collaboration_proposals','review_requests','review_feedback','review_suppressions')
  and grantee in ('anon','authenticated','service_role')
group by 1,2 order by 1,2;

-- Functions: expect security definer = false and search_path='' on all five
select p.proname, p.prosecdef as security_definer, p.proconfig
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (p.proname like 'review\_%' or p.proname = 'collaboration_proposals_touch')
order by 1;

-- Execute rights: expect only service_role (plus postgres, the owner)
select routine_name, grantee
from information_schema.routine_privileges
where routine_schema = 'public' and routine_name like 'review\_%'
order by 1,2;
```

## 4. After applying: end-to-end tests (in Ben's Chrome, real Turnstile)

Keep the email fallback until every row passes.

| # | Test | Expected |
|---|---|---|
| C1 | Submit `/collaborate` as Drylake (internal address), project BRONNIE | Success screen, acknowledgement email says "not a partnership", notification reaches the inbox |
| C2 | Submit with the summary under 20 characters, no consent, or a bad website URL | Inline errors and nothing stored |
| C3 | 11 rapid submissions | Rate limited (429) |
| C4 | `/admin/collaborations` as each admin: filter, open, change status, add a note | Saved, audit entry written |
| C5 | Signed out, then signed in as a non-admin | Redirected to sign-in, then refused |
| C6 | Abbicare | Not offered (flag off), and the API rejects `project=abbicare` |
| R1 | `/admin/reviews`: send a request to an internal address for a completed consultation | Email arrives with "How did we do?", an unsubscribe link and the List-Unsubscribe header |
| R2 | Send again for the same engagement | Blocked as a duplicate |
| R3 | Submit feedback via the link, without publish consent | Stored, visible to admins, not published |
| R4 | Reuse the same link | "Already submitted" |
| R5 | A second request with publish consent, admin approves | The quote appears on `/services` and no star or count appears |
| R6 | Unsubscribe link, then send another request | Suppressed |

Record date, evidence and pass/fail per row.

## 5. Owner-only SQL (privacy requests)

```sql
-- Delete a collaboration proposal (privacy request). Look it up first.
select id, created_at, organisation from public.collaboration_proposals where lower(email) = lower('<address>');
delete from public.collaboration_proposals where id = '<id>';

-- Delete review data for one person: feedback, then suppression link, then requests.
delete from public.review_feedback where request_id in
  (select id from public.review_requests where lower(recipient_email) = lower('<address>'));
update public.review_suppressions set request_id = null where request_id in
  (select id from public.review_requests where lower(recipient_email) = lower('<address>'));
delete from public.review_requests where lower(recipient_email) = lower('<address>');
-- Keep (or add) the suppression row so they are never asked again:
insert into public.review_suppressions (email_lower, source) values (lower('<address>'), 'admin')
on conflict (email_lower) do nothing;
```

Record each privacy deletion in the audit trail per `~/.claude/rules/account-deletion.md`.
