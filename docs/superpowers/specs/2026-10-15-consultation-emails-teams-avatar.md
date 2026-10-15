# Consultation emails, Microsoft Teams integration, Gmail sender avatar: assessment and plan

Date: 2026-10-15. Scope: the three improvements Ben asked for on the production consultation
booking system (PR #69 and PR #70, both merged). This change (branch
`drylake/consultation-email-redesign`) implements **Task 1 only**. Nothing here is merged,
deployed, enabled or changed in DNS.

## 1. Current implementation assessment

| Area | State on `main` (3c1a256) | Evidence |
|---|---|---|
| Booking, management, reminders | Live: Supabase tables + RPCs, durable email outbox, minute cron, 24-hour reminder, signed manage links (hash stored, never the token) | `lib/consultations/*`, `supabase/migrations/20261013120000_*`, `20261014090000_*` |
| Double booking | Prevented **in the database**: GiST exclusion on `(assigned_representative, tstzrange(start,end))`, `FOR UPDATE` row locks on change, an advisory lock per customer email | migration `20261014090000`, lines 88, 227, 319, 435 |
| Two-hour policy | `CUSTOMER_CHANGE_CUTOFF_MINUTES = 120`, enforced server-side, message in `outcomes.ts` | `lib/consultations/rules.ts` |
| Emails | 8 kinds on the shared layout, plain-text part, escaping, no em dashes, Perth time named. Weak hierarchy (date same size as every row), one button style, Teams URL **printed as text** in founder notices (breaks the design-system rule), not covered by the design-system test | `lib/email/consultation-emails.ts` before this change |
| Microsoft 365 / Teams | **Already built and tested, switched off** (`CONSULTATION_CALENDAR_PROVIDER` unset = `none`). App-only Graph, `getSchedule` free/busy for both mailboxes (uncached at booking), event per booking with `isOnlineMeeting` (Teams link from the event), tag-based idempotent sync queue with leases and backoff, cancel/move/reassign, founder alert after 10 failures, admin Retry button, Teams link shown in the admin portal, Teams confirmation waits up to 10 minutes for the link and never claims one that does not exist | `lib/consultations/calendar/*`, `calendar-sync*.ts`, `tests/consultation-m365.test.mjs`, `docs/operations/consultations.md` "Microsoft 365" |
| Sender | Resend, From on `drylake.com.au` (DKIM `resend._domainkey`, return path `send.` and `rsend.drylake.com.au`), Reply-To `hello@drylake.com.au` | DNS below, `lib/consultations/dispatch-server.ts` |

**Task 2 is therefore configuration and verification, not new code.** Its remaining work is the
tenant setup and the eight go-live checks, none of which has been run against the real tenant.

## 2. Architecture and approach

### Task 1 (this change)

- `renderEmailLayout` gains `header: "dark"`: a charcoal band (`#1a1a17`, `--color-ink-3`) with
  the official dark-background lockup flattened onto that charcoal
  (`public/brand/drylake-email-logo-dark.png`, built by the existing `scripts/build-email-logo.mjs`
  from `drylake-lockup-dark-bg.png`; no new artwork), then a 4 px orange rule. Default stays
  `"light"`, so invitation, invoice and enquiry emails are byte-for-byte unchanged in design.
- `button` gains `variant: "secondary"` (off-white on charcoal, 15:1).
- New reusable `lib/email/appointment-blocks.ts`: `appointmentCard`, `notice`, `sectionLabel`,
  `textSection`, `textRows`. One component set for all eight consultation kinds.
- `consultation-emails.ts` composes each kind from sections (HTML block + matching text lines),
  so HTML and plain text cannot drift in order or content.
- Buttons only for real destinations (Join Teams with the current event's join URL, Manage Booking
  with an accepted link, Open in Drylake admin on founder notices, Book a New Consultation on a
  customer cancellation). Every href is asserted.
- The two-hour policy is stated in every active customer email, from the same constant the server
  enforces.

### Task 2 (configure, then verify; no code change proposed)

Keep the merged design. It already meets every requirement in the brief:
availability from both Outlook calendars, assignment rules unchanged, Teams event and real join
URL, Exchange sends invitations/updates/cancellations to the customer, Teams link in the email and
admin, cancellations and moves synced (PATCH start/end only, so the Teams link survives), DB-level
double-booking prevention, retries/backoff/alerts, token cache server-side, no credential reaches
the browser, no claim of a Teams link that does not exist, two-hour policy untouched, off until
configured. Turning it on is a Vercel env change and a redeploy, after the setup and checks below.

### Task 3 (sender avatar)

The avatar is chosen by the receiving mailbox provider from the sender's identity, never from the
email HTML. Options in section 3.

## 3. Credentials and configuration

### Microsoft 365 (Task 2)

