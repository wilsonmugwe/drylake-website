# Free consultation booking: design

Date: 2026-10-13. Branch `drylake/consultation-booking`. Brief: "Website improvements and
consultation booking system" plus the appointment-management and admin-portal addenda.

## Problem

The public site offers one route to Drylake: an enquiry form. Prospects who would rather talk
cannot pick a time. The brief asks for a free 30-minute consultation that anyone can book
without an account, on Monday, Tuesday and Friday, 9:00 to 17:00 Perth time. It must never
double-book, must survive email outages, must remind the customer 24 hours ahead, and must be
manageable by both the customer (secure link) and Drylake (admin portal).

## Locked decisions

| # | Decision | Why |
|---|---|---|
| 1 | Supabase Postgres is the only source of truth; three new tables, all writes through SQL functions | Atomic booking + audit + notification rows in one transaction |
| 2 | Double booking is impossible at the database: `EXCLUDE USING gist (tstzrange(start,end) WITH &&) WHERE status active` | Holds under any concurrency, any code path, any future bug |
| 3 | Slot rules are enforced twice: pure TypeScript (`lib/consultations/rules.ts`) for the UI and the API, and a CHECK constraint + function checks in SQL | The database cannot be talked into a Wednesday or 17:00 booking even by a buggy caller |
| 4 | Times stored as `timestamptz` (UTC); every rule evaluated in `Australia/Perth` | Visitor timezone never matters |
| 5 | Reschedule is an in-place UPDATE of the same row inside one function | Old slot released and new slot reserved in a single statement; on conflict the row is untouched |
| 6 | Optimistic concurrency: every change passes the `version` the caller saw | A stale admin screen or a second tab cannot overwrite a newer change |
| 7 | Management token = `HMAC-SHA256(CONSULTATION_TOKEN_SECRET, id:version)`, DB stores only its SHA-256 | Unguessable, scoped to one booking, revocable (version bump), and re-derivable for the reminder email without storing the raw token |
| 8 | Token travels in the URL fragment (`/consultation/manage#t=...`) and in POST bodies | Fragments are never sent to the server, so never in Vercel access logs, analytics or Referer |
| 9 | Notifications use a transactional outbox (`consultation_notifications`) written by the same SQL function | A committed booking can never lose its emails; Resend outages become retries |
| 10 | Delivery: dispatcher claims due rows with `FOR UPDATE SKIP LOCKED`, sends with Resend `idempotencyKey = event_key` | No duplicate sends across concurrent workers or a crash between send and ack |
| 11 | Triggers: (a) `after()` on every booking mutation, (b) Supabase `pg_cron` + `pg_net` every minute (SQL in `docs/operations/sql/`), (c) daily Vercel cron backstop | Vercel Hobby rejects sub-daily crons at deploy time and the plan is unknown here; pg_cron works on any Vercel plan and gives minute precision |
| 12 | Reminder row is created with `send_after = start - 24h`; cancelled and re-created in the reschedule/cancel transaction; re-checked against the live booking at send time | Never a reminder for a cancelled or moved appointment |
| 13 | Short-notice policy: no reminder when `start - 24h` is less than 2 hours after booking; the confirmation email already carries the time | A "tomorrow" reminder minutes after the confirmation would be noise, and inside 24h it would be wrong |
| 14 | Minimum notice 2 hours, booking horizon 28 days, at most 2 upcoming bookings per email address | Founders see the notification before the call; limits slot hoarding |
| 15 | Turnstile on the public booking form with its own action `consultation`; per-instance rate limit on every public consultation endpoint | Reuses the existing verifier; the action binding stops a contact-form token being replayed here |
| 16 | Statuses: `CONFIRMED`, `RESCHEDULED` (active, moved at least once), `CANCELLED`, `COMPLETED` | Matches the admin filters in the brief; never deleted |
| 17 | Admin reuses `requirePlatformAdmin` / `authorizeAdminApi`; admin actions use the same SQL functions as customers | One code path, one audit trail |
| 18 | Microsoft 365 calendars are NOT checked | No Graph integration exists in the repo. The availability function is the single seam where a calendar busy-list can be subtracted later |

## Architecture

```
/consultation (public)          /consultation/manage#t=..          /admin/consultations
  SlotPicker + form               view / cancel / reschedule         list, detail, history,
     |                                 |                              reschedule, cancel, complete
GET  /api/consultations/availability   |                                   |
POST /api/consultations ------- POST /api/consultations/manage ---- POST /api/admin/consultations/[id]/*
     |                                 |                                   |
     +---------------- SQL functions (service role only) -----------------+
     |  consultation_create_booking / _reschedule_booking / _cancel_booking / _complete_booking
     |  each writes: booking row + consultation_booking_events + consultation_notifications
     v
consultation_notifications (outbox) <-- consultation_claim_notifications (SKIP LOCKED)
     ^                                        |
     |                     lib/consultations/dispatch.ts -> Resend (idempotencyKey)
     |                                        |
     +------ consultation_finish_notification (SENT / retry with backoff / FAILED + event)
Triggers: after() on mutation, pg_cron every minute -> /api/cron/consultation-notifications,
daily Vercel cron backstop.
```

## Security

- All three tables: RLS enabled with no policies, privileges revoked from `anon` and
  `authenticated`. Functions executable by `service_role` only.
- Public availability returns start times only. No customer data leaves except to the holder of
  the management token (their own booking) and platform admins.
- Event rows carry ids, times, status and actor only (no names or emails), matching
  `lib/auth/audit.ts`.
- Booking routes sit under `/api/`, so the proxy's cross-site mutation refusal applies.
- Cron endpoint requires `Authorization: Bearer ${CRON_SECRET}`; constant-time compare.

## New configuration

| Variable | Purpose |
|---|---|
| `CONSULTATION_TOKEN_SECRET` | HMAC key for management links, 32+ random bytes. Rotating it invalidates every outstanding link |
| `CRON_SECRET` | Bearer secret for the dispatcher (Vercel sends it automatically for its own crons) |
| `CONSULTATION_EMAIL_FROM` | Optional sender; defaults to EMAIL_FROM's address as "Drylake consultations" |

## Testing

- Pure unit tests (node:test): rules, slot generation across all weekdays and edges, token
  derivation, email rendering (no em dashes, Perth times), dispatcher logic with fakes.
- Database tests against a real Postgres 17 container: constraint matrix (Mon/Tue/Fri pass,
  other days fail, 08:30/17:00/16:45 fail), exclusion under 20 concurrent inserts, idempotent
  replay, reschedule conflict preserves the original, reminder lifecycle, claim/finish retry,
  privilege checks for anon/authenticated.
- E2E (Playwright, local build): booking flow with stubbed API, manage page, mobile widths,
  axe, lake-bed labels inside their plates.

## Out of scope

Microsoft 365 calendar sync, video-meeting links (none configured), SMS reminders.
