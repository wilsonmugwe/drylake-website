-- Database tests for supabase/migrations/20261013120000_consultation_bookings.sql as amended by
-- 20261014090000_consultation_representatives.sql (one representative here: Benedict, so the
-- original single-calendar rules are exercised unchanged; multi-representative rules live in
-- tests/db/consultation-representatives.sql).
-- Run by tests/db/run-consultation-db-tests.sh against a throwaway Postgres. Any failed
-- assertion raises and stops the run (psql -v ON_ERROR_STOP=1).

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

-- A Perth wall-clock slot next week. Day offset 0 = Monday ... 6 = Sunday.
create or replace function pg_temp.slot(day_offset int, hh int, mm int, weeks int default 1)
returns timestamptz language sql as $$
  select ((date_trunc('week', now() at time zone 'Australia/Perth') + make_interval(days => 7 * weeks + day_offset))
          + make_time(hh, mm, 0)) at time zone 'Australia/Perth';
$$;

create or replace function pg_temp.book(p_start timestamptz, p_email text default 'a@example.com', p_key uuid default gen_random_uuid())
returns text language sql as $$
  select outcome from public.consultation_create_booking(
    gen_random_uuid(), p_key, 'DL-' || substr(md5(random()::text), 1, 6), 'Test Person', p_email, null, null,
    'About my business', p_start, md5(random()::text) || md5(random()::text),
    array['wilson@drylake.com.au', 'benedict@drylake.com.au'], 'TEAMS', array['benedict']);
$$;

set client_min_messages = notice;
set role service_role;

-- ---------------------------------------------------------------- slot rules
select pg_temp.eq(pg_temp.book(pg_temp.slot(0, 10, 0)), 'created', 'Monday 10:00 succeeds');
select pg_temp.eq(pg_temp.book(pg_temp.slot(1, 10, 0)), 'created', 'Tuesday 10:00 succeeds');
select pg_temp.eq(pg_temp.book(pg_temp.slot(4, 10, 0), 'b@example.com'), 'created', 'Friday 10:00 succeeds');
select pg_temp.eq(pg_temp.book(pg_temp.slot(2, 10, 0)), 'invalid_slot', 'Wednesday fails');
select pg_temp.eq(pg_temp.book(pg_temp.slot(3, 10, 0)), 'invalid_slot', 'Thursday fails');
select pg_temp.eq(pg_temp.book(pg_temp.slot(5, 10, 0)), 'invalid_slot', 'Saturday fails');
select pg_temp.eq(pg_temp.book(pg_temp.slot(6, 10, 0)), 'invalid_slot', 'Sunday fails');
select pg_temp.eq(pg_temp.book(pg_temp.slot(0, 8, 30, 2)), 'invalid_slot', 'before 9:00 fails');
select pg_temp.eq(pg_temp.book(pg_temp.slot(0, 9, 0, 2), 'c@example.com'), 'created', '9:00 succeeds');
select pg_temp.eq(pg_temp.book(pg_temp.slot(0, 16, 30, 2), 'c@example.com'), 'created', '16:30 succeeds (ends 17:00)');
select pg_temp.eq(pg_temp.book(pg_temp.slot(0, 17, 0, 2)), 'invalid_slot', '17:00 fails');
select pg_temp.eq(pg_temp.book(pg_temp.slot(0, 10, 15, 2)), 'invalid_slot', 'off the half hour fails');
select pg_temp.eq(pg_temp.book(pg_temp.slot(0, 10, 0, -1)), 'too_soon', 'past date fails');
select pg_temp.eq(pg_temp.book(pg_temp.slot(0, 10, 0, 6)), 'too_far', 'beyond the 29-day horizon fails');

-- The CHECK constraint holds even when a caller bypasses the function.
do $$
begin
  insert into public.consultation_bookings (id, reference, customer_name, customer_email, project_description,
    start_time, end_time, idempotency_key, management_token_hash, management_token_expires_at, assigned_representative, meeting_method)
  values (gen_random_uuid(), 'DL-DIRECT', 'X', 'x@example.com', 'x', pg_temp.slot(2, 10, 0), pg_temp.slot(2, 10, 30),
    gen_random_uuid(), repeat('a', 64), now() + interval '30 days', 'benedict', 'TEAMS');
  raise exception 'FAIL direct Wednesday insert was accepted';
