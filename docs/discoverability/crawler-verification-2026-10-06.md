# Crawler and discovery reference, verified (2026-10-06)

Scope: drylake.com.au (Next.js on Vercel). Every row below is drawn from the vendor's own page where it could be fetched, all accessed **2026-10-06**. Where a vendor page could not be fetched, or does not exist, the row says so, and any secondary source is marked **[secondary]**. Tools used: WebSearch and WebFetch only, about 40 calls, no metered tools.

Class key: **(a)** search/indexing crawler · **(b)** AI retrieval/search crawler · **(c)** user-triggered fetcher · **(d)** model-training crawler · **(e)** robots.txt control token only (not a separate crawler)

---

## 1. Master table

| Platform | Product | Token / UA | Class | Own index or depends on | Obeys robots.txt? | Official source |
|---|---|---|---|---|---|---|
| Google | Search, Discover, Images, News, **AI Overviews, AI Mode** | `Googlebot` (+ `Googlebot-Image`, `-Video`, `-News`) | a | Own | Yes | developers.google.com/search/docs/crawling-indexing/google-common-crawlers (updated 2026-07-14) |
| Google | Shopping | `Storebot-Google` | a | Own | Yes | same |
| Google | Generic R&D, no product | `GoogleOther` (+ `-Image`, `-Video`) | a (generic, "no specific product") | Own | Yes | same |
| Google | Vertex AI Agents (crawls the site owner asked for) | `Google-CloudVertexBot` | b | Own | Yes | same |
| Google | Gemini training + **Gemini Apps grounding** + Vertex AI API for Gemini | `Google-Extended` | e | Uses Googlebot's crawl | Token only | same |
| Google | Search Console testing tools | `Google-InspectionTool` | c (testing, no Search effect) | n/a | Yes per common-crawler list | same |
| Google | Agents (e.g. Project Mariner), Read Aloud, NotebookLM/Gemini Notebook, Pinpoint, Messages previews, Site Verifier, Feedfetcher | `Google-Agent`, `Google-Read-Aloud`, `Google-GeminiNotebook`, `Google-Pinpoint`, `GoogleMessages`, `Google-Site-Verification`, `FeedFetcher-Google` | c | n/a | **"generally ignore robots.txt rules"** | developers.google.com/search/docs/crawling-indexing/google-user-triggered-fetchers (updated 2026-08-19) |
| Microsoft | Bing Search; Copilot and M365 Copilot web grounding | `bingbot` | a (also the source for Copilot) | Own | Yes (Bing help pages not fetchable, see §3) | Bing help JS-rendered; Copilot→Bing: learn.microsoft.com/en-us/microsoft-365-copilot/manage-public-web-access |
| Microsoft | Training control | **no robots token**; `<meta name="robots" content="noarchive">` / `nocache` | e (meta tag, not robots token) | n/a | n/a | blogs.bing.com/webmaster/september-2023/Announcing-new-options-for-webmasters-to-control-usage-of-their-content-in-Bing-Chat |
| DuckDuckGo | Search | `DuckDuckBot/1.1` | a | **Largely Bing** for links and images, plus own crawler and indexes | Yes ("respects WWW::RobotRules") | duckduckgo.com/duckduckgo-help-pages/results/duckduckbot ; .../results/sources |
| DuckDuckGo | DuckAssist AI answers | `DuckAssistBot/1.2` | b (real-time crawl for AI answers) | Own | Yes, change takes effect after 72 h | duckduckgo.com/duckduckgo-help-pages/results/duckassistbot |
| Yahoo | Search | (no own web crawler in use for results) `Slurp` is still listed in Vercel's directory | n/a | **Bing** (US/CA English confirmed 2010) | n/a | [secondary] searchengineland.com/yahoos-transition-to-bing-organic-results-complete-49228 |
| Ecosia | Search | none documented | n/a | **Bing (all users), Google (some regions/browsers), EUSP (France only)** | n/a | support.ecosia.org/article/579-search-results-providers |
| Startpage | Search | none | n/a | **Google** (paid feed) | n/a | [secondary] howtogeek.com/718781 ; en.wikipedia.org/wiki/Startpage. Startpage's own page not checked |
| Qwant | Search | `Qwantbot` | a | Own index + Bing supplement + EUSP JV | Not verified (help.qwant.com/bot returned **403**) | [secondary] betterweb.qwant.com/en/2023/09/18/web-indexing-where-is-qwants-independence/ |
| Brave | Search + Brave Search API (sold to LLM vendors for grounding) | **No distinct UA, by design** | a | **Own independent index** | Follows **Googlebot** rules: "if a domain or page is not crawlable by Googlebot, then Brave Search's bot will not crawl it either" | search.brave.com/help/brave-search-crawler ; brave.com/search/api/ |
| Apple | Spotlight, Siri, Safari search; also training | `Applebot` | a (and d: crawl "also helps train" Apple models) | Own | Yes; **falls back to Googlebot rules** if Applebot not named | support.apple.com/en-us/119829 |
| Apple | Training control | `Applebot-Extended` | e ("not a separate crawler") | Uses Applebot's crawl | Token only | same |
| OpenAI | ChatGPT search | `OAI-SearchBot` | b | Own | Yes | developers.openai.com/api/docs/bots |
| OpenAI | Training | `GPTBot` | d | n/a | Yes | same |
| OpenAI | User actions in ChatGPT / Custom GPTs | `ChatGPT-User` | c | n/a | **"robots.txt rules may not apply"** | same |
| OpenAI | Ad safety checks for ChatGPT ads | `OAI-AdsBot` | c (ad validation) | n/a | Yes | same |
| Anthropic | Training | `ClaudeBot` | d | n/a | Yes | support.claude.com/en/articles/8896518 |
| Anthropic | Claude search index | `Claude-SearchBot` | b | Own | Yes | same |
| Anthropic | User-directed fetches | `Claude-User` | c | n/a | **Yes**: page says Anthropic's bots (all three) honour robots.txt; supports Crawl-delay | same |
| Perplexity | Perplexity search results | `PerplexityBot` | b (states "not used for AI foundation model training") | Own | Yes | docs.perplexity.ai/guides/bots |
| Perplexity | User-triggered | `Perplexity-User` | c | n/a | **"generally ignores robots.txt rules"** | same |
| Meta | Training **and** "improving products by indexing content directly" | `meta-externalagent` | d (mixed: training + indexing) | n/a | Yes | developers.facebook.com/docs/sharing/webmasters/web-crawlers |
| Meta | Meta AI search results, citations | `meta-webindexer` | b | Own | Yes | same |
| Meta | User-initiated fetches / agentic | `meta-externalfetcher` | c | n/a | **"may bypass robots.txt rules"** | same |
| Meta | Link previews for shares | `facebookexternalhit` | c (link preview) | n/a | May bypass for security/integrity checks | same |
| Meta | Ads products | `meta-externalads` | a (ads) | n/a | Yes | same |
| Meta | `FacebookBot` | **not on Meta's current crawler page** | n/a | n/a | n/a | same (absence noted) |
| xAI | Grok | **not publicly documented** | n/a | n/a | n/a | checked docs.x.ai and x.ai via site search: no crawler page |
| Amazon | "Improve products and services"; may train AI | `Amazonbot` | d (mixed) | Own | Yes (robots cached up to 30 days) | developer.amazon.com/amazonbot |
| Amazon | Alexa / Amazon search | `Amzn-SearchBot` | b ("does not crawl content for generative AI model training") | Own | Yes | same |
| Amazon | Live user queries (Alexa) | `Amzn-User` | c | n/a | **"may not follow all robots.txt directives"** | same |
| Common Crawl | Open web corpus | `CCBot/2.0` | d (corpus widely used for training; FAQ itself does not say so) | Own | Yes; obeys Crawl-delay, nofollow | commoncrawl.org/faq |
| Mojeek | Search | `MojeekBot` | a | **Own independent index** | Yes; honours noindex, nocache, nofollow | mojeek.com/bot.html |
| Yandex | Search | `YandexBot/3.0`, `YandexImages/3.0` | a | Own | Yes (but `YandexMobileBot` and some service bots ignore `*` rules) | yandex.com/support/webmaster/robot-workings/check-yandex-robots.html |

