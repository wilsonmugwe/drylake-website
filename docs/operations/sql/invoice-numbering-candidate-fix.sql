-- =============================================================================
-- CANDIDATE FIX: atomic, constant-time invoice numbering (DL-YYYY-NNN)
--
-- DO NOT APPLY BLINDLY. Apply only if invoice-creation-diagnostics.sql shows the
-- existing generate_drylake_invoice_number() is the cause (for example it scans
-- the invoices table with max(), takes a table lock, loops on collisions, or
-- produces NULL). Review the existing function's FORMAT first and keep it: this
-- version produces DL-<year>-<3+ digit sequence>, e.g. DL-2026-009, which is the
-- format the admin UI describes.
--
-- Why this design:
--   * One counter row per year, incremented with INSERT ... ON CONFLICT DO UPDATE
--     ... RETURNING. That is a single row lock held only for the transaction, so
--     concurrent invoice inserts serialise on one tiny row instead of scanning or
--     locking the invoices table. Numbers never collide and never repeat.
--   * Gaps are possible if an insert later rolls back. That is normal and accepted
--     for invoice numbering (the number was consumed, not reused).
--   * The trigger only fills invoice_number when the insert did not supply one,
--     so existing rows and any manual numbering are untouched.
--   * The counter is seeded from the highest existing DL-<year>- number so the
--     sequence continues where it is today.
--
-- Rollback: drop trigger set_drylake_invoice_number on public.invoices; then
-- restore the previous function definition saved from diagnostics query 1c.
-- =============================================================================

begin;

create table if not exists public.invoice_number_counters (
  year integer primary key,
  last_value integer not null check (last_value >= 0)
);

-- Service role only; no client access.
alter table public.invoice_number_counters enable row level security;

-- Seed from existing numbers for every year already used (idempotent).
insert into public.invoice_number_counters (year, last_value)
select (regexp_match(invoice_number, '^DL-(\d{4})-(\d+)$'))[1]::int as year,
       max((regexp_match(invoice_number, '^DL-(\d{4})-(\d+)$'))[2]::int) as last_value
from public.invoices
where invoice_number ~ '^DL-\d{4}-\d+$'
group by 1
on conflict (year) do update
  set last_value = greatest(public.invoice_number_counters.last_value, excluded.last_value);

create or replace function public.generate_drylake_invoice_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_year integer := extract(year from (now() at time zone 'Australia/Perth'))::int;
  next_value integer;
begin
  insert into public.invoice_number_counters as c (year, last_value)
  values (current_year, 1)
  on conflict (year) do update set last_value = c.last_value + 1
  returning c.last_value into next_value;

  return format('DL-%s-%s', current_year, lpad(next_value::text, 3, '0'));
end;
$$;

create or replace function public.set_drylake_invoice_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invoice_number is null or btrim(new.invoice_number) = '' then
    new.invoice_number := public.generate_drylake_invoice_number();
  end if;

  return new;
end;
$$;

-- Replace any previous numbering trigger with this one. Check the trigger name
-- from diagnostics query 1b and drop the old one if it differs.
drop trigger if exists set_drylake_invoice_number on public.invoices;

create trigger set_drylake_invoice_number
before insert on public.invoices
for each row execute function public.set_drylake_invoice_number();

-- Numbers must be unique (no-op if a unique constraint/index already exists).
create unique index if not exists invoices_invoice_number_key
  on public.invoices (invoice_number);

commit;
