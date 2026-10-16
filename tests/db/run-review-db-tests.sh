#!/usr/bin/env bash
# Runs the review_requests migration and its assertions against a throwaway Postgres 17
# container, then races the two operations that must stay correct under concurrency.
# Same harness shape as run-consultation-db-tests.sh; never touches production.
#
#   bash tests/db/run-review-db-tests.sh        (needs Docker)
#
# 1. Creates the Supabase roles the migration grants against.
# 2. Applies the migration twice (it must be re-runnable).
# 3. Runs tests/db/review-requests.sql.
# 4. Races 20 simultaneous submissions of ONE token: exactly one may succeed.
# 5. Races 10 simultaneous requests for one recipient and engagement: exactly one may be created.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NAME="drylake-review-test-pg"
MIGRATION="$ROOT/supabase/migrations/20261016140000_review_requests.sql"

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
psql_run < "$ROOT/tests/db/review-requests.sql" 2>&1 | sed 's/^psql:<stdin>:[0-9]*: NOTICE:  /  /'

echo "== concurrency: 20 simultaneous submissions of one token"
H1="$(printf 'racetoken' | md5sum | cut -d' ' -f1)$(printf 'racetokenx' | md5sum | cut -d' ' -f1)"
H2="$(printf 'raceunsub' | md5sum | cut -d' ' -f1)$(printf 'raceunsubx' | md5sum | cut -d' ' -f1)"
docker exec "$NAME" psql -U postgres -tA -c "set role service_role; select outcome from public.review_create_request('project', gen_random_uuid(), null, 'Race Pty Ltd', 'Racer', 'race@example.com', '$H1', '$H2', now() + interval '1 day', 'user_admin')" >/dev/null
docker exec "$NAME" psql -U postgres -tA -c "update public.review_requests set status = 'sent' where token_hash = '$H1'" >/dev/null
for i in $(seq 1 20); do
  docker exec "$NAME" psql -U postgres -tA -c "set role service_role; select public.review_submit_feedback('$H1', 5::smallint, 'racer $i', false, null)" > "/tmp/drylake-review-race-$i.txt" 2>&1 &
done
wait
submitted=$(cat /tmp/drylake-review-race-*.txt | grep -c '^submitted$' || true)
already=$(cat /tmp/drylake-review-race-*.txt | grep -c '^already_submitted$' || true)
rm -f /tmp/drylake-review-race-*.txt
rows=$(docker exec "$NAME" psql -U postgres -tA -c "select count(*) from public.review_feedback f join public.review_requests r on r.id = f.request_id where r.token_hash = '$H1'")
echo "  submitted=$submitted already_submitted=$already feedback_rows=$rows"
if [ "$submitted" != "1" ] || [ "$already" != "19" ] || [ "$rows" != "1" ]; then
  echo "FAIL: a token must be spendable exactly once under concurrency"
  exit 1
fi
echo "  ok  exactly one of 20 concurrent submissions succeeded"

echo "== concurrency: 10 simultaneous requests for one recipient and engagement"
ENG="99999999-9999-4999-8999-999999999999"
for i in $(seq 1 10); do
  A="$(printf "dup$i" | md5sum | cut -d' ' -f1)$(printf "dupx$i" | md5sum | cut -d' ' -f1)"
  B="$(printf "dupu$i" | md5sum | cut -d' ' -f1)$(printf "dupux$i" | md5sum | cut -d' ' -f1)"
  docker exec "$NAME" psql -U postgres -tA -c "set role service_role; select outcome from public.review_create_request('project', '$ENG', null, 'Dup Pty Ltd', 'Dup', 'dup@example.com', '$A', '$B', now() + interval '1 day', 'user_admin')" > "/tmp/drylake-review-dup-$i.txt" 2>&1 &
done
wait
created=$(cat /tmp/drylake-review-dup-*.txt | grep -c '^created$' || true)
dupes=$(cat /tmp/drylake-review-dup-*.txt | grep -c '^duplicate$' || true)
rm -f /tmp/drylake-review-dup-*.txt
rows=$(docker exec "$NAME" psql -U postgres -tA -c "select count(*) from public.review_requests where engagement_id = '$ENG'")
echo "  created=$created duplicate=$dupes rows=$rows"
if [ "$created" != "1" ] || [ "$dupes" != "9" ] || [ "$rows" != "1" ]; then
  echo "FAIL: the duplicate guard must hold under concurrency"
  exit 1
fi
echo "  ok  exactly one of 10 concurrent requests was created"

echo "ALL REVIEW DATABASE TESTS PASSED"
