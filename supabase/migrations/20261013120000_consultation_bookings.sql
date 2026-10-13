-- Free 30-minute consultation bookings (design: docs/superpowers/specs/2026-10-13-consultation-booking-design.md).
--
-- Three tables and seven functions. Every write goes through a function so the booking row,
-- its audit event and its outbound notifications commit (or roll back) together.
--
-- Invariants enforced HERE, not only in the app:
--   * no two active bookings overlap            (EXCLUDE constraint, any concurrency)
--   * Monday/Tuesday/Friday, 09:00-16:30 starts, 30 minutes, on the half hour, Perth time
--                                               (CHECK constraint)
--   * not in the past / inside the minimum notice, at most N upcoming per email
--                                               (consultation_create_booking)
--   * a reschedule moves the same row in one UPDATE; on conflict nothing changes
--
-- Access: RLS on, no policies, privileges revoked from anon and authenticated, functions
-- executable by service_role only. The public site never reads these tables directly.
--
-- Idempotent where Postgres allows it (create ... if not exists / or replace).

-- ------------------------------------------------------------------ bookings

create table if not exists public.consultation_bookings (
  id uuid primary key,
  reference text not null unique,
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  customer_email text not null check (char_length(customer_email) between 3 and 254 and customer_email like '%_@_%'),
  customer_phone text check (customer_phone is null or char_length(customer_phone) <= 40),
  business_name text check (business_name is null or char_length(business_name) <= 160),
  project_description text not null check (char_length(project_description) between 1 and 2000),
  start_time timestamptz not null,
  end_time timestamptz not null,
  timezone text not null default 'Australia/Perth' check (timezone = 'Australia/Perth'),
  status text not null default 'CONFIRMED'
    check (status in ('CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED')),
  version integer not null default 1 check (version >= 1),
  idempotency_key uuid not null unique,
  management_token_hash text not null unique check (management_token_hash ~ '^[0-9a-f]{64}$'),
  management_token_expires_at timestamptz not null,
  reschedule_count integer not null default 0,
  cancellation_reason text check (cancellation_reason is null or char_length(cancellation_reason) <= 500),
  cancelled_at timestamptz,
  cancelled_by_type text check (cancelled_by_type is null or cancelled_by_type in ('CUSTOMER', 'ADMIN', 'SYSTEM')),
  completed_at timestamptz,
  completed_by_clerk_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint consultation_bookings_thirty_minutes
    check (end_time = start_time + interval '30 minutes'),

  -- Business rules in Perth wall-clock time. ISO day of week: 1 Monday, 2 Tuesday, 5 Friday.
  constraint consultation_bookings_perth_slot check (
    extract(isodow from start_time at time zone 'Australia/Perth') in (1, 2, 5)
    and (start_time at time zone 'Australia/Perth')::time >= time '09:00'
    and (start_time at time zone 'Australia/Perth')::time <= time '16:30'
    and extract(minute from start_time at time zone 'Australia/Perth') in (0, 30)
    and extract(second from start_time at time zone 'Australia/Perth') = 0
  ),

  -- The double-booking guarantee. Cancelled and completed rows never block a slot.
  constraint consultation_bookings_no_overlap
    exclude using gist (tstzrange(start_time, end_time, '[)') with &&)
    where (status in ('CONFIRMED', 'RESCHEDULED'))
);

create index if not exists consultation_bookings_start_idx on public.consultation_bookings (start_time);
create index if not exists consultation_bookings_status_start_idx on public.consultation_bookings (status, start_time);
create index if not exists consultation_bookings_email_idx on public.consultation_bookings (lower(customer_email));

comment on table public.consultation_bookings is
  'Free 30-minute consultations. Written only through consultation_* functions. Never deleted: cancelled bookings keep their row and history.';

-- ------------------------------------------------------------------ audit trail (append-only)

create table if not exists public.consultation_booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.consultation_bookings (id) on delete restrict,
  action text not null check (action in (
    'CREATED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED',
    'REMINDER_QUEUED', 'REMINDER_CANCELLED', 'NOTIFICATION_SENT', 'NOTIFICATION_FAILED'
  )),
  actor_type text not null check (actor_type in ('CUSTOMER', 'ADMIN', 'SYSTEM')),
  actor_clerk_user_id text,
  -- Ids, times, status, reasons and notification kinds only: no names or email addresses.
  previous jsonb,
  next jsonb,
  created_at timestamptz not null default now()
);

