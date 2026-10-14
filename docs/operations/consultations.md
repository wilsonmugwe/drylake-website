# Free consultation booking: operations

Design and decisions: `docs/superpowers/specs/2026-10-13-consultation-booking-design.md` and, for
representatives, Teams or phone and Microsoft 365, `docs/superpowers/specs/2026-10-14-consultation-m365-design.md`.

## Production status check (do this first)

```
curl -s https://drylake.com.au/api/health                          # missingRequired must be 0
curl -s https://drylake.com.au/api/consultations/availability | head -c 300
```

Availability answers 503 with a `code`:
- `store_unavailable`: the database refused. On 14 Oct 2026 production answered 503 here; the
  availability path touches only the database (no secret), so the cause is almost certainly that
  **the consultation migration was never applied to production** (`consultation_busy_slots` does
  not exist). Confirm in the Vercel function log: the line `Consultation availability failed:
  busy slots: PGRST202 ...` means "function not found". Apply both migrations (step 1 below).
- `calendar_unavailable`: Microsoft 365 is switched on (`CONSULTATION_CALENDAR_PROVIDER=microsoft`)
  but could not be read. The site offers NO times rather than unverified ones. See
  "Microsoft 365" below; switching the variable back to `none` restores Drylake-only availability.

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
2 hours' notice; up to 28 days ahead; at most 2 upcoming bookings per email address; customers can
change or cancel online until 2 hours before the start (admins any time).

Representatives: Wilson and Benedict (`lib/consultations/representatives.ts` + the CHECK in
`20261014090000`). A time is offered when at least one of them is free. Each booking is assigned
to one: fewest upcoming consultations first, then Wilson before Benedict. No representative ever
holds two consultations at once (database exclusion constraint). A reschedule keeps the same
representative when they are free at the new time and reassigns otherwise.
Change them in `lib/consultations/rules.ts` AND in the migration (a new migration), together.

## Before the first deploy (in this order)

1. **Apply BOTH migrations, in order,** to production (Supabase SQL editor or `supabase db push`):
   `supabase/migrations/20261013120000_consultation_bookings.sql`, then
   `supabase/migrations/20261014090000_consultation_representatives.sql` (needs the `btree_gist`
   extension, which it creates in the `extensions` schema). Each is re-runnable on its own; never
   re-run the first after the second. Test both first: `bash tests/db/run-consultation-db-tests.sh`
   (throwaway Postgres in Docker, 127 assertions and two concurrency races).
