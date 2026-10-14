-- Database tests for supabase/migrations/20261014090000_consultation_representatives.sql:
-- per-representative overlap, fair assignment, meeting method, the customer 2-hour cut-off and the
-- calendar sync queue. Run by tests/db/run-consultation-db-tests.sh after consultation-bookings.sql
-- (which leaves Benedict with several upcoming bookings and Wilson with none).
-- Slots used here: Fridays three weeks out, so nothing collides with the other files.

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

create or replace function pg_temp.fri(hh int, mm int)
returns timestamptz language sql as $$
  select ((date_trunc('week', now() at time zone 'Australia/Perth') + interval '25 days') + make_time(hh, mm, 0))
         at time zone 'Australia/Perth';
$$;

create or replace function pg_temp.book2(p_start timestamptz, p_email text, p_candidates text[],
                                         p_method text default 'TEAMS', p_phone text default null)
returns record language sql as $$
  select (outcome, representative)::record from public.consultation_create_booking(
    gen_random_uuid(), gen_random_uuid(), 'DL-' || substr(md5(random()::text), 1, 6), 'Rep Test', p_email, p_phone, null,
    'About my business', p_start, md5(random()::text) || md5(random()::text),
    array['wilson@drylake.com.au', 'benedict@drylake.com.au'], p_method, p_candidates);
$$;

create or replace function pg_temp.book_outcome(p_start timestamptz, p_email text, p_candidates text[],
                                                p_method text default 'TEAMS', p_phone text default null)
returns text language sql as $$
  select outcome from public.consultation_create_booking(
    gen_random_uuid(), gen_random_uuid(), 'DL-' || substr(md5(random()::text), 1, 6), 'Rep Test', p_email, p_phone, null,
    'About my business', p_start, md5(random()::text) || md5(random()::text),
    array['wilson@drylake.com.au', 'benedict@drylake.com.au'], p_method, p_candidates);
$$;

create or replace function pg_temp.rep_of(p_email text)
returns text language sql as $$
  select assigned_representative from public.consultation_bookings where customer_email = p_email order by created_at desc limit 1;
$$;

set client_min_messages = notice;
set role service_role;

-- ---------------------------------------------------------------- assignment
select pg_temp.eq(pg_temp.book_outcome(pg_temp.fri(9, 0), 'r1@example.com', array['wilson', 'benedict']), 'created', 'first booking at 9:00');
select pg_temp.eq(pg_temp.rep_of('r1@example.com'), 'wilson', 'least-loaded representative (Wilson, 0 upcoming) assigned');
select pg_temp.eq(pg_temp.book_outcome(pg_temp.fri(9, 0), 'r2@example.com', array['wilson', 'benedict']), 'created', 'second booking at the same time succeeds');
select pg_temp.eq(pg_temp.rep_of('r2@example.com'), 'benedict', 'second booking goes to the other representative');
select pg_temp.eq(pg_temp.book_outcome(pg_temp.fri(9, 0), 'r3@example.com', array['wilson', 'benedict']), 'slot_taken', 'third booking at the same time refused');
select pg_temp.eq(pg_temp.book_outcome(pg_temp.fri(9, 30), 'r4@example.com', array[]::text[]), 'slot_taken', 'no verified-free representative: refused');
select pg_temp.eq(pg_temp.book_outcome(pg_temp.fri(9, 30), 'r4@example.com', array['benedict']), 'created', 'only the Microsoft-free representative is used');
select pg_temp.eq(pg_temp.rep_of('r4@example.com'), 'benedict', 'Benedict assigned when Wilson is busy in Outlook');
select pg_temp.eq(pg_temp.book_outcome(pg_temp.fri(10, 0), 'r5@example.com', array['nobody', 'wilson']), 'created', 'unknown representative keys ignored');
select pg_temp.eq(pg_temp.rep_of('r5@example.com'), 'wilson', 'only roster keys assigned');

-- Direct writes cannot double-book one representative.
do $$
begin
  reset role;
  insert into public.consultation_bookings (id, reference, customer_name, customer_email, project_description,
    start_time, end_time, idempotency_key, management_token_hash, management_token_expires_at, assigned_representative, meeting_method)
  values (gen_random_uuid(), 'DL-DUPREP', 'X', 'x@example.com', 'x', pg_temp.fri(9, 0), pg_temp.fri(9, 30),
    gen_random_uuid(), repeat('f', 64), now() + interval '30 days', 'wilson', 'TEAMS');
  raise exception 'FAIL a second Wilson booking at 9:00 was accepted';