exception when check_violation then
  raise notice 'ok  CHECK constraint refuses a direct Wednesday insert';
end $$;

-- ---------------------------------------------------------------- double booking
select pg_temp.eq(pg_temp.book(pg_temp.slot(0, 10, 0), 'd@example.com'), 'slot_taken', 'second booking for the same slot fails');

do $$
begin
  insert into public.consultation_bookings (id, reference, customer_name, customer_email, project_description,
    start_time, end_time, idempotency_key, management_token_hash, management_token_expires_at, assigned_representative, meeting_method)
  values (gen_random_uuid(), 'DL-DIRECT2', 'X', 'x@example.com', 'x', pg_temp.slot(0, 10, 0), pg_temp.slot(0, 10, 30),
    gen_random_uuid(), repeat('b', 64), now() + interval '30 days', 'benedict', 'TEAMS');
  raise exception 'FAIL direct overlapping insert was accepted';
exception when exclusion_violation then
  raise notice 'ok  EXCLUDE constraint refuses a direct overlapping insert';
end $$;

-- ---------------------------------------------------------------- idempotency
do $$
declare
  k uuid := gen_random_uuid();
  first_ref text;
  second_ref text;
begin
  perform pg_temp.eq(pg_temp.book(pg_temp.slot(1, 11, 0), 'e@example.com', k), 'created', 'keyed booking created');
  perform pg_temp.eq(pg_temp.book(pg_temp.slot(1, 11, 0), 'e@example.com', k), 'replayed', 'retry with same key replays');
  perform pg_temp.eq(pg_temp.book(pg_temp.slot(1, 11, 0), 'other@example.com', k), 'idempotency_conflict', 'same key, different email refused');
  perform pg_temp.eq((select count(*)::int from public.consultation_bookings where idempotency_key = k), 1, 'retry created no second row');
  perform pg_temp.eq((select count(*)::int from public.consultation_notifications n
                       join public.consultation_bookings b on b.id = n.booking_id where b.idempotency_key = k
                       and n.kind <> 'CUSTOMER_REMINDER'), 3, 'retry queued no duplicate emails (1 customer + 2 founders)');
end $$;

-- ---------------------------------------------------------------- per-email limit
select pg_temp.eq(pg_temp.book(pg_temp.slot(1, 14, 0), 'a@example.com'), 'limit_reached', 'third upcoming booking for one email refused');
select pg_temp.eq(pg_temp.book(pg_temp.slot(1, 14, 0), 'A@Example.com'), 'limit_reached', 'limit is case-insensitive');

-- ---------------------------------------------------------------- notifications on create
do $$
declare
  b public.consultation_bookings;
begin
  select * into b from public.consultation_bookings where start_time = pg_temp.slot(0, 10, 0);
  perform pg_temp.eq((select count(*)::int from public.consultation_notifications where booking_id = b.id and kind = 'CUSTOMER_CONFIRMATION'), 1, 'customer confirmation queued');
  perform pg_temp.eq((select array_agg(recipient order by recipient) from public.consultation_notifications where booking_id = b.id and kind = 'FOUNDER_NEW_BOOKING'),
                     array['benedict@drylake.com.au', 'wilson@drylake.com.au'], 'both founders queued');
  perform pg_temp.eq((select send_after from public.consultation_notifications where booking_id = b.id and kind = 'CUSTOMER_REMINDER' and status = 'PENDING'),
                     b.start_time - interval '24 hours', 'reminder queued exactly 24h before');
  perform pg_temp.eq((select action from public.consultation_booking_events where booking_id = b.id order by id limit 1), 'CREATED', 'CREATED event recorded');
end $$;

-- ---------------------------------------------------------------- reschedule
do $$
declare
  b public.consultation_bookings;
  r record;
  old_reminder uuid;
