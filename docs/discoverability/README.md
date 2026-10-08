# Drylake search and AI discoverability

Universal search and AI-retrieval infrastructure for drylake.com.au. It is a system, not a page:
the facts live in one module, every machine-readable surface is generated from them, and
tests plus a live check fail when a deploy breaks discoverability.

- Code: `lib/discovery/` (entity, crawler policy, structured data, llms.txt, IndexNow)
- Build-time guard: `tests/discoverability.test.mjs` (runs in `npm test`)
- Live guard: `scripts/discoverability-check.mjs`, run by `.github/workflows/discoverability.yml`
  after every production deploy and weekly
- Crawler evidence (vendor pages, accessed 2026-10-06): `crawler-verification-2026-10-06.md`

We cannot guarantee rankings or AI answers. This work makes Drylake's public information
complete, consistent, crawlable and corroborated, so search and answer systems have reliable
evidence to work from.

---

## 1. The entity every system should see

| Fact | Value | Where it is stated |
|---|---|---|
| Brand | Drylake | Organization `name`, every title, llms.txt |
| Legal entity | DRYLAKE PTY LTD | Organization `legalName`, footer, About company details, llms.txt |
| ABN | 70 702 662 557 | Organization `identifier` + `taxID`, footer, About, llms.txt, invoices |
| ACN | 702 662 557 | Organization `identifier`, About, llms.txt |
| Website | https://drylake.com.au | Organization `url`, WebSite, canonicals |
| Location | Perth, Western Australia, Australia | Organization `address` (locality only) and `areaServed`, footer, every service page |
| Category | Australian technology and software company | llms.txt, About, page copy |
| Services | Custom software and client portals; business automation and systems integration; applied AI | Service nodes, `/solutions/*`, llms.txt |

One source: `lib/discovery/entity.ts` (legal name, ABN and ACN come from `lib/business.ts`,
the same module invoices use). Every page emits a JSON-LD `@graph` whose nodes reference
`https://drylake.com.au/#organization`, so all pages describe the same organisation.