---

## 2. Per-platform notes

**Google.**
- AI Overviews and AI Mode have no separate crawler. The only eligibility test is "a page must be indexed and eligible to be shown in Google Search with a snippet". The controls are `nosnippet`, `data-nosnippet`, `max-snippet` and `noindex` (developers.google.com/search/docs/appearance/ai-features, updated 2025-12-10).
- Google-Extended "does not impact a site's inclusion in Google Search nor is it used as a ranking signal". Its scope covers training future Gemini models **and "grounding ... in Gemini Apps"**, plus the Vertex AI API for Gemini. So disallowing it removes the site from Gemini app grounding as well as training.
- Vercel's verified-bot directory, which quotes Google, adds that "Grounding with Google Search on Vertex AI does not use web pages for grounding that have disallowed Google-Extended" **[secondary]**.
- Verification: IP ranges are published in `common-crawlers.json` and `user-triggered-fetchers*.json`. Reverse DNS should resolve to `crawl-*.googlebot.com` or `geo-crawl-*.geo.googlebot.com`.
- Programme: Google Search Console. **Google does not participate in IndexNow**: it is absent from indexnow.org/searchengines.json.

**Microsoft (Bing / Copilot).**
- M365 Copilot "generates a search query that it sends to the Bing search service" (Microsoft Learn). For the consumer Copilot, the Bing grounding detail is **[secondary]** (SEJ, industry write-ups).
- Microsoft has **no robots.txt training token**. The controls are meta tags (Bing blog, Sept 2023):
  - `NOARCHIVE`: "will not be included in Bing Chat answers, not be linked to in the answers" **and** not used for training.
  - `NOCACHE`: Copilot shows only URL, title and snippet, and training is limited to those same fields.
  - Under both, the page stays in Bing search.
