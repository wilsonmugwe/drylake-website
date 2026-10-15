# Drylake email design system

Every email the application itself sends is built from one layout: `lib/email/layout.ts`.
Last reviewed 2026-10-15 (consultation emails redesigned on the charcoal header).

## Inventory (audited 2026-10-09)

### Sent by the application (Resend), all on the shared layout

| Email | Trigger | Recipient | Renderer | Sender code |
|---|---|---|---|---|
| Client workspace invitation | Admin invites a contact (Admin → Clients); Clerk emits `email.created` | Invited client contact | `lib/email/client-invitation-email.ts` | `app/api/clerk/webhook/route.ts` |
| Invoice issued | Admin issues an invoice | Client billing email | `lib/email/invoice-email.ts` (`kind: "ISSUED"`) | `lib/invoices/invoice-notifications.ts` |
| Invoice reminder / overdue | Admin sends a reminder | Client billing email | `lib/email/invoice-email.ts` (`kind: "REMINDER"`) | `lib/invoices/invoice-notifications.ts` |
| Website / portal enquiry | Contact form or "Message Drylake" in Workspace | Drylake inbox (`CONTACT_TO_EMAIL`), Reply goes to the enquirer | `lib/email/contact-enquiry-email.ts` | `lib/email/contact-enquiry.ts` |
| Consultation: confirmation, reschedule, cancellation, 24-hour reminder | Booking / change / cron | Customer (Reply goes to `hello@`) | `lib/email/consultation-emails.ts` (`header: "dark"`) | `lib/consultations/dispatch.ts` (outbox) |
| Consultation: new booking, reschedule, cancellation, calendar sync failed | Same | Both founders (Reply goes to the customer) | same | same |

### Not present in the application (checked, not built)

Invitation reminders, workspace activation confirmations, payment confirmations or receipts,
project creation, milestone, status, document or handover notifications, and enquiry
acknowledgements to the enquirer. None of these has a trigger in the code today. They were
deliberately **not** added in the design-system PR (no new notification workflows). When one is
built, it uses the layout below.

### Sent by providers (configured in their dashboards, not in this repo)

| Provider | Email | Where to configure | Recommendation |
|---|---|---|---|
| Clerk | Verification code (sign-in / sign-up OTP) | Clerk Dashboard → Customization → Emails → Authentication; branding at Customization → Branding | Keep **Delivered by Clerk ON** (security-critical, Clerk owns deliverability). Set the app logo to `public/brand/drylake-email-logo-light.png` and the primary colour to `#f26a2e` so it matches |
| Clerk | Organization invitation | Same page, Organizations tab | **Delivered by Clerk OFF** (since 2026-10-09). Our webhook sends the branded version. Turning it back on makes the webhook skip with `reason: delivered_by_clerk` (logged as a warning) |
| Clerk | Organization invitation accepted | Organizations tab | Clerk-delivered. Client orgs have no admin members (Drylake staff are not added), so in practice it has no recipient |
| Clerk | Invitation (application-level) | Authentication tab | Unused by Drylake; keep **Delivered by Clerk ON** so it never silently goes nowhere |
| Stripe | Payment receipt after Checkout | Stripe Dashboard → Settings → Customer emails ("Successful payments"); branding at Settings → Branding | Stripe sends the receipt. **Do not** add an application receipt, or clients get two. Set Branding: icon `drylake-mark-512.png`, logo `drylake-email-logo-light.png`, brand colour `#f26a2e`, accent `#0b0b0a` |
| Microsoft 365 | Human mail from @drylake.com.au | Outlook signatures (drylake-brand-kit) | Out of scope for this system |

## The layout

`renderEmailLayout({ title, preheader, eyebrow, heading, bodyHtml, assetOrigin, legalLine?, header? })`

- **`header: "dark"`** (consultation emails): a charcoal (`#1a1a17`, `--color-ink-3`) band with
  `drylake-email-logo-dark.png`, the approved dark-background lockup flattened onto that exact
  charcoal (same script, same size as the light one), over a 4 px Drylake orange rule. `bgcolor`
  is set as well as CSS for Outlook desktop. The card body stays white.