2. **Set Vercel environment variables (Production):**
   - `CONSULTATION_TOKEN_SECRET`: 32+ random characters (`openssl rand -base64 48`).
   - `CRON_SECRET`: 32+ random characters (`openssl rand -hex 32`).
   - Optional `CONSULTATION_EMAIL_FROM` (defaults to EMAIL_FROM's address as "Drylake consultations").
   - `CONSULTATION_CALENDAR_PROVIDER`: leave unset (`none`) for the first deploy. Turn on Microsoft
     365 only after the setup and go-live checks below.
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

**Off by default** (`CONSULTATION_CALENDAR_PROVIDER` unset or `none`). In that mode availability
comes from Drylake bookings only, nothing is written to Outlook, Teams customers are told "we will
email your Teams link", founders' notices name the method and representative, and the admin page
says "Calendar integration is off: add this consultation to the calendar by hand". Bookings made
in this mode stay queued for the calendar and are synced (future ones only) once it is switched on.

### What it does when on (`microsoft`)

| When | Graph call | Mailbox |
|---|---|---|
| Booking page loads (cached 60 s per instance) | `POST /users/{rep}/calendar/getSchedule` for both mailboxes, 4 weeks | both |
| Booking / reschedule (customer or admin) | the same, for the exact 30 minutes, uncached | both |
| After a booking commits | `POST /users/{rep}/events` with the customer as attendee; Teams: `isOnlineMeeting` so Exchange creates the Teams meeting and emails the invitation; Phone: location and body name the number | assigned |
| Reschedule, same representative | `PATCH` start/end only (never the body: that can strip the Teams link) | assigned |
| Reschedule, reassigned | `POST .../cancel` on the old organizer, new event on the new one | both |
| Cancellation | `POST /users/{rep}/events/{id}/cancel` (customer gets Exchange's cancellation) | owner |
| Crash recovery | `GET .../events?$filter=` by the booking-id extended property before any create | both |

Calendar work is a durable queue on the booking row (state PENDING / SYNCED / FAILED). It runs
right after each change and from the minute cron; failures back off 1, 2, 4 ... 60 minutes, and
after 10 attempts the booking is FAILED, both founders get "Action Needed: Calendar Sync Failed",
and the admin page shows **Retry calendar sync**. A Teams confirmation email waits up to 10 minutes
for the join link, then goes without it (it points at the calendar invitation).

Busy means `busy`, `tentative`, `oof` and `unknown`; `free` and `workingElsewhere` are free. A
mailbox Graph cannot read counts as busy, and if neither can be read the site shows the "could
not load" error, never unverified times.

### Microsoft 365 setup (Ben or Wilson, tenant admin; about 30 minutes)

Least privilege: ONE Exchange role scoped to the two consultation mailboxes. Nothing else.

1. **Entra admin center > App registrations > New registration**: name "Drylake consultation
   calendar", single tenant, no redirect URI. Note the **Application (client) ID** and
   **Directory (tenant) ID**.
2. **Certificates & secrets > New client secret**, 12 months. Copy the value once. Put the expiry
   date on the calendar (a lapsed secret = every calendar call fails = no times offered).
3. **Do NOT grant any Microsoft Graph API permission** in Entra. If one was added, remove it:
   Entra grants and Exchange RBAC add together, so a tenant-wide `Calendars.*` grant would cancel
   the scoping below.
4. Exchange Online PowerShell (`Connect-ExchangeOnline` as an Exchange admin):

   ```powershell
   # Enterprise applications > the app > Object ID (NOT the App registrations object id)
   New-ServicePrincipal -AppId <client-id> -ObjectId <enterprise-app-object-id> -DisplayName "Drylake consultation calendar"
   New-ManagementScope -Name "Drylake consultation mailboxes" `
     -RecipientRestrictionFilter "PrimarySmtpAddress -eq 'wilson@drylake.com.au' -or PrimarySmtpAddress -eq 'benedict@drylake.com.au'"
   New-ManagementRoleAssignment -App <client-id> -Role "Application Calendars.ReadWrite" `
     -CustomResourceScope "Drylake consultation mailboxes"
   Test-ServicePrincipalAuthorization -Identity <client-id> -Resource wilson@drylake.com.au      # InScope True
   Test-ServicePrincipalAuthorization -Identity <client-id> -Resource someone-else@drylake.com.au # InScope False
   ```

   Changes can take 30 minutes to 2 hours to apply (Exchange caches them).
5. Both mailboxes need an **Exchange Online licence** and Teams for the Teams option. (Note from
   drylake-ops: the tenant is a trial and the paid subscription from 2 Nov has ONE licence for two
   users. An unlicensed mailbox cannot be read, so that representative would never be offered.)
6. Vercel (Production): `MS_GRAPH_TENANT_ID`, `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_CLIENT_SECRET`, then
   `CONSULTATION_CALENDAR_PROVIDER=microsoft`, redeploy. The secret never reaches the browser.

### Microsoft 365 go-live checks (none of these has been run against the real tenant)

1. `/consultation` loads times; block an hour in Wilson's Outlook and confirm that hour still shows
   only if Benedict is free; block both and confirm it disappears (within 60 s).
2. Book a **Teams** consultation with an outside address (e.g. a Gmail): the event appears in the
   assigned mailbox with a Teams link; the customer receives Exchange's invitation AND the Drylake
   confirmation with the "Join Microsoft Teams Meeting" button. Microsoft documents the join link
   in the create response for delegated calls; app-only Teams creation is not documented as such,
   so this is the check that proves it on this tenant.
3. Book a **phone** consultation: event with "Phone call to <number>", no Teams link.
4. Reschedule from the email link: event moves (no second event), customer gets an update.
5. Reschedule into a time only the other representative has free: old invitation cancelled, new
   one sent by the other mailbox, admin history says "reassigned".
6. Cancel: customer gets Exchange's cancellation and Drylake's email; the slot reappears.
7. Out of scope stays out of scope: `getSchedule` for a third mailbox must fail (step 4 above).
8. Outbound from a new tenant can bounce with `5.7.708` (seen from a connector on this tenant,
   13 Oct). If Exchange invitations bounce, the Drylake (Resend) emails still carry the details.

## Rollback

- Microsoft 365 misbehaving: set `CONSULTATION_CALENDAR_PROVIDER=none` and redeploy. Booking keeps
  working on Drylake bookings alone; queued calendar work waits.
- Code: revert the merge; the tables are harmless when unused.
- Stop emails immediately: `select cron.unschedule('drylake-consultation-dispatch');` and remove
  the cron from `vercel.json`.
- Data: never drop the tables with bookings in them (customers hold links to them). If the
  feature is withdrawn, cancel future bookings from the admin page so customers are told.
