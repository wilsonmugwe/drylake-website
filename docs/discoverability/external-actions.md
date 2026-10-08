# External discoverability plan (Wilson and Ben)

AI assistants and search engines trust a business that other sources confirm. drylake.com.au is
now technically complete, so the next gains come from outside the site. Nothing here can be
done in code. No account is created and nothing is published by this PR. The M numbers refer to
the manual actions in `README.md` section 4.

Ordered by likely commercial impact per hour spent.

## A. Owner actions, highest impact first

| # | Action | Who | Time | Why it matters |
|---|---|---|---|---|
| 1 | **Google Business Profile** as a service-area business (Perth and WA, address hidden), category "Software company", website drylake.com.au (M5) | Ben | 30 min plus postcard or video verification | Feeds Google Maps, local results and Gemini. The single strongest local signal |
| 2 | **Search Console**: confirm owner, submit the sitemap, request indexing (M1, `measurement.md`) | Ben | 10 min | Without it, indexing problems are invisible |
| 3 | **LinkedIn company page** (exists: linkedin.com/company/drylake, already in `ENTITY.sameAs`). Complete its About section with DRYLAKE PTY LTD, the ABN, Perth and the website. Both founders list Drylake as their employer (M7) | Ben, Wilson | 20 min | A completed profile corroborates the same facts the site states |
| 4 | **Bing Webmaster Tools** via import from Search Console (M2) | Ben or Wilson | 10 min | Bing powers Copilot, DuckDuckGo, Yahoo and Ecosia results |
| 5 | **Bing Places**, imported from the Google profile once it is verified (M6) | Ben | 10 min | Same chain as above |
| 6 | **Apple Business Connect** (M4) | Ben | 20 min | Siri, Spotlight, Apple Maps |
| 7 | **One genuine case study**, with the client's written permission (`content-recommendations.md` row 6) | Wilson, Ben | half a day | The proof AI answers and buyers look for. Never a composite or invented one |
| 8 | **Monthly AI visibility check** (`measurement.md`) | Ben | 15 min a month | The only way to see whether any of this works |
| 9 | Australian directories with editorial or verification standards, only where Drylake genuinely qualifies (a local chamber of commerce, an industry association) | Ben | varies | Independent corroboration. Never paid link schemes or fake listings |
| 10 | Technology partner directories (Vercel, Clerk, Stripe, Supabase) | Wilson | later | Only once their criteria are actually met |

**The same facts everywhere:** "Drylake", legal name DRYLAKE PTY LTD, ABN 70 702 662 557,
https://drylake.com.au, Perth, Western Australia, hello@drylake.com.au. When a profile goes live,
give Claude its URL and it will be added to `ENTITY.sameAs` (the tests reject placeholders).

## B. Needs account access (Wilson)

| Action | Where |
|---|---|
| Confirm the Vercel plan. Custom events need Pro (`measurement.md`) | Vercel, Settings, Billing |
| Check that Vercel Firewall Bot Protection is not challenging public pages, and that the "AI bots" managed ruleset is not set to deny (M8) | Vercel, Firewall |
| After deploy: check the "Discoverability" GitHub workflow is green and IndexNow returns 200/202 (M3) | GitHub Actions |

## C. Needs a decision before anything is built

| Decision | Options | Recommendation |
|---|---|---|
| Content Signal `ai-train` (live since PR #53) | Keep `ai-train=no` (stated preference: no training) or align with D-1 (Google-Extended allowed) | Pick one so robots.txt and `README.md` agree. If D-1 stands, decide whether `ai-train=no` in the `*` group is acceptable as a general statement while Google-Extended stays allowed |
| Content wording in `content-recommendations.md` | Approve, edit or reject each row | Rows 1 to 5 are low risk |
| Agent enquiries (`agent-enquiry-design.md`) | Build now, or wait for evidence | Wait until assistant traffic shows up in the logs |

## D. Can be done in code once the above lands

- Approved content rows go in a small PR.
- New profile URLs go into `ENTITY.sameAs`.
- If a genuine case study is approved: a page, a sitemap entry and structured data.