- **This is the one vendor where opting out of training costs you AI-answer visibility.**
- Bing Webmaster Tools now has an AI Performance report: preview 2026-02-10, Citation Share added 2026-06-16 **[secondary]**.
- IndexNow: Bing is a participant.
- IP list: www.bing.com/toolbox/bingbot.json was fetched (28 IPv4 prefixes, creationTime 2024-01-03). The Bing help pages, including Webmaster Guidelines and "verify Bingbot", are JS-rendered and returned no body, so the reverse-DNS suffix (`search.msn.com`) is **not verified from Bing's own page**.

**DuckDuckGo.** Results come "largely" from Bing. DuckDuckBot and DuckAssistBot both publish IP JSON files (`duckduckbot.json`, `duckassistbot.json`). DuckAssistBot data "is not used in any way to train AI models".

**Yahoo / Ecosia / Startpage / Qwant.**
- None of these needs its own robots rule. Visibility comes through Bing or Google.
- Ecosia: Bing for all users, Google in some regions and browsers, EUSP in France only.
- Startpage: Google **[secondary]**.
- Qwant: runs its own Qwantbot plus Bing. Qwant's bot page returned 403, so its UA and robots behaviour are **not verified**.
- The Yahoo evidence is from 2010 and US/CA English only **[secondary]**.

**Brave.**
- Brave runs its own index and deliberately sends no distinct UA. It obeys Googlebot rules, and it says robots.txt is not used to prevent indexing: only `noindex` does that.
- The Brave Search API is sold for LLM grounding, and Brave says it "supplies most of the top-10 LLMs" with web data (brave.com/search/api/ and blog, vendor claim). Which AI products use it is **not verified per product**.
- Brave publishes no IP list on the crawler page.

**Apple.**
- `Applebot-Extended` is a usage token. "Webpages that disallow Applebot-Extended can still be included in search results."
- Apple does **not** say whether Applebot-Extended affects Apple Intelligence or Siri answer features. Treat that as unverified.
- Verification: reverse DNS to `*.applebot.apple.com`, plus a CIDR JSON linked from the page.
- Programme: Apple Business Connect (businessconnect.apple.com). It manages place cards in Maps, Siri and Wallet, and is relevant to a business with a premises. For a remote-first company it is optional.

**OpenAI.**
- "Disallowing GPTBot indicates a site's content should not be used in training" and does not affect search, which runs on OAI-SearchBot.
- Robots changes take about 24 h to apply.
- IP lists: openai.com/searchbot.json, gptbot.json, chatgpt-user.json, adsbot.json.

**Anthropic.**
- Blocking Claude-SearchBot "may reduce your site's visibility and accuracy in user search results".
- Blocking Claude-User "may reduce your site's visibility for user-directed web search".
- Blocking ClaudeBot excludes "future materials" from training.
- IP list: claude.com/crawling/bots.json.
- This is the only vendor here whose user-triggered agent is stated to respect robots.txt.

**Perplexity.** It recommends allowing PerplexityBot to appear in results. Perplexity-User ignores robots. IP lists: perplexity.com/perplexitybot.json and perplexity-user.json.

