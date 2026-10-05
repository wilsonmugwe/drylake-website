-- Client status lifecycle: allow ACTIVE / INACTIVE / ARCHIVED on public.organizations.status.
--
-- Written without access to the production schema (this repo has no prior migrations), so
-- it inspects the column first and handles both shapes:
--   * status is a Postgres ENUM  -> add the missing labels to that enum type
--   * status is text/varchar     -> replace any CHECK constraint on status with one that
--                                   allows exactly the three lifecycle values
-- Idempotent: safe to run more than once.
--
-- Until this is applied the app stays safe: POST /api/admin/clients/:id/status maps the
-- database rejection (23514 check_violation / 22P02 invalid enum input) to a clear
-- "requires migration" error, and nothing is written.
--
-- Review before applying: if the existing CHECK constraint allowed values other than
-- ACTIVE (e.g. PENDING), rows holding them are kept (the new constraint is added NOT VALID
-- and only validated when every row complies), but new writes of those values will be
-- refused. The app itself only ever writes ACTIVE, INACTIVE or ARCHIVED.

do $$
declare
  v_data_type text;
  v_udt_schema text;
  v_udt_name text;
  v_label text;
  v_constraint record;
  v_attnum smallint;
begin
  select c.data_type, c.udt_schema, c.udt_name
    into v_data_type, v_udt_schema, v_udt_name
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'organizations'
    and c.column_name = 'status';

  if v_data_type is null then
    raise exception 'public.organizations.status does not exist';
  end if;

  if v_data_type = 'USER-DEFINED' then
    foreach v_label in array array['ACTIVE', 'INACTIVE', 'ARCHIVED'] loop
      if not exists (
        select 1
        from pg_enum e
        join pg_type t on t.oid = e.enumtypid
        join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = v_udt_schema
          and t.typname = v_udt_name
          and e.enumlabel = v_label
      ) then
        execute format('alter type %I.%I add value %L', v_udt_schema, v_udt_name, v_label);
        raise notice 'Added % to enum %.%', v_label, v_udt_schema, v_udt_name;
      end if;
    end loop;

    return;
  end if;

  select a.attnum into v_attnum
  from pg_attribute a
  where a.attrelid = 'public.organizations'::regclass
    and a.attname = 'status'
    and not a.attisdropped;

  -- Drop every CHECK constraint that references only the status column.
  for v_constraint in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.organizations'::regclass
      and con.contype = 'c'
      and con.conkey = array[v_attnum]
      and con.conname <> 'organizations_status_lifecycle_check'
  loop
    execute format('alter table public.organizations drop constraint %I', v_constraint.conname);
    raise notice 'Dropped status constraint %', v_constraint.conname;
  end loop;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.organizations'::regclass
      and conname = 'organizations_status_lifecycle_check'
  ) then
    alter table public.organizations
      add constraint organizations_status_lifecycle_check
      check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')) not valid;
  end if;

  begin
    alter table public.organizations validate constraint organizations_status_lifecycle_check;
  exception when check_violation then
    raise notice 'Existing rows hold other status values; constraint left NOT VALID (enforced for new writes only).';
  end;
end
$$;

comment on column public.organizations.status is
  'Client lifecycle: ACTIVE (operational), INACTIVE (paused, no portal access), ARCHIVED (closed, hidden by default, restorable). See lib/clients/status.ts.';
