# Contact form: delivery path, protection and checks

Path: `/contact` form (`components/forms/ProjectForm.tsx`) -> Cloudflare Turnstile widget ->
`POST /api/contact` (`app/api/contact/route.ts`) -> server-side Siteverify
(`lib/contact/turnstile.ts`) -> Resend (`lib/email/contact-enquiry.ts`) -> `CONTACT_TO_EMAIL` inbox.

## Response contract

| Outcome | Status | Body |
|---|---|---|
| Delivered (Resend accepted the message) | 200 | `{ "success": true }` |
| Field validation failed | 400 / 413 / 415 | `{ "error": "..." }` |
| Turnstile token missing, invalid, reused, wrong host or wrong action | 403 | `{ "error": "..." }` |
| Too many requests (Vercel Firewall, see below) | 429 | Vercel's response, not JSON |
| Turnstile secret missing or Cloudflare unreachable | 503 | `{ "error": "..." }` |
| Resend rejected the message, or `RESEND_API_KEY` / `EMAIL_FROM` / `CONTACT_TO_EMAIL` missing | 502 | `{ "error": "...email hello@drylake.com.au directly." }` |

The browser shows "Enquiry received" only for a 2xx response whose JSON is exactly
`success: true` (`lib/contact/submit-enquiry.ts`). Any other outcome keeps the visitor's answers
in the form and resets the single-use Turnstile token.

Logs record the reason for a failure (Resend's error name and message, or which variable is
missing) and Turnstile error codes. They never record the enquiry, the token or a secret.

## Token replay (open investigation, 5 Oct 2026)

On production, one Turnstile token was accepted by `/api/contact` three times in about two
minutes (three emails were sent). Invalid, missing and Cloudflare-dummy tokens were correctly
refused with 403, so the secret is a real one. Cloudflare documents every token as single-use
(`timeout-or-duplicate` on replay), so its Siteverify answer for the replays needs checking.

The in-memory guard from PR #10 did not stop it on production (the replay reached another
instance). Mitigation in code now has two layers in `lib/contact/consumed-tokens.ts`:

1. In memory, per instance.
2. Shared: `public.turnstile_token_claims` (primary key = token fingerprint). **Run
   `docs/operations/sql/2026-10-05-turnstile-token-claims.sql` once in the Supabase SQL editor.**
   Until the table exists, the logs show `Turnstile: durable token claim unavailable: 42P01`
   (or `PGRST205`) and only layer 1 applies. The form keeps working either way.

Re-test after the SQL: submit the form once, then POST the same token again; the second must
return 403.

To find the cause (needs Vercel access): in the logs, every accepted token now prints
`Turnstile: verified <fingerprint> age <N>s`. The same fingerprint appearing twice means
Cloudflare accepted a replay; raise it with Cloudflare support and confirm in the Turnstile
dashboard that the widget's secret has not been rotated or shared with another site.

## Required environment variables (Vercel, Production)

`NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `EMAIL_FROM` (an
address on a Resend-verified domain), `CONTACT_TO_EMAIL`. Optional: `TURNSTILE_ALLOWED_HOSTNAMES`
(comma-separated, added to `drylake.com.au` and `www.drylake.com.au`, e.g. for a preview domain).

**Sender name (since PR #41):** enquiries send from `EMAIL_FROM`'s address under the display name
"Drylake website enquiries" (`lib/email/contact-enquiry-sender.ts`), so they are never labelled
as billing mail. Optional `CONTACT_EMAIL_FROM` (a full `Name <address>` on the same verified
domain) overrides it. Invoice email keeps `EMAIL_FROM` unchanged. If enquiries still show as
"Drylake billing" after deploy, the label is coming from the mailbox (an Outlook contact saved for
that address): rename the contact.

## Rate limiting

There is **no rate limiter in this repository**. Production is protected by a **Vercel Firewall**
rule, which lives in the Vercel dashboard (Project > Firewall), not in code.

Observed on production, 5 Oct 2026: the 6th `POST /api/contact` in a rapid burst from one IP
returns `429` with `x-vercel-mitigated: deny`. The block cleared within about 40 seconds. Page
requests (`GET /contact`) were not affected.

Manual check (needs Vercel access): open Project > Firewall, confirm the rule exists, and record
its match (path `/api/contact`, method POST), limit, window and action here. If the rule is ever
removed, the only remaining protection is Turnstile.

To re-test: send requests at least 12 seconds apart, or you will trip the limit yourself.
