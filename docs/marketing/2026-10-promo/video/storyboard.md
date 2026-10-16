# Storyboard: Drylake introduction video (main cut, 50 s)

**Status:** storyboard only. Nothing has been animated or rendered.
**Art direction:** the site's own visual language. Dark ink ground (`#0b0b0a`), mineral white type
(`#f2f0e9`), ochre plate (`#c2703d`) and signal orange (`#f26a2e`) used sparingly, Geist type. The
cracked lakebed is the same plate-and-crack idea as the site hero (`components/visuals/LakeField.tsx`,
design notes in `docs/design/2026-10-07-experience-polish.md`) and the brand mark (four mineral plates,
one ochre plate). The flyer texture generator (`../flyers/src/texture.mjs`) is a usable starting
point for the plates.

**Licensing rule for every shot:** original motion graphics and illustration only, built from the
Drylake brand assets in `public/brand/`. No stock footage, no stock or AI-generated people, no
photos or footage of Benedict or Wilson. If a later edit wants live footage (for example real dry
lakebed aerials), it must be licensed footage with its source, licence type and licence ID recorded
in this table before use. **Source to be confirmed** for any such footage; none is specified here.

| # | Time | Shot description | Motion | Text overlay | Transition out | Asset needed | Licensing note |
|---|---|---|---|---|---|---|---|
| 1 | 0.0 to 3.2 | Still dark water surface, faint ripple, top-down. | Slow push-in, ripple settles. | none | Water level drops (dissolve) | Vector water shader or gradient plane | Original motion graphic |
| 2 | 3.2 to 6.0 | Water recedes from frame edges, revealing dry, pale ground beneath. | Water edge animates inward, ground fades up. | none | Hold, camera continues | Cracked plate field (from `texture.mjs` or redrawn) | Original illustration |
| 3 | 6.0 to 10.5 | The ground dries and splits: cracks propagate between plates. | Cracks draw on with stroke animation, light dust particles. | none | Match cut on a single crack | Plate field with animatable crack paths | Original illustration |
| 4 | 10.5 to 12.0 | Close on one crack. A small business is implied only by objects: a spreadsheet grid, an inbox stack, a sticky note, drawn as flat line icons along the crack. | Icons slide into the crack. | none | Pull out | 3 to 4 flat line icons (Lucide, already a site dependency, ISC licence) | Lucide icons, ISC licence; confirm attribution not required |
| 5 | 12.0 to 18.0 | Four cracks, each labelled. Each label strikes through as the VO names it. | Labels type on, strike-through draws left to right. | Disconnected systems / Repetitive tasks / Outdated tools / Temporary workarounds | Cracks glow signal orange | Label component in Geist | Original; Geist is SIL OFL |
| 6 | 18.0 to 23.5 | The plates lift slightly (strip it back), one ochre plate lights (find the cracks), cracks become clean connection lines with nodes (build back better). | Three beats, one per phrase. | Strip it back. / Find the cracks. / Build back better. | Plates settle into a grid | Plate field, node dots | Original motion graphic |
| 7 | 23.5 to 28.0 | The settled grid becomes simple interface frames: a website page, a booking calendar, a customer list. | Frames build from plate edges. | Websites / Custom software / Booking and customer systems | Slide left | Flat UI frames built in brand tokens (no real client data, no screenshots of client work) | Original; never show a client's real site or data |
| 8 | 28.0 to 32.5 | Frames connect: an enquiry dot travels from the website frame to the calendar to the customer list. | Dot travels along connection lines. | Automation / Practical AI | Fade to ink | Connection lines, travelling dot | Original motion graphic |
| 9 | 32.5 to 37.0 | CTA card on ink ground, ochre plate beside it. | Card rises, URL types on. | Book a free 30-minute consultation / drylake.com.au/consultation | Hold | CTA card (same layout as the flyer CTA panel) | Original |
| 10 | 37.0 to 42.5 | Same card, condition line appears directly under the offer. | Condition fades up, hold for reading. | The consultation is free. Any work is quoted before it begins. | Cracks re-form behind card | none new | Original |
| 11 | 42.5 to 47.0 | Plate field resolves into the Drylake mark, then the wordmark. | Plates converge into the mark tile, wordmark draws the y swoosh. | See what lies beneath. Build what comes next. | Hold | `public/brand/drylake-mark-tile.svg`, `drylake-wordmark-dark-bg.svg` | Drylake-owned assets |
| 12 | 47.0 to 50.0 | End card. Poster frame candidate. | Static. | Drylake / drylake.com.au / 0433 448 000 / Drylake Pty Ltd, ABN 70 702 662 557, Perth, Western Australia | Cut to black | Wordmark | Drylake-owned asset |

## 15 s cutdown shots

| # | Time | Uses main-cut shot | Text overlay |
|---|---|---|---|
| A | 0.0 to 3.0 | 3 (cracks propagate), tightened | Every business has hidden cracks. |
| B | 3.0 to 7.8 | 6 (three beats) | Strip it back. Find the cracks. Build back better. |
| C | 7.8 to 13.3 | 9 and 10 combined: offer and condition on one card | Free 30-minute consultation / drylake.com.au/consultation / Any work is quoted before it begins. |
| D | 13.3 to 15.0 | 12 (end card) | Drylake / 0433 448 000 |

For 9:16, the card and labels re-flow into the centre safe zone (see `production-spec.md`); plate
field is re-composed, not cropped, so no label is cut off.
