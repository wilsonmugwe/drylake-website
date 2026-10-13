# Free consultation booking: operations

Design and decisions: `docs/superpowers/specs/2026-10-13-consultation-booking-design.md`.

## The lifecycle

```
/consultation  -> POST /api/consultations          -> consultation_create_booking()
                                                       booking + CREATED event + outbox rows
                                                       (customer confirmation, 2 founder notices,
                                                        24h reminder) in ONE transaction
email link     -> /consultation/manage#t=<token>   -> POST /api/consultations/manage
                                                       view / cancel / reschedule (customer)
/admin/consultations[/id]                          -> POST /api/admin/consultations/[id]
                                                       reschedule / cancel / complete (admin)
outbox         -> after() on every change, pg_cron every minute, Vercel cron daily
                -> /api/cron/consultation-notifications -> Resend
```

Rules (Perth time): Monday, Tuesday, Friday; starts 9:00 am to 4:30 pm every 30 minutes; at least
2 hours' notice; up to 28 days ahead; at most 2 upcoming bookings per email address.
Change them in `lib/consultations/rules.ts` AND in the migration (a new migration), together.

## Before the first deploy (in this order)

1. **Apply the migration** `supabase/migrations/20261013120000_consultation_bookings.sql` to
   production (Supabase SQL editor or `supabase db push`). It is idempotent. Test it first:
   `bash tests/db/run-consultation-db-tests.sh` (throwaway Postgres in Docker).
2. **Set Vercel environment variables (Production):**
   - `CONSULTATION_TOKEN_SECRET`: 32+ random characters (`openssl rand -base64 48`).
   - `CRON_SECRET`: 32+ random characters (`openssl rand -hex 32`).
   - Optional `CONSULTATION_EMAIL_FROM` (defaults to EMAIL_FROM's address as "Drylake consultations").
   Without the first two, booking answers 503 with an email fallback and the dispatcher answers 401.
3. **Deploy.** `vercel.json` adds a daily cron (06:00 Perth) as a backstop.
4. **Schedule the minute trigger (mandatory)** with `docs/operations/sql/2026-10-13-consultation-dispatch-cron.sql`
   (pg_cron + pg_net, secret in Vault). Without it, reminders go out at the next booking change or
   the daily backstop, which is NOT "24 hours before" and often too late to send at all (a reminder
   due after the appointment has started is skipped). Liveness check, weekly or after any
   Supabase change: `select max(start_time) from cron.job_run_details where jobid = (select jobid from cron.job where jobname = 'drylake-consultation-dispatch');`
   must be within the last few minutes.
   If the Vercel project is on **Pro**, a `*/5 * * * *` Vercel cron is an alternative; on Hobby a
   sub-daily schedule fails the deployment.
5. **Vercel Firewall:** add a rate-limit rule for `/api/consultations` like the one on
   `/api/contact` (the in-app limiter is per instance only).
6. **Verify with a real booking** (see below), then cancel it.

## Verifying in production

- Book a slot with your own email. Expect: confirmation to you, a notice to wilson@ and
  benedict@ within a minute; the booking in `/admin/consultations`.
- Open the Manage link; reschedule; expect the "rescheduled" emails and the old link to stop working.
- Cancel; expect cancellation emails; the slot reappears on `/consultation`.
- `select kind, recipient, status, attempts, last_error from consultation_notifications order by created_at desc limit 20;`

## When emails do not arrive

1. `/admin/consultations/<id>` > Emails shows each email's status, attempts and last error.
2. `status = 'PENDING'` with attempts 0 and `send_after` in the past: nothing is dispatching.
   Check the pg_cron job (`cron.job_run_details`) and `CRON_SECRET`.
3. `last_error` like `validation_error: ... domain is not verified`: Resend configuration
   (`EMAIL_FROM`, domain verification), not code.
4. `FAILED` rows gave up after 8 attempts (about 8.5 hours of backoff). After fixing the cause,
   requeue: `update consultation_notifications set status = 'PENDING', attempts = 0, send_after = now() where status = 'FAILED';`
   Resend's idempotency key (the row's `event_key`) prevents a duplicate if one did go out within 24 hours.

## Security notes

- Tables have RLS on and no policies; `anon` and `authenticated` have no privileges. Only the
  service role (server routes and admin pages) reads them.
- Manage links: `HMAC(CONSULTATION_TOKEN_SECRET, id:version)`; the database holds only a SHA-256.
  Every reschedule revokes the previous link. Rotating the secret revokes all links (customers
  then use the email contact route).
- The token is in the URL fragment, never sent to the server in a URL, so it is not in Vercel
  logs. Vercel Analytics strips the fragment and skips the manage page entirely
  (`components/analytics/SiteAnalytics.tsx`). Never log request bodies on the manage route.
- **Keep Resend click tracking OFF** for the sending domain. A tracked link sends the full URL,
  fragment included, through Resend's redirector.
- Rotating `CONSULTATION_TOKEN_SECRET`: emails for existing bookings then go out WITHOUT a manage
  link (the dispatcher only includes a link whose hash matches the database), and old links stop
  working. Customers can still reply to the email. Rotate only when the secret may have leaked.
  Never point a preview deployment with a different secret at the production database.
- Accepted residual: a reminder that is already being sent when the customer reschedules or
  cancels (a window of up to about 2 minutes, the outbox lease) can still arrive. The history
  shows it. Everything queued for a superseded time is skipped at send time.

## Microsoft 365 calendars

Not connected. Availability is Supabase only, so a founder's personal calendar is NOT checked.
To add it later, subtract a Graph `getSchedule` busy list inside `loadAvailability()`
(`lib/consultations/service.ts`) and inside a pre-check in the create/reschedule routes; the
database stays authoritative for bookings.

## Rollback

- Code: revert the merge; the tables are harmless when unused.
- Stop emails immediately: `select cron.unschedule('drylake-consultation-dispatch');` and remove
  the cron from `vercel.json`.
- Data: never drop the tables with bookings in them (customers hold links to them). If the
  feature is withdrawn, cancel future bookings from the admin page so customers are told.
