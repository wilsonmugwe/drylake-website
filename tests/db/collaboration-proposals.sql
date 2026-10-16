-- Database tests for supabase/migrations/20261016120000_collaboration_proposals.sql.
-- Run by tests/db/run-collaboration-db-tests.sh against a throwaway Postgres.

\set QUIET on
set client_min_messages = warning;

create or replace function pg_temp.eq(actual anyelement, expected anyelement, label text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL %: expected %, got %', label, expected, actual;
  end if;
  raise notice 'ok  %', label;
end $$;

-- Runs a statement and reports whether it raised.
create or replace function pg_temp.raises(stmt text)
returns boolean language plpgsql as $$
begin
  execute stmt;
  return false;
exception when others then
  return true;
end $$;

set client_min_messages = notice;

select pg_temp.eq((select relrowsecurity from pg_class where oid = 'public.collaboration_proposals'::regclass), true, 'RLS enabled');
select pg_temp.eq(has_table_privilege('anon', 'public.collaboration_proposals', 'select'), false, 'anon cannot select');
select pg_temp.eq(has_table_privilege('anon', 'public.collaboration_proposals', 'insert'), false, 'anon cannot insert');
select pg_temp.eq(has_table_privilege('authenticated', 'public.collaboration_proposals', 'select'), false, 'authenticated cannot select');
select pg_temp.eq(has_table_privilege('authenticated', 'public.collaboration_proposals', 'update'), false, 'authenticated cannot update');
select pg_temp.eq(has_table_privilege('service_role', 'public.collaboration_proposals', 'insert'), true, 'service_role can insert');
select pg_temp.eq(has_table_privilege('service_role', 'public.collaboration_proposals', 'delete'), false, 'service_role cannot delete');

set role service_role;

insert into public.collaboration_proposals (name, organisation, email, category, project, summary, consent_at)
values ('Quinn Tester', 'Example Pty Ltd', 'quinn@example.com', 'pilot_project', 'bronnie',
        'We would like to pilot the platform with our front desk team.', now());

select pg_temp.eq((select status from public.collaboration_proposals where email = 'quinn@example.com'), 'new', 'status defaults to new');
select pg_temp.eq((select internal_notes from public.collaboration_proposals where email = 'quinn@example.com'), null::text, 'no internal notes by default');

select pg_temp.eq(pg_temp.raises($q$insert into public.collaboration_proposals (name, organisation, email, category, project, summary, consent_at)
  values ('A', 'B', 'a@example.com', 'not_a_category', 'drylake', 'long enough summary text here', now())$q$), true, 'unknown category rejected');
select pg_temp.eq(pg_temp.raises($q$insert into public.collaboration_proposals (name, organisation, email, category, project, summary, consent_at)
  values ('A', 'B', 'a@example.com', 'other', 'unknown_project', 'long enough summary text here', now())$q$), true, 'unknown project rejected');
select pg_temp.eq(pg_temp.raises($q$insert into public.collaboration_proposals (name, organisation, email, category, project, summary, consent_at)
  values ('A', 'B', 'a@example.com', 'other', 'drylake', 'too short', now())$q$), true, 'short summary rejected');
select pg_temp.eq(pg_temp.raises($q$insert into public.collaboration_proposals (name, organisation, email, category, project, summary, consent_at)
  values ('A', 'B', 'not-an-email', 'other', 'drylake', 'long enough summary text here', now())$q$), true, 'bad email rejected');
select pg_temp.eq(pg_temp.raises($q$insert into public.collaboration_proposals (name, organisation, email, category, project, summary)
  values ('A', 'B', 'a@example.com', 'other', 'drylake', 'long enough summary text here')$q$), true, 'consent_at is required');
select pg_temp.eq(pg_temp.raises($q$update public.collaboration_proposals set status = 'won' where email = 'quinn@example.com'$q$), true, 'unknown status rejected');
select pg_temp.eq(pg_temp.raises($q$update public.collaboration_proposals set internal_notes = repeat('x', 5001) where email = 'quinn@example.com'$q$), true, 'oversize notes rejected');

-- updated_at moves on update, created_at does not.
select pg_temp.eq(pg_temp.raises($q$update public.collaboration_proposals set updated_at = now() - interval '1 day' where email = 'quinn@example.com'$q$), false, 'update allowed');
update public.collaboration_proposals set status = 'under_review', updated_by = 'user_test', internal_notes = 'Call Tuesday'
 where email = 'quinn@example.com';
select pg_temp.eq((select status from public.collaboration_proposals where email = 'quinn@example.com'), 'under_review', 'status updated');
select pg_temp.eq((select updated_at >= created_at from public.collaboration_proposals where email = 'quinn@example.com'), true, 'trigger keeps updated_at current');

reset role;

-- A browser role must not be able to read the table, even with RLS bypass off.
set role anon;
select pg_temp.eq(pg_temp.raises('select count(*) from public.collaboration_proposals'), true, 'anon select raises');
reset role;
set role authenticated;
select pg_temp.eq(pg_temp.raises('select count(*) from public.collaboration_proposals'), true, 'authenticated select raises');
reset role;
