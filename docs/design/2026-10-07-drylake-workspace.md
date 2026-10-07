# Drylake Workspace: client experience redesign (PR 4, 2026-10-07)

The signed-in client area is now called **Drylake Workspace** ("Workspace" in navigation). The
public entry label stays **Client Login**. Routes (`/client`, `/portal`), tables, types, CSS hooks
(`.client-portal`, `#portal-main`) and API identifiers (`portalUrl`) are unchanged: this is a
product-language and presentation change, with no migration.

## Principles

- **Answer four questions in order:** what is happening, what needs my attention, what changed,
  what can I do. Not a grid of equal cards.
- **Restrained surfaces.** The dark rail carries the brand (canonical `DrylakeWordmark` lockup, the
  ochre y). Content stays on the light app canvas. Hierarchy comes from type (display titles, mono
  labels) and spacing.
- **One primary action colour:** ink with white text (19:1). White on signal orange (about 3:1) failed
  AA at button size. Signal orange marks status, progress and the active nav item only.
- **No fabricated data.** Every figure, list and timeline item maps to a row the existing loaders
  return. Derived views live in `components/client/workspace-derive.ts` (pure, unit tested).

## Information architecture

| Destination | Route | Contents |
|---|---|---|
| Overview | `/client` | Briefing line, key figures, needs-your-attention, projects, activity timeline, latest documents, support |
| Project | `/client/projects/[id]` | Status, progress, dates, next milestone, latest update, milestone timeline, updates, documents |
| Billing | `/client/billing` | Balance figures, To pay (overdue first), History (paid/void), payment security note, support |
| Invoice | `/client/billing/[id]` | Amount + Stripe pay button (first on phones), details, tax breakdown (unchanged logic), related project |

The rail: wordmark + "Workspace", organisation (+ switch when more than one), Navigate (grouped,
below), then Start a conversation, Drylake website, Sign out, account.

### Grouped navigation and deep links (Experience Polish, Workstream W)

Every entry is a real route or a section id the view renders (`components/client/ClientNav.tsx`,
test-pinned in `tests/workspace-polish.test.mjs`):

| Group | Destination | URL |
|---|---|---|
| Overview | Overview (top) | `/client` |
| | Needs your attention | `/client#needs-attention` |
| | Projects | `/client#projects` |
| | Recent activity | `/client#recent-activity` |
| | Documents | `/client#documents` |
| This project (only while a project is open) | Status and progress | `/client/projects/[id]#project-status` |
| | Milestones | `/client/projects/[id]#milestones` |
| | Updates | `/client/projects/[id]#updates` |
| | Documents | `/client/projects/[id]#project-documents` |
| Billing | Billing (top) | `/client/billing` |
| | To pay | `/client/billing#to-pay` |
| | Invoice history | `/client/billing#invoice-history` |
| | Paying online | `/client/billing#paying-online` |

Not offered, because the capability does not exist: Account > Members / Settings (account
security is Clerk's own menu in the rail footer, organisation switching is the existing "Switch
workspace" link), Documents > Agreements / Shared files / Deliverables as separate places (one
document list per scope, no document categories in the data), Billing > Payments as a separate
list (payments are recorded per invoice; the invoice page shows the paid state).

Arrival (`components/client/WorkspaceAnchors.tsx`, mounted once in the shell): on a full load,
refresh, cross-page link, same-page link, Back/Forward or a typed hash, it waits for the section
if the page is still streaming, scrolls it in (smooth only without reduced motion,
`scroll-margin-top` clears the sticky bar), moves focus to the section heading (tabIndex -1),
and marks the section for a moment. A missing section (an empty workspace shows the Welcome
panel) falls back to the page heading. Same-page links push a history entry first, so Back
returns to where the reader was.

The rail lists every group's sections. Below lg the menu is a sheet that rises from the bottom
edge (a floating panel from sm), navigation first; each group is a disclosure (the group link plus
a separate expand button, 48px wide), the current group open; every target is 44px or more.

### Product environment

`components/shell/ProductEnvironment.tsx` is the ground under the content column: a dot field, a
slightly lighter sky above a horizon line, the tile's own plate geometry drawn large and faint at
the top right with its ochre plate barely tinted, and one short ochre stroke where the horizon
meets the right gutter. Admin uses the same primitive with its "admin" variant (measured line
grid, ruled horizon, construction-line cracks with ochre registration marks). Background only:
aria-hidden, no pointer events, CSS backgrounds plus one static SVG, no script, no animation, no
asset request, fades out below the header band; every card keeps its opaque white surface.

## Overview hierarchy

1. **Briefing** (h1 = organisation): one plain sentence built from counts, e.g. "2 projects are in
   progress, and 1 invoice is overdue." A failed query is left out, never guessed.
2. **Figure band** (one surface, the first figure leads): balance due, next due date, active
   projects, documents.
3. **Needs your attention**: payable invoices, overdue first; each row says "Overdue" / "To pay" in
   text with an icon (never colour alone) and offers View and pay. When nothing is payable it
   collapses to a calm confirmation line.
4. **Projects** (open work first) and **Recent activity** (updates, documents and invoices merged into
   one newest-first timeline) on the left; **Documents** and **Support** on the right.
5. A workspace with no projects, invoices, documents or updates shows a **Welcome** panel instead:
   what will appear here, plus Start a conversation.

Overdue on the overview is derived as OPEN + due date before today in Perth, the same rule
`lib/invoices/lifecycle.ts` applies on the billing pages (presentation only; payment eligibility is
still decided by the server).

## States matrix

| State | Source | What the client sees |
|---|---|---|
| ready, with data | `getClientWorkspace()` ready | Full overview / project / billing |
| ready, empty | ready + zero rows | Welcome panel (overview); per-section empty states with a next step |
| ready, partial failure | a query returned an error | That section shows its error state; figures read "Unavailable" |
| access pending | `access-pending` (not-linked, authorization-pending) | State card, Start a conversation |
| choose / activate | `access-pending` (choose/activate membership) | Organisation picker (Clerk `setActive`) |
| invitation | `access-pending` (accept-invitation) | Invitation completer (server re-derives everything) |
| blocked | `blocked` (INACTIVE / ARCHIVED) | Paused / closed card, nothing deleted, Start a conversation |
| no organisation | `no-organisation` | Explains the invitation email; admins are redirected to /admin (unchanged) |
| lookup failed | `lookup-failed` | Temporary error card |
| loading | route `loading.tsx` | Skeletons in the same shapes (header, figure band, sections); shimmer off under reduced motion |

Every access state renders before the ready branch, from the one resolver: unchanged.

## Mobile navigation (below lg)

Sticky top bar (wordmark + "Workspace", current section from md, menu button). The menu is a
grouped bottom sheet (see above) and a modal dialog, on the contract shared with Admin
(`components/shell/useModalDrawer.ts`): `role="dialog"`, `aria-modal`, toggle has `aria-expanded`/`aria-controls`/`aria-haspopup`.
Focus moves to the close button on open, Tab and Shift+Tab stay inside, Escape and the scrim close
it, focus returns to the menu button, the page scroll lock is released on close, navigation and
unmount. A nested Start a conversation `<dialog>` keeps its own keyboard. Motion is a short slide,
removed under `prefers-reduced-motion`.

## Accessibility

Landmarks (`aside` rail named Drylake Workspace, `nav` "Workspace", `main` with skip link), one h1
per page then h2 sections and h3 items, status always in text, `--focus-ring` on every control,
44px targets, muted text raised to 5.3:1 (`--cp-ink-muted #6b6963`).
