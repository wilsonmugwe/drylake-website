# Search setup runbook (owner steps)

For Ben (and Wilson where noted). Written 2026-10-16. Nothing here can be done in code and no
account was created by the PR that added this file. It extends `external-actions.md` (what to do and
why) and `measurement.md` (what the numbers mean) with the exact steps in order.

**No ranking is guaranteed by any step here.** Search engines decide what to index and rank.
These steps make Drylake visible to them and make its performance measurable; they do not buy a position.

Confidence labels: **HIGH** = from a first-party page or measured on this site; **MEDIUM** = from
vendor documentation or reputable secondary sources, not confirmed on Drylake's own account;
**LOW** = common practice or recollection, verify in the product before relying on it.

## 0. Facts to use everywhere (HIGH, from the site)

Drylake, legal name DRYLAKE PTY LTD, ABN 70 702 662 557, https://drylake.com.au, Perth, Western
Australia, hello@drylake.com.au. Sitemap: `https://drylake.com.au/sitemap.xml`. IndexNow is already
live (`scripts/indexnow-submit.mjs`, run by the Discoverability workflow after deploys).

## 1. Google Search Console (Ben, 15 minutes)

1. Open search.google.com/search-console and choose **Add property > Domain** and enter `drylake.com.au`.
   A Domain property covers every subdomain and both http/https (MEDIUM, Google documentation).
2. Verify with the **DNS TXT** record Google shows. Add it at **Synergy Wholesale**: Domain
   Management > `drylake.com.au` > DNS > add a TXT record, host `@` (or blank), value as given.
   Propagation can take minutes to hours. Do not delete the record afterwards: removing it
   un-verifies the property. (Per `measurement.md` a verified Domain property may already exist:
   check first and skip to step 3.)
3. Leave `GOOGLE_SITE_VERIFICATION` unset: DNS covers it.
4. **Sitemaps > Add** `https://drylake.com.au/sitemap.xml`. Status should read Success (HIGH that the
   file exists; the status is only visible in your account).
5. **URL Inspection** for each of: `https://drylake.com.au/`, `/consultation`, `/perth`, `/services`,
   and any `/locations/*` page that is live. For each, press **Request indexing** if it says "URL is
   not on Google". The quota is small and a request does not force indexing (MEDIUM).
6. **Settings > Users and permissions**: add Wilson as Full user.

## 2. Bing Webmaster Tools (Ben or Wilson, 10 minutes)

1. bing.com/webmasters > **Import from Google Search Console** after step 1 above. Imported sites
   are verified automatically; Bing re-checks ownership periodically, so keep Search Console access
   (MEDIUM, Bing Webmaster blog, September 2019).
2. Alternative if import is not wanted: choose the HTML meta tag method, put the token in
   `BING_SITE_VERIFICATION` in Vercel (Production) and redeploy (`app/layout.tsx` emits `msvalidate.01`).
3. Confirm the sitemap is listed under **Sitemaps**; submit it if not.
4. IndexNow: already live, nothing to submit by hand. After a deploy, **Webmaster Tools > IndexNow**
   should show received URLs (MEDIUM: panel names may change).
5. Data for a newly verified site can take up to 48 hours to appear (MEDIUM).

## 3. Other engines (no separate account needed)

| Engine | What to do | Confidence |
|---|---|---|
| **Yahoo** | Nothing separate. Yahoo Search results are powered by Bing, so Bing Webmaster Tools is the submission route. Verify in Bing Webmaster Tools' own help before telling a client this | MEDIUM |
| **DuckDuckGo** | Nothing to submit. It draws on several sources including Bing's index, plus its own crawler. Being in Bing is the practical lever | MEDIUM |
| **Brave Search** | Has its own index, built by Brave's crawler, which honours `robots.txt`. As far as is known there is no webmaster submission form: be crawlable (no blocks in `robots.txt`, sitemap listed) and earn links. Re-check Brave's current webmaster page; this may change | MEDIUM / LOW |
| **Ecosia** and similar | Draw on Bing's results (partly), so covered by section 2 | LOW |

Check `robots.txt` has not blocked a search crawler by accident: the decision is recorded in
`docs/discoverability/README.md` (training crawlers blocked, search/answer crawlers allowed).

## 4. Google Business Profile (Ben, 30 minutes plus verification)

Drylake has no public shopfront, so it is set up as a **service-area business (SAB)**.