| Item | Value | Who |
|---|---|---|
| Entra app registration | "Drylake consultation calendar", single tenant, no redirect URI | tenant admin (Ben or Wilson) |
| Credential | Client secret, 12 months; expiry date on the calendar (a lapsed secret = no times offered) | tenant admin |
| Graph API permissions in Entra | **None.** Do not grant `Calendars.*`: Entra grants add to Exchange RBAC and would widen scope to every mailbox | tenant admin |
| Admin consent | Not required for Graph (no Graph permission). The authorisation is the Exchange RBAC-for-Applications assignment below, made by an Exchange admin | Exchange admin |
| Exchange RBAC | `New-ServicePrincipal`, `New-ManagementScope` (wilson@ and benedict@ only), `New-ManagementRoleAssignment -Role "Application Calendars.ReadWrite"`, then `Test-ServicePrincipalAuthorization` InScope True for both, False for anyone else. Commands in `docs/operations/consultations.md` | Exchange admin |
| Licences | **Both** mailboxes need Exchange Online and Teams. **Blocker:** the tenant is a trial and the paid subscription from 2 Nov 2026 has ONE licence for two users. An unlicensed mailbox cannot be read, so that representative would never be offered | Ben (purchase) |
| Vercel Production env | `MS_GRAPH_TENANT_ID`, `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_CLIENT_SECRET` (server-only), then `CONSULTATION_CALENDAR_PROVIDER=microsoft` and redeploy | Ben or Wilson, after approval |

### Task 1

No new credentials. The dark logo is served from the production origin once deployed
(`https://drylake.com.au/brand/drylake-email-logo-dark.png`).

### Task 3: sender, DNS and BIMI (read-only lookups, 2026-10-15, resolver 1.1.1.1)

| Record | Value | Verdict |
|---|---|---|
| Provider | Resend (`*.forge.rmta.net` return path, SES feedback MX) | |
| SPF `drylake.com.au` | `v=spf1 include:spf.protection.outlook.com -all` | Covers M365. Resend's SPF lives on its return-path subdomains, which align with drylake.com.au under relaxed alignment |
| SPF `send.drylake.com.au` | `v=spf1 ip4:52.3.252.119 ip4:44.222.39.36 ip4:199.249.231.0/24 ~all` | OK |
| SPF `rsend.drylake.com.au` | `v=spf1 include:amazonses.com ~all` | OK (a second Resend return path, ap-northeast-1). Confirm in the Resend dashboard which domain `EMAIL_FROM` uses; I cannot read Vercel env from here |
| DKIM Resend | `resend._domainkey.drylake.com.au` RSA key present | DKIM `d=drylake.com.au`, aligned |
| DKIM M365 | `selector1/2._domainkey` CNAMEs to the d-v1 targets, enabled in Defender (6 Oct) | OK |
| DMARC | `v=DMARC1; p=none; rua=mailto:benedict@drylake.com.au` | **Monitoring only. BIMI needs `p=quarantine` or `p=reject` at 100 %** |
| BIMI | `default._bimi.drylake.com.au` absent | Not set up |

**What can and cannot show the Drylake logo as the avatar**

| Route | Where it shows | Cost | Requirements | When |
|---|---|---|---|---|
| Google account photo on the exact From address | Gmail (web and apps) only, at Google's discretion | Free | The From address must be a real mailbox that can receive Google's verification code. A Resend send-only address cannot, so the From would move to an M365 address (or alias) that receives mail, then "Create account, use my existing email" on that address and set the square-padded logo as the photo (Gmail crops to a circle). Whether Gmail uses it for bulk/app mail is not guaranteed | Now, after Ben approves changing the From address |
| BIMI with a **CMC** (Common Mark Certificate) | Gmail avatar; not Apple Mail | about US$650 to 1,100 per year | DMARC enforced; SVG Tiny PS logo; the logo shown publicly on drylake.com.au for **12 months** (site public since late Sep 2026, so roughly Oct 2027) | ~Oct 2027 |
| BIMI with a **VMC** (Verified Mark Certificate) | Gmail avatar with the blue tick, Apple Mail, Yahoo | about US$750 to 1,750 per year | DMARC enforced; SVG Tiny PS; the logo a **registered trade mark** (IP Australia: Drylake has none yet; examination to registration is typically 7+ months) | After the trade mark registers |
| BIMI without a certificate (self-asserted) | Yahoo/AOL only, for senders they judge high-volume and reputable | Free | DMARC enforced, BIMI record, SVG | Unlikely at Drylake's volume |
| Outlook / Outlook.com / Exchange | No inbound BIMI support; only the recipient's own contact photo | | | Not controllable by the sender |

**HTML cannot set the avatar.** The logo inside the email body (this change) is unrelated to the
round inbox avatar.

