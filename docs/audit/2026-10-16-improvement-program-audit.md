# Improvement program audit and PR plan (2026-10-16, revision 2)

Scope: the 10-PR "final production website improvement program" brief, audited against `main` at
`b6ab5b4` (PR #71) and against production (`/api/health` reports commit `b6ab5b4`, region syd1,
`missingRequired: 0`).

**Revision 2 (2026-10-16, later the same day)** folds in the owner's corrections brief: D-A
resolved (both representatives licensed, no purchase), D-B widened (all 35 mandatory areas, ~70+
total), new "near me" / Google Business Profile / Bing Places requirement, broad AI ecosystem
discoverability, secondary-page redesign as a major deliverable, and four administrative
investigations (GitHub invitations, Vercel previews, reminders, 5.7.708). This document is
**planning only**. It is not completion of the programme: implementation PRs follow it (section 9).

Confidence: **HIGH** = measured on production or read in code; **MEDIUM** = vendor documentation
or inference not yet proven on this tenant; **NONE** = not established.

Status vocabulary used below: **Implemented** (code on `main`), **Mock-tested** (automated tests
with mocked external services), **Live-verified** (observed working against the real tenant or
production), **Unverified**.

## 1. Headline

Most of the booking and email work already exists on `main` (PRs #61, #62, #69 to #71, verified
in code on 2026-10-16: `lib/consultations/**`, `lib/consultations/calendar/microsoft-graph.ts`,
`lib/email/appointment-blocks.ts`, `tests/consultation-m365.test.mjs`). **None of the Microsoft 365
path is live-verified**: the provider is switched off in production. The largest new work is local
SEO (35+ areas), navigation, the secondary-page redesign, and verification of the booking path
against the real tenant.

## 2. Status matrix: the 10 workstreams

| # | Workstream | Existing PRs | Implemented | Mock-tested | Missing | Live verification outstanding | New PR(s) | Depends on / blocked by | Next action |
|---|---|---|---|---|---|---|---|---|---|
| 1 | M365 calendar + Teams | #69, #70 | Graph provider: availability, create with Teams, move, cancel, reassign, crash recovery outbox | Yes (`tests/consultation-m365.test.mjs`) | A runnable least-privilege + Teams verification tool | All 8 go-live checks (section 4.3); provider is OFF | **PR 1** `drylake/m365-live-verification` | Owner runs the script with Vercel creds (D-C) | Build script; owner runs it |
| 2 | Booking, scheduling, admin | #61, #62, #69, #70 | 30-min slots Mon/Tue/Fri 9:00 to 17:00 Perth; DB-enforced no double booking; 2-hour change cutoff; admin `/admin/consultations` | Yes, incl. two DB concurrency races (`tests/db/*`) | Reminder liveness on `/api/health`; admin-screen e2e; empty-calendar fallback check | Admin screens never exercised in prod; reminders unproven | **PR 2** `drylake/booking-hardening` | PR 1 (Teams routing) | After PR 1 |
| 3 | Email branding + comms | #71 | Branded templates, appointment card, real-destination buttons | Previews only | Real-client render matrix; contact-form confirmation on the same blocks; BIMI write-up | Delivery to Gmail/Outlook/Apple Mail not observed | **PR 3** `drylake/email-polish` | PR 2 data model | After PR 2 |
| 4 | Technical SEO + measurement | earlier SEO PRs | Unique titles/descriptions/canonicals, OG, JSON-LD on all 14 sitemap URLs; robots; IndexNow; Bing meta env | Discoverability check script | Booking + CTA analytics events; GSC/Bing/GBP runbook | GSC and Bing Webmaster accounts NONE established | **PR 4** `drylake/analytics-search-setup` | none | In progress |
| 5 | Perth + WA local SEO | none | `/perth` only | n/a | Service-area registry (35 mandatory + expansion), directory, standalone pages, near-duplicate guard | Indexing of new pages | **PR 5** `drylake/location-seo` | none (shares metadata helpers) | In progress |
| 6 | AI discoverability + topical authority | earlier GEO PRs | llms.txt, llms-full.txt, `/api/markdown`, search-crawler access | n/a | Repeatable multi-platform AI visibility test with dated baseline; identity consistency test; robots review (section 7) | Every platform | **PR 6** `drylake/ai-discoverability` | PR 5 (areas in llms.txt) | After PR 5 |
| 7 | Secondary-page redesign | none | Pages exist with real copy | n/a | The whole redesign (section 8) | Visual review on a preview | **PR 7a/7b** (split, section 8) | PR 5 (location layout), PR 8 (nav) | After 5 + 8 |
| 8 | Homepage, nav, conversion | #68 (service dialogs) | Service pop-ups (Popover API) | e2e | Services dropdown, Services vs Solutions clarity, footer hub, service-areas link, click-to-call | n/a | **PR 8** `drylake/navigation-conversion` | none | In progress |
| 9 | Responsive, a11y, performance | #31 to #41, #68 | Large prior pass; prod Lighthouse ~90 | `tests/e2e/accessibility.spec.ts`, responsive matrix | Re-run on new pages | CWV on prod after merge | **PR 9** | 7, 8 | Last but one |
| 10 | Security, regression, readiness | earlier security PRs | CSP, rate limits, RLS checks | e2e suite | Final regression + readiness report + rollback | Prod smoke after each merge | **PR 10** | all | Last |

