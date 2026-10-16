#!/usr/bin/env bash
# Runs the consultation booking migration and its database tests against a throwaway
# Postgres 17 container (Supabase runs Postgres 15/17; nothing here is version-specific).
#
#   bash tests/db/run-consultation-db-tests.sh        (needs Docker; never touches production)
#
# 1. Creates the Supabase roles (anon, authenticated, service_role) the migration grants against.
# 2. Applies every migration in supabase/migrations that does not need the production schema.
# 3. Applies the two consultation migrations TWICE each (they must be re-runnable).
# 4. Runs tests/db/consultation-bookings.sql, consultation-representatives.sql and consultation-health.sql (assertions;
#    any failure stops the run).
# 5. Races 20 concurrent bookings for one slot with two representatives: exactly two may succeed,
#    one per representative.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NAME="drylake-consultation-test-pg"
MIGRATION="$ROOT/supabase/migrations/20261013120000_consultation_bookings.sql"
REPS_MIGRATION="$ROOT/supabase/migrations/20261014090000_consultation_representatives.sql"

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
psql_run < "$REPS_MIGRATION"
psql_run < "$REPS_MIGRATION"

echo "== assertions"
psql_run < "$ROOT/tests/db/consultation-bookings.sql" 2>&1 | sed 's/^psql:<stdin>:[0-9]*: NOTICE:  /  /'
psql_run < "$ROOT/tests/db/consultation-representatives.sql" 2>&1 | sed 's/^psql:<stdin>:[0-9]*: NOTICE:  /  /'
psql_run < "$ROOT/tests/db/consultation-health.sql" 2>&1 | sed 's/^psql:<stdin>:[0-9]*: NOTICE:  /  /'

echo "== concurrency: 20 simultaneous bookings for one slot, two representatives"
SLOT_SQL="((date_trunc('week', now() at time zone 'Australia/Perth') + interval '21 days') + time '13:30') at time zone 'Australia/Perth'"
for i in $(seq 1 20); do
  docker exec "$NAME" psql -U postgres -tA -c "set role service_role; select outcome from public.consultation_create_booking(gen_random_uuid(), gen_random_uuid(), 'DL-RACE$i', 'Racer', 'racer$i@example.com', null, null, 'race', $SLOT_SQL, md5('$i') || md5('x$i'), array['wilson@drylake.com.au'], 'TEAMS', array['wilson','benedict'])" > "/tmp/drylake-race-$i.txt" 2>&1 &
done
wait

created=$(cat /tmp/drylake-race-*.txt | grep -c '^created$' || true)
taken=$(cat /tmp/drylake-race-*.txt | grep -c '^slot_taken$' || true)
rm -f /tmp/drylake-race-*.txt
rows=$(docker exec "$NAME" psql -U postgres -tA -c "select count(*) from public.consultation_bookings where reference like 'DL-RACE%'")
echo "  created=$created slot_taken=$taken rows=$rows"
reps=$(docker exec "$NAME" psql -U postgres -tA -c "select count(distinct assigned_representative) from public.consultation_bookings where reference like 'DL-RACE%'")
if [ "$created" != "2" ] || [ "$taken" != "18" ] || [ "$rows" != "2" ] || [ "$reps" != "2" ]; then
  echo "FAIL: concurrent bookings must produce exactly one reservation per representative"
  exit 1
fi
echo "  ok  exactly two of 20 concurrent bookings succeeded, one per representative"

echo "== concurrency: 6 simultaneous bookings for one email at different times (limit 2)"
for i in $(seq 1 6); do
  SLOT="((date_trunc('week', now() at time zone 'Australia/Perth') + interval '22 days') + time '09:00' + interval '$((i * 30)) minutes') at time zone 'Australia/Perth'"
  docker exec "$NAME" psql -U postgres -tA -c "set role service_role; select outcome from public.consultation_create_booking(gen_random_uuid(), gen_random_uuid(), 'DL-LIM00$i', 'Limit', 'limit@example.com', null, null, 'x', $SLOT, md5('l$i') || md5('m$i'), array[]::text[], 'TEAMS', array['wilson','benedict'])" > "/tmp/drylake-limit-$i.txt" 2>&1 &
done
wait
active=$(docker exec "$NAME" psql -U postgres -tA -c "select count(*) from public.consultation_bookings where customer_email = 'limit@example.com' and status in ('CONFIRMED','RESCHEDULED')")
cat /tmp/drylake-limit-*.txt | sort | uniq -c | sed 's/^/  /'
rm -f /tmp/drylake-limit-*.txt
if [ "$active" != "2" ]; then
  echo "FAIL: the per-email limit allowed $active upcoming bookings"
  exit 1
fi
echo "  ok  per-email limit holds under concurrency (2 of 6)"

echo "ALL DATABASE TESTS PASSED"