exception when exclusion_violation then
  raise notice 'ok  exclusion constraint refuses a second booking for one representative';
end $$;
set role service_role;

-- ---------------------------------------------------------------- meeting method
select pg_temp.eq(pg_temp.book_outcome(pg_temp.fri(11, 0), 'p1@example.com', array['wilson'], 'PHONE', null), 'phone_required', 'phone consultation needs a number');
select pg_temp.eq(pg_temp.book_outcome(pg_temp.fri(11, 0), 'p1@example.com', array['wilson'], 'ZOOM', null), 'invalid_method', 'unknown method refused');
select pg_temp.eq(pg_temp.book_outcome(pg_temp.fri(11, 0), 'p1@example.com', array['wilson'], 'PHONE', '0400 000 000'), 'created', 'phone consultation with a number succeeds');
select pg_temp.eq((select meeting_method from public.consultation_bookings where customer_email = 'p1@example.com'), 'PHONE', 'method stored');
select pg_temp.eq((select calendar_sync_state from public.consultation_bookings where customer_email = 'p1@example.com'), 'PENDING', 'new booking queued for calendar sync');

-- ---------------------------------------------------------------- reschedule keeps or reassigns
do $$
declare
  b public.consultation_bookings;
  r record;
begin
  select * into b from public.consultation_bookings where customer_email = 'r5@example.com';  -- Wilson, 10:00
  select * into r from public.consultation_reschedule_booking(b.id, b.version, pg_temp.fri(12, 0), 'CUSTOMER', null, repeat('1', 64),
    array['wilson@drylake.com.au'], array['benedict', 'wilson']);
  perform pg_temp.eq(r.outcome, 'rescheduled', 'reschedule to a free time');
  perform pg_temp.eq(r.representative, 'wilson', 'same representative kept when free');
  perform pg_temp.eq((select calendar_sync_state from public.consultation_bookings where id = b.id), 'PENDING', 'reschedule queues a calendar update');

  -- 9:00 Wilson is booked (r1): moving there must hand the booking to Benedict... who is also booked
  -- at 9:00 (r2), so it is refused and nothing changes.
  select * into r from public.consultation_reschedule_booking(b.id, b.version + 1, pg_temp.fri(9, 0), 'CUSTOMER', null, repeat('2', 64),
    array[]::text[], array['wilson', 'benedict']);
  perform pg_temp.eq(r.outcome, 'slot_taken', 'reschedule into a time both representatives hold is refused');
  perform pg_temp.eq((select assigned_representative from public.consultation_bookings where id = b.id), 'wilson', 'representative unchanged after refusal');

  -- 9:30: only Benedict (r4) is booked, so Wilson keeps it.
  select * into r from public.consultation_reschedule_booking(b.id, b.version + 1, pg_temp.fri(9, 30), 'ADMIN', 'user_admin', repeat('3', 64),
    array[]::text[], array['wilson', 'benedict']);
  perform pg_temp.eq(r.representative, 'wilson', 'kept with Wilson when only Benedict is busy');

  -- Wilson busy in Outlook at 10:30 (app passes only Benedict): reassigned.
  select * into r from public.consultation_reschedule_booking(b.id, b.version + 2, pg_temp.fri(10, 30), 'ADMIN', 'user_admin', repeat('4', 64),
    array[]::text[], array['benedict']);
  perform pg_temp.eq(r.outcome, 'rescheduled', 'reschedule with a reassignment succeeds');
  perform pg_temp.eq(r.representative, 'benedict', 'reassigned to Benedict');
  perform pg_temp.eq((select next->>'representative' from public.consultation_booking_events where booking_id = b.id and action = 'RESCHEDULED'
                       order by id desc limit 1), 'benedict', 'reassignment in the audit trail');
  perform pg_temp.eq((select previous->>'representative' from public.consultation_booking_events where booking_id = b.id and action = 'RESCHEDULED'
                       order by id desc limit 1), 'wilson', 'previous representative in the audit trail');