**Eligibility (read this first, MEDIUM, from Google's Business Profile guidelines as summarised by
secondary sources; read Google's current page `support.google.com/business/answer/3038177` before you start):**
- A profile is for a business that **makes in-person contact with customers** at its location or in
  its service area. A purely online business with no in-person contact is generally not eligible. Drylake
  must be able to say honestly that it meets clients in person (for example, on-site or at the client's
  premises in Perth). If it does not, **do not create the profile**: an ineligible profile is liable to
  suspension.
- **No virtual office, PO box or co-working desk** as the address. Use the real address you work from;
  it stays private (below). Do not use a residence as a *public* address (also the portfolio rule).
- **One profile only** for the business. No duplicate profiles for suburbs or services.
- Use the real business name, **Drylake** (the name customers actually see on signage, invoices and the
  site). No keywords added to the name.

**Steps:**
1. business.google.com > **Add your business**, name `Drylake`.
2. Choose **I deliver goods and services to my customers** (service-area), and when asked about a
   location that customers visit, answer **No** (LOW: wording changes).
3. **Hide the address.** Enter the real address for verification only; leave "show address" off so
   only the service areas appear (MEDIUM).
4. **Service areas:** Google allows up to **20** service areas (MEDIUM; one secondary source, confirm in
   the product). Choose areas Drylake genuinely serves, e.g. Perth, plus the suburbs and cities that
   will have a `/locations/*` page. Do not list places that are not served: it is a guideline breach
   and misleads customers. Nearby-areas guidance (roughly within two hours' travel) is advice, not a rule (LOW).
5. **Categories:** one primary and a few secondary, chosen from Google's list. Candidates: **Website designer**,
   **Software company**, and other categories only if they describe what customers pay for. **Categories
   change over time and these names are not verified against today's list (LOW):** type each into the
   picker and use the exact entry offered. Choose the primary category to match the main thing clients
   buy; the primary category matters most (MEDIUM).
6. Add the phone number the site publishes (`BUSINESS_PHONE` in `lib/site.ts`), the website
   `https://drylake.com.au`, and a short description in plain English with no promotional claims about
   rankings.
7. Complete **verification** as Google directs (postcard, phone/email, or video). Service-area profiles
   often get video verification; have the business premises and a work-in-progress ready to show (MEDIUM).
8. After verification add hours (honest), services, and real photos only. No stock photos presented as
   the team, no fabricated reviews, no incentivised reviews (the portfolio rule and Google's policy).
9. Give Claude the profile URL: it goes into `ENTITY.sameAs` (see `external-actions.md`).

## 5. Bing Places (Ben, 10 minutes, after the Google profile is verified)

bingplaces.com > **Import from Google Business Profile** and approve the same details, including the
hidden address and service areas. Re-check what imported (MEDIUM: Bing Places supports a GBP import;
the fields it carries over have changed over time). Bing Places may require its own verification.

## 6. Local SEO monitoring (monthly, 20 minutes, Ben)

Put it on the calendar for the first Monday of each month. Record the numbers in a dated note in
`docs/discoverability/` so the trend is visible. All figures are correlations, not proof that any one
change caused them.

| What | Where | How |
|---|---|---|
| Queries by place | Search Console > Performance > **Search results** | Add a **Query** filter, "Custom (regex)", with the suburb names that have a page, e.g. `perth\|fremantle\|joondalup`. Note impressions, clicks and average position per query. Average position is an average and is not a ranking |
| Local pages | Search Console > Performance > **Pages** | Filter **Page contains** `/perth`, then `/locations/`. Record impressions and clicks for each page. Pages with impressions but no clicks need a better title or description; pages with neither may not be indexed (check URL Inspection) |
| Indexing health | Search Console > **Pages** | Read "Why pages aren't indexed" for any location page |
| Consultation conversions | Vercel > Analytics > **Events** | `booking_started` (a visitor chose a time), `booking_completed` (the server confirmed a booking), `cta_click` (breakdown by `location`: header, mobile-menu, hero, closing, footer, location-page, service-page, page; and `target`: booking, contact, phone, email, other). Filter by **Referrer** to split Google, Bing, assistants and Direct. Custom events need Vercel Pro; confirm the plan (`external-actions.md` B). Compare `booking_started` with `booking_completed` to see where visitors drop out |
| Enquiries | Vercel > Analytics > Events | `enquiry_submitted`, by referrer |
| Google Business Profile | business.google.com > **Performance** | Views (Search and Maps), calls, website clicks, direction requests (not applicable to a hidden address), and the searches that showed the profile |
| Bing | Bing Webmaster Tools > **Search Performance** | Impressions and clicks; the AI Performance report where offered |
| Assistants | `measurement.md` monthly check | Ask the main assistants who Drylake is and note whether it is named |

**Reading it honestly:** small sites see small numbers, so month-on-month swings of a few clicks mean
little. Judge a quarter, not a month. If location pages show impressions and no `booking_started`,
the problem is the page or the offer, not the search setup.

## Verification status

This runbook has not been executed: it needs Ben's accounts. The code half (events and their privacy
properties) is covered by `tests/analytics-events.test.mjs`. Event dashboards will show nothing until
the PR deploys, and custom events are reported only on Vercel Pro.

Sources read 2026-10-16: Bing Webmaster Blog, "Easily Verify Your Site in Bing Webmaster Tools by Importing from Google Search Console"
(blogs.bing.com/webmaster/september-2019/Import-sites-from-Search-Console-to-Bing-Webmaster-Tools); Google Business Profile help
`support.google.com/business/answer/10514137` as quoted in search results; secondary SEO sources for the 20-area limit.
Yahoo, DuckDuckGo, Brave and GBP category names were **not** confirmed from first-party pages in this pass.
