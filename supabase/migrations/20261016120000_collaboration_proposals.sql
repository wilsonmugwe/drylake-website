-- Collaborate With Drylake: inbound collaboration proposals (/collaborate).
--
-- One table. The public form writes through the service-role API route
-- (app/api/collaboration/route.ts); the admin pages read and update through service-role
-- routes after the platform-admin check. Nothing here is reachable from a browser session.
--
-- Access: RLS on, no policies, privileges revoked from anon and authenticated, service_role
-- only. internal_notes are written and read server-side only and are never selected by any
-- public code path.
--
-- Re-runnable: create ... if not exists / create or replace, guarded constraints.

create table if not exists public.collaboration_proposals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  organisation text not null check (char_length(organisation) between 1 and 160),
  email text not null check (char_length(email) between 3 and 254 and email like '%_@_%'),
  category text not null check (category in (
    'technology',
    'product_development',
    'business_partnership',
    'pilot_project',
    'integration',
    'research_innovation',
    'supplier_service_provider',
    'other'
  )),
  -- 'abbicare' is storable so an owner decision to enable it needs no migration, but the app
  -- only offers and accepts it while COLLABORATION_ABBICARE_ENABLED is true.
  project text not null check (project in ('drylake', 'bronnie', 'abbicare', 'other')),
  summary text not null check (char_length(summary) between 20 and 3000),
  website text check (website is null or char_length(website) <= 200),
  -- When the submitter ticked the privacy acknowledgement. Set by the server, never the client.
  consent_at timestamptz not null,
  status text not null default 'new' check (status in ('new', 'under_review', 'contacted', 'accepted', 'declined')),
  internal_notes text check (internal_notes is null or char_length(internal_notes) <= 5000),
  updated_at timestamptz not null default now(),
  -- Clerk user id of the platform admin who last changed the row; null while untouched.
  updated_by text
);

create index if not exists collaboration_proposals_status_created_idx
  on public.collaboration_proposals (status, created_at desc);
create index if not exists collaboration_proposals_project_created_idx
  on public.collaboration_proposals (project, created_at desc);

create or replace function public.collaboration_proposals_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists collaboration_proposals_touch on public.collaboration_proposals;
create trigger collaboration_proposals_touch
  before update on public.collaboration_proposals
  for each row execute function public.collaboration_proposals_touch();

-- ------------------------------------------------------------------ access

alter table public.collaboration_proposals enable row level security;

do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on public.collaboration_proposals from %I', r);
    end if;
  end loop;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update on public.collaboration_proposals to service_role;
  end if;
end
$$;

revoke all on function public.collaboration_proposals_touch() from public;