- **Header (default `"light"`):** `drylake-email-logo-light.png`. This is the approved light-background lockup
  (dark "Drylake" wordmark) flattened onto opaque white by `scripts/build-email-logo.mjs`, so a
  client that forces dark mode still shows it on a white chip. There is no extra text label.
- **Eyebrow + heading:** the eyebrow is orange-ink (`#b83f0c`), uppercased with CSS so the
  underlying text and screen readers keep the real words.
- **Footer (every email):** Drylake Pty Ltd · Perth, Western Australia · hello@drylake.com.au ·
  0433 448 000 · drylake.com.au. `legalLine` adds the ABN on invoices (a tax invoice must show it).
- **Plain text:** every renderer returns `text`; `textFooter()` matches the HTML footer.

### Blocks

| Block | Use |
|---|---|
| `paragraph(text, { muted?, small? })` | Body copy |
| `button({ href, label, variant? })` | `primary` (default): the one main action, ink on Drylake orange (6.9:1). `secondary`: off-white on charcoal (15:1), for a second real action. Full width on phones |
| `fallbackLink({ href, linkText })` | "Button not working? *Open your … in your browser*." Same destination as the button; **the URL is never printed** |
| `checklist({ title, items })` | What the client gets (invitation) |
| `detailTable(rows)` | Label/value pairs; `emphasis: true` for a total line |
| `messageBlock({ title, text })` | Free text with line breaks kept (enquiries) |

All arguments are plain text and are escaped by the block.

Appointment blocks (`lib/email/appointment-blocks.ts`, consultation emails):

| Block | Use |
|---|---|
| `appointmentCard({ title, date, time, zone, rows, inactive? })` | The appointment at a glance: date 20 px bold, time, zone, then hairline rows (stack label-over-value on phones). Orange top rule when active; muted and struck through when `inactive` (cancelled) |
| `notice({ title, text, tone? })` | Titled note with a left rule: `action` orange (how to join, Teams link to follow), default charcoal (policy, reason) |
| `sectionLabel(text)` | Small uppercase heading between sections |
| `textSection(title, lines)`, `textRows(rows)` | The plain-text part in the same order as the HTML |

**Buttons only for real destinations.** Join Microsoft Teams Meeting appears only with the join URL
of the CURRENT calendar event; Manage Booking only with a link the database accepts; Open in
Drylake admin only on founder notices; Book a New Consultation only on a customer cancellation.
`tests/consultation-email-design.test.mjs` asserts every href in every kind and method.

### Adding a new email

1. Write a pure renderer in `lib/email/<name>-email.ts` that returns `RenderedEmail` using the blocks.
2. Send it through `getResendClient()` with `replyTo: CONTACT_EMAIL` (sender addresses have no mailbox).
3. Add it to `EMAILS` in `tests/email-design-system.test.mjs`: footer, contrast, mobile,
   no-printed-URL and no-em-dash checks then cover it automatically.
4. Add it to the inventory above.

## Invitation links: short branded links considered and not built

Option: `https://drylake.com.au/invite/<token>` redirecting to Clerk's ticket URL.

**Recommendation: do not build it now.** The visible problem (a long ticket URL printed in the
email) is solved by hiding the URL behind link text. A redirector would:

- store Clerk tickets (bearer credentials for account creation) at rest in our database, a new
  leak surface that does not exist today;
- need a second expiry and single-use state that must stay in sync with Clerk's;
- add a public endpoint that has to be rate-limited against token guessing.

Revisit only if invitations must go out by SMS or other plain-text channels where a hyperlink
is impossible. The design then is: 32-byte random opaque token, only its SHA-256 stored,
expiry ≤ the Clerk invitation's, marked used on first redirect, redirect target restricted to
`isTrustedAcceptUrl`, never logged.

## Dark mode

The emails declare `color-scheme: light`. Clients that force dark mode anyway (Gmail apps,
Outlook.com) invert backgrounds and text; the logo PNG is opaque white so it stays legible.
Simulated in `docs/review/2026-10-09-email-design-system/after-invitation-dark-sim.png`.
A real-client check (Gmail iOS/Android, Outlook desktop/web, Apple Mail) is a manual step.
