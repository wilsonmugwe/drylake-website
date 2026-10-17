/*
 * /bronnie page copy (Exposed Ground, D54). DRAFT FOR BEN'S APPROVAL: Ben approved creating the
 * page but asked to review the exact copy before publication. Every line below is in
 * docs/content/2026-10-17-bronnie-page-copy.md with its source. Nothing here may claim a customer,
 * pilot, result, deployment, date or feature that exists today.
 *
 * Sources:
 *   - description: owner-approved sentence (2026-10-16, lib/collaboration/copy.ts BRONNIE).
 *   - stage and phases: wilsonmugwe/bronnie README, "Project Status" (read 2026-10-17):
 *     "Product Stage: Pre-MVP / Product Development", "Current FDE Phase: Phase 4, Requirements
 *     Engineering", phases 0-3 completed.
 *   - first module and its capabilities: README "Initial Product Module" ("expected to include").
 *   - design principles: README "Core AI Principle", "AI Reliability Principle", "Systems of Record",
 *     "Auditability", "Multi-Tenancy". Stated as design intent ("designed to"), never as shipped.
 */

import { BRONNIE } from "../collaboration/copy.ts";

export const BRONNIE_PAGE = {
  eyebrow: "Developed by Drylake",
  name: BRONNIE.name,
  description: BRONNIE.description,
  stamp: "In development. Not yet available.",

  stagesHeading: "Where it stands",
  /* Reuses the owner-approved stages verbatim. */
  stages: BRONNIE.stages,

  progressHeading: "Progress",
  progressNote: "Requirements are being defined now. Architecture follows, then a build and pilots.",
  phases: [
    { label: "Foundation", state: "done" },
    { label: "Discovery", state: "done" },
    { label: "Problem definition", state: "done" },
    { label: "Current-state analysis", state: "done" },
    { label: "Requirements", state: "now" },
    { label: "Architecture", state: "next" },
    { label: "Build", state: "next" },
    { label: "Pilots", state: "next" },
  ] as const,

  moduleHeading: "First module: customer operations",
  moduleIntro: "What the first module is being designed to do.",
  moduleItems: [
    "Read and sort customer enquiries",
    "Ask for missing details",
    "Route requests to the right person",
    "Book, move and cancel appointments",
    "Hand anything sensitive to a person",
  ],

  principlesHeading: "How it is designed to work",
  /* The README's control model, reduced to four steps a business owner can follow. */
  principles: [
    { title: "AI reads", text: "It understands and sorts the request." },
    { title: "Rules decide", text: "Your permissions and business rules decide what may happen." },
    { title: "People approve", text: "Sensitive actions wait for a person." },
    { title: "Everything is recorded", text: "Each step is logged, so every action can be explained." },
  ],
  systemsNote: "Your existing calendar, customer and accounting systems stay the source of truth.",

  status: BRONNIE.status,

  ctaHeading: "Interested in a pilot?",
  ctaText: "Pilots and early access are arranged by discussion.",
  ctaLabel: "Propose a collaboration",
} as const;
