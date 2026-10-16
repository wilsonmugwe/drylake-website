-- Review requests and first-party feedback (/admin/reviews, /feedback).
--
-- Three tables and four functions. The site publishes NO reviews of its own making: a testimonial
-- reaches the public site only when (1) the customer submitted feedback through a single-use link,
-- (2) ticked a separate explicit consent to publish it, and (3) a platform admin approved it.
-- External review platforms stay authoritative for their own reviews; nothing here copies them.
--
--   review_requests     one email request per recipient per engagement (a completed project or a
--                       completed consultation). Holds only the SHA-256 of the feedback token and
--                       of the unsubscribe token, so a database leak exposes no working link.
--   review_feedback     what the customer submitted. Negative feedback is stored exactly like any
--                       other and is never filtered from the admin view.
--   review_suppressions addresses that opted out. Honoured on every future send.
--
-- Functions hold the invariants that must survive concurrency:
--   review_create_request  duplicate guard (unique per recipient per engagement) + suppression,
--                          atomically
--   review_lookup          read the state of a token (open / expired / submitted / withdrawn)
--   review_submit_feedback single use: the request row is locked, the token is spent in the same
--                          transaction as the feedback insert; 20 racing submits yield one success
--   review_unsubscribe     idempotent opt-out by unsubscribe token
--
-- Access: RLS on, no policies, privileges revoked from anon and authenticated, functions
-- executable by service_role only. The public site never reads these tables directly.
--
-- organization_id is deliberately not a foreign key: public.organizations is managed outside the
-- committed migrations (see scripts/check-migrations.mjs baseline note). Re-runnable.

-- ------------------------------------------------------------------ requests

create table if not exists public.review_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  engagement_kind text not null check (engagement_kind in ('project', 'consultation')),
  engagement_id uuid not null,
  organization_id uuid,
  organisation_name text check (organisation_name is null or char_length(organisation_name) <= 160),
  recipient_name text not null check (char_length(recipient_name) between 1 and 120),
  recipient_email text not null check (char_length(recipient_email) between 3 and 254 and recipient_email like '%_@_%'),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  unsubscribe_token_hash text not null unique check (unsubscribe_token_hash ~ '^[0-9a-f]{64}$'),
  token_expires_at timestamptz not null,
  -- queued: row exists, email not yet accepted by the provider. sent: provider accepted it.
  -- failed: the provider refused (admin can retry). submitted: feedback received.
  -- withdrawn: an admin closed the link.
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'submitted', 'withdrawn')),
  sent_at timestamptz,
  -- Clerk user id of the platform admin who initiated the request.
  sent_by text not null,
  submitted_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 300)
);

-- The duplicate guard: one request per recipient per engagement, whatever the address casing.
create unique index if not exists review_requests_engagement_recipient_uq
  on public.review_requests (engagement_kind, engagement_id, lower(recipient_email));
create index if not exists review_requests_created_idx on public.review_requests (created_at desc);
create index if not exists review_requests_email_idx on public.review_requests (lower(recipient_email));

-- ------------------------------------------------------------------ feedback

create table if not exists public.review_feedback (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.review_requests (id),
  created_at timestamptz not null default now(),
  rating smallint check (rating is null or rating between 1 and 5),
  comments text check (comments is null or char_length(comments) between 1 and 2000),
  -- A separate, explicit tick to publish the comments as a testimonial. Never implied by submitting.
  publish_consent boolean not null default false,
  consent_at timestamptz,
  display_choice text check (display_choice is null or display_choice in
    ('name_and_organisation', 'first_name_and_organisation', 'organisation_only', 'anonymous')),
  -- What would be shown, computed in review_submit_feedback from the request, not typed by the visitor.
  display_name text check (display_name is null or char_length(display_name) <= 120),
  display_organisation text check (display_organisation is null or char_length(display_organisation) <= 160),
  approved boolean not null default false,
  approved_at timestamptz,
  approved_by text,
  -- Admin removed the written content (the comment text is cleared; the fact of the feedback stays).
  removed_at timestamptz,
  removed_by text,

  constraint review_feedback_something_given check (rating is not null or comments is not null or removed_at is not null),
  constraint review_feedback_consent_needs_comments check (not publish_consent or comments is not null or removed_at is not null),
  constraint review_feedback_consent_has_time check (not publish_consent or consent_at is not null),
  -- The publication invariant, enforced by the database and not only by the app.
  constraint review_feedback_approved_only_if_consented check (
    not approved or (publish_consent and comments is not null and removed_at is null)
  )
);

create index if not exists review_feedback_approved_idx on public.review_feedback (approved_at desc) where approved;

-- ------------------------------------------------------------------ suppressions

create table if not exists public.review_suppressions (
  email_lower text primary key check (email_lower = lower(email_lower) and char_length(email_lower) between 3 and 254),
  created_at timestamptz not null default now(),
  source text not null check (source in ('unsubscribe_link', 'admin')),
  request_id uuid references public.review_requests (id)
);

-- ------------------------------------------------------------------ access

alter table public.review_requests enable row level security;
alter table public.review_feedback enable row level security;
alter table public.review_suppressions enable row level security;

do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on public.review_requests from %I', r);
      execute format('revoke all on public.review_feedback from %I', r);
      execute format('revoke all on public.review_suppressions from %I', r);
    end if;
  end loop;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update on public.review_requests to service_role;
    grant select, insert, update on public.review_feedback to service_role;
    grant select, insert on public.review_suppressions to service_role;
  end if;