**Immediately possible (still needs Ben's approval, nothing done):** move DMARC to `p=quarantine`
on the planned 20 Oct date if the aggregate reports show Resend, M365 and Clerk all passing
(Clerk's `clk*` mail must pass first); prepare the SVG Tiny PS logo; decide the From address for
the Google-photo route. **Needs external verification or payment:** CMC or VMC purchase, trade mark
application, and the 12-month public-logo history for a CMC.

## 4. Files

### Changed in this change (Task 1)

| File | Change |
|---|---|
| `lib/email/layout.ts` | `header: "dark"`, `charcoal` / `onDark` tokens, `EMAIL_FONT` export, `button` `variant`, mobile row stacking |
| `lib/email/appointment-blocks.ts` | New: reusable appointment components |
| `lib/email/consultation-emails.ts` | Rebuilt on the components; `adminUrl`; `CHANGE_POLICY`; no printed URLs |
| `lib/consultations/dispatch.ts` | Passes `adminUrl` on founder notices only |
| `lib/consultations/calendar/microsoft-graph.ts` | Invitation text names the Manage Booking button (wording only; off until M365 is on) |
| `scripts/build-email-logo.mjs`, `public/brand/drylake-email-logo-dark.png` | Builds the dark logo from the official lockup; the light logo is regenerated byte-identical |
| `tests/consultation-email-design.test.mjs` | New: 8 kinds x 2 methods against the design-system rules, every href, policy, buttons, contrast, logo asset |
| `tests/consultation-booking.test.mjs`, `tests/email-design-system.test.mjs` | "Manage Booking" wording; consultation renderer added to the shared-layout check |
| `docs/email/README.md` | Inventory, dark header, new blocks |

### Would change for Task 2

None in code. Vercel env only, after the tenant setup.

### Would change for Task 3

DNS only (DMARC, then a BIMI TXT record), and possibly `CONSULTATION_EMAIL_FROM` for the Google
photo route. Each is Ben's decision; none is made here.

## 5. Implementation sequence

1. **Task 1 (this PR):** review, Wilson merges, deploy. Then one real send per client (below).
2. **Task 2:** buy the second licence; tenant admin runs the setup; Exchange cache settles
   (up to 2 hours); Ben approves enabling; set Vercel env; redeploy; run go-live checks 1 to 8
   in `docs/operations/consultations.md` with an outside Gmail; rollback is
   `CONSULTATION_CALENDAR_PROVIDER=none`.
3. **Task 3:** read the DMARC aggregate reports; if clean, Ben approves `p=quarantine` (20 Oct
   plan); decide the From address and do the Google photo if wanted; decide CMC versus VMC (and
   the trade mark) on cost and timing.

## 6. Risks and testing

### Risks

| Risk | Mitigation |
|---|---|
| Outlook desktop (Word engine) ignores border-radius and some borders | Layout is tables + `bgcolor`; corners square there, colours and buttons survive. Needs a real Outlook check |
| Forced dark mode recolours the email | `color-scheme: light`; both logos opaque on their own background, so neither inverts into an unreadable mark |
| The dark logo URL 404s until this is deployed | Emails sent before the deploy use the old code and the light logo; nothing references the new file until the new code ships with it |
| Teams link missing at send time | Existing behaviour kept: wait up to 10 minutes, then send the "link will follow" notice, never a dead button |
| Admin link in founder email exposes the booking id | Founders only; the admin route requires sign-in; customers never receive it (tested) |
| M365 single licence | Blocker listed above; do not enable before it is resolved |
| New tenant outbound `5.7.708` | Exchange invitations may bounce externally at first; the Drylake (Resend) email still carries every detail and the link |

### Tests run (this change)

- `npm test`: 1,292 passed, 0 failed, including the 93 tests of the new
  `tests/consultation-email-design.test.mjs`.
- `tsc --noEmit` clean; ESLint clean on changed files.
- Chromium screenshots of all 9 rendered cases at 760 px and 375 px, no horizontal overflow at
  375 px: `docs/review/2026-10-15-consultation-emails/`.

### Still to test (needs a deploy or credentials, so not done here)

| Check | How |
|---|---|
| Real clients: Gmail web + iOS + Android, Outlook desktop + web, Apple Mail iOS + macOS | After deploy, book a test consultation to accounts on each; or a rendering service (Litmus / Email on Acid, paid) |
| Customer and founder delivery | Same test booking: both founders receive the new-booking notice; customer receives confirmation; then reschedule and cancel from the email link |
| Teams link generation, Outlook event creation, availability, reschedule, cancel, failure scenarios | The eight go-live checks in `docs/operations/consultations.md`, after Task 2 setup; failure path by temporarily revoking the role assignment on a test booking |
| Perth timezone | Unit-tested (Perth wall-clock in every kind); confirm in a real client set to another zone |
| Manage-link security | Existing tests (hashed token, version-bound, rejected after change); confirm the link stops working after a reschedule |
