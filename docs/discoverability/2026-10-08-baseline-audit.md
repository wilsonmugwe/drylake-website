# AI discoverability and technical SEO: baseline audit (2026-10-08)

**Scope:** drylake.com.au, the public site only. Repo read at `origin/main` 77146b0, then re-read
after PR #53 merged (f18270d). Live evidence is raw `curl` HTML of 13 public pages, plus
robots.txt, sitemap.xml, the llms files and the agent-readiness scanner. No request was made to
`/api/*` apart from `/api/health`, and no form was submitted.

**Verdict:** the technical base is already strong. It was built by PRs #28, #33, #41 and #53 and
is documented in `README.md` in this folder. This PR fixes the defects the audit found and adds
measurement. It also writes up the parts that need a person: content wording, external
profiles, and the decision on agent enquiries.

Classification: **IMPLEMENTED**, **NEEDS IMPROVEMENT**, **MISSING**, **NOT RECOMMENDED**.
"Fixed here" means this PR changes it.

## 1. What is already implemented

| Area | Status | Evidence |
|---|---|---|
| Titles, descriptions, canonicals | IMPLEMENTED | 13 routes. Unique titles of 22-65 characters, descriptions of 142-160 characters, self canonical, no duplicates. `lib/seo.ts` `pageMetadata()` |
| robots.txt | IMPLEMENTED | Search and assistant crawlers allowed. Training crawlers (GPTBot, ClaudeBot, CCBot, meta-externalagent, Amazonbot, Applebot-Extended) disallowed. Six private prefixes disallowed. Sitemap line present. Content-Signal line added by PR #53 |
| sitemap.xml | IMPLEMENTED | 13 URLs, all return 200. lastmod is the date content changed, not the request time. No private URLs |
| llms.txt, llms-full.txt | IMPLEMENTED | Generated from `lib/discovery/` |
| Open Graph and Twitter | IMPLEMENTED | Every page has a 1200x630 image, an alt, and the en_AU locale |
| Internal links | IMPLEMENTED | Every sitemap URL is one click from `/`. No orphans |
| Breadcrumbs | IMPLEMENTED | Visible trail plus BreadcrumbList on every page deeper than one level |
| Server rendering | IMPLEMENTED | Raw HTML of every service page carries the full copy and every FAQ answer before JavaScript runs |
| Headings | NEEDS IMPROVEMENT, **fixed here** | One h1 per page and a sensible hierarchy. Defect: words run together in extracted text (section 4, F-1) |
| Redirects | IMPLEMENTED | Legacy `/solutions/*`, trailing slash and `www` all return 308 |
| Private surfaces | IMPLEMENTED | Disallowed in robots.txt, noindex header and meta, behind Clerk plus RLS |
| JSON-LD | IMPLEMENTED with small defects, **fixed here** | Section 2 |
| Crawler policy (search vs training) | IMPLEMENTED | `README.md` section 2 and decisions D-1 to D-8 |
| IndexNow, live discoverability check | IMPLEMENTED | `.github/workflows/discoverability.yml` |
| Markdown for agents, Content Signals, Link headers, API catalogue, WebMCP attributes | IMPLEMENTED by PR #53 (merged 2026-10-08 01:57 UTC) | Section 3 |
| Analytics | IMPLEMENTED (page views), MISSING (conversions), **fixed here** | `measurement.md` |
| Search Console | Probably IMPLEMENTED | A DNS TXT record verifies the domain property. Sitemap submission can only be checked in the dashboard |
| Bing Webmaster | MISSING (not established) | `MS=` TXT is the Microsoft 365 record, not Bing. `/BingSiteAuth.xml` returns 404 |

## 2. Structured data (live, all 13 pages)

| Check | Result |
|---|---|
| Parses | 26 blocks, 0 errors |
| Organization | Has every recommended field that applies: legal name, ABN/ACN identifiers, locality-only address, areaServed, founders, email contact, logo, sameAs LinkedIn. No telephone, deliberately (it is a personal mobile) |
| Type | `Organization`. No LocalBusiness and no street address, per decision D-8 |
| BreadcrumbList, FAQPage, Service | Required properties present. Every FAQ question and answer (23) is visible on its page |
| Invented claims | None. No rating, review, award or client logo |
| Offer references | NEEDS IMPROVEMENT, **fixed here**. Each Offer pointed at a Service id defined only on that service's own page. Now each Offer names its Service inline (type, id, name, url) |
| Homepage ids | NEEDS IMPROVEMENT, **fixed here**. `https://drylake.com.au#webpage` vs site-wide `https://drylake.com.au/#organization`. Now one base, built by `nodeId()` |
| Vocabulary | NEEDS IMPROVEMENT, **fixed here** (structured data only). `knowsAbout` gains "AI integration". The AI service's `serviceType` is now "AI integration and automation". Both are backed by the visible AI automation page and its FAQ |
| BreadcrumbList on one-level pages (/about, /contact, /privacy, /terms) with no visible trail | Low. Left as is and recorded in section 5 |

## 3. Cloudflare agent-readiness scanner (isitagentready.com)

The scanner API (`POST https://isitagentready.com/api/scan`) returns a **level** from 0 to 5 and a
pass/fail per check. It does not return a number out of 100. The earlier "20/100" figure came
from the scanner's web page and is not reproduced here.

