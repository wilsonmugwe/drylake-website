# Experience polish: public site (Workstream P, 2026-10-07)

Brief: `drylake-ops/docs/superpowers/specs/2026-10-07-experience-polish-brief.md`, sections 1-14
plus the public half of 21-31. Builds on PR 2 ("Drylake Horizon") and PR 3 (mobile rhythm).
Benchmarks (MetaLab, Basement, Instrument) are for the standard of thinking only: nothing here
copies a layout, typeface treatment, animation or composition.

## 1. Hero: three concepts

The line stays: **"Your business shouldn't run on workarounds."** Wilson did not like the opening
(a poster headline over a horizon ruler of noise ticks). The ruler was clever but abstract: an
owner had to decode ticks to learn what Drylake does, and nothing about it was ours. Three
genuinely different directions were sketched before any code.

### A. The lake bed (chosen)

The hero visual is the **Drylake tile itself, at poster scale, broken apart**. Its five plates are
labelled as the parts of an ordinary business (Quotes, Customers, Jobs and staff, Invoices) and the
cracks between them carry the workarounds that hold the business together today: `copy → paste`,
`re: fwd`, `export.csv`. On load the plates drift in from their broken positions and lock together,
each workaround is struck through, the cracks light up as connections with a node at every
junction, and the ochre plate (the one the logo always reserves for "the part we work on") turns on
as **One system**. The picture comes to rest as the actual Drylake mark. Then the next chapter opens
with the line that was already on the site: **"Growth makes the cracks visible."** The thread is
literal: cracked lake bed, cracked business, connected system.

Why it is unmistakably Drylake: it is built from the mark's own geometry and the company's own
name. Take the logo away and the hero still draws it.

### B. The workaround ledger

A typographic hero: the headline over an editorial ledger of real SME workarounds ("Re-typing the
quote into the accounts", "Chasing approvals by text", "The spreadsheet only one person
understands"), each struck through in turn and annotated in the margin with what replaces it, like
a marked-up document. Strong for comprehension; weaker as brand: strikethrough lists are a known
device and nothing in it is Drylake-specific. Rejected on question 3 of the self-check.

### C. The Perth line

A single rail that runs through the entire homepage like a transit line: the hero is the first
station map (the business's systems as stations, workarounds as walking transfers), and every later
chapter is a stop on the same line. Memorable and continuous, but it would need a long scroll-bound
line across the page (scroll listeners, layout coupling between every section), it competes with
the problem chapter's own fragmentation story instead of setting it up, and transit diagrams are
a familiar metaphor. Rejected on performance and on question 3.

### Why A

- It communicates at a glance: an owner sees their quotes, customers, jobs and invoices joined by
  copy and paste, and then joined properly. No decoding.
- It is the brand: the resolved state is the mark (D27, the cracked lake-bed tile, whose cracks
  were always meant to read as connected systems).
- It sets up the problem chapter instead of repeating it ("Growth makes the cracks visible").
- It is cheap: server-rendered SVG + HTML labels, one finite CSS timeline, no client JavaScript at
  all (the previous hero shipped a pointer-lens client component; this one ships none).

## 2. Hero rules

- The `<h1>` is server-rendered and paints in place on the first frame (no entrance animation,
  test-pinned). The lake bed animates around it, never the headline.
- One finite timeline (about 1.6 s, starting 0.2 s after paint): plates settle, workarounds strike
  through, cracks draw as connections, the ochre plate turns on. Nothing loops.
- Reduced motion and no-JS both show the resolved mark with every label legible: no animation is
  needed to understand the picture, and the figcaption says the same thing in words.
- Imagery: no photography, no people, no client work. The labels are generic business areas, not
  claims about anyone's business.

## 3. Pacing (sections 1, 9, 13, 14)

| Change | Why |
|---|---|
| Desktop `--section-y` 9 rem to 6 rem, `--block-gap` 6 rem to 3.5 rem | Chapters were separated by ~290 px of air on each side; the content inside them already breathes. |
| Hero: no `100svh` minimum; height comes from content, which fits one desktop viewport with the problem chapter visible beneath | The full-screen slide is gone; the next chapter is announced, not hidden. |
| Problem statements: `58vh` minimum per statement removed | That minimum existed only to stretch the pinned track; the sort now finishes early instead. |
| Integrations pinned track 250vh to 170vh | Same reason. |
| AppliedAI section removed from the homepage | Section 6. AI stays in What We Do, the AI Automation service page, discovery files and schema. |
| What We Do rows compressed, outcome first | Section 8. |
| Production: strata cross-section instead of a box diagram | Section 5, and about half the height. |
| FAQ folded into the closing conversation | Section 9: same five answers, same FAQPage schema, now next to the call to action it supports. |
| Footer: wordmark sized as a full stop beside the corporate line | Section 10. |

## 4. Problem and systems timing (sections 3, 4)

`ScrollProgress` gains a `finish` option: the story reaches its resolved state at that fraction of
its scroll range and holds it for the rest. Both stories start as soon as they enter, resolve with
an ease-out curve (fast start, gentle landing) and hold the connected state on screen. Measured
before and after in `docs/review/2026-10-07-polish/public/` (`frag-before.txt`, `frag-after.txt`).

## 5. Production: the core sample

Not boxes feeding a logo. A geological cross-section: the thin top band is the product your team
sees; under it, six strata in order of depth (Authentication, Permissions, Data validation,
Integrations, Monitoring, Backups and recovery), each with one plain sentence about what it does
for the business. It reuses the lake-bed language (strata under a dry lake) and says the point
directly: what makes software dependable is underneath.

## 6. Language (section 7)

Read as a Perth owner running on spreadsheets and email. Outcomes over capability names: "joins up
the systems you already use" rather than "connected systems"; no API, LLM, middleware or agentic
language on the homepage. Claims stay true: no clients, results or numbers.