PR #72 itself is docs-only and is **not** completion of any workstream.

## 3. Decisions

- **D-A Licences. RESOLVED 2026-10-16 (Ben, Microsoft 365 Admin Center).** wilson@ and benedict@
  both hold **Microsoft 365 Business Standard**. hello@, support@, accounts@ are unlicensed.
  **No licences are purchased or provisioned by this programme**, no replacement accounts are
  created, and shared mailboxes are never Teams organisers. Both representatives organise meetings
  from their own calendars. Residual check (not a purchase recommendation): the earlier note that
  the paid subscription starting 2 Nov carries one seat [MEDIUM, from 13 Oct]. Ben to confirm in
  Admin Center > Billing > Your products that the seat count after 2 Nov still covers both users;
  if it does, this risk is closed.
- **D-B Locations. REVISED 2026-10-16 (Ben).** All **35 mandatory areas** are represented in a
  navigable service-area directory, expanded to roughly **70+ genuine metro areas**. Standalone
  pages only where there is distinct useful content; first batch of 8 (Osborne Park, Malaga, Canning
  Vale, West Perth, Joondalup, Fremantle, Rockingham, Midland), promoted further as content allows.
  The 8 pages are the first batch, not the coverage limit.
- **D-C Who runs tenant steps.** Ben (tenant admin). This programme supplies exact instructions and
  a script; it never handles secrets.
- **D-D NEW, owner decision: AI crawler policy review** (section 7.2).
- **D-E NEW, owner decision: Vercel previews** (section 5.2).

## 4. Microsoft 365 and Teams

### 4.1 What was checked today

| Check | Result | Confidence |
|---|---|---|
| Benedict signed into M365 (delegated session) | benedict@drylake.com.au, display name "Benedict Wambugu" | HIGH |
| Wilson's calendar free/busy readable from Benedict's delegated session | Yes (Mon 19 Oct 9:00 to 10:00 Perth returned free) | HIGH |
| Mailbox time zone | "W. Australia Standard Time" (= Australia/Perth, UTC+8, no DST) | HIGH |
| Application (client-credentials) access limited to the two mailboxes | **Not tested here**: the client secret exists only in Vercel, never on this machine | NONE |
| Teams meeting creation via Graph as each rep | Not tested | NONE |

Note: the delegated free/busy check above proves the mailboxes exist and calendars are shareable
inside the tenant. It says **nothing** about the app's Exchange RBAC scope, which is what matters.
hello@ also returned free/busy, so its mailbox still exists while unlicensed (30-day grace or
retained); that is expected and is why the scope test below must check application access, not
mailbox existence.

### 4.2 Teams and Exchange service checks (Ben, Admin Center, ~5 minutes)