**Meta.**
- `meta-externalagent` is **dual purpose**: training **and** "improving products by indexing content directly". Blocking it may cost some Meta product indexing, though Meta AI search citations are served by the separate `meta-webindexer`.
- `facebookexternalhit` is the link-preview fetcher. Keep it allowed or social shares lose their previews.
- Meta publishes no IP JSON. The industry method is a whois lookup of AS32934 **[secondary]**.

**xAI / Grok.**
- **No official crawler documentation found.**
- Third-party trackers report tokens such as `xAI-Grok`, `GrokBot` and `xAI-SearchBot`, and allege non-identifying traffic **[secondary, unverified; not to be relied on]**.

**Amazon.**
- `noarchive` "prevents use for model training".
- Amazon is an IndexNow participant (`indexnow.amazonbot.amazon`).
- It publishes per-agent IP lists.

**Common Crawl.**
- Reverse DNS resolves to `*.crawl.commoncrawl.org`. IP JSON is at index.commoncrawl.org/ccbot.json **[secondary for the URL]**.
- The FAQ does not address whether a disallow removes past crawls. Assume it does not.

**Mojeek / Yandex.**
- Mojeek runs an independent index. Verification is reverse DNS to mojeek.com, or `/mojeekbot.json`.
- Yandex verification is reverse plus forward DNS to yandex.ru, yandex.net or yandex.com. Yandex participates in IndexNow.

**IndexNow** (indexnow.org/documentation and searchengines.json).
- Key: 8-128 characters from a-z, A-Z, 0-9 and `-`.
- Key file: a UTF-8 file `{key}.txt` at the site root, or at a `keyLocation` you specify.
- Submission: GET `https://<engine>/indexnow?url=...&key=...`, or POST JSON with up to **10,000 URLs**.
- Response codes: 200 OK, 202 accepted, 400 bad request, 403 invalid key, 429 spam detection.
- A submission to one engine "automatically" reaches all participants.
- Participants: **Bing, Yandex, Seznam, Naver, Yep, Internet Archive, Amazonbot**. Google is not among them.

**Vercel.**
- **Bot Protection managed ruleset** ("inactive by default"): it "automatically excludes verified bots, such as Google's crawler, from evaluation". It challenges clients that violate browser-like behaviour.
- **Attack Mode**: known bots "are automatically allowed through". Vercel says it "will not negatively impact your site's SEO". It also warns that "non-recognized automated services may not be able to pass challenges and could be blocked".
- **AI bots managed ruleset**: off by default (labelled Allow), with modes log or deny. It covers bots crawling "for training data, search purposes, or user-generated fetches". **Deny mode would therefore also block AI search and retrieval bots** (OAI-SearchBot, Claude-SearchBot, PerplexityBot), which defeats AI-search visibility.
- **BotID**: a client-side invisible challenge. It only affects routes where `checkBotId()` is called, so public pages are unaffected unless code adds it there.
- **Risk (inference):**
  - Brave's crawler sends no distinct UA, so Vercel cannot verify it.
  - MojeekBot was not visible in the verified-bot directory as fetched.
  - With Bot Protection set to *challenge* or Attack Mode on, both of these crawlers could be challenged.
  - Googlebot, Bingbot, Applebot, DuckDuckBot, GPTBot, OAI-SearchBot, Claude*, Perplexity*, Meta, CCBot, YandexBot and Qwantbot all appear in Vercel's verified directory (vercel.com/docs/bot-management, updated 2026-09-10).

---

## 3. NOT documented / could not verify

- **xAI / Grok**: no official crawler page. Checked a site-restricted search of x.ai and docs.x.ai.
- **Bing help pages** (Webmaster Guidelines, "How to verify Bingbot") are JS-rendered and WebFetch got no body. The following rest on **secondary** sources: the Bingbot reverse-DNS suffix, the 2026 guideline wording on Copilot/grounding, and the AI Performance report dates.
- **Consumer Copilot uses Bing**: officially documented for M365 Copilot only. Consumer Copilot is secondary.
- **Qwantbot** UA and robots behaviour: help.qwant.com/bot returned 403.
- **Startpage** and **Yahoo** index dependence come from secondary sources only.
- **Applebot-Extended** effect on Apple Intelligence or Siri answers: Apple does not say.
- **Common Crawl**: the FAQ does not mention AI training use, nor whether past crawls are removed after a disallow.
- **Meta**: no IP list on the official page. `FacebookBot` no longer appears there.
- **Which AI products ground on the Brave Search API**: only Brave's own claim.
- **Applebot user-triggered fetches**: not addressed by Apple.

---

## 4. Recommended robots.txt policy (search + AI search/citation: yes · model training: no)

