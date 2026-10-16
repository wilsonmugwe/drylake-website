-- Database tests for supabase/migrations/20261016140000_review_requests.sql.
-- Run by tests/db/run-review-db-tests.sh against a throwaway Postgres.

\set QUIET on
\pset tuples_only on
\pset format unaligned
set client_min_messages = warning;

create or replace function pg_temp.eq(actual anyelement, expected anyelement, label text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL %: expected %, got %', label, expected, actual;
  end if;
  raise notice 'ok  %', label;
end $$;

create or replace function pg_temp.raises(stmt text)
returns boolean language plpgsql as $$
begin
  execute stmt;
  return false;
exception when others then
  return true;
end $$;

-- 64 hex chars from a seed, as the app's sha256 hex would be.
create or replace function pg_temp.h(seed text) returns text language sql as $$
  select md5(seed) || md5(seed || 'x');
$$;

create or replace function pg_temp.create_req(kind text, eng uuid, email text, seed text)
returns text language sql as $$
  select outcome from public.review_create_request(
    kind, eng, null, 'Example Pty Ltd', 'Quinn Tester', email,
    pg_temp.h(seed), pg_temp.h('u' || seed), now() + interval '30 days', 'user_admin');
$$;

set client_min_messages = notice;

-- ---------------------------------------------------------------- access
select pg_temp.eq((select relrowsecurity from pg_class where oid = 'public.review_requests'::regclass), true, 'RLS on review_requests');
select pg_temp.eq((select relrowsecurity from pg_class where oid = 'public.review_feedback'::regclass), true, 'RLS on review_feedback');
select pg_temp.eq((select relrowsecurity from pg_class where oid = 'public.review_suppressions'::regclass), true, 'RLS on review_suppressions');
select pg_temp.eq(has_table_privilege('anon', 'public.review_requests', 'select'), false, 'anon cannot read requests');
select pg_temp.eq(has_table_privilege('authenticated', 'public.review_feedback', 'select'), false, 'authenticated cannot read feedback');
select pg_temp.eq(has_table_privilege('anon', 'public.review_suppressions', 'insert'), false, 'anon cannot write suppressions');
select pg_temp.eq(has_table_privilege('service_role', 'public.review_requests', 'delete'), false, 'service_role cannot delete requests');
select pg_temp.eq(has_function_privilege('anon', 'public.review_submit_feedback(text, smallint, text, boolean, text)', 'execute'), false, 'anon cannot execute submit');
select pg_temp.eq(has_function_privilege('authenticated', 'public.review_lookup(text)', 'execute'), false, 'authenticated cannot execute lookup');
select pg_temp.eq(has_function_privilege('service_role', 'public.review_lookup(text)', 'execute'), true, 'service_role can execute lookup');

set role service_role;

-- ---------------------------------------------------------------- duplicate guard
select pg_temp.eq(pg_temp.create_req('project', '11111111-1111-4111-8111-111111111111', 'Quinn@Example.com', 'a'), 'created', 'first request created');
select pg_temp.eq(pg_temp.create_req('project', '11111111-1111-4111-8111-111111111111', 'quinn@example.com', 'b'), 'duplicate', 'same recipient, same engagement, other casing: duplicate');
select pg_temp.eq(pg_temp.create_req('project', '11111111-1111-4111-8111-111111111111', 'other@example.com', 'c'), 'created', 'different recipient, same engagement: allowed');
select pg_temp.eq(pg_temp.create_req('project', '22222222-2222-4222-8222-222222222222', 'quinn@example.com', 'd'), 'created', 'same recipient, different engagement: allowed');
select pg_temp.eq((select count(*)::int from public.review_requests), 3, 'three rows, the duplicate wrote nothing');
select pg_temp.eq((select status from public.review_requests where token_hash = pg_temp.h('a')), 'queued', 'new request is queued until the email is accepted');
select pg_temp.eq(pg_temp.raises($q$insert into public.review_requests (engagement_kind, engagement_id, recipient_name, recipient_email, token_hash, unsubscribe_token_hash, token_expires_at, sent_by)
  values ('invoice', gen_random_uuid(), 'A', 'a@example.com', repeat('a', 64), repeat('b', 64), now(), 'u')$q$), true, 'unknown engagement kind rejected');
select pg_temp.eq(pg_temp.raises($q$insert into public.review_requests (engagement_kind, engagement_id, recipient_name, recipient_email, token_hash, unsubscribe_token_hash, token_expires_at, sent_by)
  values ('project', gen_random_uuid(), 'A', 'a@example.com', 'not-a-hash', repeat('b', 64), now(), 'u')$q$), true, 'token must be a sha256 hex');

-- Requests only become usable once the app marks them sent (after the provider accepted the email).
select pg_temp.eq((select state from public.review_lookup(pg_temp.h('a'))), 'invalid', 'a queued request cannot be opened');
update public.review_requests set status = 'sent', sent_at = now();

-- ---------------------------------------------------------------- lookup
select pg_temp.eq((select state from public.review_lookup(pg_temp.h('a'))), 'open', 'sent request is open');
select pg_temp.eq((select recipient_name from public.review_lookup(pg_temp.h('a'))), 'Quinn Tester', 'lookup returns the recipient name');
select pg_temp.eq((select state from public.review_lookup(pg_temp.h('nope'))), 'invalid', 'unknown token is invalid');

-- ---------------------------------------------------------------- submit: single use, validation
select pg_temp.eq(public.review_submit_feedback(pg_temp.h('nope'), 5::smallint, 'Great', false, null), 'invalid', 'unknown token');
select pg_temp.eq(public.review_submit_feedback(pg_temp.h('a'), null, '   ', false, null), 'empty', 'nothing given is refused');
select pg_temp.eq(public.review_submit_feedback(pg_temp.h('a'), 9::smallint, 'x', false, null), 'invalid_input', 'rating out of range');
select pg_temp.eq(public.review_submit_feedback(pg_temp.h('a'), 4::smallint, null, true, 'anonymous'), 'consent_needs_comments', 'consent without comments is refused');
select pg_temp.eq(public.review_submit_feedback(pg_temp.h('a'), 4::smallint, 'Good work', true, 'bogus'), 'invalid_input', 'unknown display choice');
select pg_temp.eq((select status from public.review_requests where token_hash = pg_temp.h('a')), 'sent', 'refused attempts do not spend the token');

select pg_temp.eq(public.review_submit_feedback(pg_temp.h('a'), 4::smallint, 'Good work, slow replies.', true, 'first_name_and_organisation'), 'submitted', 'valid submit');
select pg_temp.eq(public.review_submit_feedback(pg_temp.h('a'), 4::smallint, 'Again', false, null), 'already_submitted', 'second use of the token refused');
select pg_temp.eq((select state from public.review_lookup(pg_temp.h('a'))), 'submitted', 'lookup shows submitted');
select pg_temp.eq((select display_name from public.review_feedback), 'Quinn', 'first name only, computed server side');
select pg_temp.eq((select display_organisation from public.review_feedback), 'Example Pty Ltd', 'organisation snapshot');
select pg_temp.eq((select approved from public.review_feedback), false, 'consent does not approve');
select pg_temp.eq((select publish_consent and consent_at is not null from public.review_feedback), true, 'consent recorded with a time');

-- Negative feedback is stored like any other.
select pg_temp.eq(public.review_submit_feedback(pg_temp.h('c'), 1::smallint, 'Poor communication.', false, null), 'submitted', 'negative feedback accepted');
select pg_temp.eq((select count(*)::int from public.review_feedback where rating = 1 and not publish_consent), 1, 'negative feedback stored, no consent');

-- ---------------------------------------------------------------- expiry and withdrawal
update public.review_requests set token_expires_at = now() - interval '1 minute' where token_hash = pg_temp.h('d');
update public.review_requests set status = 'sent' where token_hash = pg_temp.h('d');
select pg_temp.eq(public.review_submit_feedback(pg_temp.h('d'), 5::smallint, 'Late', false, null), 'expired', 'expired token refused');
select pg_temp.eq((select state from public.review_lookup(pg_temp.h('d'))), 'expired', 'lookup shows expired');
select pg_temp.eq(pg_temp.create_req('consultation', '33333333-3333-4333-8333-333333333333', 'w@example.com', 'w'), 'created', 'request to withdraw');
update public.review_requests set status = 'withdrawn' where token_hash = pg_temp.h('w');
select pg_temp.eq(public.review_submit_feedback(pg_temp.h('w'), 5::smallint, 'Nope', false, null), 'withdrawn', 'withdrawn token refused');

-- ---------------------------------------------------------------- publication invariant
select pg_temp.eq(pg_temp.raises($q$update public.review_feedback set approved = true where rating = 1$q$), true, 'cannot approve without consent');
update public.review_feedback set approved = true, approved_at = now(), approved_by = 'user_admin' where publish_consent;
select pg_temp.eq((select count(*)::int from public.review_feedback where approved), 1, 'consented feedback can be approved');
select pg_temp.eq(pg_temp.raises($q$update public.review_feedback set removed_at = now(), removed_by = 'u' where approved$q$), true, 'cannot remove content while approved');
update public.review_feedback set approved = false, approved_at = null, comments = null, removed_at = now(), removed_by = 'user_admin' where approved;
select pg_temp.eq((select comments is null and removed_at is not null and not approved from public.review_feedback where publish_consent), true, 'removed content is cleared and unapproved');
select pg_temp.eq(pg_temp.raises($q$update public.review_feedback set approved = true where removed_at is not null$q$), true, 'removed content cannot be approved');

-- ---------------------------------------------------------------- unsubscribe and suppression
select pg_temp.eq(public.review_unsubscribe(pg_temp.h('nope')), 'invalid', 'unknown unsubscribe token');
select pg_temp.eq(public.review_unsubscribe(pg_temp.h('ud')), 'unsubscribed', 'unsubscribe works');
select pg_temp.eq(public.review_unsubscribe(pg_temp.h('ud')), 'unsubscribed', 'unsubscribe is idempotent');
select pg_temp.eq((select count(*)::int from public.review_suppressions where email_lower = 'quinn@example.com'), 1, 'one suppression row for the address');
select pg_temp.eq(pg_temp.create_req('project', '44444444-4444-4444-8444-444444444444', 'QUINN@example.com', 's1'), 'suppressed', 'suppressed address cannot be asked again, whatever the casing');
select pg_temp.eq(pg_temp.create_req('consultation', '55555555-5555-4555-8555-555555555555', 'fresh@example.com', 's2'), 'created', 'other addresses unaffected');
select pg_temp.eq(pg_temp.raises($q$insert into public.review_suppressions (email_lower, source) values ('Upper@Example.com', 'admin')$q$), true, 'suppression keys are lower case');

reset role;
set role anon;
select pg_temp.eq(pg_temp.raises('select count(*) from public.review_feedback'), true, 'anon select raises');
reset role;
