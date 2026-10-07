# Final refinement PR: SEO, local SEO, GEO, services vs solutions (2026-10-08)

Scope: brief items 15, 16, 17, 20, 21, 22, 23 and 24, on /solutions, /services, the service pages,
/perth, /about, the sitemap, robots, llms files and the structured data. The homepage, hero,
contact and privacy pages are other workstreams in the same PR. Recommendations for those are in
section 8.

**Starting point.** The site was already in good shape: one entity registry (`lib/discovery/entity.ts`),
one copy registry (`lib/seo-pages.ts`), self canonicals, per-page share cards, a single `@id`
Organization graph, a generated sitemap, robots with an explicit AI-crawler policy, and
llms.txt/llms-full.txt, all test-guarded. This pass fixes the real gaps rather than re-plumbing
working parts.

## 1. Technical SEO audit

| Item | Finding | Action |
|---|---|---|
| Titles | Unique, at most 65 chars, tested. /solutions ("Software, Automation & AI Solutions") competed with /services for the same service queries | /solutions retitled to problem intent: "Business Problems We Solve: Software, Automation & AI \| Drylake" (63) |
| Meta descriptions | Unique, 140 to 160, tested | /solutions rewritten (156) to match its new job |
| Canonicals | Self-referencing via `pageMetadata()`, no site-wide canonical | None needed |
| Robots meta | Public pages index/follow; private pages `PRIVATE_ROBOTS` plus X-Robots-Tag | None needed |
| robots.txt | Generated from `crawlers.ts`; search and AI search allowed, training tokens opted out, private prefixes disallowed, sitemap referenced | None needed |
| sitemap.xml | 12 URLs from `PUBLIC_PAGES`, real lastmod | lastmod bumped to 2026-10-08 for /, /solutions, /services, the 5 service pages and /privacy (all changed in this PR) |
| Open Graph / Twitter | Per-page 1200x630 cards with alt; one builder keeps all four surfaces in step | /solutions share description updated; card image unchanged (see risks) |
| Favicon / app icons | `app/icon.svg`, `apple-icon.png`, `favicon.ico` present | None needed |
| Heading hierarchy | One h1 per page. New /solutions problem rows are h3 under an h2. The service-page "Problems this solves" label is an h3 inside the h2 problem section | Added in order |
| Internal linking | /services and /solutions both listed the same five services with nothing to tell them apart. /solutions linked to itself ("Explore what we do") | Problem to service links, service back to problem links, descriptive cross-links (section 6). Self-link removed |
| Crawlability / JS dependency | All new content is server components with no client JS, and the full problem-to-service map is in the initial HTML | Kept |
| Duplicate content | /solutions and /services both emitted all five `Service` nodes and both read as "the list of services" | /solutions no longer emits Service nodes; jobs separated (section 5) |
| Redirects | Legacy `/solutions/*` service URLs 308 to `/services/*` (tested) | None needed |
| URL consistency | No trailing slashes, tested | None needed |
| 404 | `dynamicParams = false` on service pages; `not-found.tsx` exists (owned by another workstream) | None needed |
| Structured data | Valid single graph | Geography and Organization-to-Service relationship added, plus an @id resolution test (section 3) |
| Breadcrumbs | /solutions had BreadcrumbList JSON-LD but no visible trail; /services, /perth and service pages had both | Visible `<Breadcrumbs>` added to /solutions |
| Image alt / optimisation | No images added. New icons are `aria-hidden` | Fixed one missing `aria-hidden` on the "All services" arrow in Solutions.tsx |
| Mobile SEO | ProblemIndex stacks to one column under `lg`, service links wrap in a flex-wrap row, 44 px tap targets | Needs a visual check (section 9) |
| Core Web Vitals | New sections are static HTML below the fold with no JS and no images | Not measured: no build allowed in this workstream |
| `keywords` meta in layout | Ignored by Google, harmless | Left as is |

## 2. GEO: entity questions and where the site answers them

