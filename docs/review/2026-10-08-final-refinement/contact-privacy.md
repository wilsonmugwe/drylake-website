# Contact conversion + privacy (brief items 18, 19)

Date: 2026-10-08. Branch: `design/final-refinement-mobile-hero-seo`.

## Problems found

1. **Enquiries arrive labelled as billing mail.** `lib/email/contact-enquiry.ts:90` (before) sent with
   `from: getEmailFromAddress()`, the single `EMAIL_FROM` value that `lib/invoices/invoice-notifications.ts:231`
   also uses. The display name in that env var was set for invoices, so every "Start a conversation"
   enquiry showed in the inbox as Drylake billing. The production value of `EMAIL_FROM` cannot be read
   from the repo or WSL; the diagnosis is from the code path (one shared sender, no per-mail name).
2. **"Budget" on the enquiry path.** The form's "What kind of help are you looking for?" select was
   `id/name="budget"` (`components/forms/ProjectForm.tsx:240-242`), posted as `budget`
   (`ProjectForm.tsx:81`), and printed in the enquiry email as a **"Budget"** row
   (`lib/email/contact-enquiry.ts:54`). The answers are engagement types, never money, so the email
   row was wrong and the internal name leaked into the payload and DOM.
3. **No focus or scroll after a successful send.** `ProjectForm.tsx:94-96` swapped the tall form for
   the confirmation but left focus on a removed button and the scroll position unchanged. On phones the
   visitor was left looking at whatever slid up (usually the footer), with no announcement beyond the
   `role="status"` region.
4. **Stale privacy wording.** `app/privacy/page.tsx:135-137` said a privacy email "will be published once
   Drylake's business email service is activated". Business email is live (`hello@drylake.com.au`,
   `lib/site.ts:9`). The page also gave no complaint route to the regulator (APP 1.4(e)).

## Changes

- `lib/email/contact-enquiry-sender.ts` (new, pure): `enquiryFromAddress()` keeps the **same verified
  address** from `EMAIL_FROM` but sets the display name "Drylake website enquiries". Optional
  `CONTACT_EMAIL_FROM` overrides it. No Resend or DNS change needed. Throws when no address exists.
- `lib/email/contact-enquiry.ts`: uses that sender; subject is now "New website enquiry: <name>"
  (portal messages keep "Client message"); rows "Topic" and "Help wanted" replace "Project type"
  and "Budget". Invoice email untouched (still `getEmailFromAddress()`).
- `budget` renamed `helpType` through `ProjectForm.tsx`, `lib/contact/submit-enquiry.ts`,
  `lib/contact/validate-enquiry.ts`, `app/api/contact/route.ts` and `components/client/MessageDrylake.tsx`
  (one line, outside my nominal scope, needed for the shared `EnquiryPayload` type).
  **Backward compatible:** the validator reads `helpType`, falling back to a legacy `budget` key, so a
  tab opened before the deploy still delivers its answer. Same length and line-break rules apply.
- `ProjectForm.tsx`: after success the confirmation panel (`tabIndex=-1`, `scroll-mt` under the fixed
  nav) is scrolled into view (instant under `prefers-reduced-motion`, smooth otherwise) and focused with
  `preventScroll`, so the two never fight.
- `app/privacy/page.tsx`: section 10 now gives `CONTACT_EMAIL` as a mailto link ("mention Privacy in the
  subject") and the OAIC complaint route (oaic.gov.au). "Last updated" moved to 8 October 2026.
  No address invented.

## Tests

- New `tests/contact-enquiry.test.mjs` (sender name/address parsing, CONTACT_EMAIL_FROM precedence,
  fail-loud, invoice email still on the shared sender, no `budget` in form/API/email code).
- `tests/security-hardening.test.mjs`: fixture uses `helpType`; new case for the legacy `budget` key
  (read, bounded, no line breaks, not echoed).
- `tests/e2e/contact-form.spec.ts`: new "confirmation is focused and in view, and no budget is sent".
- `tests/e2e/accessibility.spec.ts`: keyboard order expects `helpType`.
- Run: `node --test tests/contact-enquiry.test.mjs tests/security-hardening.test.mjs tests/client-workspace.test.mjs`
  **94 pass / 0 fail**. `tsc --noEmit`: no errors in these files (only a stale `.next/types` entry for
  another fork's in-progress `app/solutions/[slug]`). eslint on all touched files: clean.
  **E2E not run by this fork** (build owned by the parent); the two e2e edits need the full run.

## Not done, and why

- **Thank-you URL** (pre-launch checklist #4 wants a distinct URL for attribution). The brief asks for
  an in-place transition to "Thanks for reaching out"; there is no analytics conversion event in the
  repo today, so nothing regressed. Worth a decision once analytics is wired.
- **Sub-processor list on the privacy page** (Clerk, Supabase, Resend, Cloudflare Turnstile, Vercel,
  Stripe). Not stale wording but missing content; it is a policy decision for Ben and should be checked
  against real hosting regions before publishing (Vercel functions run in iad1).
- **`docs/operations/contact-form.md`** does not yet mention optional `CONTACT_EMAIL_FROM`; outside
  this fork's file scope.

## Risks

- If production `EMAIL_FROM` is a bare address with no display name, the inbox label was coming from
  the mailbox itself (e.g. an Outlook contact named "Drylake billing" for that address). The new display
  name still changes what most clients show, but **confirm with one real enquiry after deploy**.
- A process note: this fork briefly ran `git stash` / `git stash pop` on the shared working tree to
  compare a test against baseline. The pop restored cleanly (status re-checked), but if another fork
  wrote a tracked file in that second it would have surfaced as a pop conflict; none did.
