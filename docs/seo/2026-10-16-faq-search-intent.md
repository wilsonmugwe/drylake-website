# FAQ search-intent map (2026-10-16)

Scope: the 28 questions in `lib/faqs.ts`, mapped to query clusters, intent, destination page, internal links and evidence.
Method (research cost ladder, tier 1 only, no paid tools, no Firecrawl): Google and Bing autocomplete endpoints (AU market, 2026-10-16, requests spaced about 1 second apart) and two WebSearch looks at what currently ranks.

## Confidence

| Claim | Confidence |
|---|---|
| A query string appears in autocomplete, so people type it | MEDIUM. Autocomplete shows demand exists, not volume |
| Relative priority between clusters | LOW. No volume data was used |
| What ranks today (agency cost guides, vendor price pages) | MEDIUM. Two searches, results are vendor marketing |
| Anything about Drylake ranking | NONE. Not measured; no ranking is promised anywhere on the site |

A raw string being absent from autocomplete (e.g. "custom software vs spreadsheets") does not mean no demand; it means the long-tail phrasing is not a stored suggestion. Those FAQs are written for the underlying intent and are noted below.

## What currently ranks (WebSearch, 2026-10-16)

- "how much does a business website cost in Perth": local agency cost guides and price tables (Perth web design firms, independent cost guides) with published price bands. Informational with commercial intent. Drylake is quote-first by policy, so the FAQ answers the question honestly (what drives cost), publishes no figure, and links to the service page and consultation.
- "custom software development cost Australia small business": vendor cost guides publishing ranges. Same treatment.
- Autocomplete for "web developer perth" and "software company perth" is dominated by directory-style and jobs results, which signals navigational and local-commercial intent that belongs on `/perth` and the service pages, not on /faq.

## Destination rule

- Commercial intent (someone ready to buy or compare vendors): primary destination is the service page; the FAQ is a short summary that links to it. No FAQ answer may be a near-duplicate (3-word shingle Jaccard above 0.6) of a service-page or location-page FAQ answer; enforced in `tests/brand-story-faqs.test.mjs`.
- Informational intent: /faq is the primary destination.
- Local: `/perth` and `/locations/*`.
- Navigational: /consultation, /contact, /collaborate.

## Map

| FAQ id | Target query cluster | Intent | Primary destination | Internal links added | Evidence (autocomplete, 2026-10-16) |
|---|---|---|---|---|---|
| web-cost | website cost perth / cost of a website australia | Commercial + informational | /services/web-development (commercial), /faq (informational) | web-development, /consultation | G: "website design cost perth", "how much does a website cost in australia", "how much does website development cost in australia"; B: "how much does a website cost in australia", "website development cost in australia" |
| web-time | how long does it take to build a website | Informational | /faq | web-development | G+B: "how long does it take to build a website" (10 and 12 suggestions); variants "from scratch", "on wordpress", "on shopify" |
| web-redesign | redesign website without losing seo | Informational | /faq | web-development | G: "redesign website without losing seo", "does changing your website affect seo"; B: "website redesign seo checklist", "seo rates during website redesign" |
| web-wordpress | move/migrate away from wordpress | Informational + commercial | /faq, then web-development | web-development | G: "moving away from wordpress", "migrate away from wordpress", "are people moving away from wordpress" |
| web-store | online store website, ecommerce | Commercial | /services/web-development | web-development, systems-integration | G/B: only shopper-side suggestions ("online shopping website australia"). Builder intent not visible in autocomplete: LOW confidence, kept because owner-requested topic |
| web-mobile | mobile friendly website | Informational | /faq | web-development | No distinct suggestion observed; covered as a short answer, not a target query |
| web-google | how to get website on google | Informational | /faq | web-development, /perth | G: "how to get website on google search", "how to get website on google"; B: "how to get my website to show up on google", "how to get website on google first page seo" |
| web-after | website maintenance after launch / who owns my website | Informational | /faq | /consultation | B: "maintenance plan for website", "what is website maintenance", "website maintenance" family. Ownership phrasing has no suggestion; answer follows Approach.tsx (no automatic IP transfer) |
| sw-cost | custom software development cost australia | Commercial | /services/custom-software-development | custom-software, /consultation | G: "custom software development cost in australia"; B: "custom built software costs", "business software australia pricing", "custom software development cost" family |
| sw-spreadsheets | custom software vs spreadsheets | Informational | /faq | custom-software | No suggestion for the exact phrase (G empty). Intent inferred, LOW confidence |
| sw-connect | connect existing software / systems integration | Commercial | /services/systems-integration | systems-integration | No AU long-tail suggestions ("connect accounting software to website", "systems integration australia small business" empty on Google, noise on Bing). Short summary, detail on service page |
| sw-admin | automate manual admin / business process automation | Commercial + informational | /services/business-automation | business-automation | G: "workflow automation vs rpa", "process automation perth"; B: "how to automate business", "automate your business process" |
| sw-portals | customer portal / booking system for small business | Commercial | /services/custom-software-development | custom-software | G+B: "booking system for small business" (10 and 11 suggestions: free, app, software, reservation system). Customer portal AU suggestions are noise (government portals) |
| sw-improve | improve existing system without replacing | Informational | /faq | custom-software, systems-integration | No suggestions. Intent inferred, LOW confidence |
| ai-help | ai automation for small business | Commercial + informational | /services/ai-automation | ai-automation, business-automation | G: "ai automation for small businesses", "...services...", "ai automation agency for small businesses", "ai workflow automation for small business"; B: "ai automation for small businesses use cases", "ai process automation for small businesses" |
| ai-which | what business processes can be automated | Informational | /faq | business-automation | G: "what business processes can be automated"; B: "what is business process automation", "automation of business processes" |
| ai-add | add ai to my website / system | Informational + commercial | /services/ai-automation | ai-automation | G: "add ai to my website", "can i add ai to my website", "add ai chatbot to my website"; B: "how to add ai to my website", "add an ai chatbot to your website" |
| ai-privacy | is ai safe for customer data (AU) | Informational | /security-privacy | security-privacy, ai-automation | B: "ai and privacy australia", "safe and responsible ai in australia", "is ai safe to use". G empty for the exact phrase |
| collab-bronnie | BRONNIE (brand) | Navigational | /collaborate | /collaborate | None: brand term, no search demand to claim. Owner-required answer |
| svc-what | what does Drylake do | Navigational + informational | / (home) | /services | Brand query; homepage subset |
| wk-who | web developer / software company perth, small business | Local + commercial | /perth | /perth | G: "web developer perth", "website developer perth", "web design perth", "software company perth", "software development company perth"; B: mostly jobs and unrelated. Perth pages own the local intent |
| price-consultation | free website consultation perth | Navigational | /consultation | /consultation | B: "free website design consultation", "website designers in perth"; G empty for the Perth phrase |
| wk-decide | what technology does my business need | Informational | /faq | /solutions | No suggestions; supports the "understand first" brand message |
| price-quote | what happens after consultation / how projects are quoted | Navigational | /faq | none | No suggestions. Process answer |
| start | how to get started / contact | Navigational | /consultation, /contact | /consultation, /contact | Homepage subset |
| collab-work | technology collaboration / partnership | Navigational | /collaborate | /collaborate | No search demand claimed |
| sec-protect | how is my information protected | Informational | /security-privacy | /security-privacy | Trust query, not a search target |
| sec-data | what happens to my form data, delete my information | Informational | /privacy, /security-privacy | /security-privacy, /privacy | Trust query, not a search target |

