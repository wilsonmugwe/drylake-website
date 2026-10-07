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

The rail: wordmark + "Workspace", organisation (+ switch when more than one), Navigate (Overview,
Billing), then Start a conversation, Drylake website, Sign out, account.

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

Sticky top bar (wordmark + "Workspace", current section from md, menu button). The drawer is a modal
dialog: `role="dialog"`, `aria-modal`, toggle has `aria-expanded`/`aria-controls`/`aria-haspopup`.
Focus moves to the close button on open, Tab and Shift+Tab stay inside, Escape and the scrim close
it, focus returns to the menu button, the page scroll lock is released on close, navigation and
unmount. A nested Start a conversation `<dialog>` keeps its own keyboard. Motion is a short slide,
removed under `prefers-reduced-motion`.

## Accessibility

Landmarks (`aside` rail named Drylake Workspace, `nav` "Workspace", `main` with skip link), one h1
per page then h2 sections and h3 items, status always in text, `--focus-ring` on every control,
44px targets, muted text raised to 5.3:1 (`--cp-ink-muted #6b6963`).