begin
  select * into b from public.consultation_bookings where start_time = pg_temp.slot(0, 10, 0);
  select id into old_reminder from public.consultation_notifications where booking_id = b.id and kind = 'CUSTOMER_REMINDER' and status = 'PENDING';

  -- Into an occupied slot: refused, original untouched.
  select * into r from public.consultation_reschedule_booking(b.id, b.version, pg_temp.slot(1, 10, 0), 'CUSTOMER', null, repeat('c', 64),
    array['wilson@drylake.com.au', 'benedict@drylake.com.au'], array['benedict']);
  perform pg_temp.eq(r.outcome, 'slot_taken', 'reschedule into a booked slot refused');
  perform pg_temp.eq((select start_time from public.consultation_bookings where id = b.id), b.start_time, 'original slot preserved after failed reschedule');
  perform pg_temp.eq((select status from public.consultation_notifications where id = old_reminder), 'PENDING', 'reminder untouched after failed reschedule');

  -- Invalid day and stale version.
  select * into r from public.consultation_reschedule_booking(b.id, b.version, pg_temp.slot(2, 10, 0), 'CUSTOMER', null, repeat('c', 64), array[]::text[], array['benedict']);
  perform pg_temp.eq(r.outcome, 'invalid_slot', 'reschedule to Wednesday refused');
  select * into r from public.consultation_reschedule_booking(b.id, b.version + 5, pg_temp.slot(0, 11, 0), 'CUSTOMER', null, repeat('c', 64), array[]::text[], array['benedict']);
  perform pg_temp.eq(r.outcome, 'stale', 'reschedule with a stale version refused');

  -- Success: same row moves, old slot is free, reminder re-queued.
  select * into r from public.consultation_reschedule_booking(b.id, b.version, pg_temp.slot(0, 11, 0), 'ADMIN', 'user_admin', repeat('c', 64),
    array['wilson@drylake.com.au', 'benedict@drylake.com.au'], array['benedict']);
  perform pg_temp.eq(r.outcome, 'rescheduled', 'reschedule to a free slot succeeds');
  perform pg_temp.eq(r.version, b.version + 1, 'version bumped');
  perform pg_temp.eq((select status from public.consultation_bookings where id = b.id), 'RESCHEDULED', 'status RESCHEDULED');
  perform pg_temp.eq((select management_token_hash from public.consultation_bookings where id = b.id), repeat('c', 64), 'management token rotated');
  perform pg_temp.eq((select status from public.consultation_notifications where id = old_reminder), 'CANCELLED', 'old reminder cancelled');
  perform pg_temp.eq((select send_after from public.consultation_notifications where booking_id = b.id and kind = 'CUSTOMER_REMINDER' and status = 'PENDING'),
                     pg_temp.slot(0, 11, 0) - interval '24 hours', 'new reminder for the new time');
  perform pg_temp.eq((select payload->>'actor_type' from public.consultation_notifications where booking_id = b.id and kind = 'CUSTOMER_RESCHEDULED'),
                     'ADMIN', 'reschedule email records that Drylake made the change');
  perform pg_temp.eq((select actor_clerk_user_id from public.consultation_booking_events where booking_id = b.id and action = 'RESCHEDULED'),
                     'user_admin', 'admin identity recorded');
  perform pg_temp.eq(pg_temp.book(pg_temp.slot(0, 10, 0), 'f@example.com'), 'created', 'old slot released for someone else');
end $$;

-- ---------------------------------------------------------------- cancel
do $$
declare
  b public.consultation_bookings;
  r record;
begin
  select * into b from public.consultation_bookings where start_time = pg_temp.slot(4, 10, 0);
  select * into r from public.consultation_cancel_booking(b.id, b.version, 'CUSTOMER', null, null, array['wilson@drylake.com.au', 'benedict@drylake.com.au']);
  perform pg_temp.eq(r.outcome, 'cancelled', 'customer cancellation succeeds');
  perform pg_temp.eq((select status from public.consultation_bookings where id = b.id), 'CANCELLED', 'row kept with status CANCELLED');
  perform pg_temp.eq((select count(*)::int from public.consultation_notifications where booking_id = b.id and kind = 'CUSTOMER_REMINDER' and status = 'PENDING'), 0, 'no pending reminder after cancellation');
  perform pg_temp.eq((select count(*)::int from public.consultation_notifications where booking_id = b.id and kind in ('CUSTOMER_CANCELLED', 'FOUNDER_CANCELLED')), 3, 'cancellation emails queued for customer and both founders');
  select * into r from public.consultation_cancel_booking(b.id, r.version, 'CUSTOMER', null, null, array[]::text[]);
  perform pg_temp.eq(r.outcome, 'not_active', 'second cancellation refused');
  perform pg_temp.eq(pg_temp.book(pg_temp.slot(4, 10, 0), 'g@example.com'), 'created', 'cancelled slot is bookable again');