create index if not exists consultation_booking_events_booking_idx
  on public.consultation_booking_events (booking_id, created_at);

create or replace function public.consultation_events_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'consultation_booking_events is append-only';
end;
$$;

drop trigger if exists consultation_booking_events_no_update on public.consultation_booking_events;
create trigger consultation_booking_events_no_update
  before update or delete on public.consultation_booking_events
  for each row execute function public.consultation_events_append_only();

-- ------------------------------------------------------------------ notification outbox

create table if not exists public.consultation_notifications (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.consultation_bookings (id) on delete restrict,
  -- Stable identity of one email; also the Resend idempotency key. Unique: never queued twice.
  event_key text not null unique,
  kind text not null check (kind in (
    'CUSTOMER_CONFIRMATION', 'FOUNDER_NEW_BOOKING',
    'CUSTOMER_RESCHEDULED', 'FOUNDER_RESCHEDULED',
    'CUSTOMER_CANCELLED', 'FOUNDER_CANCELLED',
    'CUSTOMER_REMINDER'
  )),
  recipient text not null,
  -- Snapshot of what the email describes (times before/after, actor type). No secrets.
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'PENDING' check (status in ('PENDING', 'SENDING', 'SENT', 'FAILED', 'CANCELLED')),
  send_after timestamptz not null default now(),
  attempts integer not null default 0,
  max_attempts integer not null default 8,
  locked_until timestamptz,
  last_attempt_at timestamptz,
  last_error text,
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists consultation_notifications_due_idx
  on public.consultation_notifications (send_after)
  where status in ('PENDING', 'SENDING');
create index if not exists consultation_notifications_booking_idx
  on public.consultation_notifications (booking_id);

-- ------------------------------------------------------------------ access

alter table public.consultation_bookings enable row level security;
alter table public.consultation_booking_events enable row level security;
alter table public.consultation_notifications enable row level security;

do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on public.consultation_bookings from %I', r);
      execute format('revoke all on public.consultation_booking_events from %I', r);
      execute format('revoke all on public.consultation_notifications from %I', r);
    end if;
  end loop;

  -- Explicit, rather than relying on Supabase's default privileges for new tables.
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update on public.consultation_bookings to service_role;
    grant select, insert on public.consultation_booking_events to service_role;
    grant select, insert, update on public.consultation_notifications to service_role;
  end if;
end
$$;

-- ------------------------------------------------------------------ helpers

-- Queue the customer + founder emails for one event. p_tag makes the key unique per change.
create or replace function public.consultation_queue_emails(
  p_booking public.consultation_bookings,
  p_customer_kind text,
  p_founder_kind text,
  p_founder_emails text[],
  p_tag text,
  p_payload jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_founder text;
begin
  insert into public.consultation_notifications (booking_id, event_key, kind, recipient, payload)
  values (p_booking.id, format('%s:%s:%s', p_booking.id, p_tag, lower(p_customer_kind)), p_customer_kind,
          p_booking.customer_email, p_payload)
  on conflict (event_key) do nothing;

  foreach v_founder in array coalesce(p_founder_emails, array[]::text[]) loop
    insert into public.consultation_notifications (booking_id, event_key, kind, recipient, payload)
    values (p_booking.id, format('%s:%s:%s:%s', p_booking.id, p_tag, lower(p_founder_kind), lower(v_founder)),
            p_founder_kind, v_founder, p_payload)
    on conflict (event_key) do nothing;
  end loop;
end;
$$;

-- Cancel any queued reminder and, when the booking is active and far enough away, queue one
-- for start - 24h. Called inside create / reschedule / cancel.
create or replace function public.consultation_sync_reminder(
  p_booking public.consultation_bookings,
  p_actor_type text,
  p_reminder_min_gap interval
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_cancelled integer;
  v_queued integer;
  v_send_at timestamptz := p_booking.start_time - interval '24 hours';
begin
  update public.consultation_notifications
     set status = 'CANCELLED', locked_until = null, updated_at = now()
   where booking_id = p_booking.id
     and kind = 'CUSTOMER_REMINDER'
     and status in ('PENDING', 'SENDING');
  get diagnostics v_cancelled = row_count;

  if v_cancelled > 0 then
    insert into public.consultation_booking_events (booking_id, action, actor_type, previous)
    values (p_booking.id, 'REMINDER_CANCELLED', p_actor_type, jsonb_build_object('count', v_cancelled));
  end if;

  if p_booking.status in ('CONFIRMED', 'RESCHEDULED') and v_send_at >= now() + p_reminder_min_gap then
    insert into public.consultation_notifications (booking_id, event_key, kind, recipient, payload, send_after)
    values (p_booking.id,
            format('%s:reminder:%s', p_booking.id, extract(epoch from p_booking.start_time)::bigint),
            'CUSTOMER_REMINDER', p_booking.customer_email,
            jsonb_build_object('start_time', p_booking.start_time, 'end_time', p_booking.end_time),
            v_send_at)
    on conflict (event_key) do update
      set status = 'PENDING', send_after = excluded.send_after, attempts = 0,
          locked_until = null, last_error = null, updated_at = now()
      where public.consultation_notifications.status = 'CANCELLED';
    get diagnostics v_queued = row_count;

    if v_queued > 0 then
      insert into public.consultation_booking_events (booking_id, action, actor_type, next)
      values (p_booking.id, 'REMINDER_QUEUED', 'SYSTEM', jsonb_build_object('send_after', v_send_at));
    end if;
  end if;
end;
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
  p_min_notice interval default interval '2 hours',
  p_horizon interval default interval '29 days',
  p_max_active integer default 2,
  p_reminder_min_gap interval default interval '2 hours'
)
returns table (outcome text, booking_id uuid, reference text, start_time timestamptz, end_time timestamptz)
language plpgsql
set search_path = ''
as $$
declare
  v_existing public.consultation_bookings;
  v_row public.consultation_bookings;
  v_end timestamptz := p_start + interval '30 minutes';
  v_local timestamp := p_start at time zone 'Australia/Perth';
begin
  -- Replay of the same submission (refresh, double click, network retry): same answer, no new row.
  select * into v_existing from public.consultation_bookings b where b.idempotency_key = p_idempotency_key;
  if found then
    if lower(v_existing.customer_email) = lower(p_email) and v_existing.status not in ('CONFIRMED', 'RESCHEDULED') then
      return query select 'not_active'::text, null::uuid, null::text, null::timestamptz, null::timestamptz;
    elsif lower(v_existing.customer_email) = lower(p_email) then
      return query select 'replayed'::text, v_existing.id, v_existing.reference, v_existing.start_time, v_existing.end_time;
    else
      return query select 'idempotency_conflict'::text, null::uuid, null::text, null::timestamptz, null::timestamptz;
    end if;
    return;
  end if;

  if extract(isodow from v_local) not in (1, 2, 5)
     or v_local::time < time '09:00' or v_local::time > time '16:30'
     or extract(minute from v_local) not in (0, 30) or extract(second from v_local) <> 0 then
    return query select 'invalid_slot'::text, null::uuid, null::text, null::timestamptz, null::timestamptz;
    return;
  end if;

  if p_start < now() + p_min_notice then
    return query select 'too_soon'::text, null::uuid, null::text, null::timestamptz, null::timestamptz;
    return;
  end if;

  if p_start > now() + p_horizon then
    return query select 'too_far'::text, null::uuid, null::text, null::timestamptz, null::timestamptz;
    return;
  end if;

  -- Serialise concurrent requests for the same email so the count below cannot be raced.
  perform pg_advisory_xact_lock(hashtext('consultation:' || lower(p_email)));

  if (select count(*) from public.consultation_bookings b
       where lower(b.customer_email) = lower(p_email)
         and b.status in ('CONFIRMED', 'RESCHEDULED')
         and b.start_time > now()) >= p_max_active then
    return query select 'limit_reached'::text, null::uuid, null::text, null::timestamptz, null::timestamptz;
    return;
  end if;

  begin
    insert into public.consultation_bookings (
      id, reference, customer_name, customer_email, customer_phone, business_name,
      project_description, start_time, end_time, idempotency_key,
      management_token_hash, management_token_expires_at
    ) values (
      p_booking_id, p_reference, p_name, p_email, nullif(p_phone, ''), nullif(p_business, ''),
      p_description, p_start, v_end, p_idempotency_key,
      p_token_hash, v_end + interval '30 days'
    )
    returning * into v_row;
  exception
    when exclusion_violation then
      select * into v_existing from public.consultation_bookings b where b.idempotency_key = p_idempotency_key;
      if found and lower(v_existing.customer_email) = lower(p_email) then
        return query select 'replayed'::text, v_existing.id, v_existing.reference, v_existing.start_time, v_existing.end_time;
      else
        return query select 'slot_taken'::text, null::uuid, null::text, null::timestamptz, null::timestamptz;
      end if;
      return;
    when unique_violation then
      -- A concurrent request with the same idempotency key won the race.
      select * into v_existing from public.consultation_bookings b where b.idempotency_key = p_idempotency_key;
      if found and lower(v_existing.customer_email) = lower(p_email) then
        return query select 'replayed'::text, v_existing.id, v_existing.reference, v_existing.start_time, v_existing.end_time;
        return;
      end if;
      raise;
  end;

  insert into public.consultation_booking_events (booking_id, action, actor_type, next)
  values (v_row.id, 'CREATED', 'CUSTOMER',
          jsonb_build_object('start_time', v_row.start_time, 'end_time', v_row.end_time, 'status', v_row.status));

  perform public.consultation_queue_emails(
    v_row, 'CUSTOMER_CONFIRMATION', 'FOUNDER_NEW_BOOKING', p_founder_emails, 'created',
    jsonb_build_object('start_time', v_row.start_time, 'end_time', v_row.end_time, 'actor_type', 'CUSTOMER')
  );
  perform public.consultation_sync_reminder(v_row, 'SYSTEM', p_reminder_min_gap);

  return query select 'created'::text, v_row.id, v_row.reference, v_row.start_time, v_row.end_time;
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
  p_min_notice interval default interval '2 hours',
  p_horizon interval default interval '29 days',
  p_reminder_min_gap interval default interval '2 hours'
)
returns table (outcome text, version integer, start_time timestamptz, end_time timestamptz)
language plpgsql
set search_path = ''
as $$
declare
  v_old public.consultation_bookings;
  v_row public.consultation_bookings;
  v_local timestamp := p_new_start at time zone 'Australia/Perth';
begin
  if p_actor_type not in ('CUSTOMER', 'ADMIN') then
    raise exception 'invalid actor type %', p_actor_type;
  end if;

  select * into v_old from public.consultation_bookings b where b.id = p_booking_id for update;
  if not found then
    return query select 'not_found'::text, null::integer, null::timestamptz, null::timestamptz;
    return;
  end if;
  if v_old.status not in ('CONFIRMED', 'RESCHEDULED') then
    return query select 'not_active'::text, v_old.version, v_old.start_time, v_old.end_time;
    return;
  end if;
  if v_old.version <> p_expected_version then
    return query select 'stale'::text, v_old.version, v_old.start_time, v_old.end_time;
    return;
  end if;
  -- Customers cannot move an appointment that has already begun.
  if p_actor_type = 'CUSTOMER' and v_old.start_time <= now() then
    return query select 'already_started'::text, v_old.version, v_old.start_time, v_old.end_time;
    return;
  end if;
  if p_new_start = v_old.start_time then
    return query select 'same_slot'::text, v_old.version, v_old.start_time, v_old.end_time;
    return;
  end if;
  if extract(isodow from v_local) not in (1, 2, 5)
     or v_local::time < time '09:00' or v_local::time > time '16:30'
     or extract(minute from v_local) not in (0, 30) or extract(second from v_local) <> 0 then
    return query select 'invalid_slot'::text, v_old.version, v_old.start_time, v_old.end_time;
    return;
  end if;
  if p_new_start < now() + p_min_notice then
    return query select 'too_soon'::text, v_old.version, v_old.start_time, v_old.end_time;
    return;
  end if;
  if p_new_start > now() + p_horizon then
    return query select 'too_far'::text, v_old.version, v_old.start_time, v_old.end_time;
    return;
  end if;

  begin
    update public.consultation_bookings b
       set start_time = p_new_start,
           end_time = p_new_start + interval '30 minutes',
           status = 'RESCHEDULED',
           version = b.version + 1,
           reschedule_count = b.reschedule_count + 1,
           management_token_hash = p_new_token_hash,
           management_token_expires_at = p_new_start + interval '30 minutes' + interval '30 days',
           updated_at = now()
     where b.id = p_booking_id
    returning * into v_row;
  exception
    when exclusion_violation then
      -- The update is undone; the original appointment stands.
      return query select 'slot_taken'::text, v_old.version, v_old.start_time, v_old.end_time;
      return;
  end;

  insert into public.consultation_booking_events (booking_id, action, actor_type, actor_clerk_user_id, previous, next)
  values (v_row.id, 'RESCHEDULED', p_actor_type, p_actor_clerk_user_id,
          jsonb_build_object('start_time', v_old.start_time, 'end_time', v_old.end_time, 'status', v_old.status),
          jsonb_build_object('start_time', v_row.start_time, 'end_time', v_row.end_time, 'status', v_row.status));

  perform public.consultation_queue_emails(
    v_row, 'CUSTOMER_RESCHEDULED', 'FOUNDER_RESCHEDULED', p_founder_emails,
    format('rescheduled:%s', v_row.reschedule_count),
    jsonb_build_object(
      'start_time', v_row.start_time, 'end_time', v_row.end_time,
      'previous_start_time', v_old.start_time, 'previous_end_time', v_old.end_time,
      'actor_type', p_actor_type, 'token_version', v_row.version
    )
  );
  perform public.consultation_sync_reminder(v_row, p_actor_type, p_reminder_min_gap);

  return query select 'rescheduled'::text, v_row.version, v_row.start_time, v_row.end_time;
end;
$$;

-- ------------------------------------------------------------------ cancel

create or replace function public.consultation_cancel_booking(
  p_booking_id uuid,
  p_expected_version integer,
  p_actor_type text,
  p_actor_clerk_user_id text,
  p_reason text,
  p_founder_emails text[]
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
  if p_actor_type = 'CUSTOMER' and v_old.start_time <= now() then
    return query select 'already_started'::text, v_old.version;
    return;
  end if;

  update public.consultation_bookings b
     set status = 'CANCELLED',
         version = b.version + 1,
         cancellation_reason = nullif(btrim(p_reason), ''),
         cancelled_at = now(),
         cancelled_by_type = p_actor_type,
         updated_at = now()
   where b.id = p_booking_id
  returning * into v_row;

  insert into public.consultation_booking_events (booking_id, action, actor_type, actor_clerk_user_id, previous, next)
  values (v_row.id, 'CANCELLED', p_actor_type, p_actor_clerk_user_id,
          jsonb_build_object('status', v_old.status),
          jsonb_build_object('status', v_row.status, 'reason_given', v_row.cancellation_reason is not null));

  perform public.consultation_queue_emails(
    v_row, 'CUSTOMER_CANCELLED', 'FOUNDER_CANCELLED', p_founder_emails, 'cancelled',
    jsonb_build_object('start_time', v_row.start_time, 'end_time', v_row.end_time, 'actor_type', p_actor_type)
  );
  perform public.consultation_sync_reminder(v_row, p_actor_type, interval '0');

  return query select 'cancelled'::text, v_row.version;
end;
$$;

-- ------------------------------------------------------------------ complete (admin only)

create or replace function public.consultation_complete_booking(
  p_booking_id uuid,
  p_expected_version integer,
  p_actor_clerk_user_id text
)
returns table (outcome text, version integer)
language plpgsql
set search_path = ''
as $$
declare
  v_old public.consultation_bookings;
  v_row public.consultation_bookings;
begin
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
  -- Only a consultation that has started can be marked completed. Never automatic.
  if v_old.start_time > now() then
    return query select 'not_started'::text, v_old.version;
    return;
  end if;

  update public.consultation_bookings b
     set status = 'COMPLETED', version = b.version + 1, completed_at = now(),
         completed_by_clerk_user_id = p_actor_clerk_user_id, updated_at = now()
   where b.id = p_booking_id
  returning * into v_row;

  insert into public.consultation_booking_events (booking_id, action, actor_type, actor_clerk_user_id, previous, next)
  values (v_row.id, 'COMPLETED', 'ADMIN', p_actor_clerk_user_id,
          jsonb_build_object('status', v_old.status), jsonb_build_object('status', v_row.status));

  return query select 'completed'::text, v_row.version;
end;
$$;

-- ------------------------------------------------------------------ availability (no customer data)

create or replace function public.consultation_busy_slots(p_from timestamptz, p_to timestamptz)
returns table (start_time timestamptz)
language sql
stable
set search_path = ''
as $$
  select b.start_time
    from public.consultation_bookings b
   where b.status in ('CONFIRMED', 'RESCHEDULED')
     and b.start_time >= p_from
     and b.start_time < p_to
   order by b.start_time;
$$;

-- ------------------------------------------------------------------ outbox worker

-- Lease due notifications. SKIP LOCKED lets several workers run without sending one email twice;
-- an expired lease (worker crashed mid-send) makes the row claimable again.
create or replace function public.consultation_claim_notifications(p_limit integer, p_lease interval default interval '2 minutes')
returns setof public.consultation_notifications
language plpgsql
set search_path = ''
as $$
begin
  -- A worker that died during its final permitted attempt leaves the row SENDING with no
  -- attempts left. Settle it as FAILED (with an audit event) instead of leaving it stuck.
  with dead as (
    update public.consultation_notifications n
       set status = 'FAILED', locked_until = null,
           last_error = coalesce(n.last_error, 'lease expired on final attempt'), updated_at = now()
     where n.status = 'SENDING' and n.locked_until < now() and n.attempts >= n.max_attempts
    returning n.booking_id, n.kind, n.attempts
  )
  insert into public.consultation_booking_events (booking_id, action, actor_type, next)
  select d.booking_id, 'NOTIFICATION_FAILED', 'SYSTEM',
         jsonb_build_object('kind', d.kind, 'attempt', d.attempts, 'final', true)
    from dead d;

  return query
  update public.consultation_notifications n
     set status = 'SENDING', attempts = n.attempts + 1, last_attempt_at = now(),
         locked_until = now() + p_lease, updated_at = now()
   where n.id in (
     select c.id
       from public.consultation_notifications c
      where c.send_after <= now()
        and c.attempts < c.max_attempts
        and (c.status = 'PENDING' or (c.status = 'SENDING' and c.locked_until < now()))
      order by c.send_after
      limit p_limit
      for update skip locked
   )
  returning n.*;
end;
$$;

-- Record the outcome of one send. 'retry' backs off; after max_attempts it becomes FAILED.
create or replace function public.consultation_finish_notification(
  p_id uuid,
  p_outcome text,
  p_provider_message_id text,
  p_error text,
  p_retry_after interval default interval '5 minutes'
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_n public.consultation_notifications;
  v_status text;
begin
  if p_outcome not in ('sent', 'retry', 'skipped') then
    raise exception 'invalid outcome %', p_outcome;
  end if;

  select * into v_n from public.consultation_notifications where id = p_id for update;
  if not found or v_n.status <> 'SENDING' then
    return 'ignored';
  end if;

  if p_outcome = 'sent' then
    v_status := 'SENT';
    update public.consultation_notifications
       set status = 'SENT', provider_message_id = p_provider_message_id, sent_at = now(),
           locked_until = null, last_error = null, updated_at = now()
     where id = p_id;
    insert into public.consultation_booking_events (booking_id, action, actor_type, next)
    values (v_n.booking_id, 'NOTIFICATION_SENT', 'SYSTEM', jsonb_build_object('kind', v_n.kind, 'attempt', v_n.attempts));
  elsif p_outcome = 'skipped' then
    v_status := 'CANCELLED';
    update public.consultation_notifications
       set status = 'CANCELLED', locked_until = null, last_error = left(p_error, 500), updated_at = now()
     where id = p_id;
  else
    v_status := case when v_n.attempts >= v_n.max_attempts then 'FAILED' else 'PENDING' end;
    update public.consultation_notifications
       set status = v_status, locked_until = null, last_error = left(p_error, 500),
           send_after = now() + p_retry_after, updated_at = now()
     where id = p_id;
    insert into public.consultation_booking_events (booking_id, action, actor_type, next)
    values (v_n.booking_id, 'NOTIFICATION_FAILED', 'SYSTEM',
            jsonb_build_object('kind', v_n.kind, 'attempt', v_n.attempts, 'final', v_status = 'FAILED'));
  end if;

  return v_status;
end;
$$;

-- ------------------------------------------------------------------ function privileges

do $$
declare
  f text;
  r text;
begin
  foreach f in array array[
    'public.consultation_events_append_only()',
    'public.consultation_queue_emails(public.consultation_bookings, text, text, text[], text, jsonb)',
    'public.consultation_sync_reminder(public.consultation_bookings, text, interval)',
    'public.consultation_create_booking(uuid, uuid, text, text, text, text, text, text, timestamptz, text, text[], interval, interval, integer, interval)',
    'public.consultation_reschedule_booking(uuid, integer, timestamptz, text, text, text, text[], interval, interval, interval)',
    'public.consultation_cancel_booking(uuid, integer, text, text, text, text[])',
    'public.consultation_complete_booking(uuid, integer, text)',
    'public.consultation_busy_slots(timestamptz, timestamptz)',
    'public.consultation_claim_notifications(integer, interval)',
    'public.consultation_finish_notification(uuid, text, text, text, interval)'
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
