# Homepage creative direction: Drylake Horizon (PR 2, 2026-10-07)

Brief: Ben, 7 Oct 2026. Core idea: **clarity from complexity**. Benchmarks (MetaLab, Instrument,
Stripe) are for quality of thinking only; nothing here copies a layout, asset, animation or phrase.

## 1. The Horizon language

One idea, used sparingly: **a single fine line that information resolves onto.**

| Element | Meaning | Where |
|---|---|---|
| **The horizon** | a 1px rule running edge to edge; the place order happens | hero (under the headline), section seams, footer crop |
| **Noise vs signal ticks** | irregular, rotated, floating ticks on the left; an even ruler on the right | hero field |
| **Fragments** | small mono "work artefacts" (spreadsheet.xlsx, copy → paste, follow-up) | problem chapter |
| **Nodes + spine** | systems that hang off one line, connected by orthogonal drops | systems chapter |
| **Coordinates** | Perth, 31.95° S 115.86° E, in mono | hero only (once) |
| **Signal orange `#f26a2e`** | a single node where noise becomes signal; status that is "live" | one or two points per chapter, never a fill |
| **Tile ochre** | the y of the wordmark | wordmark only (imported, never retyped) |

Rules: one horizon per chapter at most; no glow, no gradients beyond a mask fade, no particles, no
3D, no perpetual animation; mono for machine things, Geist for human statements.

## 2. Chapter plan (light/dark rhythm)

| # | Chapter | Surface | Job |
|---|---|---|---|
| 0 | Hero: "Your business shouldn't run on workarounds." | ink | Type is the visual. The third line lands on the horizon; below it, noise ticks on the left give way to a regular ruler on the right. Desktop pointer acts as a "clarity lens" that straightens nearby noise. |
| 1 | The problem | paper | Twelve work fragments, scattered and rotated. Scrolling through the four problem statements sorts them into three lanes. Ordered, but still separate. |
| 2 | Work with what you have (signature) | ink | Website, CRM, Email, Accounting, Documents, Payments, Staff, Customers start scattered, joined only by dashed workarounds ("copy → paste", "export.csv"). Scrolling pins the stage: workarounds dissolve, nodes settle onto one spine, drops connect them, the Drylake lockup appears at the junction, status dots turn on. |
| 3 | What we do (#solutions) | mineral | Four editorial rows, not cards: 01 Custom Software, 02 Automation, 03 AI, 04 Connected Systems. Each row is one link to its service page. |
| 4 | Applied AI | ink-3 | Restrained: six practical verbs (Extract, Classify, Summarise, Route, Assist, Predict), each with a concrete input → output line. No robots, brains, sparkles or purple. |
| 5 | Founder-led (#about) | paper | Existing composition, facts unchanged. |
| 6 | How we work (#approach) | mineral | Existing rail. |
| 7 | Production matters | ink-2 | Existing engineered diagram. |
| 8 | FAQ | paper | Existing accordion + FAQPage schema. |
| 9 | Ending | ink | "Have a problem worth fixing?" + Start a conversation, then the footer: links, a large cropped wordmark sitting on the horizon, and the corporate line beneath it. |

## 3. Motion principles

- **Scroll-linked, not time-linked, for the two story moments.** One small client wrapper
  (`components/motion/ScrollProgress.tsx`) writes a single `--p` (0..1) custom property, rAF-throttled,
  only while the element is near the viewport. Everything else is CSS `calc()` on `translate`,
  `rotate`, `opacity` and `transform: scale` (compositor-only). No animation library.
- **The H1 is never hidden.** It rises by transform only, so it paints at first frame (LCP).
- **Nothing perpetual.** Once resolved, things stay resolved.
- **Reduced motion:** the wrapper never attaches; each stage shows a deliberate static state
  (problem field: fragmented; systems: fully connected), every caption is plain text, and the hero
  lens is off. No information depends on motion: each visual has a visible text caption.

## 4. Mobile treatment

- Hero: the same three-line headline at 12.4vw, horizon field shortened, CTAs full width.
- Problem field sits above the statements (not pinned) and resolves as it passes through the
  viewport. Lanes become a 2 x 6 grid.
- Systems: no pinning on phones. The spine turns vertical, nodes sit in two columns, and the stage
  resolves while it crosses the screen.
- Service rows show every detail statically; hover is an enhancement only.
- Footer: two link columns side by side; the wordmark scales with the width (about 75 px tall at
  375 px), so the footer does not balloon.

## 5. Constraints honoured

No imagery in the hero, no fabricated proof, no em dashes in rendered strings, section ids
`#solutions`, `#approach`, `#about` unchanged, every "Start a conversation" is `PrimaryCta`,
the canonical `DrylakeWordmark` is the only wordmark drawn.
