# Genuine review requests (/admin/reviews, /feedback)

How Drylake asks people it has worked with for honest feedback, and what may appear publicly.

**The site shows no reviews of its own making.** Nothing is invented, imported or copied. External
review platforms (for example a Google Business Profile) stay authoritative for their own reviews;
this system never reproduces them. A quote reaches the public site only when the person submitted
it through Drylake's own form, ticked a separate consent to publish it, and a platform admin
approved it.

## Owner setup (nothing here is applied by the pull request)

1. **Apply the migration** `supabase/migrations/20261016140000_review_requests.sql` to production
   Supabase. It is re-runnable. It creates `review_requests`, `review_feedback` and
   `review_suppressions` (RLS on, no policies, `service_role` only) and four functions. Until it is
   applied, `/admin/reviews` shows an error panel, `/feedback` answers 500, and the public page
   shows nothing (the quotes component fails closed to an empty list).
2. **Environment variables** (Vercel, Production). Both optional:
   - `FEEDBACK_EMAIL_FROM`: sender for the request emails. Default
     `Drylake Feedback <address of EMAIL_FROM>`. Replies always go to `hello@drylake.com.au`.
   - `REVIEW_PLATFORM_URL`: an https link to a review platform Drylake does not control (for
     example the Google Business Profile review link). Shown only when set: in the request email
     as an optional alternative, on the thank-you screen, and next to real quotes. Needs a redeploy.
3. Required and already set: `EMAIL_FROM`, `RESEND_API_KEY`, `SUPABASE_SECRET_KEY`.

## Who is eligible (the rule)

One request per recipient per engagement. An engagement is:

- a **completed project** (`projects.status = COMPLETED`): the recipient is the client organisation's
  billing contact (`organizations.billing_contact_name` and `billing_email`), unless the organisation
  is ARCHIVED; or
- a **completed consultation** (`consultation_bookings.status = COMPLETED`): the recipient is the
  person who booked it. Consultations are not tied to a client organisation, so the business name
  they gave is the organisation label.

Not eligible: a cancelled or in-progress engagement, no valid email, an archived organisation, an
address that opted out, or an engagement already asked. The rule lives in
`lib/reviews/eligibility.ts` and is re-derived on the server for every send (the browser's list is
never trusted).

## The workflow

1. `/admin/reviews` lists who is ready. **Send request** opens a confirm step (recipient, engagement,
   what the email says). Nothing is sent in bulk or automatically.
2. The server creates the request in the database function (duplicate guard and opt-out check in
   one transaction), then sends the email. The row is saved as `queued` first, becomes `sent` with
   `sent_at` and `sent_by` once Resend accepts the message, or `failed` (admin can send again).
3. The email: neutral "How did we do?", asks for honest feedback good or bad, offers nothing in
   return, identifies Drylake Pty Ltd and its ABN, and carries an unsubscribe link plus
   `List-Unsubscribe` headers (including one-click). Recipients who opt out are added to
   `review_suppressions` and are never asked again.
4. The link opens `/feedback#t=<token>`. The token is 32 random bytes in the URL **fragment** (never
   sent to a server or logs), stored only as its SHA-256, **single use** (the database locks the
   request row and spends the token in the same transaction as the feedback), and expires after 30
   days. The form has an optional rating, comments, and a **separate, unticked, explicit** consent to
   publish the comments as a testimonial, with a choice of credit (name and organisation, first name
   and organisation, organisation only, anonymous). The credited name is computed in the database
   from the request, never taken from the browser.
5. All feedback, negative included, is stored and listed in admin exactly like any other. Nothing is
   filtered from the admin view.
6. **Approve** shows a consented comment on the public site; **Remove from the public site** hides
   it; **Remove written content** clears the comment for good (the rating and the fact feedback
   arrived are kept). Approval is refused without consent, in code and by a database constraint.
   Every action is audit-logged with ids and state only.

## What the public site shows

`/services` shows a "What people say" section **only** when at least one approved, consented quote
exists. With none it renders nothing: no heading, no stars, no placeholder. It never shows stars, an
average or a count, and the site emits **no** `Review` or `AggregateRating` structured data
(Google treats a business marking up reviews about itself on its own site as self-serving). The page
refreshes hourly and immediately when an admin approves or removes a quote.

## Spam Act 2003

Review requests to existing customers are close to transactional, but they carry sender
identification and a functional unsubscribe anyway. The unsubscribe works with one click from the
email and is honoured on every later send (`review_suppressions`, checked in the database function).
A retry after a failed or expired send issues new tokens; the previous unsubscribe link then stops
working, so a recipient who asks to be removed by reply is handled by email until an admin
"add to opt-out list" action exists (see Outstanding in the PR).

## Tests

- `node --conditions=react-server --test tests/review-requests.test.mjs`
- `bash tests/db/run-review-db-tests.sh` (needs Docker; real Postgres 17; includes a race of 20
  simultaneous submissions of one token and 10 simultaneous requests for one recipient)
- `E2E_SKIP_BUILD=1 RESEND_API_KEY= npx playwright test tests/e2e/reviews.spec.ts`