end $$;

-- ---------------------------------------------------------------- customer 2-hour cut-off
-- The slot CHECK forbids seeding a booking 90 minutes away, so the window is widened instead:
-- a cut-off longer than the time remaining is exactly "inside the cut-off".
do $$
declare
  b public.consultation_bookings;
  r record;
begin
  perform pg_temp.eq(pg_temp.book_outcome(pg_temp.fri(15, 0), 'soon@example.com', array['wilson']), 'created', 'booking for the cut-off test');
  select * into b from public.consultation_bookings where customer_email = 'soon@example.com';

  select * into r from public.consultation_cancel_booking(b.id, b.version, 'CUSTOMER', null, null, array[]::text[], interval '60 days');
  perform pg_temp.eq(r.outcome, 'change_window_closed', 'customer cannot cancel inside the cut-off');
  select * into r from public.consultation_reschedule_booking(b.id, b.version, pg_temp.fri(14, 0), 'CUSTOMER', null, repeat('6', 64),
    array[]::text[], array['wilson'], interval '2 hours', interval '29 days', interval '2 hours', interval '60 days');
  perform pg_temp.eq(r.outcome, 'change_window_closed', 'customer cannot reschedule inside the cut-off');
  select * into r from public.consultation_cancel_booking(b.id, b.version, 'ADMIN', 'user_admin', 'Unwell', array[]::text[], interval '60 days');
  perform pg_temp.eq(r.outcome, 'cancelled', 'admin can still cancel inside the cut-off');
end $$;

-- Default cut-off is 2 hours (the app passes nothing, so the database default is the rule).
select pg_temp.eq(
  (select pg_get_function_arguments(p.oid) like '%p_customer_cutoff interval DEFAULT ''02:00:00''::interval%'
     from pg_proc p where p.proname = 'consultation_cancel_booking'),
  true, 'customer cut-off defaults to 2 hours');

-- ---------------------------------------------------------------- calendar sync queue
do $$
declare
  b public.consultation_bookings;
  claimed int;
  st text;
begin
  select * into b from public.consultation_bookings where customer_email = 'r1@example.com';

  select count(*) into claimed from public.consultation_claim_calendar_sync(10, interval '2 minutes', b.id);
  perform pg_temp.eq(claimed, 1, 'booking claimed for calendar sync');
  perform pg_temp.eq((select count(*)::int from public.consultation_claim_calendar_sync(10, interval '2 minutes', b.id)), 0, 'a leased booking is not claimed twice');

  st := public.consultation_finish_calendar_sync(b.id, b.version, (select calendar_lease_until from public.consultation_bookings where id = b.id), 'synced', 'evt-1', 'wilson', 'https://teams.microsoft.com/l/meetup-join/x',
                                                 null, interval '0', array[]::text[]);
  perform pg_temp.eq(st, 'SYNCED', 'sync recorded');
  perform pg_temp.eq((select calendar_join_url from public.consultation_bookings where id = b.id), 'https://teams.microsoft.com/l/meetup-join/x', 'join URL stored');
  perform pg_temp.eq((select count(*)::int from public.consultation_claim_calendar_sync(10, interval '2 minutes', b.id)), 0, 'a synced booking is not claimed');

  -- Cancellation puts it back on the queue so the Outlook event is cancelled too.
  perform public.consultation_cancel_booking(b.id, b.version, 'CUSTOMER', null, null, array[]::text[]);
  perform pg_temp.eq((select calendar_sync_state from public.consultation_bookings where id = b.id), 'PENDING', 'cancellation queues the event cancellation');
  perform pg_temp.eq((select count(*)::int from public.consultation_claim_calendar_sync(10, interval '2 minutes', b.id)), 1, 'cancelled booking with an event is claimed');
  st := public.consultation_finish_calendar_sync(b.id, b.version + 1, (select calendar_lease_until from public.consultation_bookings where id = b.id), 'synced', null, null, null, null, interval '0', array[]::text[]);
  perform pg_temp.eq((select calendar_event_id from public.consultation_bookings where id = b.id), null::text, 'event id cleared after cancellation');
  perform pg_temp.eq(pg_temp.book_outcome(pg_temp.fri(9, 0), 'r6@example.com', array['wilson']), 'created', 'cancelled slot is bookable again for Wilson');
