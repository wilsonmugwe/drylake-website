#!/usr/bin/env bash
# Runs the collaboration_proposals migration and its assertions against a throwaway Postgres 17
# container. Same harness shape as run-consultation-db-tests.sh; never touches production.
#
#   bash tests/db/run-collaboration-db-tests.sh        (needs Docker)
#
# The migration is applied twice (it must be re-runnable), then tests/db/collaboration-proposals.sql
# asserts RLS, privileges, constraints and the updated_at trigger.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NAME="drylake-collaboration-test-pg"
MIGRATION="$ROOT/supabase/migrations/20261016120000_collaboration_proposals.sql"

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test --tmpfs /var/lib/postgresql/data postgres:17 >/dev/null

for _ in $(seq 1 60); do
  if docker exec "$NAME" pg_isready -U postgres -q 2>/dev/null; then break; fi
  sleep 1
done
sleep 1

psql_run() { docker exec -i "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q "$@"; }

psql_run <<'SQL'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
SQL

echo "== apply migration (twice: must be idempotent)"
psql_run < "$MIGRATION"
psql_run < "$MIGRATION"

echo "== assertions"
psql_run < "$ROOT/tests/db/collaboration-proposals.sql" 2>&1 | sed 's/^psql:<stdin>:[0-9]*: NOTICE:  /  /'

echo "ALL COLLABORATION DATABASE TESTS PASSED"
