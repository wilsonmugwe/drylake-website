# Content recommendations (for Wilson's approval, NOT implemented)

These change words a visitor reads, so this PR does not make them. Each one closes a gap in the
GEO query map (`2026-10-08-baseline-audit.md`, section 5). Every proposal restates what the site
already says or does. It adds no claim, client, rating or capability. Approve, edit or reject each
row. Approved rows go in a separate small PR.

| # | Gap | Where | Current | Proposed |
|---|---|---|---|---|
| 1 | Homepage does not say Perth in its search-result title or description | `app/page.tsx` metadata | Title: "Drylake \| Operational Software & Automation Australia". Description: "Drylake builds operational software, automation and connected systems for Australian businesses held back by manual processes and disconnected tools." | Title: "Drylake \| Custom Software & Automation, Perth WA". Description: "Drylake is a Perth technology company building custom software, automation and connected systems for Australian businesses held back by manual processes." (151 characters) |
| 2 | "AI integration" never appears in visible copy | AI automation FAQ, `lib/discovery/services.ts` | Existing FAQ: "Can AI features work with the systems we already use?" (kept) | Add a FAQ. Q: "Does Drylake provide AI integration for Perth businesses?" A: "Yes. Drylake integrates AI into the software Perth and Australian businesses already use, such as document intake, email and records systems, with a person reviewing any result that affects a customer, money or a decision." |
| 3 | "Modernise / outdated system" never appears | Systems integration card, `services.ts` | Card heading: "Moving off an old platform" | Heading: "Modernising an outdated system" (same body text). Add a FAQ. Q: "Can Drylake modernise an outdated business system?" A: "Yes. Drylake either connects an older system to modern software or moves its data and workflows to a replacement in stages, so the business keeps running while it changes." |
| 4 | Custom software page has no Perth statement | Custom software FAQ | none | Q: "Does Drylake build custom software for Perth businesses?" A: "Yes. Drylake is based in Perth, Western Australia, and builds custom software, client portals and internal systems for businesses in Perth and across Australia." |
| 5 | Web development page has no Perth statement | Web development FAQ | none | Q: "Does Drylake build websites for Perth businesses?" A: "Yes. Drylake builds business websites and web applications for Perth and Western Australian businesses, with enquiries, bookings and payments connected to the systems behind them." |
| 6 | No proof content | New page | none | One genuine case study or a clearly labelled worked example ("how we would approach..."). Only with a client's written permission, never a composite. Wilson and Ben to choose the project |

**Mechanics:** FAQs are data in `lib/discovery/services.ts`, so each new FAQ also appears in the
FAQPage structured data, llms-full.txt and the Markdown copy, with no further work.
`tests/discoverability.test.mjs` checks that FAQ answers are visible.

**Constraints that apply:** no em dashes, no competitor names, no inc-GST prices, plain Australian
English. **Not recommended:** separate pages per suburb or city ("Software developer Joondalup"
and so on). They are thin, near-duplicate pages, and decision D-7 rules them out.