end $$;

-- A sync result for an OLD version leaves the booking queued for the newer one.
do $$
declare
  b public.consultation_bookings;
  lease timestamptz;
  st text;
begin
  select * into b from public.consultation_bookings where customer_email = 'r2@example.com';
  perform public.consultation_claim_calendar_sync(1, interval '2 minutes', b.id);
  select calendar_lease_until into lease from public.consultation_bookings where id = b.id;
  perform public.consultation_cancel_booking(b.id, b.version, 'ADMIN', 'user_admin', null, array[]::text[]);  -- races the worker
  st := public.consultation_finish_calendar_sync(b.id, b.version, lease, 'synced', 'evt-2', 'benedict', null, null, interval '0', array[]::text[]);
  perform pg_temp.eq(st, 'PENDING', 'a sync for an older version keeps the booking queued');
  perform pg_temp.eq((select calendar_lease_until from public.consultation_bookings where id = b.id), null::timestamptz, 'the lease holder releases its lease');
  perform pg_temp.eq((select count(*)::int from public.consultation_claim_calendar_sync(1, interval '2 minutes', b.id)), 1,
                     'the event created by the losing worker is picked up for cancellation');
end $$;

-- A LATE result (older than one already recorded) changes nothing, and never strands the booking.
do $$
declare
  b public.consultation_bookings;
  st text;
begin
  select * into b from public.consultation_bookings where customer_email = 'p1@example.com';
  -- Version 2 (reschedule) is synced first with event E2 ...
  perform public.consultation_reschedule_booking(b.id, b.version, pg_temp.fri(16, 0), 'ADMIN', 'user_admin', repeat('8', 64),
    array[]::text[], array['wilson']);
  perform public.consultation_claim_calendar_sync(1, interval '2 minutes', b.id);
  st := public.consultation_finish_calendar_sync(b.id, b.version + 1, (select calendar_lease_until from public.consultation_bookings where id = b.id),
                                                 'synced', 'evt-E2', 'wilson', null, null, interval '0', array[]::text[]);
  perform pg_temp.eq(st, 'SYNCED', 'newer version synced');
  -- ... then the worker that handled version 1 reports E1, lease long gone.
  st := public.consultation_finish_calendar_sync(b.id, b.version, now() - interval '1 hour', 'synced', 'evt-E1', 'wilson', 'https://old', null,
                                                 interval '0', array[]::text[]);
  perform pg_temp.eq(st, 'ignored', 'a late result for an older version is ignored');
  perform pg_temp.eq((select calendar_event_id from public.consultation_bookings where id = b.id), 'evt-E2', 'the newer event id is kept');
  perform pg_temp.eq((select calendar_sync_state from public.consultation_bookings where id = b.id), 'PENDING', 'the stray event is queued for cleanup');
  perform pg_temp.eq((select count(*)::int from public.consultation_claim_calendar_sync(1, interval '2 minutes', b.id)), 1,
                     'and the booking is claimable again (not stranded)');
  update public.consultation_bookings set calendar_lease_until = null where id = b.id;
end $$;

-- A superseded worker's failure neither delays nor fails the newer version.
do $$
declare
  b public.consultation_bookings;
  lease timestamptz;
  st text;
begin
  select * into b from public.consultation_bookings where customer_email = 'r6@example.com';
  perform public.consultation_claim_calendar_sync(1, interval '2 minutes', b.id);
  select calendar_lease_until into lease from public.consultation_bookings where id = b.id;
  perform public.consultation_reschedule_booking(b.id, b.version, pg_temp.fri(16, 30), 'ADMIN', 'user_admin', repeat('9', 64),
    array[]::text[], array['wilson', 'benedict']);
  st := public.consultation_finish_calendar_sync(b.id, b.version, lease, 'retry', null, null, null, 'graph 503', interval '60 minutes', array[]::text[]);
  perform pg_temp.eq(st, 'superseded', 'old-version failure reported as superseded');
  perform pg_temp.eq((select calendar_next_attempt_at <= now() from public.consultation_bookings where id = b.id), true, 'the newer version is not pushed back');
  perform pg_temp.eq((select calendar_last_error from public.consultation_bookings where id = b.id), null::text, 'no stale error recorded');
