-- Consultation representatives, meeting method and Microsoft 365 calendar sync
-- (design: docs/superpowers/specs/2026-10-14-consultation-m365-design.md).
--
-- Builds on 20261013120000_consultation_bookings.sql and must run after it. Additive and
-- re-runnable. What changes:
--   * every booking is assigned to ONE representative (wilson | benedict) and carries a meeting
--     method (TEAMS | PHONE; PHONE requires a phone number)
--   * the double-booking guarantee becomes PER REPRESENTATIVE: two consultations may share a
--     time when two different representatives hold them, never the same representative
--   * create / reschedule take the representatives the app verified as free in Microsoft 365 and
--     pick one inside the transaction: least upcoming consultations first, then roster order
--     (deterministic, so the same state always gives the same answer)
--   * customers can change or cancel only until 2 hours before the start (admins any time)
--   * calendar sync is a durable, leased work queue on the booking row itself: the desired state
--     is "calendar_synced_version = version"; a worker creates / moves / cancels the Outlook
--     event and records the outcome; after max attempts the founders are emailed
--
-- Access is unchanged: service_role only, RLS on, nothing granted to anon or authenticated.

-- ------------------------------------------------------------------ extension

-- Equality on text inside a GiST exclusion constraint needs btree_gist. Supabase installs
-- extensions into the "extensions" schema; a plain Postgres (tests) has no such schema.
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'btree_gist') then
    if exists (select 1 from pg_namespace where nspname = 'extensions') then
      execute 'create extension btree_gist with schema extensions';
    else
      execute 'create extension btree_gist';
    end if;
  end if;
end
$$;

-- ------------------------------------------------------------------ booking columns

alter table public.consultation_bookings
  add column if not exists assigned_representative text,
  add column if not exists meeting_method text,
  add column if not exists calendar_event_id text,
  add column if not exists calendar_event_owner text,
  add column if not exists calendar_join_url text,
  add column if not exists calendar_synced_version integer not null default 0,
  add column if not exists calendar_sync_state text not null default 'PENDING',
  add column if not exists calendar_sync_attempts integer not null default 0,
  add column if not exists calendar_next_attempt_at timestamptz not null default now(),
  add column if not exists calendar_lease_until timestamptz,
  add column if not exists calendar_last_error text;

-- Rows booked before this migration (if any) predate the choice: Benedict, by phone if a number
-- was given, otherwise Teams. They are synced like any other once the integration is enabled.
update public.consultation_bookings set assigned_representative = 'benedict' where assigned_representative is null;
update public.consultation_bookings
   set meeting_method = case when customer_phone is not null then 'PHONE' else 'TEAMS' end
 where meeting_method is null;

