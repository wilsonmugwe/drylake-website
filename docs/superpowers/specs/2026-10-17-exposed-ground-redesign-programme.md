# Exposed Ground redesign programme

Approved by Ben on 2026-10-17 (drylake-ops decisions D54). Concept canvas:
https://claude.ai/artifact/LmuVn35fH7SNRnyuHWenB3 (boards Main, Mobile, Direction, System, Pages, Assets).

**Objective.** A visually memorable, premium technology studio website. Not a cleaner copy of the
current text-heavy site. Quality benchmarks: Metalab, Instrument, Basement.

## Branching

- Integration branch: `redesign/exposed-ground`, cut from `main` at 8f34926.
- Each stage is its own branch, `redesign/NN-<stage>`, opened as a **draft PR into
  `redesign/exposed-ground`**, reviewer wilsonmugwe. Ben approves each one before it is marked
  ready and merged into the integration branch.
- **Nothing merges into `main` and nothing deploys without Ben's explicit approval.** The final
  integration PR (`redesign/exposed-ground` into `main`) is opened as a draft only after every
  stage is merged into the integration branch.
- Every stage PR carries before and after screenshots at 1440 px and 390 px, and the full test
  suite: `npm test` (unit), `npx tsc --noEmit`, `npm run lint`, `next build`, and the Playwright
  e2e suite (`E2E_SKIP_BUILD=1 RESEND_API_KEY= npx playwright test`).

## Stages

| # | Branch | Scope |
|---|---|---|
| 1 | `redesign/01-foundations` | Archivo display face, type scale, crack divider + motion primitives, navigation (Services, Solutions, Approach, BRONNIE, About; Perth + FAQ to the footer), One System lock test + label weight, asset register, `/bronnie` draft page (copy for Ben's approval) |
| 2 | `redesign/02-homepage` | Homepage recomposed: services as the headline, the One System tile on its own stage, type-led service rows, problems as cracks, three-step approach, real Workspace screens, founders as type, live booking, under 350 visible words |
| 3 | `redesign/03-services` | /services and the five service pages: giant rows, per-service animated workflow, real screens, detail kept in server-rendered disclosure |
| 4 | `redesign/04-pages` | Solutions crack map, About, Perth plate map (fixes the 20,000 px phone page), location pages, FAQ, contact + consultation as two doors, collaborate, legal reading layout |
| 5 | `redesign/05-hero-film` | Option A hero animation from the existing crack geometry, poster frame as LCP, pause control, reduced-motion still |
| 6 | `redesign/06-chatbot` | Chat assistant made functional (guided mode), launcher restyled and visible, wording fixes, live checklist for production enablement |

## Fixed constraints (D54 and earlier decisions)

- **One System graphic preserved exactly**: `components/visuals/LakeBed*.tsx`, `lakebed-geometry.ts`
  and the `.lb` CSS. Only a minimal font-weight change for accessibility is allowed. Guarded by
  `tests/one-system-lock.test.mjs`.
- No photographs of Wilson or Benedict. No fabricated reviews, customers, results or bios.
- Photography and footage: original or licensed, every asset recorded in `docs/brand/asset-register.md`.
- Every working flow kept: booking, enquiries, collaboration, reviews, sign-in, admin, Workspace.
- SEO: titles, descriptions, canonicals, structured data, sitemap and internal links carry over.
  Detail moves below the fold into server-rendered sections; it is never deleted.
- Performance budget: homepage JS within 204,800 B, mobile LCP 2.5 s or less on production, CLS 0.05
  or less, Lighthouse mobile 90 or more. The hero h1 never fades in (LCP).
- Accessibility: WCAG 2.2 AA, axe clean, reduced motion shows finished states, 44 px targets.
- Copy: no em dashes, plain AUD, the free-consultation note beside every primary CTA.
- `/bronnie` copy is published only after Ben approves the exact text.
- The chatbot is enabled in production only by Wilson/Ben (Vercel env), after the chatbot stage
  is approved and the privacy and FAQ wording that depends on it ships in the same deploy.