end $$;

-- A worker that dies on its final attempt: settled as FAILED at the next claim, founders told.
do $$
declare
  b public.consultation_bookings;
begin
  select * into b from public.consultation_bookings where customer_email = 'r6@example.com';
  update public.consultation_bookings set calendar_sync_attempts = 10, calendar_lease_until = now() - interval '1 second' where id = b.id;
  perform public.consultation_claim_calendar_sync(10, interval '2 minutes', null, 10, array['wilson@drylake.com.au', 'benedict@drylake.com.au']);
  perform pg_temp.eq((select calendar_sync_state from public.consultation_bookings where id = b.id), 'FAILED', 'dead final attempt settled as FAILED');
  perform pg_temp.eq((select count(*)::int from public.consultation_notifications where booking_id = b.id and kind = 'FOUNDER_CALENDAR_FAILED'), 2,
                     'both founders alerted for the dead final attempt');
  perform pg_temp.eq(public.consultation_retry_calendar_sync(b.id, 'user_admin'), 'queued', 'admin can retry it');
  perform pg_temp.eq((select actor_clerk_user_id from public.consultation_booking_events where booking_id = b.id and action = 'CALENDAR_RETRY_REQUESTED'),
                     'user_admin', 'the admin retry is audited with the admin id');
end $$;

-- Retries back off; the last failure marks FAILED and emails both founders once.
do $$
declare
  b public.consultation_bookings;
  st text;
  i int;
begin
  select * into b from public.consultation_bookings where customer_email = 'r4@example.com';
  for i in 1..3 loop
    perform public.consultation_claim_calendar_sync(1, interval '2 minutes', b.id, 3);
    st := public.consultation_finish_calendar_sync(b.id, b.version, (select calendar_lease_until from public.consultation_bookings where id = b.id), 'retry', null, null, null, 'graph 503', interval '0',
                                                   array['wilson@drylake.com.au', 'benedict@drylake.com.au'], 3);
  end loop;
  perform pg_temp.eq(st, 'FAILED', 'third failure marks the booking FAILED');
  perform pg_temp.eq((select count(*)::int from public.consultation_notifications where booking_id = b.id and kind = 'FOUNDER_CALENDAR_FAILED'), 2,
                     'both founders told the calendar sync failed');
  perform pg_temp.eq((select count(*)::int from public.consultation_claim_calendar_sync(10, interval '2 minutes', b.id, 3)), 0, 'a FAILED booking is not retried automatically');
  perform pg_temp.eq(public.consultation_retry_calendar_sync(b.id, 'user_admin'), 'queued', 'admin retry re-queues it');
  perform pg_temp.eq((select count(*)::int from public.consultation_claim_calendar_sync(10, interval '2 minutes', b.id, 3)), 1, 'retried booking claimed again');
end $$;

-- ---------------------------------------------------------------- notification defer
do $$
declare
  n public.consultation_notifications;
begin
  update public.consultation_notifications set send_after = now() - interval '1 second'
   where kind = 'CUSTOMER_CONFIRMATION' and recipient = 'r6@example.com';
  select * into n from public.consultation_claim_notifications(100) c where c.recipient = 'r6@example.com' and c.kind = 'CUSTOMER_CONFIRMATION';
  perform pg_temp.eq(public.consultation_defer_notification(n.id, interval '1 minute'), 'deferred', 'confirmation deferred while the Teams link is created');
  perform pg_temp.eq((select attempts from public.consultation_notifications where id = n.id), n.attempts - 1, 'a defer does not spend an attempt');
  perform pg_temp.eq((select status from public.consultation_notifications where id = n.id), 'PENDING', 'deferred email is pending again');
end $$;

-- ---------------------------------------------------------------- public roles see nothing
do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    begin
      execute format('set local role %I', r);
      perform * from public.consultation_claim_calendar_sync(1);
      raise exception 'FAIL % could claim calendar work', r;
    exception when insufficient_privilege then
      raise notice 'ok  % cannot call the calendar queue', r;
    end;
  end loop;
end $$;

\echo ALL REPRESENTATIVE DB ASSERTIONS PASSED