end
$$;

-- ------------------------------------------------------------------ functions

create or replace function public.review_create_request(
  p_kind text,
  p_engagement_id uuid,
  p_organization_id uuid,
  p_organisation_name text,
  p_recipient_name text,
  p_recipient_email text,
  p_token_hash text,
  p_unsubscribe_token_hash text,
  p_expires_at timestamptz,
  p_sent_by text
) returns table (outcome text, request_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_recipient_email));
  v_id uuid;
begin
  if exists (select 1 from public.review_suppressions s where s.email_lower = v_email) then
    return query select 'suppressed'::text, null::uuid;
    return;
  end if;

  insert into public.review_requests (
    engagement_kind, engagement_id, organization_id, organisation_name, recipient_name, recipient_email,
    token_hash, unsubscribe_token_hash, token_expires_at, sent_by
  ) values (
    p_kind, p_engagement_id, p_organization_id, p_organisation_name, btrim(p_recipient_name), v_email,
    p_token_hash, p_unsubscribe_token_hash, p_expires_at, p_sent_by
  )
  on conflict (engagement_kind, engagement_id, (lower(recipient_email))) do nothing
  returning id into v_id;

  if v_id is null then
    return query select 'duplicate'::text, null::uuid;
  else
    return query select 'created'::text, v_id;
  end if;
end;
$$;

create or replace function public.review_lookup(p_token_hash text)
returns table (state text, recipient_name text, organisation_name text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r public.review_requests;
begin
  select * into r from public.review_requests q where q.token_hash = p_token_hash;

  if not found then
    return query select 'invalid'::text, null::text, null::text;
  elsif r.status = 'submitted' then
    return query select 'submitted'::text, null::text, null::text;
  elsif r.status = 'withdrawn' then
    return query select 'withdrawn'::text, null::text, null::text;
  elsif r.status in ('queued', 'failed') then
    return query select 'invalid'::text, null::text, null::text;
  elsif r.token_expires_at <= now() then
    return query select 'expired'::text, null::text, null::text;
  else
    return query select 'open'::text, r.recipient_name, r.organisation_name;
  end if;
end;
$$;

create or replace function public.review_submit_feedback(
  p_token_hash text,
  p_rating smallint,
  p_comments text,
  p_publish_consent boolean,
  p_display_choice text
) returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r public.review_requests;
  v_comments text := nullif(btrim(coalesce(p_comments, '')), '');
  v_name text;
  v_org text;
begin
  -- Lock the request row: concurrent submits of one token serialise here, and only the first
  -- finds it still 'sent'.
  select * into r from public.review_requests q where q.token_hash = p_token_hash for update;

  if not found or r.status in ('queued', 'failed') then
    return 'invalid';
  elsif r.status = 'submitted' then
    return 'already_submitted';
  elsif r.status = 'withdrawn' then
    return 'withdrawn';
  elsif r.token_expires_at <= now() then
    return 'expired';
  end if;

  if p_rating is not null and (p_rating < 1 or p_rating > 5) then
    return 'invalid_input';
  end if;
  if v_comments is not null and char_length(v_comments) > 2000 then
    return 'invalid_input';
  end if;
  if p_rating is null and v_comments is null then
    return 'empty';
  end if;

  if coalesce(p_publish_consent, false) then
    if v_comments is null then
      return 'consent_needs_comments';
    end if;
    if p_display_choice is null or p_display_choice not in
       ('name_and_organisation', 'first_name_and_organisation', 'organisation_only', 'anonymous') then
      return 'invalid_input';
    end if;

    v_name := case p_display_choice
      when 'name_and_organisation' then r.recipient_name
      when 'first_name_and_organisation' then split_part(r.recipient_name, ' ', 1)
      else null end;
    v_org := case p_display_choice
      when 'anonymous' then null
      else r.organisation_name end;
  end if;

  insert into public.review_feedback (
    request_id, rating, comments, publish_consent, consent_at, display_choice, display_name, display_organisation
  ) values (
    r.id, p_rating, v_comments, coalesce(p_publish_consent, false),
    case when coalesce(p_publish_consent, false) then now() end,
    case when coalesce(p_publish_consent, false) then p_display_choice end,
    v_name, v_org
  );

  update public.review_requests set status = 'submitted', submitted_at = now() where id = r.id;
  return 'submitted';
end;
$$;

create or replace function public.review_unsubscribe(p_unsubscribe_token_hash text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r public.review_requests;
begin
  select * into r from public.review_requests q where q.unsubscribe_token_hash = p_unsubscribe_token_hash;
  if not found then
    return 'invalid';
  end if;

  insert into public.review_suppressions (email_lower, source, request_id)
  values (lower(btrim(r.recipient_email)), 'unsubscribe_link', r.id)
  on conflict (email_lower) do nothing;

  return 'unsubscribed';
end;
$$;

do $$
declare
  f text;
  r text;
begin
  foreach f in array array[
    'public.review_create_request(text, uuid, uuid, text, text, text, text, text, timestamptz, text)',
    'public.review_lookup(text)',
    'public.review_submit_feedback(text, smallint, text, boolean, text)',
    'public.review_unsubscribe(text)'
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
