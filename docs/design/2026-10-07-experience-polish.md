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

## 5. Production: the cross-section

Not boxes feeding a logo. A geological cross-section: a light surface band labelled "What your team
sees" (the app, the portal, the website), then "What it stands on": six layers in order of depth
(Authentication, Permissions, Data validation, Integrations, Monitoring, Backups and recovery), each
stepping further in and darker, with a strata texture on its cut face and one plain sentence about
what it does for the business. Pass 1 (a strata texture behind table rows) read as a styled table;
pass 2 makes surface versus underneath visible at a glance in the same height.

## 6. Language (section 7)

Read as a Perth owner running on spreadsheets and email. Outcomes over capability names: "joins up
the systems you already use" rather than "connected systems"; no API, LLM, middleware or agentic
language on the homepage. Claims stay true: no clients, results or numbers.

## 7. Measured results (LOCAL, `next start`, rebased on main d752cb4)

Page heights (px): homepage 1440: 15,281 to 9,493 (-38%); 375: 12,403 to 10,317 (-17%).
About 1440: 5,606 to 4,281; 375: 5,975 to 5,762. Benedict's name on /about: y 1,730 to 517
(1440x900), 500 at 1280x720, 420 at 375x812: inside the first viewport at every size.

Removed spacing, and why: the 9 rem desktop chapter padding (both sides of every seam), the hero's
100svh minimum, four 58vh problem statements, 75vh of pinned systems track, the whole AppliedAI
chapter, the FAQ as its own chapter (merged into the close), the founders' full-width stacked rows,
and footer link rows at 44 px on desktop (34 px there; 44 px kept on touch sizes).

Story timing (connected state reached, as % of the section's on-screen travel):
problems 1440 69% to 36%, 375 31% to 27% (and now with the whole field on screen, top at 45% of
the viewport, instead of 30%); systems 1440 66% to 44%, 375 46% to 39%. Scroll from first movement
to connected: desktop problems 1,512 to 504 px, systems 1,320 to 584 px; phones 480 to 424 and
440 to 352 px. Full tables: drylake-ops/docs/review/2026-10-07-polish/public/frag-*.txt.

## 8. Hero self-check, pass 1 (superseded by section 9)

1. New concept: yes (not a restyle of the horizon ruler; the old component is deleted).
2. Memorable idea: yes, the logo assembled from the parts of your business.
3. Could it belong to another tech company without the logo: no; it IS the logo's geometry.
4. Custom-designed: yes; no library, no stock, no generated imagery.
5. Motion serves a purpose: yes, broken, workarounds struck out, connected; finite, 1.6 s.
6. Confident typography: yes, poster headline kept, painted on the first frame.
7. Interesting composition: partly. Phones (caption beside the tile) and the chapter hand-off are
   distinctive; the desktop headline-left, picture-right split is the most conventional part.
8. An ordinary SME owner understands it: yes, Quotes / Customers / Jobs / Invoices and a caption.
9. Mobile equally intentional: yes, its own composition, all inside a 375 x 812 first screen.
10. Approaches the MetaLab / Basement / Instrument bar: on the idea and the moment, yes; the desktop
    layout is the place Wilson's eye should go first if it needs another pass.

## 9. Composition pass (pass 2, after orchestrator review)

Review: the concept passed; questions 7 and 10 did not, because the desktop hero was a
headline-left, picture-right split and the phone caption was a cramped nine-line column. Changes are
composition only (concept, copy, first-frame h1, no-JS hero, performance, SEO and accessibility
rules unchanged):

- **The lake bed is the hero.** A cracked field of dark plates (components/visuals/LakeField.tsx,
  seeded geometry, 9 x 5 wide and 4 x 8 tall variants, sliced to cover) bleeds off every edge. The
  headline is set on it; plates are #141412 on #0b0b0a, so white type stays about 18:1 and the grey
  third line about 5:1. The tile sits in the field, breaking off the right edge beside the type,
  and its backing takes the plate tone so it reads as part of the lake bed, not a card. When it
  locks, field cracks light up as connections that run under the headline. No column grid.
- **The hero ends on a cracked edge** into the problem chapter, which opens "Growth makes the
  cracks visible".
- **Phones:** headline, then the tile breaking off the right edge under it, one short caption line
  ("Held together by copy and paste. Until they are one system."), then the proposition and the
  primary action inside the first 375 x 812 screen.
- **Production:** the cross-section in section 5.

Self-check, pass 2: 1 new concept: yes. 2 memorable: yes. 3 could belong to another company without
the logo: no. 4 custom: yes. 5 motion has a purpose: yes. 6 confident typography: yes, the headline
is larger and set on the lake bed. 7 interesting composition: yes; the picture is the page, the type
sits in it, the mark breaks off the edge and the cracks carry into the next chapter. 8 an owner
understands it: yes. 9 mobile intentional: yes. 10 approaches the bar: yes, with the honest caveat
that this is judged on local renders, not on a device in Wilson's hand.
