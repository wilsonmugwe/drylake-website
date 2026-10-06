-- Drylake RLS and grants inventory. READ ONLY: every statement is a SELECT.
-- Run in the Supabase SQL editor (production), section by section, and save each result
-- grid as CSV into the PR 2 review thread. Nothing here changes the database.
--
-- Why: the repo holds one migration only, so RLS policies, grants and functions exist only
-- in Supabase. The repo cannot prove tenant isolation at the database layer; these results
-- can. Compare them with the expected matrix in docs/security/rls-and-tenant-isolation.md.

-- 1. RLS status of every application table (expect rls_enabled = true for all of them).
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;

-- 2. Every policy on public tables: who it applies to, which command, and its conditions.
select tablename, policyname, permissive, roles, cmd,
       qual as using_expression,
       with_check as check_expression
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;

-- 3. Table privileges for the API roles. anon should hold nothing on client data.
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated')
group by table_name, grantee
order by table_name, grantee;

-- 4. Storage: the client-documents bucket must be private (public = false).
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
order by name;

-- 5. Storage policies (expect none that let anon or authenticated read client-documents;
--    clients get files only through 60-second signed URLs minted server-side).
select policyname, roles, cmd, qual as using_expression, with_check as check_expression
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

-- 6. SECURITY DEFINER functions callable by API roles: each one bypasses RLS when called,
--    so each needs a reason (the invoice-numbering function is expected here).
select p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'execute') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.prosecdef desc, p.proname;

-- 7. Views in public: a view without security_invoker runs as its owner and can bypass RLS.
select c.relname as view_name,
       coalesce((select option_value from pg_options_to_table(c.reloptions)
                 where option_name = 'security_invoker'), 'false') as security_invoker
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'v'
order by c.relname;

-- 8. How policies identify the caller: expect current_clerk_org_id() (reads the Clerk org
--    claim, `o.id` or `org_id`, from the signed JWT), never a column the client can write.
select tablename, policyname,
       (coalesce(qual, '') || coalesce(with_check, '')) ilike '%current_clerk_org_id%' as uses_org_claim_fn,
       (coalesce(qual, '') || coalesce(with_check, '')) ilike '%auth.jwt()%' as reads_jwt_directly
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 9. The org-claim function itself (definition, definer rights, who may execute it).
select p.proname, p.prosecdef as security_definer, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where p.proname = 'current_clerk_org_id';
