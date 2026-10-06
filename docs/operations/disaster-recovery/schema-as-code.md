# Schema as code

## The problem

Ten tables, the RLS policies, `current_clerk_org_id()`, the invoice-numbering function, grants
and the `client-documents` bucket were created in the Supabase dashboard. Git holds one
migration (`20261005120000_client_status_lifecycle.sql`). If the project were lost, nobody could
rebuild it from the repo, and RLS (the tenant boundary) cannot be reviewed in a pull request.

## Why we did not write the baseline by hand

A baseline typed from documentation would be a guess that looks authoritative. One wrong policy
in a hand-written baseline would silently weaken tenant isolation on the next rebuild. The
baseline must come from a **real dump of production**.

## Producing the baseline (Wilson, read-only on production)

```bash
export SUPABASE_DB_URL='<session pooler connection string>'
supabase db dump --db-url "$SUPABASE_DB_URL" --schema public -f public-schema.sql
unset SUPABASE_DB_URL
```

Then, in a branch:

1. Save it as `supabase/migrations/<timestamp earlier than 20261005120000>_baseline.sql`, for
   example `20261001000000_baseline.sql`, so it sorts before the lifecycle migration.
2. Add the bucket, which lives in `storage.buckets`, not the public schema:
   ```sql
   insert into storage.buckets (id, name, public) values ('client-documents', 'client-documents', false)
   on conflict (id) do nothing;
   ```
   plus any `storage.objects` policies (capture them with
   `supabase db dump --schema storage` and keep only the policy statements).
3. Read the file before committing: no data rows, no secrets, no `auth` schema objects.
4. `node scripts/check-migrations.mjs` must print `status: OK`. If it lists a missing object, the
   dump missed it (often a function in another schema): add it, do not delete the check.
5. Mark the baseline as already applied on production so it is never re-run there:
   `supabase migration repair --status applied <timestamp>` (with the CLI linked to the project).

## The CI check

`.github/workflows/schema.yml` runs `scripts/check-migrations.mjs` on every pull request and
push to `main`:

- **Now (no baseline):** reports the 12 missing objects and passes. The gap is known and recorded.
- **After the baseline lands:** fails if any table, RPC or storage bucket used by the app is not
  defined by a committed migration. A table added in the dashboard without a migration becomes a
  red build, which is the drift we want to catch.

The check reads files only. It cannot detect a policy changed in the dashboard; the monthly
`rls-inventory.sql` comparison (`runbooks.md`, post-incident) covers that.

## Rule from now on

Every schema change ships as a migration file in the same PR as the code that needs it. The
dashboard SQL editor is for read-only diagnostics.