A licence alone does not prove Teams works. For **each** of wilson@ and benedict@:
1. Admin Center > Users > Active users > user > **Licenses and apps** > expand Business Standard >
   confirm **Microsoft Teams** and **Exchange Online (Plan 1)** service plans are ticked.
2. Teams admin center > Users > user > confirm not blocked; meeting policy allows scheduling.
3. Sign in to Teams as the user once; create a test meeting from Outlook; confirm it has a join link.
If Teams is unticked, that is the exact defect: tick it (no new licence needed; it is inside
Business Standard).

### 4.3 The 8 go-live checks and who runs them

| # | Check | Covered by | Owner |
|---|---|---|---|
| 1 | Token issued; only wilson@ + benedict@ readable; hello@/support@/accounts@ denied | `scripts/m365-verify.mjs` (PR 1) steps a to c | Ben runs |
| 2 | Teams event created with join URL, organiser = that rep | `m365-verify --write-test` | Ben runs |
| 3 | Representative-specific availability matches Outlook | script + one manual compare | Ben |
| 4 | Real booking from an outside address: Resend confirmation + Outlook invite + Teams URL | manual | Ben |
| 5 | Conflict prevention: event added in Outlook blocks the slot | manual | Ben |
| 6 | Cancel and reschedule update the Outlook event | manual | Ben |
| 7 | Perth time zone end to end | script step d + manual | Ben |
| 8 | Graph failure recovery (outbox retries, backoff) | mock-tested; live by revoking then restoring the scope is NOT recommended | accept mock + monitor |

Exchange Application RBAC stays least-privilege; the tenant-wide Graph `Calendars.ReadWrite`
permission stays removed. Nothing in this programme restores it.

### 4.4 Error 5.7.708 (investigated, separate from booking)

Observed 13 Oct: mail sent from the Claude Microsoft 365 connector to external recipients bounced
with `5.7.708 Service unavailable. Access denied, traffic not accepted from this IP`. Mail sent by
Ben from the Outlook app delivered. [HIGH for the observation.]
Cause: Microsoft routes outbound mail from new or trial tenants with low reputation through a
restricted pool and rejects some traffic with 5.7.708 [MEDIUM, Microsoft Learn NDR docs]. The tenant
is on a trial until 2 Nov.
Impact on booking: Drylake's customer emails go through **Resend**, which carries the Teams link,
so customers still get it. Exchange's own meeting invitations to external customers may bounce
until the restriction lifts [MEDIUM].
Owner steps: (1) Exchange admin center > Mail flow > Message trace on a bounced message to confirm
5.7.708; (2) re-test after the paid subscription starts; (3) if it persists, open a Microsoft support
request (Admin Center > Support) asking for the outbound restriction to be lifted. Do not route
customer mail through Exchange until it is resolved.

## 5. Platform investigations

### 5.1 GitHub collaboration invitations (done)

| Repo | Inviter | Result | Evidence |
|---|---|---|---|
| `wilsonmugwe/bronnie` | wilsonmugwe | **Accepted 2026-10-16** (was pending, write) | `gh api repos/wilsonmugwe/bronnie` shows push: true |
| `wilsonmugwe/abbicare` | wilsonmugwe | **Already accepted earlier**; no pending invitation | listed under `/user/repos?affiliation=collaborator`, push: true |

No code in either repository was changed.

### 5.2 Vercel preview deployments (cause found, owner decision D-E)