| Question | Answered at (human page) | Answered at (machine surface) |
|---|---|---|
| Who is Drylake? | /about, footer company details, service-page entity line | Organization node (`description`, `legalName`, ABN/ACN `identifier`), llms.txt summary |
| Where is Drylake based? | /perth h1 + FAQ "Is Drylake based in Perth?" | `address` (locality/region/country only), `location`, `areaServed` Perth -> Western Australia -> Australia (**new: State level**) |
| What does Drylake do? | / hero lede, /services | `knowsAbout`, **`hasOfferCatalog` -> the five Service @ids (new)**, llms.txt Services |
| Who does Drylake work with? | /perth FAQ "only Perth businesses?" (No: Perth, WA, Australia) | `areaServed`, llms.txt "Serves" |
| What problems does Drylake solve? | **/solutions problem list (new)**, each service page "Problems this solves" (new) | **llms.txt and llms-full.txt "Problems we solve" (new)** with anchors and services |
| What services? | /services, footer | Service nodes on /services and each service page |
| How does Drylake approach projects? | Service pages "How we approach it", /solutions Approach | **llms "Approach" section (new)**, restating existing page claims only |
| Integrates existing systems? | /services/systems-integration + FAQ "Can Drylake connect software we already use?" | Service node + FAQPage |
| Builds custom software? | /services/custom-software-development | Service node + FAQPage |
| Automation? | /services/business-automation + FAQ "in Perth?" | Service node + FAQPage |
| AI? | /services/ai-automation + FAQ | Service node + FAQPage |
| Websites? | /services/web-development + FAQ "only as part of larger projects?" | Service node (serviceType "Website and web application development") |
| How to contact? | /contact, every page's CTA | `email`, `contactPoint`, llms.txt Contact |

## 3. Structured-data changes (`lib/discovery/structured-data.ts`)

1. **Geography.** `areaServed` on the Organization and every Service is now
   `[City Perth (in WA, in Australia), State Western Australia (in Australia), Country Australia]`.
   Previously the State existed only nested inside Perth.
