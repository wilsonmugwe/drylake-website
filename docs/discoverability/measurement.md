# Measuring discoverability and enquiries

**Status, 2026-10-08.** Page views are measured in production, verified with a headless browser:
Vercel Web Analytics loads and records a view. This PR adds one conversion event,
`enquiry_submitted`. Everything else on this page is either dashboard configuration or a manual
check, and is labelled as such. No paid platform was added and no personal information is
collected.

## What can be measured, and how reliably

| Signal | Status | How |
|---|---|---|
| Visits from organic search | **Measurable now** | Vercel Analytics, Referrers panel: google.com, bing.com, duckduckgo.com |
| Google indexing, queries, impressions | **After configuration** | Search Console. The domain is verified by DNS TXT. Confirm the owner and submit the sitemap (below) |
| Bing indexing and Copilot citations | **After configuration** | Bing Webmaster Tools, imported from Search Console. Monthly AI Performance report |
| AI assistant referrals (chatgpt.com, perplexity.ai, copilot.microsoft.com, gemini.google.com, claude.ai) | **Measurable now, as a floor** | Referrers panel. Clicks from desktop and mobile assistant apps often arrive with no referrer and count as Direct, so the true number is higher |
| `utm_source=chatgpt.com` | **Paid add-on only** | Vercel Web Analytics Plus (US$10 a month on Pro). Optional: referrers already cover the domains |
| Enquiries delivered | **After this PR, on Vercel Pro** | Custom event `enquiry_submitted`. Before that: count the emails in the enquiry inbox |
| Enquiries by source | **After this PR, on Pro, in aggregate** | Filter the dashboard by referrer, then read the Events panel. Per-enquiry source is deferred (below) |
| Conversion rate | **After this PR, on Pro** | `enquiry_submitted` events divided by visitors, for the same period and filter |
| Whether AI assistants name Drylake | **Manual only** | Monthly check (below). No tool can measure this reliably |

**The Vercel plan is not verified** (it needs a dashboard login). Custom events need Pro. On Hobby,
the event call is accepted and simply not reported, and Hobby keeps only one month of data. Source:
vercel.com/docs/analytics/limits-and-pricing, read 2026-10-08.

## The enquiry event (added in this PR)

- **Where:** `lib/contact/submit-enquiry.ts` calls `trackEnquirySubmitted()`
  (`lib/analytics/enquiry-event.ts`) in exactly one place, the branch where the server has
  confirmed delivery. A validation error, failed security check, rate limit, server error or
  network failure never counts.
- **Covers both forms:** the public contact form, and the portal's Message Drylake form (property
  `surface`: `public` or `portal`).
- **Properties:** `surface`, and `projectType` reduced to the public form's own dropdown values or
  `other`. No name, email, company, message or free text, ever. A unit test checks that the
  allowed values match the form's options, so the two cannot drift apart.
- **Failure:** if an ad blocker or privacy extension blocks analytics, the call is ignored and the
  visitor still sees their confirmation.

## Deferred, with reasons

| Item | Why it is not in this PR |
|---|---|
| A distinct thank-you URL (for example `/contact/received`) | Changes the contact form's success flow and a user journey, so it needs Wilson's approval. The event above already gives an attributable conversion |
| Recording each enquiry's source (referrer and UTM) in the enquiry email | Adds fields to the `/api/contact` request and the email (a contract change). It also ties a named person to their marketing path, which needs a privacy-policy line |
| Server-side events | Not needed: the event fires only after server confirmation |

## Owner configuration

**Ben, Google Search Console (about 10 minutes)**
1. Confirm a Domain property `drylake.com.au` exists and that Ben is a verified owner. The existing
   DNS TXT record verifies it. Do not delete that record.
2. Sitemaps: submit `https://drylake.com.au/sitemap.xml` and check that its status is Success.
3. URL Inspection: request indexing for `/`, `/services` and the five `/services/*` pages.
4. Add Wilson as a Full user.
5. Leave `GOOGLE_SITE_VERIFICATION` unset, because DNS already covers it.

**Ben or Wilson, Bing Webmaster Tools (about 10 minutes)**
1. Sign in at bing.com/webmasters and choose Import from Google Search Console.
2. Confirm the sitemap is listed. After the next deploy, confirm that IndexNow shows received URLs.
3. Monthly: read the AI Performance report.

**Wilson, Vercel (project drylake-website)**
1. Analytics: confirm Web Analytics is enabled and today's visits appear.
2. Settings, Billing: confirm the plan. Custom events need Pro.
3. If on Pro: set a spend cap. Events cost US$0.03 per 1,000, so at this site's volume that is cents.
4. After this PR deploys: Analytics, Events, `enquiry_submitted`. Send one real enquiry and confirm
   it appears.

## Monthly AI visibility check (Ben, about 15 minutes)

1. Run the Ahrefs free AI Visibility Checker for "Drylake".
2. Ask ChatGPT, Perplexity, Gemini and Copilot each of these questions: "What is Drylake Pty Ltd?",
   "Who builds custom software in Perth?", "Who does business automation in Perth?" and "Which
   Perth companies provide AI integration?".
3. Record, per answer, whether drylake.com.au is named or linked and whether the facts are correct.
   Keep the log in `docs/search/search-audit.md`.
4. Read the Vercel Referrers panel for the AI domains and the Events panel for `enquiry_submitted`.

Correlation is not causation: a change in these numbers after a release is an observation, not
proof that the release caused it.
