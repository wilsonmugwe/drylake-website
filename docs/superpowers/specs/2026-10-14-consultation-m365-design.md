# Consultation booking: representatives, Teams or phone, Microsoft 365 (2026-10-14)

Extends `2026-10-13-consultation-booking-design.md` (PR #69). Operations: `docs/operations/consultations.md`.

## Problem

1. Production `/consultation` showed "Consultation times could not be loaded" on every visit
   (availability 503, `/api/health` missingRequired 2). PR #69 merged before its configuration.
   The availability path calls only `consultation_busy_slots`, so the 503 is the missing
   migration. The two missing variables (`CONSULTATION_TOKEN_SECRET`, `CRON_SECRET`) break booking
   creation and the dispatcher, not availability. All three are dashboard actions (D16).
2. The brief adds: two representatives with their own Microsoft 365 calendars, a slot offered
   when at least one is free, fair assignment, Teams or phone, invitations, calendar updates on
   reschedule and cancel, a 2-hour customer cut-off, an honest no-availability screen, and admin
   filtering by representative and date.

## Locked decisions

| # | Decision | Why |
|---|---|---|
| 1 | Additive migration `20261014090000`, not an edit of `20261013120000` | Migrations are immutable once merged; production may apply them separately |
| 2 | Overlap is per representative: `exclude using gist (assigned_representative with =, tstzrange with &&)` | "No double bookings for the same representative" enforced at any concurrency; needs `btree_gist` |
| 3 | Assignment inside the SQL transaction: app passes the representatives Outlook says are free, SQL tries them in order fewest-upcoming, then roster order | Deterministic, fair, race-safe (20-way race test: exactly one per representative) |
| 4 | Outlook revalidated FRESH for the exact slot before every create / reschedule; failure = nothing booked (503 `calendar_unavailable`) | "Fail safely rather than offering unverified times" |
| 5 | Calendar writes happen AFTER the commit, through a durable leased queue on the booking row | The booking must never depend on Graph latency; nothing is lost when Graph is down |
| 6 | Event idempotency by an extended property holding the booking id, looked up before create; `transactionId` set too | Graph does not document what a duplicate `transactionId` POST returns |
| 7 | Moves PATCH start/end only | Microsoft: patching an online meeting's body can strip the Teams link |
| 8 | One Exchange RBAC-for-Applications role, `Application Calendars.ReadWrite`, scoped to the two mailboxes; no Entra Graph grant | Least privilege; Microsoft says RBAC for Applications replaces Application Access Policies |
| 9 | Teams meeting created via `isOnlineMeeting` on the event, no `OnlineMeetings.*` permission | One permission covers free/busy, events and Teams; Exchange sends the invitations |
| 10 | Provider interface + `CONSULTATION_CALENDAR_PROVIDER` (`none` default, `microsoft`) | Portfolio interoperability rule; the brief says do not enable until admin permissions exist |
| 11 | Unreadable mailbox = busy; both unreadable = error | Never offer a time nobody verified |
| 12 | Teams confirmation waits up to 10 minutes for the join link (defer, no attempt spent) | The link belongs in the confirmation, but the email must not depend on Graph forever |
| 13 | Customer cut-off 2 hours (`p_customer_cutoff`), admins unrestricted | Brief |
| 14 | Invitation body: reference, method, how to change; never the project description or the manage link | The invitation lives in the representative's mailbox and is forwarded freely |
| 15 | Customer method fixed at booking (no method change on reschedule) | Not asked for; a changed method would need a new event type and new copy |

## Verified substrate (2026-10-14)

- learn.microsoft.com: getSchedule (app-only `Calendars.ReadBasic`+, 20 mailboxes, under 62 days,
  statuses), create event (`Calendars.ReadWrite`, `onlineMeeting.joinUrl` in the POST response,
  invitations automatic), update (body PATCH gotcha), cancel (organizer-only, 202), throttling
  (429 + Retry-After; 10,000 requests per 10 min per app per mailbox), client-credential tokens
  (no refresh token, ~60-90 min), RBAC for Applications (roles, scope, test cmdlet, Entra grants add).
- UNVERIFIED and listed as go-live checks: app-only Teams creation on this tenant; Exchange update
  mail on a start/end PATCH; duplicate `transactionId` behaviour; scope enforcement on `schedules[]`.

## Testing

- DB: `tests/db/consultation-representatives.sql` (assignment, fairness, exclusion, method, cut-off,
  reassignment, sync queue lease / stale version / failure alert / admin retry, defer) and the race
  in `run-consultation-db-tests.sh`.
- Unit: `tests/consultation-m365.test.mjs` (Graph request shapes and failure handling with a fake
  fetch, availability, reconciliation incl. crash recovery and reassignment, Teams-link gating,
  email copy, no em dashes).
- E2E (`@local`, API intercepted): method choice, phone validation, no-availability vs load error,
  manage page method / Teams link / cut-off, axe and 44px targets at 375 and 1440.
- NOT verified: anything against the real Microsoft 365 tenant, the production database, or a
  signed-in admin session (no credentials in this environment).

## Out of scope

Representative choice by the customer; method change on reschedule; per-representative working
hours different from the global rules; Microsoft Bookings; SMS reminders.
