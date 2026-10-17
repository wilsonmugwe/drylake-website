# Homepage copy, Exposed Ground (stage 2), for Ben's review

Every visible string on the new homepage, in page order, with its source. Code: `lib/home/copy.ts`
(plus the approved strings it reuses). Measured on a local production build: **344 visible words on a
phone, 367 on desktop** (desktop adds the tile's caption), down from about **1,950**. Twelve of those
"words" are section numbers.

Sources: **C** = the approved concept canvas (Main board, 17 Oct); **A** = already-approved site copy;
**N** = new in this PR, needs Ben's eye.

| Section | Copy | Source |
|---|---|---|
| Hero eyebrow | Drylake · Perth, Western Australia | C |
| Hero headline (h1) | Websites. Software. Automation. AI. | C |
| Hero lede | We build the systems that run your business, then get out of the way. | C |
| Hero actions | Start Free Consultation · What we build | A · C |
| Hero note | Free 30-minute consultation. No obligation to proceed. Any work is quoted before it begins. | A |
| 01 | Strip it back / Four jobs. One system. / Select a plate to see how we help. | C (last line N, shortened) |
| Tile caption | Quotes, invoices, scheduling, enquiries: held together by copy, paste and email. Until they work together. | A (unchanged) |
| 02 What we build | Websites: Fast sites that bring in enquiries and bookings. | C |
| | Software: Portals, booking and job systems built around your work. | C |
| | Automation: Reminders, approvals and data entry that run themselves. | C |
| | Integration: The tools you already use, finally talking to each other. | **N** (fifth service, not on the canvas) |
| | AI: AI where it saves real time, with a person checking. | C |
| | All services | N |
| 03 Find the cracks | Where the time actually goes. / Typed in twice. Lost in the inbox. Chased by phone. Three versions of the truth. | C |
| | We look at how the work really happens first. Sometimes the answer is small. | C (shortened) |
| 04 How we work | Strip it back. / Find the cracks. / Build back better. | A (philosophy) |
| | A free 30-minute conversation about how the business runs. / A proposal naming the problem, the fix and the price. / Built, tested and handed over, with progress in your Workspace. | C |
| 05 Drylake Workspace | Your project, in one place. / Progress and milestones · Documents · Invoices, paid by card | C |
| | The real Drylake Workspace, sample data. (caption under a real screen) | N |
| 06 Who you work with | Two founders. A direct line. / Benedict Wambugu, Co-founder and CEO / Wilson Mugwe, Co-founder and Head of Technology / About Drylake | C · A |
| Questions | The five existing homepage FAQs (answers open on tap) · All questions | A |
| Close | See what lies beneath. Build what comes next. | A (tagline) |
| | Start Free Consultation · Send us a message + the free-consultation note | A |

## What left the homepage, and where it lives now

Nothing search-relevant is deleted; it moves one click down.

| Was on the homepage | Now |
|---|---|
| Brand story band | /about (full story, unchanged) |
| Founders with credentials | /about (unchanged) |
| "Problems" with worked examples, systems story, What We Do detail | Each service page (unchanged); /solutions |
| "Production Matters" layers (secure login, who can see what, backups and recovery...) | **Stage 3**: moves to /services, so it stays on the site |
| Seven-stage "How we work" journey | **Stage 4**: moves to /about, so it stays on the site |
| Closing phone + email lines | Footer on every page (unchanged) |

## Not done in this stage (stated, not hidden)
- **Live booking times** in the closing section (on the canvas): not built. It needs the booking API on
  every homepage view and a client island against a JS budget that is nearly full. The close links to
  /consultation instead. Can be added as a small follow-up if wanted.
- **Hero film**: stage 5 (Option A). The hero shows the static crack field for now.
- **Photography**: none yet. No stock or AI faces; each image will be recorded in the asset register.
- **Review slot**: nothing renders until a real, consented review exists (none today).
