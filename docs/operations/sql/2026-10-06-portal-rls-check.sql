-- Client portal "Portal access pending": read-only check of the Supabase side.
-- Run in the Supabase SQL editor (production). Changes nothing. Returns no client data.
--
-- The repo does not contain the organisations RLS policies or current_clerk_org_id():
-- they exist only in the database. These queries show what the portal's RLS read runs
-- against, so the client.org_rls_miss log line (lib/supabase/rls-diagnostics.ts) can be
-- read against the real policy.

-- 1. Policies on the tables the portal reads. Look at `roles`:
--    {authenticated} means a Clerk token WITHOUT role=authenticated (anon) matches nothing.
select tablename, policyname, cmd, roles, permissive, qual
from pg_policies
where schemaname = 'public'
  and tablename in ('organizations', 'projects', 'invoices', 'documents', 'project_updates', 'milestones')
order by tablename, policyname;

-- 2. RLS enabled / forced on those tables.
select c.relname, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('organizations', 'projects', 'invoices', 'documents', 'project_updates', 'milestones');

-- 3. The org-claim function: schema, definition, and whether the API roles can execute it.
select n.nspname as schema, p.proname, p.prosecdef as security_definer,
       pg_get_functiondef(p.oid) as definition,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where p.proname = 'current_clerk_org_id';

-- 4. Table grants for the API roles on organizations (RLS only filters what a grant allows).
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'organizations'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;
