# Asset register

Every font, image, illustration and film on the public site: where it came from, the licence,
what it may be used for, and when it was added. Exposed Ground redesign (D54) rule: original first;
licensed only with a recorded licence; no photographs of Wilson or Benedict; no faces presented as
staff, customers or founders; no fabricated product screens.

| Asset | Path | Source | Licence | Scope | Added | Notes |
|---|---|---|---|---|---|---|
| Archivo (variable, wdth 62-125, wght 100-900) | self-hosted by `next/font/google` | Google Fonts, Omnibus-Type | SIL Open Font Licence 1.1 | Display type, all surfaces | 2026-10-17 | Latin subset, not preloaded |
| Geist, Geist Mono | self-hosted by `next/font/google` | Vercel | SIL Open Font Licence 1.1 | Body, labels | before 2026-10 | Unchanged |
| Cracked lake-bed tile (One System) | `components/brand/DrylakeMark.tsx`, `components/visuals/LakeBed*.tsx` | Drylake (Wilson's design, D27) | Owned by Drylake | Mark, hero | 2026-10-07 | Locked by `tests/one-system-lock.test.mjs` |
| Crack divider | `components/visuals/CrackRule.tsx` | Drawn from the tile's own crack lines | Owned by Drylake | Section dividers | 2026-10-17 | Original SVG |
| Social share cards | `public/og/*.png` | Rendered by `scripts/og/render-share-cards.mjs` | Owned by Drylake | Open Graph images | 2026-10-06 onward | `bronnie.png` added 2026-10-17 |

## Pending (later stages)

| Asset | Plan | Licence path |
|---|---|---|
| Hero animation (Option A) | Original motion from the tile's crack geometry, no footage | Owned by Drylake |
| Product screens (Workspace, booking, admin) | Captured by script from a local build with sample data only | Owned by Drylake; no client data |
| Photography (salt crust, texture, workplace details: tools, screens, hands) | Commissioned or licensed per image | Record each image's source, licence ID, scope and attribution here before it ships |
| WA salt-lake footage (Option B, later) | Commissioned CASA-licensed drone operator | Drylake to own the rights; quote needed |
