# Improvement program audit and PR plan (2026-10-16)

Scope: the 10-PR "final production website improvement program" brief (Parts A to N), audited
against `main` at `b6ab5b4` (PR #71) and against production (`/api/health` reports commit
`b6ab5b4`, region syd1, `missingRequired: 0`). Read-only: nothing was changed, deployed or
enabled to produce this report.

Confidence: **HIGH** = measured on production or read in code; **MEDIUM** = vendor documentation
or inference not yet proven on this tenant; **NONE** = not established.

## 1. Headline

Most of Parts B to F already exist on `main`, built in PRs #61, #62 and #69 to #71 between
10 and 15 October. The program is therefore mostly **verification, configuration and new public
content**, not rebuilding. The largest new work is location SEO (Part G), the secondary-page
redesign (Part I) and the navigation (Part J).

## 2. State per brief part

| Part | Requirement | State | Confidence | Evidence |
|---|---|---|---|---|
| B/D | 30-min slots, Mon/Tue/Fri, 9:00 to 17:00 Perth, full duration inside hours | **Done.** Starts 9:00 to 16:30 | HIGH | `lib/consultations/rules.ts`; prod availability returns 30-min UTC slots |
| B/D | Assign to a free representative, no double booking | **Done**, enforced in the database (GiST exclusion per representative, row locks, advisory lock per email). Fewest-upcoming then Wilson first | HIGH | migration `20261014090000`; `tests/db/*` (two concurrency races) |
| B/D | Cancel or reschedule until 2 hours before; slot released | **Done** server-side | HIGH | `CUSTOMER_CHANGE_CUTOFF_MINUTES = 120` |
| B/D | Confirmation, manage link, change notices, 24-hour reminder, admin notices | **Done**, durable outbox with retries | HIGH (code) / **NONE (prod delivery of reminders)** | `docs/operations/consultations.md` |
| D | Reminder timing | Depends on the pg_cron minute trigger. Whether it is scheduled in production is **not established** | NONE | ops doc step 4 |
| D | Admin view, cancel, reschedule, reconciliation status | **Done** (`/admin/consultations`) | HIGH (code), admin screens not exercised in prod | |
| D | No times available: contact form + email | Present per ops doc (503 shows email fallback); empty-calendar UX **not verified on screen** | MEDIUM | |
| C | Microsoft 365 availability, events, Teams links, cancel, move, reassign, crash recovery | **Built and tested with mocks, switched OFF** (`CONSULTATION_CALENDAR_PROVIDER` unset) | HIGH (code) / **NONE (live tenant)** | `lib/consultations/calendar/microsoft-graph.ts`, `tests/consultation-m365.test.mjs` |
| C | Least privilege: no Graph permission, Exchange RBAC scoped to two mailboxes | Matches the brief's tenant state (scope + role assignment, unscoped grant removed) | MEDIUM (from brief, not re-tested here) | ops doc "Microsoft 365 setup" |
| C | Live go-live checks 1 to 8 | **None run** | NONE | ops doc "go-live checks" |
| E | Branded emails, appointment card, real-destination buttons, no long URLs | **Done** (PR #71) | HIGH (code) | `lib/email/appointment-blocks.ts` |
| E | Rendering across real mail clients | Previews exist; no real-client matrix | MEDIUM | `docs/review/2026-10-15-consultation-emails/` |
| E | Sender avatar / BIMI | Assessed: blocked on DMARC enforcement (still `p=none`) + CMC/VMC certificate | HIGH | `docs/superpowers/specs/2026-10-15-consultation-emails-teams-avatar.md` |
| F | Titles, descriptions, canonicals, OG image, JSON-LD on every public page | **Done**: checked live on 9 routes, all unique, all self-canonical, OG + 4 JSON-LD blocks each | HIGH | live fetch 2026-10-16 |
| F | Sitemap, robots, private routes excluded | **Done**: 14 URLs; `/api /admin /client /portal /sign-in /sign-up /consultation/manage` disallowed | HIGH | live |
| F | IndexNow | **Done** (key file served) | HIGH | `lib/discovery/indexnow.ts` |
| F | Bing verification | Meta tag wired to `BING_SITE_VERIFICATION` env | HIGH (code) / NONE (account) | `app/layout.tsx:111` |
| F | Google Search Console, Google Business Profile, Bing Places | Account work, **not established** | NONE | |
| F | Analytics: booking start, booking complete, CTA clicks | **Missing.** Only an enquiry-submitted event exists (`lib/analytics/enquiry-event.ts`) | HIGH | |
| G | 35 mandatory + expanded areas, location architecture | **Missing.** Only `/perth` exists; no service-area registry | HIGH | sitemap |
| H | AI crawler access | **Done by decision D-3**: training crawlers (GPTBot, ClaudeBot, ...) blocked; search/answer crawlers (OAI-SearchBot, Claude-SearchBot, PerplexityBot) fall under `*` and are allowed. ChatGPT search and Claude search use the search crawlers, not the training ones | HIGH (robots) / MEDIUM (vendor docs) | `docs/discoverability/README.md` |
| H | llms.txt, llms-full.txt, Markdown for agents | Present | HIGH | `app/llms*.txt`, `/api/markdown` |
| H | AI visibility monitoring | **Missing** (no repeatable question set) | HIGH | |
| I | Premium secondary pages | Pages exist with real copy; the redesign brief is **not done** | HIGH | |
| J | Services dropdown, Services vs Solutions clarity | **Missing.** Nav is 4 home anchors + Client Login + CTA | HIGH | `lib/navigation/*.ts` |
| J | Five service pop-ups as in-page dialogs | **Done** (native Popover API, PR #68) | HIGH | |
| K | Mobile clipping, a11y, CWV | Large prior work (PRs #31 to #41, #68 clipped tile); prod Lighthouse ~90 | HIGH | `tests/e2e/accessibility.spec.ts` |

## 3. Blockers and risks found

1. **Benedict and Teams (decision).** On 16 Oct the plan became: one paid licence to Wilson,
   benedict@ converted to a shared mailbox before 2 Nov. A shared mailbox's calendar can likely
   still be read and written by the app (shared mailboxes need no licence) [MEDIUM], but a Teams
   meeting needs a Teams-licensed organiser, so Teams consultations assigned to Benedict would get
   no join link [MEDIUM]. The existing ops doc says "an unlicensed mailbox cannot be read", which
   is too strong for a shared mailbox and will be corrected in PR 1. Options are in section 5.
2. **Exchange outbound from this tenant bounces externally (5.7.708)** for Graph-originated mail
   (seen 13 Oct). Exchange's own meeting invitations to customers are Graph-originated, so they may
   bounce until the trial converts or Microsoft grants an exception [MEDIUM]. Drylake's Resend
   emails carry the Teams link independently, so the customer still gets it.
3. **Benedict cannot be a GitHub reviewer on these PRs.** Benedict's GitHub account
   (`MshikadauMgigi`) is the account these PRs are opened from, and GitHub does not allow a PR's
   author to be requested as its reviewer or to approve it. Reviewer on every PR: `wilsonmugwe`.
4. **No Vercel preview for these PRs.** Vercel rejects previews for commits authored by
   `MshikadauMgigi` (not a member of the Vercel project). Review evidence comes from local
   production builds, screenshots and the e2e suite; production is checked only after Wilson merges.
5. **Reminder liveness unknown.** If the pg_cron minute job is not scheduled, 24-hour reminders
   only go out from the daily 06:00 backstop, which misses most appointments.
6. **Doorway-page risk in Part G.** 70 near-identical suburb pages is the pattern Google's spam
   policy calls doorway pages and would put the whole domain at risk. The brief already forbids
   it; the plan below enforces it with a test.

## 4. PR plan and dependencies

| # | PR | Builds on | Parallel-safe with | Main work |
|---|---|---|---|---|
| 1 | M365 live verification + least-privilege proof | none | 3, 4, 5, 6, 8 | A read-only verification script (token, `getSchedule` for both mailboxes, out-of-scope mailbox must fail), then go-live checks 1 to 8 with the real tenant, ops doc corrected for shared mailboxes, Teams routing per decision D-A |
| 2 | Booking hardening + admin screens | 1 (for Teams routing) | 3 to 8 | Teams-capable assignment rule, empty-calendar fallback check, admin-screen e2e, reminder liveness check surfaced on `/api/health` |
| 3 | Email polish | 2's data model (unchanged so far) | 4 to 8 | Real-client rendering matrix, contact-form confirmation on the same blocks, BIMI path written up (no DNS change) |
| 4 | Analytics events + search console setup | none | all | `booking_started`, `booking_completed`, CTA click events (no personal data), GSC/Bing/GBP/Bing Places runbook |
| 5 | Location SEO | 4 (sitemap/metadata helpers are shared) | 6, 8 | `lib/service-areas.ts` registry (~75 areas with region, type and audience), `/perth` directory, N standalone pages per decision D-B, a test that fails on near-duplicate location copy |
| 6 | AI discoverability | 5 (areas in llms.txt) | 8 | Business identity consistency test across pages, llms.txt refresh, `docs/discoverability/ai-visibility-monitoring.md` with the question set and a dated baseline |
| 7 | Secondary-page redesign | 5 (location layout), 8 (nav) | none | `/perth`, `/services`, service pages, `/solutions`, `/about`, `/contact`, location layouts |
| 8 | Navigation + conversion | none | 1 to 6 | Services dropdown (keyboard + mobile), Services vs Solutions labels, click-to-call on the verified business line |
| 9 | Responsive, a11y, performance pass | 7, 8 | none | Full matrix on the combined pages, CWV before/after on prod |
| 10 | Security + readiness report | all | none | Final regression, readiness report, rollback plan |

Merge order: 1, 4, 8 → 2, 3, 5 → 6 → 7 → 9 → 10. Every PR goes to `wilsonmugwe`; nothing is
merged, deployed or enabled without the owner's explicit approval.

## 5. Decisions the owner must make

- **D-A Teams and Benedict.** (a) Buy a second licence for Benedict (Business Basic includes
  Exchange and Teams; check the price in the admin centre); (b) keep the shared-mailbox plan and
  route every Teams consultation to Wilson, Benedict takes phone consultations only; (c) Wilson is
  the only representative.
- **D-B Location pages at launch.** Recommended: all ~75 areas in a structured `/perth` directory,
  plus 8 standalone pages with genuinely distinct content (Osborne Park, Malaga, Canning Vale,
  West Perth, Joondalup, Fremantle, Rockingham, Midland), adding more only when there is distinct
  content to justify them.
- **D-C Who runs the tenant steps** (client secret into Vercel already done per the brief;
  `CONSULTATION_CALENDAR_PROVIDER=microsoft` flip, go-live booking test with a real outside address,
  pg_cron check in Supabase). These need Ben's or Wilson's admin sessions.

## 6. External configuration (cannot be done from the repo)

| Item | Who | Notes |
|---|---|---|
| Microsoft 365 licence change before 2 Nov | Ben | Decision D-A |
| `CONSULTATION_CALENDAR_PROVIDER=microsoft` + redeploy | Ben or Wilson | Only after PR 1's read-only checks pass |
| pg_cron minute job | Supabase admin | `docs/operations/sql/2026-10-13-consultation-dispatch-cron.sql` |
| Google Search Console, Bing Webmaster Tools | Ben | DNS TXT or the existing Bing meta env |
| Google Business Profile, Bing Places | Ben | Service-area business, address hidden; GBP still verifies an address privately |
| DMARC to `p=quarantine` | Ben | Scheduled 20 Oct; prerequisite for BIMI |