**Mechanics to know first:**
- A crawler obeys only the **most specific** group that names it. A bot with its own group ignores the `*` group, so any path you want hidden (e.g. `/api/`) must be repeated inside every named Allow group.
- Training opt-outs are **forward-looking only**.
- robots.txt does not bind the user-triggered fetchers of Google, OpenAI, Perplexity, Meta or Amazon (Anthropic's does).

| Token | Action | Reason | Trade-off |
|---|---|---|---|
| `Googlebot` | Allow | Search, AI Overviews and AI Mode all run on it | none |
| `Google-Extended` | **Decision. Default: Disallow** | Opts out of Gemini training | **FLAG:** also removes the site from **Gemini Apps grounding** and (secondary) Vertex AI grounding. No effect on Search or AI Overviews. If Gemini app citations matter more than training, Allow |
| `bingbot` | Allow | Bing, Copilot, DuckDuckGo, Yahoo, Ecosia | none |
| (Microsoft training) | **No robots option.** Do NOT add `noarchive` | `noarchive` is the only full training opt-out | **FLAG:** `noarchive` removes the page from Copilot answers. `nocache` is the middle path: Copilot shows URL, title and snippet only, and training uses only those fields. Recommendation: no tag, accept Microsoft training, to keep Copilot citations |
| `Applebot` | Allow | Siri, Spotlight, Safari | Applebot's crawl may also feed training, governed by the token below |
| `Applebot-Extended` | Disallow | Opts out of Apple model training; Apple says search inclusion is unaffected | Effect on Apple Intelligence answers undocumented |
| `OAI-SearchBot` | Allow | ChatGPT search inclusion | none |
| `ChatGPT-User` | Allow | User-requested fetches (robots "may not apply" anyway) | none |
| `GPTBot` | Disallow | Training only; OpenAI says it does not affect search | none documented |
| `Claude-SearchBot` | Allow | Claude search index | none |
| `Claude-User` | Allow | Claude user fetches, which do obey robots, so a Disallow would really cut visibility | none |
| `ClaudeBot` | Disallow | Training only | none documented |
| `PerplexityBot` | Allow | Perplexity results (not used for training per Perplexity) | none |
| `Perplexity-User` | Allow | User fetches (ignores robots anyway) | none |
| `meta-webindexer` | Allow | Meta AI search citations | none |
| `meta-externalagent` | Disallow | Training | **FLAG:** Meta says it is also used for "improving products by indexing content directly", so some Meta product indexing may be lost |
| `facebookexternalhit` | Allow | Link previews on Facebook, Instagram, WhatsApp | none |
| `Amzn-SearchBot`, `Amzn-User` | Allow | Alexa and Amazon search answers | none |
| `Amazonbot` | Disallow | "May train AI models" | **FLAG (mild):** it is also described as improving Amazon products; Alexa search eligibility sits with Amzn-SearchBot |
| `CCBot` | Disallow | Open corpus widely used for model training | No documented search impact; data already crawled stays in past snapshots |
| `DuckDuckBot`, `DuckAssistBot` | Allow | DDG search and DuckAssist answers (not used for training) | none |
| `MojeekBot`, `YandexBot`, `Qwantbot`, `*` | Allow | Independent and regional indexes | none |
| Brave | (no token; follows Googlebot rules) | Covered by the Googlebot Allow | none |
| `GoogleOther` | Allow (or Disallow if you want R&D crawl load gone) | No product effect documented | none either way |

**Suggested file:**

```
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: CCBot
User-agent: Applebot-Extended
User-agent: meta-externalagent
User-agent: Amazonbot
User-agent: Google-Extended
Disallow: /

User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://drylake.com.au/sitemap.xml
```

**Notes on the file:**
- Named Allow groups are unnecessary: every bot not listed falls through to `*`.
- Remove `Google-Extended` from the block group if Gemini Apps grounding is wanted.

**Companion actions:**
- Register in Google Search Console and Bing Webmaster Tools.
- Implement IndexNow, which covers Bing, Yandex, Seznam, Naver, Yep, Internet Archive and Amazon. Host the key file at `/{key}.txt`.
- On Vercel:
  - Never run the **AI bots managed ruleset in deny mode**, because it blocks the AI search bots too.
  - If training bots must be blocked at the edge, use WAF custom rules matching the training UAs only.
  - Keep Bot Protection in log mode, or verify that Brave and Mojeek are not being challenged before switching to challenge.
