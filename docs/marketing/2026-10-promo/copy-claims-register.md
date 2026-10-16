# Copy claims register: Workstream 9 (October 2026 promo)

Every factual claim or offer on every asset in this folder, with its source, so a reviewer can verify
nothing is invented. Sources:

- **BF** = the Workstream 9 brand-facts brief (owner-approved facts supplied with the task, 2026-10-16)
- **SVC** = `lib/discovery/services.ts` (live service pages, `/services/<slug>`)
- **CON** = `lib/consultations/copy.ts` (live `/consultation` page copy)
- **SITE** = `lib/site.ts` / `lib/discovery/entity.ts`

Assets: F1 services overview, F2 website development, F3 business automation, F4 custom software,
F5 free consultation, F6 BRONNIE collaboration (each A4 + social), V main video, V15 cutdown.

## Identity and contact (all flyers, video end card)

| Claim | Assets | Source |
|---|---|---|
| Drylake Pty Ltd | all | BF |
| ABN 70 702 662 557 | all | BF; matches SITE |
| Perth, Western Australia (no street address, no suburb) | all | BF; residential-address guard rule, `ENTITY.locality = "Perth"` |
| 0433 448 000 (the only phone number used) | all | BF |
| drylake.com.au, hello@drylake.com.au | all | BF |
| Philosophy "Strip it back. Find the cracks. Build back better." | F1 (paraphrased in sub), V shot 6, V15 B | BF (approved) |
| Tagline "See what lies beneath. Build what comes next." | all footers, F1 headline, V shot 11 | BF (approved) |
| Dry lake metaphor: water recedes, hidden cracks become visible | F1 sub, V lines 1 to 3 | BF ("Meaning") |
| Hidden problems named as disconnected systems, repetitive tasks, outdated tools, temporary workarounds | V line 3, V shot 5 | BF ("disconnected systems, repetitive processes, outdated technology, temporary workarounds"); wording shortened |

## Offer (consultation)

| Claim | Assets | Source |
|---|---|---|
| Free 30-minute consultation | F1 to F5 CTA, F6 secondary, V line 6, V15 C | BF; CON `CONSULTATION_INTRO` |
| Booked at drylake.com.au/consultation | F1 to F6, V, V15 | BF |
| Monday, Tuesday and Friday, 9:00 am to 5:00 pm Perth time | F1 to F5 | BF; CON `CONSULTATION_PROMISES[1]` |
| Microsoft Teams or phone | F1 to F5 | BF; `lib/consultations/client.ts` method `TEAMS` / `PHONE` |
| Condition: the consultation is free, any work is quoted before it begins (always beside the offer) | F1 to F6, V line 6 and shot 10, V15 C | BF; CON `QUOTE_FIRST` |
| "No obligation to proceed" | F5 sub | CON `CONSULTATION_INTRO` |
| "No account needed. Reschedule or cancel from your confirmation email" | F5 bullet | CON `CONSULTATION_PROMISES[2]` |
| "If there is a fit, you get a clear quote before any work begins" | F5 bullet | CON `CONSULTATION_PROMISES[3]` |
| "30 minutes with Drylake" (site says "with a Drylake founder"; shortened to avoid any team-size reading) | F5 bullet | CON `CONSULTATION_PROMISES[0]` |

## Services

| Claim | Assets | Source |
|---|---|---|
| Builds websites, custom software, booking and customer management systems, business automations, AI-enabled solutions | F1 bullets, V line 5 | BF |
| "Practical AI-enabled solutions where they genuinely help" / "practical AI" | F1, V line 5 | BF ("AI-enabled solutions"); SVC `ai-automation` |
| "Websites that help customers find you and get in touch" | F2 headline | SVC `web-development.headline` (verbatim) |
| New sites and redesigns, enquiry and booking forms connected to how you work | F2 sub | SVC `web-development.intro` / `description` |
| Clear, fast site that makes the next step obvious | F2 bullet | SVC `web-development.useCases[0]` |
| Forms reach the right person, not a shared inbox | F2 bullet | SVC `web-development.useCases[1]` |
| Pages set up properly so search engines can find and list them | F2 bullet | SVC `web-development.builds[4]` |
| Domains, DNS and business email configured properly | F2 bullet | SVC `web-development.builds[5]` (verbatim) |
| "Spend less time on repetitive tasks." | F3 headline | SVC `business-automation.headline` (verbatim) |
| Fewer things depend on someone remembering | F3 sub | SVC `business-automation.summary` / `intro` |
| Appointment reminders and enquiry follow-ups | F3 bullet | SVC `business-automation.intro` |
| Information moved between systems without retyping | F3 bullet | SVC `business-automation.intro`, `useCases[0]` |
| Recurring reports that run without someone starting them | F3 bullet | SVC `business-automation.builds[4]` |
| Approvals with a clear record of who approved what and when | F3 bullet | SVC `business-automation.builds[1]` |
| "Software built for the way your business works." | F4 headline | SVC `custom-software-development.headline` (verbatim) |
| "When the spreadsheet has become the system" | F4 sub | SVC `custom-software-development.problemHeading` |
| Customer portals with projects, documents and invoices | F4 bullet | SVC `custom-software-development.builds[1]` |
| Booking and customer management in one organised place | F4 bullet | BF; SVC `custom-software-development.intro` ("one organised place") |
| Staff dashboards, job tracking, approval workflows | F4 bullet | SVC `custom-software-development.summary`, `builds[2]` |
| Straight advice when an existing product already does the job | F4 bullet | SVC `custom-software-development.problem[1]` ("Part of our work is telling you which situation you are in") |

## BRONNIE (F6 only)

| Claim | Assets | Source |
|---|---|---|
| AI-powered, multi-tenant business operations and automation platform | F6 sub | BF (verbatim terms) |
| In development; not yet available for general use | F6 eyebrow, headline, status box | BF ("IN DEVELOPMENT", "never present it as production-ready") |
| Initial focus customer operations: enquiry handling, routing, appointment coordination | F6 sub and bullets | BF |
| Pilot and early-access discussions welcome | F6 eyebrow, bullet, CTA | BF |
| Collaboration enquiries at drylake.com.au/collaborate | F6 CTA and QR | BF. **Page not live yet** (separate PR); do not distribute F6 until it is |
| No partners, customers, deployments, dates or results claimed | F6 | BF (deliberate omission) |

## Deliberately absent (checked on every asset)

Prices of any kind (and therefore no inc-GST figure), competitor names, client names or logos,
reviews, testimonials, statistics or results, awards, certifications, team size, photos or footage
of any person, AI-generated faces, any street address or suburb, Abbicare, em dashes.

## QR codes (A4 flyers)

Generated offline (`flyers/src/gen-qr.mjs`, qrcode.react encoder, error correction M). Each encodes
the printed URL plus attribution parameters `?utm_source=flyer&utm_campaign=promo-2026-10&utm_content=<flyer>`.
F1 to F5 point at `/consultation`; F6 at `/collaborate`.