| | Scanned (UTC) | Production commit | Level |
|---|---|---|---|
| Before | 2026-10-08 01:46 | 77146b0 (before PR #53) | **1, Basic Web Presence** |
| After PR #53 | 2026-10-08 02:16 | f18270d (PR #53 live) | **4, Agent-Integrated** |

| Check | Before | After | Notes |
|---|---|---|---|
| robots.txt, sitemap, AI bot rules | pass | pass | |
| Link headers | fail | pass | PR #53 |
| Markdown negotiation | fail | pass | PR #53 |
| Content Signals | fail | pass | PR #53. **Decision needed:** `ai-train=no` sits in the `*` group, which also covers Google-Extended, while decision D-1 allows Google-Extended. See `README.md` section 3 |
| API catalogue | fail | pass | PR #53 (lists `/api/health` only) |
| WebMCP | fail | fail | PR #53 put declarative attributes on the contact form. The scanner looks at the homepage, which has no form |
| DNS-AID, OAuth discovery, OAuth protected resource, auth.md, MCP server card, A2A card, agent skills, ARD | fail | fail | NOT RECOMMENDED. Drylake runs no MCP or A2A server and no public OAuth API, so publishing these would advertise something that does not exist |
| Commerce protocols | neutral | neutral | Not a shop |

**This PR does not change any scanner check**, and the level is not the goal. The PR's changes are
in heading text, JSON-LD and measurement, which this scanner does not test.

## 4. Findings and how each was handled

| ID | Finding | Class | Handling |
|---|---|---|---|
| F-1 | Heading words run together in text extraction (JSX drops newline whitespace), e.g. h1 "Your businessshouldn't runon workarounds.", "Understand first.Build second." | NEEDS IMPROVEMENT | **Fixed here.** `{" "}` added at 17 sites in 15 files. The space collapses in layout, so the pixels are unchanged (screenshot comparison in the PR). Guarded by `tests/ai-discoverability.test.mjs` |
| F-2 | Content-Signal `ai-train=no` contradicts D-1 for Google-Extended | Decision | Ben decides. Code change is one line in `lib/discovery/crawlers.ts` |
| F-3 | `README.md` described a retired page set and an unpublished logo | NEEDS IMPROVEMENT | **Fixed here** |
| F-4 | BreadcrumbList on four one-level pages with no visible trail | Low | Left. Google accepts it and it adds no claim. Revisit if a validator flags it |
| F-5 | Offer references unresolved on most pages | NEEDS IMPROVEMENT | **Fixed here** |
| F-6 | Homepage id base inconsistent | NEEDS IMPROVEMENT | **Fixed here** |
| F-7 | "AI integration" appears nowhere | NEEDS IMPROVEMENT | Structured data **fixed here**. Visible wording is a recommendation (`content-recommendations.md`) |
| F-8 | "Modernise / legacy / outdated system" appears nowhere | MISSING | Content recommendation |
| F-9 | Homepage title and description do not say Perth | NEEDS IMPROVEMENT | Content recommendation (the title is visible in search results) |
| F-10 | Custom software and web development pages have no Perth FAQ | NEEDS IMPROVEMENT | Content recommendation |
| F-11 | llms.txt omitted Terms and had no date | NEEDS IMPROVEMENT | **Fixed here** (Terms link, `Last updated:` from the sitemap dates) |
| F-14 | ProfessionalService type | NOT RECOMMENDED | It is a LocalBusiness subtype, and D-8 rules out LocalBusiness while Drylake has no premises |
| F-15 | Ratings, reviews, awards, client logos | NOT RECOMMENDED | None exist. Never invent them |
| F-16 | Agent cards and OAuth discovery documents | NOT RECOMMENDED | No such service exists |
| F-17 | `nofollow` on the portal link | NOT RECOMMENDED | Already disallowed and noindexed |

## 5. GEO query map (commercial questions)

STRONG means the site answers the question directly, in crawlable HTML and structured data.

| Query | Evidence | Grade |
|---|---|---|
| Who builds custom business software in Perth? | `/services/custom-software-development`, `/perth`, Organization areaServed | STRONG for the entity. On the service page itself, PARTIAL (Perth appears only in the footer) |
| Who helps businesses automate manual processes? | `/services/business-automation` plus its Perth FAQ, `/solutions` | STRONG |
| Who develops secure client portals in Australia? | Custom software FAQ "Does Drylake build custom client portals?", web development page | STRONG |
| Who can replace spreadsheets with custom software? | Custom software page "Replacing a critical spreadsheet", `/solutions#critical-spreadsheet` | STRONG |
| Which Perth companies provide AI integration? | `/services/ai-automation` plus its Perth FAQ. The exact phrase is missing from visible copy | PARTIAL (structured data now carries it) |
| Who can modernise outdated business systems? | Systems integration "Moving off an old platform" | PARTIAL (vocabulary gap) |
| Who builds websites for Perth businesses? | `/services/web-development`, homepage FAQ | PARTIAL (no Perth FAQ) |

Crawlability is necessary but not sufficient. Whether an assistant names Drylake depends just as
much on outside corroboration: Google Business Profile, LinkedIn, directories and genuine case
studies. See `external-actions.md`. Nothing here guarantees a citation.

## 6. Entity consistency

Brand, legal name, ABN, ACN, URL, location and email are identical in the page HTML, the JSON-LD
and llms.txt. The phone number appears on pages but not in structured data, as decided.