Every PR authored by `MshikadauMgigi` gets the Vercel status "Deployment was blocked"; merge commits
by Wilson deploy normally (e.g. PR #71's branch commit `07d8afe` blocked, merge `b6ab5b4` live).
Cause: the project lives in Wilson's personal **Hobby** scope (`vercel.com/wilsonmugwe/...`), and
Hobby does not support collaboration: commits authored by anyone other than the owner are blocked
[HIGH for the symptom, MEDIUM for the plan rule, from Vercel community threads; not from a log line
in the dashboard, which needs Wilson's login].
Options, least disruptive first:
1. **Status quo** (no cost): review evidence = local production builds, committed screenshots, e2e.
   Production checked only after Wilson merges.
2. **Wilson upgrades the project scope to Pro and adds Benedict as a member** (paid seat). The only
   route confirmed to unblock previews. Owner cost decision.
3. A GitHub Action that deploys previews with Wilson's token: community reports suggest Hobby blocks
   collaborator CLI deploys too, so this is **not recommended** without a test.
No security restriction is bypassed and production configuration is untouched.

### 5.3 Reminder scheduler

| Item | State | Confidence |
|---|---|---|
| Vercel cron | `0 22 * * *` UTC = **06:00 Perth daily** backstop (`vercel.json`) | HIGH |
| Minute trigger | pg_cron + pg_net job `drylake-consultation-dispatch` (`docs/operations/sql/2026-10-13-consultation-dispatch-cron.sql`). **Whether it is scheduled in production is not established**: local `.env.local` points at a placeholder Supabase, so prod cannot be queried from here | NONE |
| Idempotency, retries, leases, cancel/reschedule suppression | Implemented in the outbox; mock- and DB-tested | HIGH (code) |
| Customer gets a reminder ~24 h before | **Unverified.** With only the 06:00 backstop, a reminder for a 9:00 Monday slot goes out at 06:00 Monday at best | NONE |

Ben, Supabase SQL editor (read-only): 
`select jobname, schedule, active from cron.job;` then
`select max(start_time), count(*) filter (where status='failed') from cron.job_run_details where jobid = (select jobid from cron.job where jobname='drylake-consultation-dispatch');`
If no row: run the scheduling SQL file. PR 2 surfaces "last dispatch run" on `/api/health` so this is
observable without SQL. Platform limit: Hobby cron is once a day, which is why pg_cron exists.

## 6. Local SEO: 35 mandatory areas, expansion, "near me"

### 6.1 Coverage plan (PR 5)

`lib/service-areas.ts` registry: every area has slug, region, type and accurate commercial context.
All 35 mandatory areas are flagged and a test fails if any is missing:

- Commercial and office: Perth CBD, West Perth, East Perth, Subiaco, Leederville, South Perth,
  Joondalup, Midland, Fremantle
- Industrial and trade: Osborne Park, Malaga, Wangara, Welshpool, Kewdale, Bibra Lake, Balcatta,
  Maddington, Bayswater
- Residential and growing: Baldivis, Canning Vale, Dianella, The Vines, Ellenbrook, Thornlie, Morley,
  Gosnells, Willetton, Byford
- Additional priority: Wanneroo, Cockburn Central, Rockingham, Mandurah, Scarborough, Victoria Park,
  Armadale

Expansion to ~70+: Clarkson, Butler, Yanchep, Hillarys, Karrinyup, Innaloo, Belmont, Bentley,
Success, Aubin Grove, Jandakot, Harrisdale, Piara Waters, Kelmscott, Kalamunda and further genuine
metro areas.

Architecture: `/perth` becomes the directory (all areas, grouped by region and type);
`/locations/<slug>` standalone pages for the first batch of 8; every other area appears in the
directory, never as a thin page. Guards: near-duplicate copy test across standalone pages, forbidden
claims test (no "our office in", no client or project claims, no ratings), sitemap inclusion,
unique metadata, BreadcrumbList + `areaServed`. No street address in schema.

### 6.2 "Near me" visibility plan

Google decides "near me" results by **relevance, distance and prominence** [HIGH, Google Business
Profile help]. A service-area business with no public address competes on relevance and prominence;
distance is measured from the hidden verified address. Plan, in order of leverage:
1. **Google Business Profile** (section 6.3): the single biggest input for the map pack.
2. **On-site relevance**: service + suburb pages (PR 5), natural copy ("web developer in Joondalup"),
   never "near me" keyword stuffing.
3. **Prominence**: genuine reviews as real clients arrive (never fabricated, never incentivised),
   legitimate citations (6.5), consistent name / phone / website.
4. **Technical**: crawlable server-rendered pages, schema, mobile speed (already ~90 Lighthouse).
No placement in the local pack is guaranteed.

### 6.3 Google Business Profile: status and owner checklist

Status: **NONE established.** No profile was found from here (search results cannot confirm a
profile either way; Ben must check https://business.google.com signed in as the Drylake Google
account).
Eligibility [MEDIUM, GBP guidelines, verify at setup]: a service-area business qualifies if it makes
in-person contact with customers at their location. Purely remote businesses do not. Drylake must
genuinely offer on-site visits in Perth for the profile to be eligible; if it does not, do not create
one.
Checklist if eligible:
1. Business name exactly "Drylake" or the registered trading name (no keywords added).
2. Primary category: choose from Google's live list (likely "Website designer"; secondary
   "Software company", "Internet marketing service" only if true).
3. Service-area business: **hide the address**, add service areas (Google allows up to 20; pick
   regions/suburbs from the 35).
4. Phone 0433 448 000, website https://drylake.com.au, hours that will actually be kept.
5. Description: factual, no promotional claims, no URLs.
6. Services list mirroring the site's real services; real photos only (logo, cover, founder).
7. Verify (video or postcard; Google picks). Never use a virtual office or residence as a public
   address. One profile only, no suburb duplicates.

### 6.4 Bing Places: status and checklist

Status: **NONE established.** Once GBP is verified, use Bing Places "Import from Google Business
Profile" (https://www.bingplaces.com). Otherwise create manually with the same name, phone, website,
hours and service area. Feeds Bing, Copilot, and indirectly Yahoo and DuckDuckGo maps [MEDIUM].

### 6.5 Citations (quality over count)

Recommended, all free and legitimate: Google Business Profile, Bing Places, Apple Business Connect,
ABN Lookup (already public), LinkedIn company page, Yellow Pages / True Local (one listing each),
Clutch or GoodFirms (only once a real client review exists). Same name, phone and website on every
listing. No paid link schemes.

### 6.6 Monitoring

Baseline after PR 4/5 merge and GSC access: impressions and clicks for queries containing suburb
names; indexed `/locations/*` pages; consultation conversions (`booking_completed` event); GBP
calls/website clicks once live; Bing Webmaster query report. Monthly read; observations stated as
correlations, never as guaranteed rankings.

## 7. Search engines and the broad AI ecosystem

### 7.1 Traditional search

Google (GSC, owner runbook in PR 4), Bing (Bing Webmaster + IndexNow, live), **Yahoo** (results come
from Bing's index; no separate submission) [MEDIUM], DuckDuckGo (Bing among its sources plus its own
DuckDuckBot) [MEDIUM], Brave Search (own index via its crawler) [MEDIUM].

### 7.2 Robots review against the AI ecosystem (owner decision D-D)

Live robots.txt today: GPTBot, ClaudeBot, CCBot, meta-externalagent, Amazonbot, Applebot-Extended
**blocked**; Google-Extended allowed; everything else (incl. Bingbot, Googlebot, OAI-SearchBot,
Claude-SearchBot, PerplexityBot, Applebot) allowed.

| Platform | What it retrieves from | Effect of today's robots | Confidence |
|---|---|---|---|
| ChatGPT search | OAI-SearchBot + Bing | allowed | MEDIUM |
| Claude | Claude-SearchBot / Claude-User | allowed | MEDIUM |
| Perplexity | PerplexityBot | allowed | MEDIUM |
| Google Gemini / AI Overviews | Googlebot (+ Google-Extended for grounding/training) | allowed | MEDIUM |
| Microsoft Copilot | Bing index | allowed | MEDIUM |
| Grok | X + web search; no well-documented crawler | not blocked | LOW |
| **Meta AI** | meta-externalagent (also used for indexing) | **blocked: may suppress Meta AI answers** | MEDIUM |
| **Alexa / Amazon** | Amazonbot | **blocked** | MEDIUM |
| Apple Intelligence / Siri | Applebot (allowed); Applebot-Extended only governs training | allowed | MEDIUM |
| Brave, DuckDuckGo, You.com | own crawlers + Bing | allowed | MEDIUM |

Decision D-D for Ben: keep D-3 as is (training opt-out wins), or unblock meta-externalagent and
Amazonbot for answer visibility at the cost of allowing training use. No change is made without the
decision.

### 7.3 AI visibility test (PR 6)

`docs/discoverability/ai-visibility-monitoring.md`: a fixed question set (e.g. "Who builds websites
in Perth?", "Business automation companies near me in Perth", "Custom software developer Osborne
Park", "Who is Drylake Pty Ltd?"), run monthly across ChatGPT, Claude, Perplexity, Gemini, Copilot,
Grok, Meta AI, Brave, DuckDuckGo, You.com; record per platform: mentions Drylake / cites drylake.com.au
/ states something wrong / absent. First dated baseline in PR 6, run by hand in signed-in browsers.
Recommendations come from observed gaps, not speculation. No recommendation or citation is
guaranteed.

## 8. Secondary-page redesign (PR 7, Option B Premium Adaptive Layouts)

Real public routes (from `app/**/page.tsx` and the live sitemap): `/services`,
`/services/{web-development, custom-software-development, business-automation, systems-integration,
ai-automation}`, `/solutions`, `/about`, `/contact`, `/consultation`, `/perth`, `/locations/*` (new),
`/privacy`, `/terms`, plus `not-found` and `error`.

Per page, audited individually before redesign: hero, information hierarchy, what Drylake does, who
benefits, problems solved, process, what to expect, FAQs, CTA placement. Shared design system,
varied composition (service grids, labelled illustrative interface demos, workflow diagrams, journey
sections). Fictional demonstrations are labelled as such; no invented client work.

Split for reviewability:
- **7a**: `/services` + the five service pages + `/solutions`
- **7b**: `/about`, `/contact`, `/consultation` shell, `/perth` + location layouts (after PR 5),
  legal pages typography only
Each carries desktop and mobile before/after screenshots and requests review from `wilsonmugwe`.

## 9. PR schedule and dependencies

| PR | Branch | Status 2026-10-16 | Builds on | Parallel with |
|---|---|---|---|---|
| 1 | `drylake/m365-live-verification` | **in progress** | none | 4, 5, 8 |
| 4 | `drylake/analytics-search-setup` | **in progress** | none | 1, 5, 8 |
| 5 | `drylake/location-seo` | **in progress** | none | 1, 4, 8 |
| 8 | `drylake/navigation-conversion` | **in progress** | none | 1, 4, 5 |
| 2 | `drylake/booking-hardening` | next | 1 | 3, 6 |
| 3 | `drylake/email-polish` | next | 2 | 6 |
| 6 | `drylake/ai-discoverability` | next | 5 | 2, 3 |
| 7a / 7b | `drylake/redesign-services`, `drylake/redesign-secondary` | after 5 + 8 | 5, 8 | each other |
| 9 | responsive/a11y/perf | after 7 | 7, 8 | none |
| 10 | security + readiness report | last | all | none |

Merge order: 1, 4, 8, 5 → 2, 6 → 3, 7a, 7b → 9 → 10. Reviewer on every PR: `wilsonmugwe` (Benedict's
GitHub account authors these PRs, and GitHub does not allow an author to review their own PR).
Nothing is merged, deployed or enabled without the owner's explicit approval.

## 10. External configuration (cannot be done from the repo)

| Item | Who | Notes |
|---|---|---|
| Confirm post-2 Nov seat count covers both reps (no purchase) | Ben | D-A residual |
| Teams + Exchange service plans ticked for both reps | Ben | 4.2 |
| Run `scripts/m365-verify.mjs` with Vercel creds | Ben | after PR 1 merges |
| `CONSULTATION_CALENDAR_PROVIDER=microsoft` + redeploy | Ben or Wilson | only after the script passes |
| pg_cron minute job check | Ben (Supabase) | 5.3 |
| 5.7.708 message trace / support request | Ben | 4.4 |
| Google Search Console, Bing Webmaster Tools | Ben | PR 4 runbook |
| Google Business Profile (if eligible), Bing Places | Ben | 6.3, 6.4 |
| DMARC to `p=quarantine` | Ben | scheduled 20 Oct; prerequisite for BIMI |
| Vercel preview decision | Wilson | D-E |
| AI crawler policy decision | Ben | D-D |
