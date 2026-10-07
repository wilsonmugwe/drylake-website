# Drylake search, GEO and local discovery audit (PR 6, 2026-10-07)

Scope: drylake.com.au public site (12 indexable URLs). Builds on PR #20 (discoverability system,
`docs/discoverability/README.md`) and PR #28 (`/services`, five service pages, `/perth`, legacy
308s). This document records what was measured, what changed, what is still open, and the
off-site work only Ben or Wilson can do.

Method: a production build (`next build` + `next start`) crawled by a dependency-free audit script
that reads the rendered HTML of every sitemap URL (titles, descriptions, canonicals, Open Graph,
Twitter, H1s, heading order, JSON-LD parse, img alt, internal link graph, click depth, redirects,
404 behaviour, share-image bytes). Raw results: `drylake-ops/docs/review/2026-10-07-upgrade/pr6/
seo-audit-before.{json,txt}` and `seo-audit-after.{json,txt}`. Local numbers are not production
numbers: run section 9 against the live site after deploy.

We cannot guarantee rankings or AI answers. This work makes Drylake's public information complete,
consistent, crawlable and corroborated, which is the part a website controls.

---

## 1. Current state (before this PR)

**Already sound (verified in the rendered HTML, not assumed from source):**

| Area | Finding |
|---|---|
| Indexability | All 12 sitemap URLs return 200, self-canonical, `index, follow`. Private surfaces send `X-Robots-Tag: noindex` and are disallowed in robots.txt |
| Sitemap | 12 URLs, generated from `PUBLIC_PAGES`, real `lastmod` dates, no private or auth routes |
| robots.txt | Search engines, AI search crawlers and user fetchers allowed; training tokens disallowed; sitemap referenced (decisions D19/D20) |
| Internal links | No orphans. Every page is one click from `/` (footer site map). No broken internal links |
| Redirects | `/solutions/custom-software`, `/automation-integration`, `/applied-ai` 308 to their `/services/*` successors in one hop. Trailing-slash URLs 308 to the clean URL. No chains |
| 404 | Real 404 status, `noindex`, no canonical, branded, no stack or file paths leaked |
| Headings | Exactly one H1 per page; no skipped heading levels |
| Structured data | One `@graph` per page; Organization, WebSite and founders share stable `@id`s; Service, FAQPage, BreadcrumbList where justified; every block parses |
| Duplicates | No duplicate titles or descriptions |
| Images | No `<img>` without `alt` |

**Defects found (19 in the rendered audit, plus 3 by inspection):**

| # | Defect | Pages |
|---|---|---|
| 1 | No `twitter:image:alt` (Twitter images were passed as bare URLs) | all 12 |
| 2 | Meta description outside 140 to 160 characters | `/about` (132), `/privacy` (127), `/perth` (164), `/services/ai-automation` (166), `/services/web-development` (164) |
| 3 | Title over 65 characters (truncated in results) | `/perth` (66), `/services/systems-integration` (67) |
| 4 | One shared share image for every page, still showing the pre-D27 wordmark without the cracked lake-bed tile | all 12 |
| 5 | Page search copy duplicated inside each page file (metadata and JSON-LD each restated it), and tests found it by regex, so a reworded page could drift or slip the length check | 7 static pages |
| 6 | Service descriptions were tested to a looser 110 to 180 range than the portfolio standard (140 to 160) | 5 service pages |
| 7 | `aria-label="Drylake — Home"` in the footer home link: an em dash in a visitor-facing (screen reader) string | every page (Footer, owned by PR 1/2/3: flagged, not changed here) |

---

## 2. Changes implemented

