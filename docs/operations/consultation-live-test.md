# Consultation booking: live end-to-end test runbook

For the **owner** (Ben) and the **operator** (Wilson, or whoever holds Vercel and Supabase access).
Companion to `docs/operations/consultations.md`, which explains how the system works. This file
says how to prove it works, in production, with real Microsoft 365 and real email, without
touching anything a customer could see.

> **Nothing in this runbook has been run.** Every expected result below is derived from the code
> and from Microsoft's documentation. The results table at the end is empty on purpose. Until a
> row says `production-verified` with a date and evidence, treat the behaviour as unproven.

## 0. Ground rules

1. **Internal Drylake addresses only** as the "customer". No external recipient, ever. Exchange's
   outbound `5.7.708` block applies to external recipients only, so it does not affect these tests.
2. **Turnstile is real.** Booking from the public page needs a real browser (Ben's Chrome) because
   the human check only passes there. Do not script or headless the booking form.
3. **Never touch the Microsoft tenant to "simulate a fault".** No secret rotation, no removing the
   role assignment, no scope edits. The error-handling rows are `mocked` by design (section 4,
   case T15).
4. **Never restore the tenant-wide Graph `Calendars.ReadWrite` permission.** Benedict needs no
   per-user sign-in: being inside the Exchange management scope `Drylake-Consultation-Mailboxes` is
   the authorisation.
5. Tests create real rows and real calendar events. **Clean up** (section 7) and never leave a
   test booking in a slot a real customer could want.
6. Do not paste secrets, tokens or manage links into this file, a ticket or a chat. A manage link
   is a credential until the booking is cancelled.

### Who does what

| Step type | Owner (Ben) | Operator |
|---|---|---|
| Run `scripts/m365-verify.mjs` (needs pulled Vercel env) | usually | or |
| Tick Teams and Exchange service plans | yes (tenant admin) | no |
| Schedule or check pg_cron (Supabase SQL) | no | yes |
| Set `CONSULTATION_CALENDAR_PROVIDER=microsoft` and redeploy | no | **Wilson only** |
| Book from the public page (real Turnstile) | yes | yes, in a real browser |
| Read Outlook calendars and inboxes | the mailbox owner | no |

## 1. What the code already guarantees (so the live test can be short)

| Claim | Status | Where |
|---|---|---|
| Availability uses each representative's own calendar; an unreadable calendar counts as busy; no readable calendar at all means "could not load", never "everyone free" | mocked | `tests/consultation-m365-hardening.test.mjs`, `tests/consultation-m365.test.mjs` |
| No double booking for one representative: exclusion constraint, 20-way race, replay, cancel and reschedule release the slot | integration (local Postgres) | `tests/db/*.sql`, `bash tests/db/run-consultation-db-tests.sh` |
| Teams meeting only for method `TEAMS`; a phone booking sends `isOnlineMeeting: false`, names the number, and never records a join link even if Graph returns one | mocked | `tests/consultation-m365-hardening.test.mjs` |
| Event is created on the assigned representative's mailbox (organiser) with the customer as attendee | mocked | same |
| Graph 401, 403, 404, 429 (Retry-After), 5xx and expired secret (AADSTS7000222 / invalid_client) are classified; secrets and Microsoft's description text never reach an error, a log, a stored row or an email | mocked | same |
| Repeated auth failure emails both admins (once per kind per Perth day); `/api/health` reports `credentials: expired` | mocked (alert, classification) and integration (the SQL reads health uses) | `tests/consultation-health.test.mjs`, `tests/db/consultation-health.sql` |
| Signed-out admin routes answer 401 / redirect, cron refuses a missing secret | integration (built server, no Clerk) | `tests/e2e/admin-consultations.spec.ts` |
| Signed-in non-admin gets 403; admin can list, open, cancel, reschedule | source contract only | `tests/consultation-admin-access.test.mjs`, so **cases T12 and T9/T10 are the first real proof** |

## 2. Preconditions (do all of these before any booking)

Record the result of each in the results table (rows P1 to P9).

### P1. `m365-verify`, read-only (owner)

```
vercel env pull ~/m365-verify.env --environment=production     # file stays OUTSIDE the repo
node --env-file=$HOME/m365-verify.env scripts/m365-verify.mjs
```

Expected: steps **A** (token), **B** (wilson@ and benedict@ readable), **C** (hello@, support@,
accounts@ denied with 403 `ErrorAccessDenied`) and **D** (time zone `W. Australia Standard Time`)
all PASS, exit code 0. Look at the printed table; it never prints a secret.
*If B fails for one person:* Exchange RBAC changes take 30 minutes to 2 hours; check the licence and
`Test-ServicePrincipalAuthorization`. *If C shows readable:* STOP, the scope is too wide.

### P2. `m365-verify --write-test` (owner)

```
node --env-file=$HOME/m365-verify.env scripts/m365-verify.mjs --write-test
rm ~/m365-verify.env
```

Expected: step **E** PASSES for **both** wilson@ and benedict@: event created (no attendees, nobody
invited), `joinUrl` present, organiser is that person, 12:00 UTC reads as 20:00 Perth, PATCH keeps
the Teams link, event deleted. This is the proof that the app's RBAC reaches each calendar for
write. Benedict's **Teams service works** was already seen through his own signed-in session today;
**the app's access to his calendar was not**. Wilson has no live Teams evidence yet at all.
*"event exists but has NO Teams meeting":* tick Microsoft Teams under Licenses and apps for that
user and retry after a few hours.

### P3. Service plans (owner)

Microsoft 365 admin center > Users > Active users > the user > Licenses and apps: **Exchange Online**
and **Microsoft Teams** ticked for wilson@ and benedict@ (Business Standard includes both). The paid
subscription has had one licence for two users; confirm both users hold one.

### P4. The minute trigger exists (operator, Supabase SQL editor)

```sql
select jobid, jobname, schedule, active from cron.job where jobname = 'drylake-consultation-dispatch';
select status, return_message, start_time from cron.job_run_details
 where jobid = (select jobid from cron.job where jobname = 'drylake-consultation-dispatch')
 order by start_time desc limit 5;
select status_code, created from net._http_response order by created desc limit 5;
```

Expected: one active job on `* * * * *`; the newest run is under 2 minutes old with status
`succeeded`; `net._http_response` shows `200`. **Today this is UNVERIFIED in production.** If the
job is missing, run `docs/operations/sql/2026-10-13-consultation-dispatch-cron.sql` first. A `401`
means the Vault secret differs from Vercel `CRON_SECRET`.

### P5. Migrations applied (operator)

```sql
select to_regproc('public.consultation_busy_slots') is not null as migration_1,
       to_regproc('public.consultation_claim_calendar_sync(integer, interval, uuid, integer, text[])') is not null as migration_2;
```

Both `true`. Also `curl -s https://drylake.com.au/api/consultations/availability | head -c 200` returns
`{"timezone":...}`, not a `store_unavailable` 503.

### P6. Baseline `/api/health` (anyone)

```
curl -s https://drylake.com.au/api/health
```

Expected before the Microsoft switch: `status: ok`, `missingRequired: 0`, and
`consultations.available: true`, `consultations.calendar.provider: "none"`,
`consultations.calendar.credentials: "not_connected"`. `dispatch.minuteTrigger` is `running` if any
email went out in the last 10 minutes, otherwise `unknown` (an idle outbox leaves no trace; that is
not a fault). `available: false` means the health route could not read the database; check the
Vercel function log, not the booking flow.

### P7. Secrets present (operator, Vercel)

`CONSULTATION_TOKEN_SECRET`, `CRON_SECRET`, `EMAIL_FROM`, `RESEND_API_KEY`, `MS_GRAPH_TENANT_ID`,
`MS_GRAPH_CLIENT_ID`, `MS_GRAPH_CLIENT_SECRET` set in Production. Check by name in the Vercel UI;
never print values. Put the **client secret expiry date** on the calendar now (the app registration
secret lasts 12 months at most; an expired one stops all booking, see T15).

### P8. Switch the provider on (Wilson only)

Wilson sets `CONSULTATION_CALENDAR_PROVIDER=microsoft` in Production and redeploys. Nobody else does
this. Expected within a minute of the deploy going live:

```
curl -s https://drylake.com.au/api/health
```

`consultations.calendar.provider: "microsoft"` and `consultations.calendar.credentials: "ok"`. `ok`
comes from a live sign-in probe (token request only), so it proves the secret is valid; it does
**not** prove the Exchange role assignment (that is P1/P2 and the first booking). Then
`/api/consultations/availability` returns days with times (not `calendar_unavailable`).

### P9. Choose test "customers" (owner)

The "customer" address must be able to receive mail, because the confirmation, invitation and
reminder are the things under test.

| Address | Receives mail? | Use |
|---|---|---|
| wilson@drylake.com.au | Yes (licensed) | customer for bookings hosted by Benedict |
| benedict@drylake.com.au | Yes (licensed) | customer for bookings hosted by Wilson |
| hello@, support@, accounts@ | **Not established.** They are unlicensed; `m365-verify` step C only proves the app cannot read them. They may have no mailbox, in which case mail to them is lost or bounces | Do not rely on them. If one is later confirmed to be a shared mailbox, it can serve as a neutral customer |
| `wilson+t1@drylake.com.au` style plus-addresses | Unverified. Works only if the tenant has plus addressing enabled | Optional, to get around the 2-upcoming-bookings limit |

Side effects to plan around (these are not bugs):

- **A person who is the customer sees the event as an invitation in their own calendar.** An
  unanswered invitation shows as *tentative*, and the app treats tentative as busy. So using
  wilson@ as the customer of a Benedict-hosted booking **removes Wilson from that slot** until the
  booking is cancelled. This is correct behaviour and is also useful for case T7.
- **At most 2 upcoming bookings per email address.** Cancel between cases or use two addresses.
- **Assignment is "fewest upcoming consultations, then Wilson before Benedict".** With an empty
  calendar the first booking goes to Wilson. To make Benedict the host, make Wilson busy for that
  slot first (an Outlook "busy" block on his calendar, deleted afterwards), or book Wilson first.
- Use slots **no real customer would pick**, and delete anything you create the same day.

## 3. How to read each result ("where to look")

| What | Where |
|---|---|
| The booking, its status, history, calendar state and each email | `https://drylake.com.au/admin/consultations` then the booking. Calendar box: `data-testid="admin-calendar-status"`; history lines such as "Microsoft 365 calendar updated" and "Email sent: customer confirmation" |
| The event, its organiser and Teams link | Outlook (web or desktop) calendar of the **host**; open the event > organiser; Teams link under "Join" |
| The invitation, cancellation and update from Exchange | The **customer** mailbox, from the host's address |
| Drylake's own emails (confirmation, reminder, notices) | The customer mailbox and, for founder notices, wilson@ and benedict@. Sender "Drylake consultations" |
| Raw state | Supabase SQL: `select reference, status, version, assigned_representative, meeting_method, calendar_sync_state, calendar_sync_attempts, calendar_last_error, calendar_join_url is not null as has_link from consultation_bookings order by created_at desc limit 10;` and `select kind, recipient, status, attempts, send_after, sent_at, last_error from consultation_notifications order by created_at desc limit 20;` |
| Server errors | Vercel > Logs, filter `Consultation`. Lines carry outcome codes and error kinds, never a name, email or link |
| Liveness | `curl -s https://drylake.com.au/api/health` |

## 4. Test matrix

Run in this order. Each case ends with a results-table row.

### T1. Availability follows Outlook (Wilson and Benedict separately)
1. In Wilson's Outlook, add a **busy** block 10:00 to 11:00 on a coming Monday. Open `/consultation`
   (hard refresh). The 10:00 and 10:30 slots **still show** (Benedict is free).
2. Also block Benedict's calendar 10:00 to 11:00. Within 60 seconds (cache) the two slots
   **disappear**.
3. Delete both blocks; the slots return.
**Expected:** exactly that. **Looks at:** `/consultation`. Status expectation: production-verified.

### T2. Teams booking hosted by Wilson (customer: benedict@)
Book a Teams consultation for a slot Wilson is free (empty calendars: he is assigned first).
**Expected:** booking page says booked; within about a minute: admin shows `Wilson`, `Teams`, calendar
"In calendar"; Wilson's Outlook has the event with Wilson as **organiser**, a Teams link, and
benedict@ as attendee; benedict@ receives (a) Exchange's invitation from wilson@ and (b) Drylake's
"Your Free Consultation with Drylake is Confirmed" with a **Join Microsoft Teams Meeting** button
whose link matches the event's. Wilson and Benedict each get "New Drylake Consultation Booking".
**Proves:** Wilson's Teams + app RBAC for write (the part with no live evidence today).

### T3. Teams booking hosted by Benedict (customer: wilson@)
Make Wilson busy for the chosen slot first (Outlook block), book Teams. Expected as T2 with Benedict
as organiser. **Proves:** the app's RBAC reaches Benedict's calendar (today only his Teams service
is proven), and that availability checks the assigned representative's own calendar: the booking
must not land on Wilson.

### T4. Phone consultation (customer: either; use the operator's own phone number)
Choose "Phone call", enter a number you can see, book.
**Expected:** event in the host's calendar titled "Free consultation with Drylake (DL-xxxxxx)", location
"Phone call to <number>", body "This is a phone consultation. Drylake will call you on <number>",
**no Teams link, not an online meeting** (open the event: no "Join" button, no Teams toggle).
Drylake's confirmation says Drylake will call; **no join button**. Admin shows `Phone`.
**Proves:** `isOnlineMeeting: false` against the real tenant (the tenant default could otherwise add
a Teams link; this is the case that would reveal it).

### T5. Confirmation and notices
For T2: confirm Drylake's confirmation arrived once, shows Perth time, the reference, the Manage
Booking button, and (Teams) the join button. Reply-to is `hello@drylake.com.au`. Both founder
notices arrived with the admin link. No duplicate sends. **Admin > booking > Emails** lists each as
sent. No em dashes in any of them.

### T6. Invitation to customer and representative
Customer mailbox: Exchange invitation present, from the host, correct time (Perth), correct
Teams/phone wording. Host calendar: the event exists exactly once. Accept the invitation as the
customer and confirm the host sees the response.

### T7. Double booking
a. Book a slot as T2 (Wilson). In a second browser, book the **same slot**: it is assigned to
   Benedict (two representatives, so two bookings fit one time).
b. A third booking for the same slot must be refused: "This time has just been booked. Please choose
   another available time." and the slot disappears from the picker. (If you cannot reach it through
   the picker, open two tabs on the same slot before the third booking.)
