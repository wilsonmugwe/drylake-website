-- Database tests for the inputs of GET /api/health (lib/consultations/health-server.ts): the five
-- reads it makes, run here as SQL against the real migrations so a renamed column or a changed
-- status value breaks CI instead of silently blanking the health block.
-- Run by tests/db/run-consultation-db-tests.sh after consultation-representatives.sql.
-- Slots: Mondays four weeks out, clear of every other test file.

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

create or replace function pg_temp.mon(hh int, mm int)
returns timestamptz language sql as $$
  select ((date_trunc('week', now() at time zone 'Australia/Perth') + interval '28 days') + make_time(hh, mm, 0))
         at time zone 'Australia/Perth';
$$;

create or replace function pg_temp.book(p_start timestamptz, p_email text)
returns text language sql as $$
  select outcome from public.consultation_create_booking(
    gen_random_uuid(), gen_random_uuid(), 'DL-' || substr(md5(random()::text), 1, 6), 'Health Test', p_email, null, null,
    'About my business', p_start, md5(random()::text) || md5(random()::text),
    array['wilson@drylake.com.au', 'benedict@drylake.com.au'], 'TEAMS', array['wilson', 'benedict']);
$$;

set client_min_messages = notice;
set role service_role;

do $$
declare
  n public.consultation_notifications;
  b public.consultation_bookings;
  sent_at_max timestamptz;
  attempt_max timestamptz;
  due_oldest timestamptz;
begin
  perform pg_temp.eq(pg_temp.book(pg_temp.mon(9, 0), 'health1@example.com'), 'created', 'booking created');

  -- last_attempt_at is set by the claim, sent_at by the "sent" outcome.
  perform public.consultation_claim_notifications(1);
  select * into n from public.consultation_notifications where status = 'SENDING' order by last_attempt_at desc limit 1;
  perform pg_temp.eq(n.last_attempt_at is not null, true, 'a claim stamps last_attempt_at');
  perform public.consultation_finish_notification(n.id, 'sent', 'msg_h1', null);

  -- The same selects /api/health runs.
  select max(sent_at) into sent_at_max from public.consultation_notifications where status = 'SENT' and sent_at is not null;
  perform pg_temp.eq(sent_at_max is not null, true, 'last successful dispatch is readable');
  select max(last_attempt_at) into attempt_max from public.consultation_notifications where last_attempt_at is not null;
  perform pg_temp.eq(attempt_max is not null, true, 'last dispatch attempt is readable');

  -- Remaining unclaimed rows from the booking are due now and PENDING: the oldest-pending-age input.
  select min(send_after) into due_oldest from public.consultation_notifications where status = 'PENDING' and send_after <= now();
  perform pg_temp.eq(due_oldest is not null, true, 'an unsent due email shows as the oldest pending');
  perform pg_temp.eq(due_oldest <= now(), true, 'its age is non-negative');

  -- A future-dated reminder is NOT counted as waiting (it would look like a stalled trigger for a day).
  perform pg_temp.eq((select count(*)::int from public.consultation_notifications
                       where kind = 'CUSTOMER_REMINDER' and status = 'PENDING' and send_after <= now()), 0,
                     'future reminders are not "due"');

  -- Failed notifications are countable.
  select * into n from public.consultation_notifications where status = 'PENDING' and send_after <= now() limit 1;
  reset role;
  update public.consultation_notifications set attempts = max_attempts - 1 where id = n.id;
  set role service_role;
  perform public.consultation_claim_notifications(100);
  perform public.consultation_finish_notification(n.id, 'retry', null, 'resend 500', interval '0');
  perform pg_temp.eq((select count(*)::int from public.consultation_notifications where status = 'FAILED') >= 1, true, 'FAILED notifications are countable');

  -- A tagged calendar error survives storage (left(..., 500)) and is selectable for classification.
  select * into b from public.consultation_bookings where customer_email = 'health1@example.com';
  perform public.consultation_claim_calendar_sync(1, interval '2 minutes', b.id);
  perform public.consultation_finish_calendar_sync(b.id, b.version, (select calendar_lease_until from public.consultation_bookings where id = b.id), 'retry', null, null, null,
                                                   '[credential_expired] Microsoft sign-in refused (401 invalid_client AADSTS7000222)', interval '5 minutes',
                                                   array['wilson@drylake.com.au']);
  perform pg_temp.eq((select count(*)::int from public.consultation_bookings
                       where calendar_sync_state in ('PENDING', 'FAILED') and calendar_last_error is not null
                         and calendar_last_error like '[credential_expired]%'), 1,
                     'an unresolved credential error is visible to the health read');

  -- ... and clears when the sync later succeeds, so a fixed secret stops showing as expired.
  perform public.consultation_claim_calendar_sync(1, interval '2 minutes', b.id);
  perform pg_temp.eq(public.consultation_finish_calendar_sync(b.id, b.version, (select calendar_lease_until from public.consultation_bookings where id = b.id), 'synced', 'evt-h', 'wilson', null,
                                                              null, interval '0', array[]::text[]), 'SYNCED', 'a later successful sync is recorded');
  perform pg_temp.eq((select calendar_last_error from public.consultation_bookings where id = b.id), null::text, 'the error clears once the sync succeeds');
end $$;

reset role;
\echo ok  consultation health read inputs