end $$;

-- A replayed request for a booking that has since been cancelled must not report "booked".
do $$
declare
  k uuid := gen_random_uuid();
  b public.consultation_bookings;
begin
  perform pg_temp.eq(pg_temp.book(pg_temp.slot(4, 15, 0), 'h@example.com', k), 'created', 'keyed booking for replay-after-cancel');
  select * into b from public.consultation_bookings where idempotency_key = k;
  perform public.consultation_cancel_booking(b.id, b.version, 'CUSTOMER', null, null, array[]::text[]);
  perform pg_temp.eq(pg_temp.book(pg_temp.slot(4, 15, 0), 'h@example.com', k), 'not_active', 'replay of a cancelled booking reports not_active');
end $$;

-- Every function pins its search_path (Supabase linter function_search_path_mutable).
reset role;
select pg_temp.eq(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'consultation%' and coalesce(array_to_string(p.proconfig, ','), '') not like '%search_path=%'),
  0, 'every consultation function pins search_path');
set role service_role;

-- ---------------------------------------------------------------- complete (needs a started booking)
do $$
declare
  past_id uuid := gen_random_uuid();
  future public.consultation_bookings;
  r record;
begin
  reset role;  -- seed a past booking directly (the function refuses past times by design)
  insert into public.consultation_bookings (id, reference, customer_name, customer_email, project_description,
    start_time, end_time, idempotency_key, management_token_hash, management_token_expires_at, assigned_representative, meeting_method)
  values (past_id, 'DL-PAST01', 'Past', 'past@example.com', 'x', pg_temp.slot(0, 10, 0, -1), pg_temp.slot(0, 10, 30, -1),
    gen_random_uuid(), repeat('d', 64), now() + interval '30 days', 'benedict', 'TEAMS');
  set role service_role;

  select * into r from public.consultation_reschedule_booking(past_id, 1, pg_temp.slot(1, 15, 0), 'CUSTOMER', null, repeat('e', 64), array[]::text[], array['benedict']);
  perform pg_temp.eq(r.outcome, 'change_window_closed', 'customer cannot move a started appointment');
  select * into r from public.consultation_cancel_booking(past_id, 1, 'CUSTOMER', null, null, array[]::text[]);
  perform pg_temp.eq(r.outcome, 'change_window_closed', 'customer cannot cancel a started appointment');

  select * into future from public.consultation_bookings where start_time = pg_temp.slot(1, 10, 0);
  select * into r from public.consultation_complete_booking(future.id, future.version, 'user_admin');
  perform pg_temp.eq(r.outcome, 'not_started', 'a future consultation cannot be marked completed');

  select * into r from public.consultation_complete_booking(past_id, 1, 'user_admin');
  perform pg_temp.eq(r.outcome, 'completed', 'admin marks a past consultation completed');
  perform pg_temp.eq((select completed_by_clerk_user_id from public.consultation_bookings where id = past_id), 'user_admin', 'completing admin recorded');
end $$;

-- ---------------------------------------------------------------- short-notice reminder policy
do $$
declare
  b public.consultation_bookings;
begin
  reset role;
  -- A booking created 20 hours before it starts: no "tomorrow" reminder.
  perform public.consultation_sync_reminder(x, 'SYSTEM', interval '2 hours')
    from (select (row(gen_random_uuid(), 'DL-SHORT', 'S', 's@example.com', null, null, 'x',
                      now() + interval '20 hours', now() + interval '20 hours 30 minutes', 'Australia/Perth',
                      'CONFIRMED', 1, gen_random_uuid(), repeat('f', 64), now(), 0, null, null, null, null, null,
                      now(), now(),
                      -- representative, method, then the calendar sync columns (20261014090000)
                      'benedict', 'TEAMS', null, null, null, 0, 'PENDING', 0, now(), null, null)::public.consultation_bookings) as x) s;
  set role service_role;
  perform pg_temp.eq((select count(*)::int from public.consultation_notifications where recipient = 's@example.com'), 0,
                     'no reminder queued for a booking inside 24h');