## Raw autocomplete log (2026-10-16, AU; suggestions as returned, first 8)

Google (client=firefox, gl=au, hl=en-AU) and Bing (osjson, market en-AU). Empty means the endpoint returned nothing.

- website cost perth: G website cost perth | website design cost perth | how much is a good website cost | how much does a website cost in australia. B: website cost per year | website cost per month
- how much does a website cost australia: G how much does a basic website cost in australia | how much does a website design cost in australia | how much does website hosting cost australia | how much does website development cost in australia. B: how much does a website cost in australia | website builder australia cost | website development cost in australia
- how long does it take to build a website: G from scratch | on wix | on squarespace | on wordpress | on shopify | with ai. B: how long to develop a website | how to build a website quickly
- redesign website without losing seo: G does changing your website affect seo. B: website redesign seo checklist | how to redesign a website
- move away from wordpress: G moving away from wordpress | migrate away from wordpress | are people moving away from wordpress. B: how to transfer wordpress site (noise otherwise)
- custom software cost australia: G custom software development cost in australia. B: business software australia pricing | custom built software costs | custom developed software costs
- booking system for small business: G free | software | reservation system for small business. B: app | online | owners | software | features
- ai automation for small business: G ...for small businesses | services | agency | workflow automation | tools. B: use cases | tools | process automation
- what business processes can be automated: G why automate business processes. B: what is business process automation | automation of business processes
- add ai to my website: G add ai chatbot / agent / search to my website. B: how to add ai to my website | add an ai chatbot to your website
- web developer perth / software company perth: G website developer perth | web design perth | website design perth price | software development company perth | it company perth
- how to get website on google: G how to get website on google search. B: how to get my website to show up on google | ...first page seo
- empty on Google (no stored suggestion): custom software vs spreadsheets; connect accounting software to website; automate manual admin small business; customer portal development australia; is ai safe for customer data australia; website maintenance after launch; free website consultation perth; ai chatbot for small business australia; systems integration australia small business

Full raw JSON was produced by a throwaway script and is not committed.

## Observations that shaped the content

1. Cost is the dominant commercial query family, and competitors publish ranges. Drylake is quote-first (`QUOTE_FIRST`), so the answers explain what drives cost and link to the service page and consultation. If the owner later decides to publish a starting-from price, `web-cost` and `sw-cost` are the two answers to change, plus the pricing test.
2. "Perth" modifies web design and software queries heavily in Google autocomplete, so /perth, /locations/* and the home title carry that; /faq does not try to compete for it.
3. AI queries are mostly "ai automation for small businesses" plus tool/agency/course modifiers. The FAQ answers the plain informational form and sends commercial intent to /services/ai-automation.
4. Several of the owner's candidate topics have no autocomplete signal (spreadsheets, integration, maintenance). They are retained because they are real customer questions and cheap to answer, not because demand was measured.
5. Questions that deserve more than about 120 words are answered briefly and listed as dedicated-page candidates in the PR body (website cost guide, WordPress migration, redesign without losing SEO, spreadsheets vs custom software, AI and customer data).