| Change | Where | Why |
|---|---|---|
| One registry for page search copy: title, description, share description, share image, image alt | `lib/seo-pages.ts` (new); pages call `pageMetadata(SEO)` and `webPageNode({ name: SEO.title, ... })` | `<title>`, meta description, OG, Twitter and the WebPage JSON-LD can no longer disagree; tests import the registry instead of regexing source |
| All descriptions 140 to 160 characters, all titles at most 65 | `lib/seo-pages.ts`, `lib/discovery/services.ts` (3 strings) | Snippet-length standard (pre-launch checklist #12). Copy meaning unchanged; `/about` now also names the legal entity |
| `twitter:image:alt` and `og:image:type` on every page | `lib/seo.ts` | Accessibility of link previews; checklist #13 |
| A 1200 x 630 share card per page, on the current brand (tile + wordmark, Geist, site orange bar) | `public/og/*.png` (12), `public/opengraph-image.png` (fallback, same as home) | Links shared to LinkedIn, Slack, iMessage and X now show the page's own topic instead of one generic card. Old fallback URL kept so cached shares do not break |
| Card generator, reading the same registry | `scripts/og/render-share-cards.mjs` | Repeatable: re-run after copy or brand changes. Uses the site's own Geist font and the brand SVGs; fails if the font does not load or text overlaps |
| `foundingDate: 2026-09-24` on Organization | `lib/discovery/entity.ts`, `structured-data.ts` | Verifiable entity fact (ASIC registration, public on ABN Lookup); helps disambiguate the entity |
| `dateModified` on every WebPage node, from the sitemap's `lastmod` | `lib/discovery/structured-data.ts` | One freshness signal, stated in two places that cannot disagree |
| `/llms-full.txt` (service pages in full as plain text), linked from `/llms.txt` | `lib/discovery/llms.ts`, `app/llms-full.txt/route.ts` | Portfolio standard (pre-launch Part B #17). Generated from `services.ts`, so it cannot say anything the pages do not. See section 7 for the honest evidence |
| Tests | `tests/seo-search-visibility.test.mjs` (+16), `tests/discoverability.test.mjs` (3 updated) | See section 8 |

**Deliberately not changed:** page bodies, headings, nav and footer markup (PR 1/2/3), crawler
policy (D19/D20 stand), the `/solutions` and `/services` split (D25), no LocalBusiness and no street
address (D19/D25 and section 4).

---

## 3. Remaining technical issues

| # | Issue | Owner | Note |
|---|---|---|---|
| R1 | Footer home link `aria-label="Drylake — Home"` contains an em dash | PR 1 (wordmark swap touches this exact line) | Replace with `aria-label="Drylake home"` |
| R2 | `/solutions` ("What we do") and `/services` overlap as hubs | Wilson/Ben | Different content today and both useful; watch Search Console for "Duplicate, Google chose different canonical". If it appears, make `/solutions` the narrative page and stop listing all Service nodes on it |
| R3 | Visible phone number is a founder's personal mobile (excluded from structured data, D20) | Ben | Get a business number before building citations (section 5) |
| R4 | Service FAQ markup no longer earns FAQ rich results for commercial sites (Google limited them to government and health sites in 2023) | none | Kept: valid, accurate, and readable by answer engines. Not a defect |
| R5 | Production Core Web Vitals not measured here | Wilson | Local numbers are not production numbers. Check PageSpeed Insights / Search Console CWV after deploy |
| R6 | `lib/business.ts` sets `gstRegistered: true` while the site rules say Drylake is not GST-registered | Ben | Invoicing scope, not search. Consistent with decision D24 (registration by 9 Oct 2026) only once the ATO confirms |

---

## 4. Address and local decision

The registered and trading address is in Joondalup WA. **It is not published anywhere on the
site, in structured data or in llms files**, and a test now fails if "Joondalup", the street or the
postcode appears on a machine surface. Reasons: Drylake is remote-first with no public premises
(pre-launch checklist #14 hardBan: never publish an address the business does not serve customers
from); D19 and D25 already chose locality-only; and whether the address is a residence was not
confirmable from the repo. Publishing it is a one-way decision for Ben.

Local signals that ARE in place, without stuffing: Perth in the Organization `address`
(`addressLocality`) and `areaServed` (Perth City, Australia); one `/perth` page; "Perth" in two of
twelve titles (tested at most two); the footer and About company details. LocalBusiness and
ProfessionalService types are not used: both are LocalBusiness subtypes whose rich results expect
a street address, and a service-area business is better represented by a Google Business Profile
with the address hidden (section 6).

---

## 5. NAP and entity consistency

Use exactly these values everywhere off-site (directories, profiles, GBP, LinkedIn, email
signatures). Any variation splits the entity.

| Field | Value |
|---|---|
| Name | Drylake (trading name of DRYLAKE PTY LTD) |
| Legal name | DRYLAKE PTY LTD |
| ABN / ACN | 70 702 662 557 / 702 662 557 |
| Location | Perth, Western Australia (no street address) |
| Website | https://drylake.com.au (no www, no trailing slash) |
| Email | hello@drylake.com.au |
| Phone | +61 420 565 457 today (founder mobile). Replace everywhere at once when a business number exists |
| Founded | 24 September 2026 |
| Category | Software company / technology company |

Entity corroboration status: **ABR** shows DRYLAKE PTY LTD (check the business name "Drylake" is
registered against the ABN so ABN Lookup shows the trading name); **LinkedIn** company page exists
and is in `sameAs`; **Wikidata**: not yet (create only when there is independent coverage to cite;
a self-sourced item is likely to be deleted); **Crunchbase / Clutch / GoodFirms**: optional, only
with accurate fields.

---

## 6. Off-site actions (checklist for Wilson and Ben)

Order matters: verification first, then profiles, then citations.

**Google Search Console** (Ben or Wilson, 20 min)
- [ ] Add a **Domain property** `drylake.com.au` (DNS TXT at Synergy Wholesale). Covers http/https/www
- [ ] Submit `https://drylake.com.au/sitemap.xml`; confirm 12 discovered
- [ ] URL Inspection > Request indexing: `/`, `/services`, each `/services/*`, `/perth`, `/about`
- [ ] After 7 days: Pages report (no "Duplicate without user-selected canonical", no "Crawled, not indexed" on the 12); Enhancements show Breadcrumbs valid
- [ ] Rich Results Test on `/services/ai-automation` (Breadcrumb, FAQ parse; Organization logo)

**Bing Webmaster Tools** (10 min, after GSC)
- [ ] Import from Google Search Console; confirm sitemap; check IndexNow received URLs after the next deploy (workflow "Discoverability")
- [ ] Monthly: AI Performance report (Copilot citations)

**Google Business Profile** (Ben, needs a verification step)
- [ ] Create as a **service-area business**: name "Drylake", category "Software company" (secondary "Website designer" only if web work is actively sold), service area Perth + Western Australia, **address hidden**. Never a fake or virtual address (suspension risk)
- [ ] Website `https://drylake.com.au/perth` or `/`, hours as actually staffed, the same phone as the site
- [ ] Description from `ENTITY.summary`; no keyword stuffing in the business name
- [ ] Then Bing Places (import from GBP) and Apple Business Connect

**Social and profiles**
- [ ] LinkedIn company page: legal name in About, website, Perth, founders list Drylake as employer
- [ ] Share a page once on LinkedIn and check the preview shows that page's card; if stale, refresh with LinkedIn Post Inspector
- [ ] Optional: X / Facebook page only if they will be maintained (an empty profile is worse than none); add to `ENTITY.sameAs` only once live and linking back

**Citations (only after the phone decision, R3)**
- [ ] Hotfrog, Yellow Pages AU, True Local, StartLocal, Australian Business Directory: identical NAP from section 5
- [ ] Record each listing URL in `docs/search/citations.md` (to be created) so they can be updated together

**Hosting**
- [ ] Vercel Firewall: Bot Protection not in challenge mode for public pages; "AI bots" managed ruleset not in deny mode (it blocks AI search crawlers too)

---

## 7. AI / GEO considerations (evidence, not hype)

- **Google AI Overviews and AI Mode** use the normal Search index. Google: "There are no additional
  requirements to appear in AI Overviews or AI Mode", and "You don't need to create new machine
  readable files, AI text files, or markup" (Search Central, "AI features and your website",
  updated 2025-12-10). So the work that matters is indexability, clear facts and corroboration.
- **llms.txt** is a community proposal (llmstxt.org). Google's John Mueller has said repeatedly that
  no major AI system uses it and that server logs show the consumer chatbots do not fetch it
  (Search Engine Roundtable, "Google: No AI System Currently Uses LLMs.txt"). Some vendors have been
  reported to read it; that is not verified here. Drylake keeps `/llms.txt` and `/llms-full.txt`
  because they are generated from the same source as the pages, accurate and free to maintain. **Do
  not expect them to move rankings or citations, and do not spend time hand-editing them.**
- **Crawler access** (D19/D20, unchanged): Googlebot, bingbot, OAI-SearchBot, ChatGPT-User,
  Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, DuckAssistBot, Applebot,
  meta-webindexer, Amzn-SearchBot and Google-Extended allowed; GPTBot, ClaudeBot, CCBot,
  meta-externalagent, Amazonbot and Applebot-Extended (training) disallowed. Every token is cited to
  vendor documentation in `lib/discovery/crawlers.ts`. Revisit if a vendor merges its search and
  training crawlers.
- **What actually helps answer engines here**: one sentence answering "What is Drylake?" used
  identically everywhere (`ENTITY.summary`), server-rendered FAQs that answer who/where/what, a
  consistent Organization `@id`, and third-party corroboration (section 5). Copy was not rewritten
  for AI; it stays written for people.

---

## 8. Regression protection (tests)

`npm test` now also fails when: a public page has no registry entry or two pages share a title or
description; a description leaves 140 to 160 characters or a title exceeds 65; search copy contains
an em dash, a price, GST wording or invented proof; any surface publishes the street address; a page
has no own share card, or a card is not a 1200 x 630 PNG; Twitter or OG images lose their alt;
JSON-LD fails to parse, repeats an `@id`, references an unknown `@id`, or carries ratings, reviews,
awards, offers, phone, street address or credentials; `dateModified` disagrees with the sitemap;
`llms-full.txt` stops matching the service pages or loses its link from `llms.txt`; an allowed
crawler cannot fetch the cards or llms files.

---

## 9. Measurement plan

| When | Check | Tool | Healthy |
|---|---|---|---|
| Every production deploy | Live crawl + IndexNow | GitHub workflow "Discoverability" | green |
| Week 1 after deploy | 12 pages indexed, canonicals accepted | GSC Pages + URL Inspection | 12 of 12 |
| Week 1 | Previews | LinkedIn Post Inspector on 3 pages | page's own card |
| Monthly | Impressions, clicks, queries by page; branded vs non-branded | GSC Performance | branded "drylake" query ranks #1 for drylake.com.au |
| Monthly | Copilot citations | Bing AI Performance | any is a signal |
| Monthly | AI answers for "What is Drylake?", "Drylake Perth" | Ahrefs AI Visibility Checker (free) or manual check in ChatGPT, Perplexity, Gemini | correct facts, links drylake.com.au |
| Monthly | AI referrals | Vercel Analytics referrers (chatgpt.com, perplexity.ai, copilot, gemini) | trend, not target |
| Quarterly | Re-run this audit script against production | `seo-audit.mjs` (review folder) | 0 issues |

Do not claim a causal link between any of these numbers and enquiries; record them as observations.