end $$;

-- ---------------------------------------------------------------- outbox claim / finish
do $$
declare
  n public.consultation_notifications;
  claimed int;
  st text;
begin
  select count(*) into claimed from public.consultation_claim_notifications(100);
  perform pg_temp.eq(claimed > 0, true, 'due notifications claimed');
  perform pg_temp.eq((select count(*)::int from public.consultation_claim_notifications(100)), 0, 'a claimed row is not claimed twice');
  perform pg_temp.eq((select count(*)::int from public.consultation_notifications where kind = 'CUSTOMER_REMINDER' and status = 'SENDING'), 0,
                     'future reminders are not claimed early');

  select * into n from public.consultation_notifications where status = 'SENDING' order by created_at limit 1;
  st := public.consultation_finish_notification(n.id, 'sent', 'msg_123', null);
  perform pg_temp.eq(st, 'SENT', 'sent outcome recorded');
  perform pg_temp.eq(public.consultation_finish_notification(n.id, 'sent', 'msg_456', null), 'ignored', 'duplicate ack ignored');

  select * into n from public.consultation_notifications where status = 'SENDING' order by created_at limit 1;
  st := public.consultation_finish_notification(n.id, 'retry', null, 'resend 503', interval '0');
  perform pg_temp.eq(st, 'PENDING', 'transient failure goes back to PENDING');
  perform pg_temp.eq((select count(*)::int from public.consultation_booking_events where booking_id = n.booking_id and action = 'NOTIFICATION_FAILED'), 1,
                     'delivery failure recorded in the history');

  reset role;
  update public.consultation_notifications set attempts = max_attempts - 1 where id = n.id;
  set role service_role;
  perform public.consultation_claim_notifications(100);
  perform pg_temp.eq(public.consultation_finish_notification(n.id, 'retry', null, 'still failing', interval '0'), 'FAILED', 'final attempt becomes FAILED');
  perform pg_temp.eq((select status from public.consultation_notifications where id = n.id), 'FAILED', 'FAILED is terminal');

  -- A worker that crashed on its final attempt is settled as FAILED by the next claim.
  reset role;
  update public.consultation_notifications set status = 'SENDING', attempts = max_attempts, locked_until = now() - interval '1 minute'
   where id = (select id from public.consultation_notifications where status = 'SENDING' limit 1)
  returning id into n.id;
  set role service_role;
  perform public.consultation_claim_notifications(100);
  perform pg_temp.eq((select status from public.consultation_notifications where id = n.id), 'FAILED', 'expired final-attempt lease settled as FAILED');
end $$;

-- ---------------------------------------------------------------- availability exposes times only
reset role;
select pg_temp.eq(
  (select pg_get_function_result(p.oid) from pg_proc p where p.proname = 'consultation_busy_slots'),
  'TABLE(start_time timestamp with time zone, representative text)', 'busy-slot function returns start times and roster keys only');

-- ---------------------------------------------------------------- audit log is append-only
do $$
begin
  update public.consultation_booking_events set actor_type = 'ADMIN';
  raise exception 'FAIL events were updatable';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
  raise notice 'ok  booking events are append-only';
end $$;

-- ---------------------------------------------------------------- public roles see nothing
do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    begin
      execute format('set local role %I', r);
      perform count(*) from public.consultation_bookings;
      raise exception 'FAIL % could read bookings', r;
    exception when insufficient_privilege then
      raise notice 'ok  % cannot read bookings', r;
    end;
    begin
      execute format('set local role %I', r);
      perform * from public.consultation_busy_slots(now(), now() + interval '1 day');
      raise exception 'FAIL % could call busy slots', r;
    exception when insufficient_privilege then
      raise notice 'ok  % cannot call booking functions', r;
    end;
  end loop;
end $$;

\echo ALL CONSULTATION DB ASSERTIONS PASSED
