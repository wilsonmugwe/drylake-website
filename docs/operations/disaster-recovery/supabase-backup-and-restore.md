# Supabase backups and a safe restore test

## What Supabase provides (from the Supabase docs, read 2026-10-06)

Source: https://supabase.com/docs/guides/platform/backups and
https://supabase.com/docs/guides/platform/clone-project

| Plan | Automatic backups | Retention |
|---|---|---|
| Free | **None.** Supabase recommends regular `db dump` exports kept off-site | n/a |
| Pro | Daily | 7 days |
| Team | Daily | 14 days |
| Enterprise | Daily | up to 30 days |

- **PITR** is an add-on for Pro, Team and Enterprise and needs at least the Small compute add-on.
  About US$100/month for 7 days, US$200 for 14, US$400 for 28. Worst-case RPO two minutes.
- **Storage objects are not in database backups** ("the database only includes metadata about
  these objects").
- **Restoring into the same project takes it offline** for the duration.
- **Restore to a new project** (paid plans with physical backups) copies schema, data, roles and
  auth data; it does NOT copy storage objects, edge functions, auth settings, API keys, or
  realtime settings. A clone cannot itself be cloned.
- **Physical backups are not downloadable.** The only off-site copy is one we take ourselves.

**Drylake's plan is unverified.** Wilson: Dashboard > Organization > Billing shows the plan;
Project > Database > Backups shows whether daily backups exist and their dates (W1). Do not
upgrade or enable PITR without a decision recorded in `decisions.md`.

## Off-site logical dump (the backup we control)

Run from a trusted machine with the Supabase CLI installed. Use the **Session pooler**
connection string from Project > Connect (it contains the database password; paste it into the
shell only, never into a file in the repo).

```bash
export SUPABASE_DB_URL='postgresql://postgres.<PROJECT-REF>:<PASSWORD>@<POOLER-HOST>:5432/postgres'
stamp=$(date +%Y%m%d)
supabase db dump --db-url "$SUPABASE_DB_URL" -f "drylake-roles-$stamp.sql" --role-only
supabase db dump --db-url "$SUPABASE_DB_URL" -f "drylake-schema-$stamp.sql"
supabase db dump --db-url "$SUPABASE_DB_URL" -f "drylake-data-$stamp.sql" --use-copy --data-only \
  -x "storage.buckets_vectors" -x "storage.vector_indexes"
unset SUPABASE_DB_URL
```

Storage objects, separately (one-off Node script with the service key, or the dashboard): download
every object in `client-documents`, keeping paths.

**Where it goes:** an encrypted folder outside the repo (the data dump contains client names,
invoices and audit history: it is client data, AU-hosted only). Never commit a data dump.
**Cadence:** weekly while on the Free plan; monthly once Pro daily backups are confirmed.

## Restore test (never against production)

Goal: prove a backup actually restores into a working copy of the app.

1. **Create an isolated target.** A new Supabase project in ap-southeast-2 named
   `drylake-restore-test-YYYYMMDD` (Free plan is enough for a test), or, on a paid plan,
   "Restore to a new project" from the latest backup. Never point at the production project ref.
2. **Load the dump** (skip if you used restore-to-new-project):
   ```bash
   psql --single-transaction --variable ON_ERROR_STOP=1 \
     --file drylake-roles-YYYYMMDD.sql --file drylake-schema-YYYYMMDD.sql \
     --command 'SET session_replication_role = replica' \
     --file drylake-data-YYYYMMDD.sql \
     --dbname "$RESTORE_TEST_DB_URL"
   ```
3. **Schema verification.** Run `docs/security/sql/rls-inventory.sql` on both production and
   the restored copy; the policy, grant and function lists must match line for line.
4. **Critical table checks.** On both, compare:
   ```sql
   select 'organizations', count(*) from organizations union all
   select 'projects', count(*) from projects union all
   select 'invoices', count(*) from invoices union all
   select 'invoices_paid', count(*) from invoices where status = 'PAID' union all
   select 'audit_logs', count(*) from audit_logs;
   select max(invoice_number) from invoices;
   ```
   Counts equal (or equal as of the backup time); the highest invoice number matches.
5. **Application compatibility.** Run the app locally (`npm run dev`) with
   `NEXT_PUBLIC_SUPABASE_URL` / keys of the TEST project and a Clerk development instance. Sign in
   as a test admin, open Admin > Clients and one invoice. The page loads with no database errors.
6. **Record the result** in `decisions.md` (date, backup used, time taken = the real RTO), then
   **delete the test project** (it holds a copy of client data).

Result for this PR: **not run** (needs Supabase access; W3). The procedure is ready.
