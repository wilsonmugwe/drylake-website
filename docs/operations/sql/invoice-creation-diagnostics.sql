-- =============================================================================
-- Invoice creation diagnostics (Drylake)
--
-- Purpose: find out why creating a DRAFT invoice is slow and then fails.
-- The application code path is in the repo and instrumented (see the
-- "invoice.create" log line in Vercel logs). The one part NOT in the repo is the
-- database-side invoice numbering added in commit e1d8207
-- (generate_drylake_invoice_number()). These queries show what it actually does.
--
-- How to run: Supabase Dashboard -> SQL Editor. Run SECTION 1 queries one at a
-- time. They are READ-ONLY. Paste the results back to the developer.
-- SECTION 2 is an optional timed test that rolls back; run only if asked.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- SECTION 1 (read-only)
-- ---------------------------------------------------------------------------

-- 1a. Columns of public.invoices: is invoice_number NOT NULL, and what is its default?
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'invoices'
order by ordinal_position;

-- 1b. Triggers on public.invoices (a BEFORE INSERT trigger usually assigns the number).
select tgname as trigger_name,
       pg_get_triggerdef(t.oid) as definition,
       tgenabled as enabled
from pg_trigger t
where t.tgrelid = 'public.invoices'::regclass
  and not t.tgisinternal;

-- 1c. Source of every function whose name mentions invoice numbering.
select p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.provolatile as volatility,
       p.prosecdef as security_definer,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (p.proname ilike '%invoice%number%' or p.proname ilike '%drylake_invoice%');

-- 1d. Constraints and indexes on public.invoices (unique invoice_number? status CHECK?).
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.invoices'::regclass;

select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'invoices';

-- 1e. Any counter/sequence table the function might lock (names containing "invoice").
select table_schema, table_name, table_type
from information_schema.tables
where table_schema = 'public' and table_name ilike '%invoice%';

select sequence_schema, sequence_name
from information_schema.sequences
where sequence_name ilike '%invoice%';

-- 1f. Is anything currently waiting on a lock involving invoices? (Run while a create
--     is hanging, if it reproduces.)
select a.pid, a.state, a.wait_event_type, a.wait_event,
       now() - a.query_start as running_for,
       left(a.query, 200) as query
from pg_stat_activity a
where a.datname = current_database()
  and a.state <> 'idle'
  and (a.query ilike '%invoice%' or a.wait_event_type = 'Lock')
order by a.query_start;

-- 1g. Database timeouts that apply to API requests (anon/authenticated/service_role).
select rolname, rolconfig
from pg_roles
where rolname in ('anon', 'authenticated', 'service_role', 'authenticator', 'postgres');

-- 1h. Recent invoice numbers, to check the sequence is consistent (no PII).
select invoice_number, status, created_at
from public.invoices
order by created_at desc
limit 10;


-- ---------------------------------------------------------------------------
-- SECTION 2 (optional, writes then ROLLS BACK; may consume one number if the
-- function uses a sequence). Shows how long the numbering takes on its own.
-- Replace <ACTIVE_ORGANIZATION_UUID> with a real active organisation id.
-- ---------------------------------------------------------------------------
-- begin;
-- set local statement_timeout = '20s';
-- explain (analyze, buffers, timing)
-- insert into public.invoices
--   (organization_id, status, currency, subtotal_cents, tax_cents, total_cents, visible_to_client)
-- values
--   ('<ACTIVE_ORGANIZATION_UUID>', 'DRAFT', 'AUD', 100, 0, 100, false);
-- rollback;