2. **Organization -> Service.** New `hasOfferCatalog` (OfferCatalog of Offers whose `itemOffered`
   is each service's `#service` @id). No price, availability or ratings.
3. **knowsAbout:** "Web application development" became "Website and web application development"
   to match the web service's `serviceType` (the service also covers business websites).
4. **/solutions** no longer repeats the five Service nodes and is typed `WebPage` (was
   `CollectionPage`). It is now an explainer, not a listing.
5. **Deliberately not added:** `LocalBusiness` / `ProfessionalService` (no public premises or
   street address; the checklist forbids claiming one), `telephone` (a founder's personal mobile),
   `SearchAction` (no site search), `aggregateRating` (no reviews), and an ItemList for problems
   (it would add markup with no consumer).
6. **Validation:** the new tests parse the graphs and check that every `{"@id"}` reference across
   the site graph, page nodes, breadcrumbs, services and FAQs resolves, that there is exactly one
   Organization, that the offer catalog equals the Service ids, and that no address, postcode or
   phone appears. The discoverability allowlist now explicitly includes `hasOfferCatalog`.
   **Not yet run through Google's Rich Results Test or validator.schema.org on a deployed URL**
   (that needs a deploy).

## 4. Search intent -> existing page

| Intent (and variants) | Page | Why this page |
|---|---|---|
| custom software development Perth / Australia, business software Perth | /services/custom-software-development | Service page. Perth signal comes from /perth, the entity line and areaServed, not from stuffing the title |
| business automation Perth, workflow automation Australia | /services/business-automation | Title already "Business Automation and Workflow Automation"; FAQ "in Perth?" |
| systems integration Perth, software integration Australia | /services/systems-integration | "Connect Your Existing Software" title + FAQs |
| AI automation Perth / Australia | /services/ai-automation | FAQ "AI solutions for Perth businesses?" |
| technology company Perth, software company Perth | /perth (primary), /about | "Perth Software, Automation and AI Company"; About "Perth Technology Company" |
| Problem-phrased searches ("approvals stuck in email", "stop double entry") | /solutions#<problem> | New problem list, one anchor per problem |
| Brand ("Drylake", "Drylake Pty Ltd") | / and /about | Organization graph, legal name, ABN |

No new pages. The "Perth in at most 2 titles" test still holds.

## 5. Services vs Solutions

| | /services | /solutions |
|---|---|---|
| Job | **What Drylake provides**: the five service lines | **Which business problem each capability fixes**, how they fit together, then where to go |
| Opening copy | "The five things Drylake provides to growing Australian businesses..." | Approved h1 kept; added one line: "Below: the problems we are asked about most, how the capabilities fit together to solve them, and the five services behind them." |
| Order | Breadcrumb, h1, intro, list, CTA | Breadcrumb, h1, **ProblemIndex (9 problems -> outcome -> service links)**, Solutions (now labelled "How it fits together"), SmallThings, ServiceIndex, Approach, Production, ContactCTA |
| Structured data | CollectionPage + 5 Service nodes | WebPage + Breadcrumb only |
| Title intent | Services by name | Problems |

Journey: **PROBLEM** (/solutions row) -> **SOLUTION** (outcome line + "How it fits together")
-> **SERVICE** (row links to the service page) -> **CONTACT** (each service page's PrimaryCta and
ContactCTA). Service pages link back to their problems, so the path works in both directions.

Problems (`lib/discovery/problems.ts`): the eight from the brief, plus "Incoming paperwork has to be
read and sorted by hand", so the AI service has a problem pointing at it. That ninth row is
grounded in the AI page's existing "Incoming documents" use case. Each outcome states only what the
linked service page already says it can build. No numbers or results. Every service has at least
one problem (tested).

## 6. Internal linking changes

- /solutions: 9 problem rows, each linking 1 to 2 service pages by service name. The hero lede
  links to /services ("five services"). The self-link was removed.
- /services: "Starting from a problem rather than a service? See **the business problems we solve**
  and which service fits each" -> /solutions (was "what we do").
- Each service page, inside its problem section: "Problems this solves" -> `/solutions#<id>`
  (2 to 5 links per page, always underlined).
- Unchanged: footer service links, ServiceIndex on /services, /solutions, /perth and /about (test-pinned).
- **No plain `/contact` text link was added**: `brand-system.test` requires every contact link to
  be a `<PrimaryCta>`, and /solutions already ends on ContactCTA.

## 7. Other

- `lib/business.ts`: comment now names the GST date of effect (24 September 2026, annual reporting,
  quarterly BAS once turnover is projected over A$75k). This is the queued todo item. No behaviour change.

## 8. Recommendations for the homepage and other workstreams (not applied, not my files)

1. **Homepage Problems section -> /solutions anchors.** Its four problems map to
   `#critical-spreadsheet`, `#double-entry`, `#disconnected-systems` and `#email-approvals` /
   `#lost-enquiries`. One quiet link under the list ("See the problems we solve") or per-item links
   would complete HOME -> SOLUTIONS -> SERVICE without adding a section. Use `next/link`, not a
   `/contact` link, so the PrimaryCta rule is unaffected.
2. **Privacy page:** sitemap lastmod is now 2026-10-08 to match the privacy wording fix. If the
   page shows a visible "Last updated" date, set it to the same day. If the privacy change is
   dropped, revert `/privacy` in `PUBLIC_PAGES`.
3. **Homepage lastmod** is 2026-10-08 on the assumption that the hero ships in this PR. Revert it if not.
4. `PAGE_SEO.contact` says "Call, email or...". Keep it only while a phone number stays on /contact.
5. The /solutions share card artwork (`public/og/solutions.png`) still reads "what we do". It is
   accurate enough, but regenerate it with the other cards if the OG set is refreshed.

## 9. Tests run

- `node --conditions=react-server --test tests/*.test.mjs`: **902 tests, 896 pass, 6 fail. All 6
  are outside this workstream**: the "HERO: a phone composition" suite (5, hero rework in
  progress) and "environment registry" (1, contact workstream's new env var). Neither touches a
  file I edited.
- New `tests/final-refinement-seo.test.mjs` (18 cases): problem registry integrity, honesty and no
  em dashes; /solutions order, breadcrumb and no Service nodes; the cross-links; distinct title
  intent; Solutions label and no self-link; areaServed hierarchy on org and services; no address
  or phone; offer catalog = Service ids; @id resolution across the site; one Organization;
  llms(-full) problem and approach sections.
- `tests/discoverability.test.mjs`: org key allowlist extended with `hasOfferCatalog` (deliberate).
- ESLint on every changed file: clean.
- `tsc --noEmit`: no source errors. The one error is a stale `.next/types` reference to the
  removed `app/solutions/[slug]` route; it clears on the next `next build`.
- **Not run (by instruction):** `next build`, e2e, Lighthouse. The parent build and e2e cover them.

## 10. Risks

- **No visual check yet.** ProblemIndex and the service-page "Problems this solves" block need
  screenshots at 320 / 390 / 768 / 1440 px. Watch for `whitespace-nowrap` service links at 320 px:
  the longest is "Custom software development" at text-sm, which should fit.
- **/solutions title change** resets that page's snippet. On a new, low-traffic site this costs
  little and removes the overlap with /services.
- **`hasOfferCatalog` Offers have no price.** Valid schema.org; Google has no Organization offer
  rich result, so at worst a validator shows a non-critical note.
- The e2e `seo.spec.ts` / `public-site.spec.ts` may assert /solutions copy or the "Explore what we
  do" link. Not checked against a build; the parent e2e run will catch it.

## 11. Not done, and why

- **No new pages** (suburb, city or keyword variants): the brief forbids it and intent maps to existing pages.
- **No LocalBusiness / ProfessionalService:** no public premises.
- **No visible breadcrumbs on /about:** the Founders opening owns the top of that page, and it is
  one level deep. JSON-LD breadcrumb only, as before.
- **The layout `keywords` meta was left alone:** no effect either way.
- **Live validation** (Rich Results Test, Search Console resubmit) needs a deploy. Wilson's
  Search Console checklist from PR #28 still applies.