alter table public.consultation_bookings
  alter column assigned_representative set not null,
  alter column meeting_method set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'consultation_bookings_representative') then
    alter table public.consultation_bookings add constraint consultation_bookings_representative
      check (assigned_representative in ('wilson', 'benedict'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'consultation_bookings_method') then
    alter table public.consultation_bookings add constraint consultation_bookings_method
      check (meeting_method in ('TEAMS', 'PHONE'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'consultation_bookings_phone_for_phone_call') then
    alter table public.consultation_bookings add constraint consultation_bookings_phone_for_phone_call
      check (meeting_method <> 'PHONE' or customer_phone is not null);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'consultation_bookings_calendar_state') then
    alter table public.consultation_bookings add constraint consultation_bookings_calendar_state
      check (calendar_sync_state in ('PENDING', 'SYNCED', 'FAILED'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'consultation_bookings_calendar_owner') then
    alter table public.consultation_bookings add constraint consultation_bookings_calendar_owner
      check (calendar_event_owner is null or calendar_event_owner in ('wilson', 'benedict'));
  end if;

  -- One representative, one consultation at a time. Replaces the global no-overlap rule.
  if not exists (select 1 from pg_constraint where conname = 'consultation_bookings_no_rep_overlap') then
    alter table public.consultation_bookings add constraint consultation_bookings_no_rep_overlap
      exclude using gist (assigned_representative with =, tstzrange(start_time, end_time, '[)') with &&)
      where (status in ('CONFIRMED', 'RESCHEDULED'));
  end if;
  if exists (select 1 from pg_constraint where conname = 'consultation_bookings_no_overlap') then
    alter table public.consultation_bookings drop constraint consultation_bookings_no_overlap;
  end if;
end
$$;

create index if not exists consultation_bookings_rep_start_idx
  on public.consultation_bookings (assigned_representative, start_time)
  where status in ('CONFIRMED', 'RESCHEDULED');
create index if not exists consultation_bookings_calendar_due_idx
  on public.consultation_bookings (calendar_next_attempt_at)
  where calendar_sync_state = 'PENDING';

-- ------------------------------------------------------------------ audit + outbox vocabularies

alter table public.consultation_booking_events drop constraint if exists consultation_booking_events_action_check;
alter table public.consultation_booking_events add constraint consultation_booking_events_action_check check (action in (
  'CREATED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED',
  'REMINDER_QUEUED', 'REMINDER_CANCELLED', 'NOTIFICATION_SENT', 'NOTIFICATION_FAILED',
  'CALENDAR_SYNCED', 'CALENDAR_SYNC_FAILED'
));

alter table public.consultation_notifications drop constraint if exists consultation_notifications_kind_check;
alter table public.consultation_notifications add constraint consultation_notifications_kind_check check (kind in (
  'CUSTOMER_CONFIRMATION', 'FOUNDER_NEW_BOOKING',
  'CUSTOMER_RESCHEDULED', 'FOUNDER_RESCHEDULED',
  'CUSTOMER_CANCELLED', 'FOUNDER_CANCELLED',
  'CUSTOMER_REMINDER', 'FOUNDER_CALENDAR_FAILED'
));

-- ------------------------------------------------------------------ superseded signatures

drop function if exists public.consultation_create_booking(uuid, uuid, text, text, text, text, text, text, timestamptz, text, text[], interval, interval, integer, interval);
drop function if exists public.consultation_reschedule_booking(uuid, integer, timestamptz, text, text, text, text[], interval, interval, interval);
drop function if exists public.consultation_cancel_booking(uuid, integer, text, text, text, text[]);
drop function if exists public.consultation_busy_slots(timestamptz, timestamptz);

-- ------------------------------------------------------------------ helpers

-- Candidate representatives in assignment order: (optionally) the preferred one first, then the
-- fewest upcoming active consultations, then roster order. Unknown keys are dropped.
create or replace function public.consultation_rank_representatives(p_candidates text[], p_preferred text default null)
returns table (representative text)
language sql
stable
set search_path = ''
as $$
  select c.rep
    from (select distinct on (u.rep) u.rep, u.ord
            from unnest(coalesce(p_candidates, array[]::text[])) with ordinality as u(rep, ord)
           where u.rep in ('wilson', 'benedict')
           order by u.rep, u.ord) c
   order by (c.rep is not distinct from p_preferred) desc,
            (select count(*) from public.consultation_bookings b
              where b.assigned_representative = c.rep
                and b.status in ('CONFIRMED', 'RESCHEDULED')
                and b.start_time > now()),
            array_position(array['wilson', 'benedict'], c.rep);
$$;

-- ------------------------------------------------------------------ create

create or replace function public.consultation_create_booking(
  p_booking_id uuid,
  p_idempotency_key uuid,
  p_reference text,
  p_name text,
  p_email text,
  p_phone text,
  p_business text,
  p_description text,
  p_start timestamptz,
  p_token_hash text,
  p_founder_emails text[],
  p_method text,
  p_candidates text[],
  p_min_notice interval default interval '2 hours',
  p_horizon interval default interval '29 days',
  p_max_active integer default 2,
  p_reminder_min_gap interval default interval '2 hours'
)
returns table (outcome text, booking_id uuid, reference text, start_time timestamptz, end_time timestamptz, representative text)
language plpgsql
set search_path = ''
as $$
declare
  v_existing public.consultation_bookings;
  v_row public.consultation_bookings;
  v_rep text;
  v_inserted boolean := false;
  v_end timestamptz := p_start + interval '30 minutes';
  v_local timestamp := p_start at time zone 'Australia/Perth';
begin
  -- Replay of the same submission (refresh, double click, network retry): same answer, no new row.
  select * into v_existing from public.consultation_bookings b where b.idempotency_key = p_idempotency_key;
  if found then
    if lower(v_existing.customer_email) = lower(p_email) and v_existing.status not in ('CONFIRMED', 'RESCHEDULED') then
      return query select 'not_active'::text, null::uuid, null::text, null::timestamptz, null::timestamptz, null::text;
    elsif lower(v_existing.customer_email) = lower(p_email) then
      return query select 'replayed'::text, v_existing.id, v_existing.reference, v_existing.start_time, v_existing.end_time,
                          v_existing.assigned_representative;
    else
      return query select 'idempotency_conflict'::text, null::uuid, null::text, null::timestamptz, null::timestamptz, null::text;
    end if;
    return;
  end if;

  if p_method not in ('TEAMS', 'PHONE') then
    return query select 'invalid_method'::text, null::uuid, null::text, null::timestamptz, null::timestamptz, null::text;
    return;
  end if;
  if p_method = 'PHONE' and nullif(btrim(coalesce(p_phone, '')), '') is null then
    return query select 'phone_required'::text, null::uuid, null::text, null::timestamptz, null::timestamptz, null::text;
    return;
  end if;

  if extract(isodow from v_local) not in (1, 2, 5)
     or v_local::time < time '09:00' or v_local::time > time '16:30'
     or extract(minute from v_local) not in (0, 30) or extract(second from v_local) <> 0 then
    return query select 'invalid_slot'::text, null::uuid, null::text, null::timestamptz, null::timestamptz, null::text;
    return;
  end if;
  if p_start < now() + p_min_notice then
    return query select 'too_soon'::text, null::uuid, null::text, null::timestamptz, null::timestamptz, null::text;
    return;
  end if;
  if p_start > now() + p_horizon then
    return query select 'too_far'::text, null::uuid, null::text, null::timestamptz, null::timestamptz, null::text;
    return;
  end if;

  -- Serialise concurrent requests for the same email so the count below cannot be raced.
  perform pg_advisory_xact_lock(hashtext('consultation:' || lower(p_email)));

  if (select count(*) from public.consultation_bookings b
       where lower(b.customer_email) = lower(p_email)
         and b.status in ('CONFIRMED', 'RESCHEDULED')
         and b.start_time > now()) >= p_max_active then
    return query select 'limit_reached'::text, null::uuid, null::text, null::timestamptz, null::timestamptz, null::text;
    return;
  end if;

  -- Try each verified-free representative in assignment order; the exclusion constraint decides.
  for v_rep in select r.representative from public.consultation_rank_representatives(p_candidates) r loop
    begin
      insert into public.consultation_bookings (
        id, reference, customer_name, customer_email, customer_phone, business_name,
        project_description, start_time, end_time, idempotency_key,
        management_token_hash, management_token_expires_at, assigned_representative, meeting_method
      ) values (
        p_booking_id, p_reference, p_name, p_email, nullif(p_phone, ''), nullif(p_business, ''),
        p_description, p_start, v_end, p_idempotency_key,
        p_token_hash, v_end + interval '30 days', v_rep, p_method
      )
      returning * into v_row;
      v_inserted := true;
      exit;
    exception
      when exclusion_violation then
        continue;
      when unique_violation then
        -- A concurrent request with the same idempotency key won the race.
        select * into v_existing from public.consultation_bookings b where b.idempotency_key = p_idempotency_key;
        if found and lower(v_existing.customer_email) = lower(p_email) then
          return query select 'replayed'::text, v_existing.id, v_existing.reference, v_existing.start_time,
                              v_existing.end_time, v_existing.assigned_representative;
          return;
        end if;
        raise;
    end;
  end loop;

  if not v_inserted then
    return query select 'slot_taken'::text, null::uuid, null::text, null::timestamptz, null::timestamptz, null::text;
    return;
  end if;

  insert into public.consultation_booking_events (booking_id, action, actor_type, next)
  values (v_row.id, 'CREATED', 'CUSTOMER',
          jsonb_build_object('start_time', v_row.start_time, 'end_time', v_row.end_time, 'status', v_row.status,
                             'representative', v_row.assigned_representative, 'method', v_row.meeting_method));

  perform public.consultation_queue_emails(
    v_row, 'CUSTOMER_CONFIRMATION', 'FOUNDER_NEW_BOOKING', p_founder_emails, 'created',
    jsonb_build_object('start_time', v_row.start_time, 'end_time', v_row.end_time, 'actor_type', 'CUSTOMER',
                       'representative', v_row.assigned_representative)
  );
  perform public.consultation_sync_reminder(v_row, 'SYSTEM', p_reminder_min_gap);

  return query select 'created'::text, v_row.id, v_row.reference, v_row.start_time, v_row.end_time, v_row.assigned_representative;
end;
$$;

-- ------------------------------------------------------------------ reschedule

create or replace function public.consultation_reschedule_booking(
  p_booking_id uuid,
  p_expected_version integer,
  p_new_start timestamptz,
  p_actor_type text,
  p_actor_clerk_user_id text,
  p_new_token_hash text,
  p_founder_emails text[],
  p_candidates text[],
  p_min_notice interval default interval '2 hours',
  p_horizon interval default interval '29 days',
  p_reminder_min_gap interval default interval '2 hours',
  p_customer_cutoff interval default interval '2 hours'
)
returns table (outcome text, version integer, start_time timestamptz, end_time timestamptz, representative text)
language plpgsql
set search_path = ''
as $$
declare
  v_old public.consultation_bookings;
  v_row public.consultation_bookings;
  v_rep text;
  v_updated boolean := false;
  v_local timestamp := p_new_start at time zone 'Australia/Perth';
begin
  if p_actor_type not in ('CUSTOMER', 'ADMIN') then
    raise exception 'invalid actor type %', p_actor_type;
  end if;

  select * into v_old from public.consultation_bookings b where b.id = p_booking_id for update;
  if not found then
    return query select 'not_found'::text, null::integer, null::timestamptz, null::timestamptz, null::text;
    return;
  end if;
  if v_old.status not in ('CONFIRMED', 'RESCHEDULED') then
    return query select 'not_active'::text, v_old.version, v_old.start_time, v_old.end_time, v_old.assigned_representative;
    return;
  end if;
  if v_old.version <> p_expected_version then
    return query select 'stale'::text, v_old.version, v_old.start_time, v_old.end_time, v_old.assigned_representative;
    return;
  end if;
  -- Customers can change their booking online until 2 hours before it starts.
  if p_actor_type = 'CUSTOMER' and v_old.start_time <= now() + p_customer_cutoff then
    return query select 'change_window_closed'::text, v_old.version, v_old.start_time, v_old.end_time, v_old.assigned_representative;
    return;
  end if;
  if p_new_start = v_old.start_time then
    return query select 'same_slot'::text, v_old.version, v_old.start_time, v_old.end_time, v_old.assigned_representative;
    return;
  end if;
  if extract(isodow from v_local) not in (1, 2, 5)
     or v_local::time < time '09:00' or v_local::time > time '16:30'
     or extract(minute from v_local) not in (0, 30) or extract(second from v_local) <> 0 then
    return query select 'invalid_slot'::text, v_old.version, v_old.start_time, v_old.end_time, v_old.assigned_representative;
    return;
  end if;
  if p_new_start < now() + p_min_notice then
    return query select 'too_soon'::text, v_old.version, v_old.start_time, v_old.end_time, v_old.assigned_representative;
    return;
  end if;
  if p_new_start > now() + p_horizon then
    return query select 'too_far'::text, v_old.version, v_old.start_time, v_old.end_time, v_old.assigned_representative;
    return;
  end if;

  -- Keep the same representative when they are free at the new time; otherwise reassign.
  for v_rep in select r.representative from public.consultation_rank_representatives(p_candidates, v_old.assigned_representative) r loop
    begin
      update public.consultation_bookings b
         set start_time = p_new_start,
             end_time = p_new_start + interval '30 minutes',
             status = 'RESCHEDULED',
             assigned_representative = v_rep,
             version = b.version + 1,
             reschedule_count = b.reschedule_count + 1,
             management_token_hash = p_new_token_hash,
             management_token_expires_at = p_new_start + interval '30 minutes' + interval '30 days',
             calendar_sync_state = 'PENDING',
             calendar_sync_attempts = 0,
             calendar_next_attempt_at = now(),
             calendar_last_error = null,
             updated_at = now()
       where b.id = p_booking_id
      returning * into v_row;
      v_updated := true;
      exit;
    exception
      when exclusion_violation then
        continue;
    end;
  end loop;

  if not v_updated then
    -- Nothing changed; the original appointment stands.
    return query select 'slot_taken'::text, v_old.version, v_old.start_time, v_old.end_time, v_old.assigned_representative;
    return;
  end if;

  insert into public.consultation_booking_events (booking_id, action, actor_type, actor_clerk_user_id, previous, next)
  values (v_row.id, 'RESCHEDULED', p_actor_type, p_actor_clerk_user_id,
          jsonb_build_object('start_time', v_old.start_time, 'end_time', v_old.end_time, 'status', v_old.status,
                             'representative', v_old.assigned_representative),
          jsonb_build_object('start_time', v_row.start_time, 'end_time', v_row.end_time, 'status', v_row.status,
                             'representative', v_row.assigned_representative));

  perform public.consultation_queue_emails(
    v_row, 'CUSTOMER_RESCHEDULED', 'FOUNDER_RESCHEDULED', p_founder_emails,
    format('rescheduled:%s', v_row.reschedule_count),
    jsonb_build_object(
      'start_time', v_row.start_time, 'end_time', v_row.end_time,
      'previous_start_time', v_old.start_time, 'previous_end_time', v_old.end_time,
      'actor_type', p_actor_type, 'token_version', v_row.version,
      'representative', v_row.assigned_representative, 'previous_representative', v_old.assigned_representative
    )
  );
  perform public.consultation_sync_reminder(v_row, p_actor_type, p_reminder_min_gap);

  return query select 'rescheduled'::text, v_row.version, v_row.start_time, v_row.end_time, v_row.assigned_representative;
end;
$$;

-- ------------------------------------------------------------------ cancel

create or replace function public.consultation_cancel_booking(
  p_booking_id uuid,
  p_expected_version integer,
  p_actor_type text,
  p_actor_clerk_user_id text,
  p_reason text,
  p_founder_emails text[],
  p_customer_cutoff interval default interval '2 hours'
)
returns table (outcome text, version integer)
language plpgsql
set search_path = ''
as $$
declare
  v_old public.consultation_bookings;
  v_row public.consultation_bookings;
begin
  if p_actor_type not in ('CUSTOMER', 'ADMIN') then
    raise exception 'invalid actor type %', p_actor_type;
  end if;

  select * into v_old from public.consultation_bookings b where b.id = p_booking_id for update;
  if not found then
    return query select 'not_found'::text, null::integer;
    return;
  end if;
  if v_old.status not in ('CONFIRMED', 'RESCHEDULED') then
    return query select 'not_active'::text, v_old.version;
    return;
  end if;
  if v_old.version <> p_expected_version then
    return query select 'stale'::text, v_old.version;
    return;
  end if;
  if p_actor_type = 'CUSTOMER' and v_old.start_time <= now() + p_customer_cutoff then
    return query select 'change_window_closed'::text, v_old.version;
    return;
  end if;

  -- The slot is released by this UPDATE (the exclusion constraint ignores cancelled rows).
  update public.consultation_bookings b
     set status = 'CANCELLED',
         version = b.version + 1,
         cancellation_reason = nullif(btrim(p_reason), ''),
         cancelled_at = now(),
         cancelled_by_type = p_actor_type,
         -- Always back through the queue, even with no event id recorded: a worker may be
         -- creating the event right now, or crashed after creating it. The worker looks the event
         -- up by its booking tag and cancels whatever exists.
         calendar_sync_state = 'PENDING',
         calendar_sync_attempts = 0,
         calendar_next_attempt_at = now(),
         calendar_last_error = null,
         updated_at = now()
   where b.id = p_booking_id
  returning * into v_row;

  insert into public.consultation_booking_events (booking_id, action, actor_type, actor_clerk_user_id, previous, next)
  values (v_row.id, 'CANCELLED', p_actor_type, p_actor_clerk_user_id,
          jsonb_build_object('status', v_old.status),
          jsonb_build_object('status', v_row.status, 'reason_given', v_row.cancellation_reason is not null));

  perform public.consultation_queue_emails(
    v_row, 'CUSTOMER_CANCELLED', 'FOUNDER_CANCELLED', p_founder_emails, 'cancelled',
    jsonb_build_object('start_time', v_row.start_time, 'end_time', v_row.end_time, 'actor_type', p_actor_type,
                       'representative', v_row.assigned_representative)
  );
  perform public.consultation_sync_reminder(v_row, p_actor_type, interval '0');

  return query select 'cancelled'::text, v_row.version;
end;
$$;

-- ------------------------------------------------------------------ availability (no customer data)

-- Which representative is busy when. Start instants and roster keys only, never who booked.
create or replace function public.consultation_busy_slots(p_from timestamptz, p_to timestamptz)
returns table (start_time timestamptz, representative text)
language sql
stable
set search_path = ''
as $$
  select b.start_time, b.assigned_representative
    from public.consultation_bookings b
   where b.status in ('CONFIRMED', 'RESCHEDULED')
     and b.start_time >= p_from
     and b.start_time < p_to
   order by b.start_time;
$$;

-- ------------------------------------------------------------------ calendar sync queue

-- Lease bookings whose Outlook event is behind the booking (created, moved, reassigned or
-- cancelled since the last successful sync). SKIP LOCKED + a lease: concurrent workers never
-- take the same booking, and a crashed worker's lease simply expires. Optional p_booking_id
-- lets a request sync its own booking immediately after committing it.
create or replace function public.consultation_claim_calendar_sync(
  p_limit integer,
  p_lease interval default interval '2 minutes',
  p_booking_id uuid default null,
  p_max_attempts integer default 10
)
returns setof public.consultation_bookings
language plpgsql
set search_path = ''
as $$
begin
  return query
  update public.consultation_bookings b
     set calendar_sync_attempts = b.calendar_sync_attempts + 1,
         calendar_lease_until = now() + p_lease
   where b.id in (
     select c.id
       from public.consultation_bookings c
      where c.calendar_sync_state = 'PENDING'
        and c.calendar_synced_version < c.version
        and c.calendar_next_attempt_at <= now()
        and (c.calendar_lease_until is null or c.calendar_lease_until < now())
        and c.calendar_sync_attempts < p_max_attempts
        and (p_booking_id is null or c.id = p_booking_id)
        -- Past appointments are left alone: a missed or stale event in the past harms no one.
        and c.status in ('CONFIRMED', 'RESCHEDULED', 'CANCELLED')
        and c.end_time > now()
      order by c.calendar_next_attempt_at
      limit p_limit
      for update skip locked
   )
  returning b.*;
end;
$$;

-- Record one sync attempt for the booking version the worker acted on.
--   synced -> event id / owner / join url stored (null event id = no event any more);
--             if the booking changed meanwhile it stays PENDING and is picked up again
--   retry  -> back off; after p_max_attempts the booking is FAILED and the founders are emailed
create or replace function public.consultation_finish_calendar_sync(
  p_booking_id uuid,
  p_version integer,
  p_outcome text,
  p_event_id text,
  p_event_owner text,
  p_join_url text,
  p_error text,
  p_retry_after interval,
  p_founder_emails text[],
  p_max_attempts integer default 10
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_b public.consultation_bookings;
  v_state text;
  v_founder text;
begin
  if p_outcome not in ('synced', 'retry') then
    raise exception 'invalid outcome %', p_outcome;
  end if;

  select * into v_b from public.consultation_bookings where id = p_booking_id for update;
  if not found then
    return 'ignored';
  end if;

  if p_outcome = 'synced' then
    v_state := case when v_b.version > p_version then 'PENDING' else 'SYNCED' end;
    update public.consultation_bookings
       set calendar_event_id = p_event_id,
           calendar_event_owner = case when p_event_id is null then null else p_event_owner end,
           calendar_join_url = case when p_event_id is null then null else p_join_url end,
           calendar_synced_version = greatest(calendar_synced_version, p_version),
           calendar_sync_state = v_state,
           calendar_sync_attempts = case when v_state = 'PENDING' then 0 else calendar_sync_attempts end,
           calendar_next_attempt_at = now(),
           calendar_lease_until = null,
           calendar_last_error = null
     where id = p_booking_id;
    insert into public.consultation_booking_events (booking_id, action, actor_type, next)
    values (p_booking_id, 'CALENDAR_SYNCED', 'SYSTEM',
            jsonb_build_object('version', p_version, 'owner', p_event_owner, 'has_event', p_event_id is not null));
    return v_state;
  end if;

  v_state := case when v_b.calendar_sync_attempts >= p_max_attempts then 'FAILED' else 'PENDING' end;
  update public.consultation_bookings
     set calendar_sync_state = v_state,
         calendar_next_attempt_at = now() + p_retry_after,
         calendar_lease_until = null,
         calendar_last_error = left(p_error, 500)
   where id = p_booking_id;
  insert into public.consultation_booking_events (booking_id, action, actor_type, next)
  values (p_booking_id, 'CALENDAR_SYNC_FAILED', 'SYSTEM',
          jsonb_build_object('version', p_version, 'attempt', v_b.calendar_sync_attempts, 'final', v_state = 'FAILED'));

  if v_state = 'FAILED' then
    foreach v_founder in array coalesce(p_founder_emails, array[]::text[]) loop
      insert into public.consultation_notifications (booking_id, event_key, kind, recipient, payload)
      values (p_booking_id, format('%s:calendar-failed:%s:%s', p_booking_id, p_version, lower(v_founder)),
              'FOUNDER_CALENDAR_FAILED', v_founder,
              jsonb_build_object('start_time', v_b.start_time, 'end_time', v_b.end_time, 'status', v_b.status,
                                 'representative', v_b.assigned_representative))
      on conflict (event_key) do nothing;
    end loop;
  end if;
  return v_state;
end;
$$;

-- Admin "retry calendar sync" for a FAILED booking: back to the queue with a fresh budget.
create or replace function public.consultation_retry_calendar_sync(p_booking_id uuid)
returns text
language sql
set search_path = ''
as $$
  update public.consultation_bookings
     set calendar_sync_state = 'PENDING', calendar_sync_attempts = 0, calendar_next_attempt_at = now(),
         calendar_lease_until = null
   where id = p_booking_id and calendar_sync_state = 'FAILED' and calendar_synced_version < version
  returning 'queued'::text;
$$;

-- Notification defer: the email is waiting for something else (a Teams link from the calendar
-- sync). Back to PENDING without spending an attempt.
create or replace function public.consultation_defer_notification(p_id uuid, p_delay interval)
returns text
language sql
set search_path = ''
as $$
  update public.consultation_notifications
     set status = 'PENDING', attempts = greatest(attempts - 1, 0), locked_until = null,
         send_after = now() + p_delay, updated_at = now()
   where id = p_id and status = 'SENDING'
  returning 'deferred'::text;
$$;

-- ------------------------------------------------------------------ function privileges

do $$
declare
  f text;
  r text;
begin
  foreach f in array array[
    'public.consultation_rank_representatives(text[], text)',
    'public.consultation_create_booking(uuid, uuid, text, text, text, text, text, text, timestamptz, text, text[], text, text[], interval, interval, integer, interval)',
    'public.consultation_reschedule_booking(uuid, integer, timestamptz, text, text, text, text[], text[], interval, interval, interval, interval)',
    'public.consultation_cancel_booking(uuid, integer, text, text, text, text[], interval)',
    'public.consultation_busy_slots(timestamptz, timestamptz)',
    'public.consultation_claim_calendar_sync(integer, interval, uuid, integer)',
    'public.consultation_finish_calendar_sync(uuid, integer, text, text, text, text, text, interval, text[], integer)',
    'public.consultation_retry_calendar_sync(uuid)',
    'public.consultation_defer_notification(uuid, interval)'
  ] loop
    execute format('revoke all on function %s from public', f);
    foreach r in array array['anon', 'authenticated'] loop
      if exists (select 1 from pg_roles where rolname = r) then
        execute format('revoke all on function %s from %I', f, r);
      end if;
    end loop;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function %s to service_role', f);
    end if;
  end loop;
end
$$;