Privacy (reviewed 2026-10-06): structured data carries only public business facts. No telephone (the site number is a founder's personal mobile), founders as name + role + employer only.

Deliberately not published: street address (no public premises), ratings or reviews (none
exist), logo (the current artwork reads "DRYLAKE TECHNOLOGIES"; see manual action M9).

---

## 2. Crawler and discovery matrix

Current access is production on 2026-10-06, before this PR (robots.txt allowed every crawler
everywhere except the private prefixes; probe: all agents got 200 on every public page, no
Vercel mitigation). Desired access is what this PR ships. Sources for every row:
`crawler-verification-2026-10-06.md` and `lib/discovery/crawlers.ts`.

| Platform | Search / AI product | Crawler / index mechanism | Current access | Desired access | robots rule | Manual action |
|---|---|---|---|---|---|---|
| Google | Google Search, AI Overviews, AI Mode | `Googlebot`, own index (AI features use the Search index) | Allowed | Allowed | `*` group | M1 Search Console, submit sitemap |
| Google | Gemini grounding (Gemini Apps, Vertex AI) + Gemini model training | `Google-Extended` control token (no separate crawler) | Allowed | **Allowed (decision D-1, reconfirmed by Ben 2026-10-08)** | Own group: same Allow/Disallow as `*`, plus `Content-Signal: ai-train=yes` | none |
| Microsoft | Bing, Microsoft Copilot | `bingbot`, own index; Copilot grounds on Bing | Allowed | Allowed | `*` group | M2 Bing Webmaster Tools, M3 IndexNow |
| Microsoft | Training control | No robots token; only `noarchive`/`nocache` meta, which also remove Copilot answers | n/a | No tag (decision D-2) | none | none |
| Yahoo | Yahoo Search | Bing index [secondary source] | Via Bing | Via Bing | none needed | covered by M2 |
| DuckDuckGo | DuckDuckGo search | Largely Bing + `DuckDuckBot` | Allowed | Allowed | `*` group | covered by M2 |
| DuckDuckGo | DuckAssist AI answers | `DuckAssistBot` | Allowed | Allowed | `*` group | none |
| Ecosia, Startpage, Qwant | Search | Bing and/or Google feeds (Qwant partly own) | Via Bing/Google | Via Bing/Google | none needed | covered by M1/M2 |
| Brave | Brave Search, Brave Search API (used by AI products) | Own index, no distinct UA; obeys Googlebot rules | Allowed | Allowed | follows Googlebot (`*`) | none (no submission programme) |
| Apple | Siri, Spotlight, Safari suggestions | `Applebot`, own index | Allowed | Allowed | `*` group | M4 Apple Business Connect |
| Apple | Foundation-model training | `Applebot-Extended` control token | Allowed | Opted out | `Applebot-Extended: Disallow /` | none |
| OpenAI | ChatGPT search | `OAI-SearchBot` | Allowed | Allowed | `*` group | none |
| OpenAI | ChatGPT user actions | `ChatGPT-User` (may not apply robots.txt) | Allowed | Allowed | `*` group | none |
| OpenAI | Model training | `GPTBot` | Allowed | Opted out | `GPTBot: Disallow /` | none |
| Anthropic | Claude search | `Claude-SearchBot` | Allowed | Allowed | `*` group | none |
| Anthropic | Claude user fetches | `Claude-User` (honours robots.txt) | Allowed | Allowed | `*` group | none |
| Anthropic | Model training | `ClaudeBot` | Allowed | Opted out | `ClaudeBot: Disallow /` | none |
| Perplexity | Perplexity search | `PerplexityBot` | Allowed | Allowed | `*` group | none |
| Perplexity | User requests | `Perplexity-User` (generally ignores robots.txt) | Allowed | Allowed | `*` group | none |
| Meta | Meta AI search and citations | `meta-webindexer` | Allowed | Allowed | `*` group | none |
| Meta | Link previews | `facebookexternalhit` | Allowed | Allowed | `*` group | none |
| Meta | Training and product indexing | `meta-externalagent` | Allowed | Opted out | `meta-externalagent: Disallow /` | none |
| Amazon | Alexa / Amazon search | `Amzn-SearchBot` | Allowed | Allowed | `*` group | none |
| Amazon | Product improvement, may train | `Amazonbot` | Allowed | Opted out | `Amazonbot: Disallow /` | none |
| Common Crawl | Open corpus used for training | `CCBot` | Allowed | Opted out | `CCBot: Disallow /` | none |
| Mojeek | Independent index | `MojeekBot` | Allowed | Allowed | `*` group | none |
| xAI | Grok | **No crawler publicly documented** (docs.x.ai, x.ai checked) | n/a | n/a | none (not invented) | re-check quarterly |
| IndexNow | Bing, Yandex, Seznam, Naver, Yep, ... (not Google) | Push protocol, key file at site root | Not set up | Live after deploy | n/a | M3 confirm first submission |

Unknown or undocumented bots are neither named nor blocked: they fall through to the `*`
group, which allows the public site and disallows private surfaces.

**Private surfaces stay closed for everyone:** `/api`, `/admin`, `/client`, `/portal`,
`/sign-in`, `/sign-up` are `Disallow`ed in robots.txt, send `X-Robots-Tag: noindex, nofollow`
(new in this PR), keep their page-level noindex, and remain behind Clerk and Supabase RLS.
robots.txt is a crawl hint, never access control.

---

## 3. Decisions

| # | Decision | Why | Revisit when |
|---|---|---|---|
| D-1 | **Google-Extended ALLOWED** (business decision, Wilson/Ben 2026-10-06; drylake-ops D20) | Objective is maximum legitimate search and AI discovery for PUBLIC marketing content. Google documentation (google-common-crawlers, updated 2026-07-14, read 2026-10-06): Google-Extended controls BOTH grounding in Gemini Apps / Vertex AI API for Gemini AND use of content for training future Gemini models, and "does not impact a site's inclusion in Google Search nor is it used as a ranking signal". Google offers no grounding-only option, so allowing grounding means allowing that training use. Private/admin/client surfaces stay disallowed (`*` group) and noindexed regardless | Google separates grounding from training |
| D-2 | No `noarchive`/`nocache` for Bing | Microsoft's only training controls also remove pages from Copilot answers | Microsoft ships a training-only control |
| D-3 | Training tokens opted out: GPTBot, ClaudeBot, CCBot, meta-externalagent, Amazonbot, Applebot-Extended | Each vendor runs a separate search/retrieval crawler, which stays allowed, so search visibility is unaffected (per vendor docs) | A vendor merges search and training crawlers |
| D-4 | User-triggered fetchers allowed | They fetch because a person asked about Drylake; blocking them hides Drylake from that person | n/a |
| D-5 | No per-agent allow groups, with one exception | A named group replaces the `*` group for that bot; duplicating private Disallows per bot invites drift. Allowed bots use `*` (tested). **Exception (2026-10-08):** `Google-Extended` has its own group so its Content-Signal can say `ai-train=yes` while `*` says `ai-train=no`; its rules are generated from the same `PRIVATE_PREFIXES`, and the unit tests plus the live check assert they equal the `*` rules | Another token is allowed to train |
| D-6 | IndexNow on every production deploy, from the live sitemap | Bing powers Copilot, DuckDuckGo, Yahoo and Ecosia results; push indexing is free and needs no account | Bing deprecates IndexNow |
| D-7 | Three service pages, no location pages | Real service lines the site already offers; answers "who builds client portals / automation / AI in Perth" from first-party evidence. Location pages would be thin and are out of scope | A new service line launches |
| D-8 | Locality only, no street address, no LocalBusiness type | No public premises (pre-launch checklist #14, #17) | Drylake opens an office |

---

## 4. Manual actions (accounts and dashboards: Ben or Wilson)

| # | Action | Owner | Notes |
|---|---|---|---|
| M1 | **Google Search Console**: add domain property `drylake.com.au` (DNS TXT at Synergy Wholesale, or URL-prefix with `GOOGLE_SITE_VERIFICATION` env var), submit `https://drylake.com.au/sitemap.xml`, request indexing for the 3 service pages | Ben | Domain property via DNS covers http/https/www |
| M2 | **Bing Webmaster Tools**: sign in, "Import from Google Search Console" (fastest) or verify with `BING_SITE_VERIFICATION` env var / DNS; submit sitemap; check the AI Performance report monthly | Ben | Bing feeds Copilot, DuckDuckGo, Yahoo, Ecosia |
| M3 | **IndexNow**: nothing to configure. After the first production deploy, check the workflow run "Discoverability" shows IndexNow `200`/`202`; Bing Webmaster Tools > IndexNow shows received URLs | Wilson | Key file `/81ebccabf60ea274ff01b3265b24c197.txt` is public by design |
| M4 | **Apple Business Connect**: claim Drylake (brand + location card, Perth, website, ABN-matched legal name) | Ben | Feeds Apple Maps, Siri, Spotlight |
| M5 | **Google Business Profile**: create as a **service-area business** (Perth + WA, address hidden), category "Software company", website drylake.com.au | Ben | Verification needs a real address that stays hidden; never a fake address |
| M6 | **Bing Places**: import from Google Business Profile once M5 is verified | Ben | |
| M7 | **LinkedIn company page** "Drylake" with legal name DRYLAKE PTY LTD in About, website, Perth; founders list Drylake as employer | Ben, Wilson | Then add its URL to `ENTITY.sameAs` |
| M8 | **Vercel Firewall**: confirm Bot Protection is not in challenge mode for public pages and the "AI bots" managed ruleset is **not** in deny mode (it blocks AI search crawlers too). Keep the `/api/contact` rate limit | Wilson | Vercel docs: verified bots bypass Bot Protection; Brave and Mojeek may not be in the verified list |
| M9 | **Logo**: export a "Drylake" logo without "TECHNOLOGIES" (already on Wilson's list), then add `logo` to the Organization node | Wilson | Logo artwork must match the brand |
| M10 | Review the new service-page copy and FAQ answers (`lib/discovery/entity.ts` SERVICES) for accuracy | Ben | Only claims Drylake stands behind |

---

## 5. Entity authority plan (external corroboration)

drylake.com.au describing itself is not enough. Each source below independently states the
same identity. Same name, legal name, ABN, website and location everywhere; no fake listings,
reviews, links or press.

| Source | Status | Action |
|---|---|---|
| ABN Lookup / ASIC register (DRYLAKE PTY LTD, ABN 70 702 662 557) | Exists (public register) | None: the strongest corroboration, already matches |
| Google Business Profile | Not created | M5 |
| Bing Places | Not created | M6 |
| Apple Business Connect | Not created | M4 |
| LinkedIn company page + founder profiles | Unknown | M7, then add to `sameAs` |
| GitHub organisation "drylake" | Optional | Only if real public code or docs exist; add to `sameAs` |
| Australian directories with editorial or verification standards (e.g. AusTender supplier registration if tendering, industry association membership such as AIIA or a local chamber of commerce) | Not started | Only where Drylake genuinely qualifies; one consistent listing each |
| Technology partner directories (Vercel, Clerk, Stripe, Supabase partner programmes) | Not eligible yet | Apply only when partner criteria are actually met |
| Client references and case studies | None published | Only with written client permission; label own projects as own work |
| Press / editorial | None | Earned only (e.g. a founder story in WA business media); never paid "press releases" posing as editorial |
| Clutch / GoodFirms style review sites | Not started | Only with genuine client reviews; never solicit fake ones |

Rule: when a profile goes live, add its URL to `ENTITY.sameAs` (the tests reject placeholders),
and make sure the profile links back to https://drylake.com.au.

---

## 6. Branded search ownership

Target queries: Drylake, Drylake Pty Ltd, Drylake Perth, Drylake Australia, Drylake software,
Drylake technology, Drylake AI, Drylake automation.

| Query | First-party evidence on drylake.com.au | External corroboration |
|---|---|---|
| Drylake / Drylake Pty Ltd | Titles, Organization `name` + `legalName` + `alternateName`, footer entity line, About company details | ABN Lookup, ASIC, LinkedIn, GBP |
| Drylake Perth / Australia | Organization address + areaServed, every service page states Perth, Western Australia | GBP service area, Apple Business Connect, Bing Places |
| Drylake software / technology | /solutions/custom-software, Organization `knowsAbout`, About | LinkedIn industry, partner directories |
| Drylake AI | /solutions/applied-ai | LinkedIn posts, any earned coverage |
| Drylake automation | /solutions/automation-integration | Same |

Name-collision note: "Drylake" also appears in unrelated contexts (place names, other
businesses). The legal name, ABN and Perth location are the disambiguators; they appear
together on every page.

---

## 7. AI answer evidence map

| Question | Evidence a retriever finds |
|---|---|
| What is Drylake? | `ENTITY.summary` in Organization `description`, llms.txt quote, homepage |
| What is Drylake Pty Ltd? | About "Company details" + `legalSummary`, footer, llms.txt |
| Where is Drylake based? | Organization address/location, service-page FAQ "Where is Drylake based?", footer |
| What does Drylake do? | /solutions, three Service nodes, llms.txt services |
| Is Drylake an Australian company? | ABN/ACN identifiers, "Australian proprietary company" in About, ABN Lookup |
| Who provides custom software development in Perth? | /solutions/custom-software (Perth stated), Service areaServed Perth |
| Who provides business automation in Perth? | /solutions/automation-integration + FAQ |
| What companies build AI solutions for Perth businesses? | /solutions/applied-ai + FAQ |
| Who builds custom client portals in Perth? | /solutions/custom-software FAQ "Does Drylake build custom client portals?" |

The non-branded questions depend on external corroboration (section 5) as much as on the site.

---

## 8. Regression protection

| Layer | What it catches | Runs |
|---|---|---|
| `tests/discoverability.test.mjs` | Entity drift, ABN checksum, graph @id links, invented ratings, sitemap missing a page, duplicate titles/descriptions, canonical paths, crawler policy (search in, training out), private prefixes, noindex headers, auth proxy scope, llms.txt facts, IndexNow key, workflow wiring | `npm test`, every PR |
| `scripts/discoverability-check.mjs` | Live site: 200 for 7 search/AI agents on every public page, no noindex, canonical, Organization graph, robots groups, sitemap set, llms.txt, IndexNow key, private noindex headers, Vercel mitigation | After every production deploy and weekly (GitHub Actions); manually any time |

Adding a public page: add the route, add it to `PUBLIC_PAGES`, give it `pageMetadata()` and a
`webPageNode()`. The tests fail until all three are done.

---

## 9. Production verification (after deploy)

1. GitHub > Actions > "Discoverability" > the run for the production deploy: both jobs green.
2. Or locally: `node scripts/discoverability-check.mjs` prints `PASS`.
3. `curl -s https://drylake.com.au/robots.txt` shows the training group and the `*` group.
4. `curl -sI https://drylake.com.au/admin | grep -i x-robots-tag` shows `noindex, nofollow`.
5. Google Rich Results Test and Schema.org validator on `/`, `/about` and one service page:
   Organization, WebSite, WebPage, BreadcrumbList, Service and FAQPage parse with no errors.
6. Search Console URL Inspection (live test) on a service page: crawl allowed, indexable.

Before this PR, the same check against production failed 46 assertions (service pages 404,
no training opt-outs, no llms.txt, no IndexNow key, private surfaces without noindex headers,
legal name absent from page HTML).