c. With Wilson busy in Outlook for a slot, no booking is ever assigned to him at that time.
**Looks at:** the response message, the admin list (never two bookings for one representative at one
time), SQL: `select assigned_representative, start_time, count(*) from consultation_bookings where status in ('CONFIRMED','RESCHEDULED') group by 1,2 having count(*) > 1;` returns **no rows**.

### T8. Reschedule from the customer link (same host)
Use Manage Booking in the confirmation email, choose another free time.
**Expected:** the **same** Outlook event moves (one event, not two); the Teams link is unchanged;
customer gets Exchange's update and Drylake's "Your Drylake Consultation Has Been Rescheduled"; the
old link stops working; both founders notified; admin history shows "Rescheduled by customer" and
"Microsoft 365 calendar updated"; the old slot reappears in the picker. **Proves:** PATCH of
start/end keeps the Teams link in this tenant.

### T9. Admin reschedule, including reassignment
As Wilson (admin), open the booking and reschedule to a time **Benedict only** is free (block
Wilson's calendar for that time first). **Expected:** the old invitation is cancelled by the old
host, a new one arrives from the new host, admin history says "reassigned from Wilson to Benedict",
the customer gets one reschedule email. Then do the same as Benedict (admin) on a different booking:
**both admins can manage all bookings.**

### T10. Cancel, and the slot is released
Cancel from the Manage link (customer path) for one booking and from admin for another.
**Expected:** Exchange sends a cancellation to the customer; the Outlook event is gone from the
host's calendar (or shown cancelled); Drylake's "Your Drylake Consultation Has Been Cancelled"
arrives with **no** Manage button; founders notified; the slot is bookable again within 60 s; a
pending reminder is withdrawn (history: "Pending reminder withdrawn"). SQL: no `PENDING`
`CUSTOMER_REMINDER` rows for the cancelled booking.

### T11. The 2-hour cut-off
Book the earliest slot at least 2 hours away (about 2h05m ahead), wait until it is under 2 hours,
open Manage Booking. **Expected:** the page says online changes closed and gives hello@; cancelling
or rescheduling there is refused ("Online changes close 2 hours before your consultation..."). As an
admin the same booking can still be cancelled. Clean up after.

### T12. Admin portal, both admins
Sign in as Wilson, then as Benedict. For each case above: the booking is listed under
`/admin/consultations` (filters for status, representative, date and search work), the detail page
shows representative, method, Perth time, calendar state, history and emails, and Cancel /
Reschedule / Mark completed / Retry calendar sync are present. A signed-in account that is **not** a
platform admin (e.g. a client user, if one exists) must get a redirect from the page and `403` JSON
from `POST /api/admin/consultations/<id>`. This is the first real check of the 403 path.

### T13. 24-hour reminder
A reminder is queued for `start - 24 h` only when the booking is made at least **26 hours** before
the start (`REMINDER_MIN_GAP_MINUTES` = 120). To avoid waiting days: on a Monday morning at about
06:30 Perth, book Tuesday 09:00 (or any slot 26 to 27 hours away) with a Teams booking.
Expected at **start - 24 h (T-24h)**: "Reminder: Your Drylake Consultation is Tomorrow" arrives at the
customer address **within about 2 minutes of that time** if the minute trigger works. SQL before:
`select kind, status, send_after from consultation_notifications where kind = 'CUSTOMER_REMINDER' order by created_at desc limit 3;`
shows `PENDING` with `send_after` = T-24h. If the email arrives only at the next 06:00 Perth, the
minute trigger is not running (P4 was wrong). Reschedule the booking before T-24h and confirm the
old reminder never arrives and a new one is queued for the new time. Cancel afterwards.

### T14. Liveness after the run
`curl -s https://drylake.com.au/api/health`. Expected: `dispatch.lastSuccessfulAt` within the last
minutes, `oldestPendingAgeSeconds: null` or under about 120, `minuteTrigger: "running"`,
`failedNotifications: 0` (or explainable), `calendar.credentials: "ok"`,
`calendar.unresolvedSyncFailures: 0`.

### T15. Graph error handling and expired credentials: **MOCKED ONLY**
Vercel Hobby cannot give a Preview deployment its own invalid secret, and the tenant must not be
altered, so there is **no safe production test** and none should be improvised. Do **not** change
`MS_GRAPH_CLIENT_SECRET`, remove the role assignment or edit the scope on production to "see what
happens". The behaviour is covered by `tests/consultation-m365-hardening.test.mjs`,
`tests/consultation-health.test.mjs` and `tests/consultation-admin-access.test.mjs` (66 tests, run by
`npm test`):

| Fault | Mocked outcome |
|---|---|
| Expired secret (AADSTS7000222) or `invalid_client` | kind `credential_expired`; booking page shows "could not confirm with our calendars, nothing booked"; admins emailed once per Perth day; `/api/health` goes `degraded` with `credentials: "expired"`; admin screen says "Microsoft 365 credential expired or invalid" |
| 401 after token refresh, 403 (RBAC removed) | kind `auth`; same alert; health `auth_failed` |
| 404 mailbox | kind `mailbox`; retried; no alert until the booking gives up (then both founders are emailed) |
| 429 with Retry-After | not retried inside the request when the wait is over 5 s; the sync is queued for at least that long |
| 5xx / timeout | kind `unavailable`; the booking commits, the calendar update retries 1, 2, 4 ... 60 minutes, FAILED after 10 attempts, founders emailed, admin sees "Calendar sync failed" and **Retry calendar sync** |

What you **can** check safely in production, and should: `/api/health` showing
`credentials: "ok"` (live token probe), `m365-verify` step A, and the secret's expiry date on the
calendar. The alert email itself has not been sent for real; the first time it fires will be the
first real test of that path.

### T16. Rollback drill (read-only)
Do not execute on production unless needed. Confirm in the Vercel UI that you can set
`CONSULTATION_CALENDAR_PROVIDER` back to `none` (or remove it), and re-read section 6.

## 5. Results table (copy per test run)

`method` is one of **mocked**, **integration** (local Postgres or built server) or
**production-verified** (done by a person on drylake.com.au, with evidence). Leave a case blank
until it is done. Do not mark `production-verified` from a screenshot of a different case.

| case | method | date | evidence | pass/fail |
|---|---|---|---|---|
| P1 m365-verify read-only | production-verified | | script output (redacted) | |
| P2 m365-verify --write-test, both users | production-verified | | script output | |
| P3 service plans ticked | production-verified | | admin center screenshot | |
| P4 pg_cron job and recent runs | production-verified | | SQL result | |
| P5 migrations applied | production-verified | | SQL result | |
| P6 baseline health (provider none) | production-verified | | curl output | |
| P7 secrets present, expiry on calendar | production-verified | | Vercel names, calendar entry | |
| P8 provider on, health credentials ok | production-verified | | curl output | |
| P9 customer addresses decided | production-verified | | note | |
| T1 availability follows Outlook | production-verified | | | |
| T2 Teams, Wilson hosts | production-verified | | event + mail screenshots | |
| T3 Teams, Benedict hosts | production-verified | | | |
| T4 phone, no Teams link | production-verified | | | |
| T5 confirmation and notices | production-verified | | | |
| T6 invitation to customer and rep | production-verified | | | |
| T7 double booking refused | production-verified | | SQL (no rows) | |
| T8 reschedule, same host | production-verified | | | |
| T9 admin reschedule, reassign, both admins | production-verified | | | |
| T10 cancel and slot released | production-verified | | | |
| T11 2-hour cut-off | production-verified | | | |
| T12 admin portal, both admins, non-admin 403 | production-verified | | | |
| T13 24 h reminder | production-verified | | email time vs T-24h | |
| T14 liveness after run | production-verified | | curl output | |
| T15 Graph faults and expired credential | mocked | (CI) | `npm test` | |
| DB invariants (race, release, reminders) | integration | (CI) | `run-consultation-db-tests.sh` | |
| Signed-out admin and cron refusal | integration | (CI) | `admin-consultations.spec.ts` | |

## 6. Rollback

Microsoft 365 misbehaving at any point (wrong events, missing times, repeated errors):

1. Wilson sets `CONSULTATION_CALENDAR_PROVIDER=none` (or removes it) in Production and redeploys.
   Booking continues on Drylake's own bookings; queued calendar work waits.
2. Cancel any test booking from `/admin/consultations` so customers (here: you) are told.
3. If emails are misbehaving: `select cron.unschedule('drylake-consultation-dispatch');`
4. Code: revert the merge. Tables are harmless when unused.

Do not drop tables that contain bookings.

## 7. Cleanup

- Cancel every test booking in admin; confirm the Outlook events are gone from both calendars
  (delete any stray one by hand: subject "Free consultation with Drylake (DL-...)").
- Delete the temporary Outlook "busy" blocks created for T1, T3 and T9.
- `rm ~/m365-verify.env` and confirm no copy remains in a synced folder.
- `select reference, status from consultation_bookings where customer_email in ('wilson@drylake.com.au','benedict@drylake.com.au') and status in ('CONFIRMED','RESCHEDULED');` returns nothing you did not intend.
- File the filled results table with the PR or the ops log; mark the PR checklist.

## 8. What a full pass still does not prove

- Behaviour for **external** recipients (the `5.7.708` block). Customers' emails come from Resend and
  are unaffected, but Exchange's own invitation to an outside address is unproven until the
  paid subscription has aged; see `docs/operations/consultations.md`.
- Behaviour under load, or with the Vercel Firewall rate limit (separate manual step).
- The expired-secret alert and the 403/RBAC-removed paths end to end (T15 is mocked).
- That `calendar.credentials: "ok"` means the role assignment is intact; it only proves the secret.
