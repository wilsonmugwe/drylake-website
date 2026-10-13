/*
 * The operational problems Drylake is asked to fix, each tied to the service lines that usually
 * fix it: the ONE source for the problem-led list on /solutions, the "problems this solves" links
 * on each service page and the "Problems we solve" section of llms.txt.
 * PURE: no framework imports (tests import it directly).
 *
 * Why (final refinement PR, 2026-10-08): /services says WHAT Drylake provides; /solutions says
 * which business problem each capability removes, so a business owner can recognise their own
 * situation and follow PROBLEM -> SOLUTION -> SERVICE -> CONTACT.
 *
 * Content rules: the problems are the ones named in the refinement brief; each outcome states
 * what the work changes, in plain words, and only what the linked service page already says it
 * can build. No statistics or client results. Time and cost figures appear only as illustrative
 * calculations from lib/value-examples.ts (2026-10-13), never here. No em dashes.
 */

import type { ServiceSlug } from "./services.ts";

export type BusinessProblem = {
  /* Stable anchor on /solutions (#id); service pages link to it. */
  id: string;
  problem: string;
  outcome: string;
  /* Most relevant service first. Every slug must exist in SERVICES (tested). */
  services: readonly ServiceSlug[];
};

export const SOLUTIONS_PATH = "/solutions";

export const BUSINESS_PROBLEMS: readonly BusinessProblem[] = [
  /*
   * Plain-English pass (2026-10-13): each problem is written the way an owner says it, and each
   * outcome says what Drylake does about it in everyday words. Anchor ids are unchanged (homepage
   * rows and service pages link to them); three situations from the brief were added.
   */
  {
    id: "better-website",
    problem: "We need a better website that customers can actually use.",
    outcome: "We build a clear, fast website that explains what you do, works well on phones and makes it easy for customers to get in touch.",
    services: ["web-development"],
  },
  {
    id: "double-entry",
    problem: "Our staff spend too much time entering the same information.",
    outcome: "We connect your systems so details are entered once and appear where they are needed, where the software supports it.",
    services: ["systems-integration", "business-automation"],
  },
  {
    id: "critical-spreadsheet",
    problem: "We're managing bookings and jobs through emails and spreadsheets.",
    outcome: "We build one simple system for bookings, customers and jobs, with proper records and access for the right people.",
    services: ["custom-software-development"],
  },
  {
    id: "repeat-messages",
    problem: "We keep sending the same reminders and messages to customers.",
    outcome: "Routine reminders and follow-ups are sent automatically at the right time, so nobody has to remember them.",
    services: ["business-automation"],
  },
  {
    id: "lost-enquiries",
    problem: "Enquiries get lost in our inbox.",
    outcome: "Website enquiries go straight to the right person or system, so nothing waits to be noticed.",
    services: ["web-development", "business-automation"],
  },
  {
    id: "disconnected-systems",
    problem: "Our systems don't work together.",
    outcome: "We connect the tools you already use instead of replacing them, so information moves between them on its own.",
    services: ["systems-integration", "custom-software-development"],
  },
  {
    id: "document-requests",
    problem: "We want customers to log in and check their information.",
    outcome: "A secure customer portal gives each customer one place to see their documents, progress and invoices, instead of asking by email.",
    services: ["custom-software-development", "web-development"],
  },
  {
    id: "email-approvals",
    problem: "Approvals sit in someone's inbox.",
    outcome: "Requests go to the right person, the decision is recorded and the work moves on.",
    services: ["business-automation"],
  },
  {
    id: "manual-transfer",
    problem: "We copy information from one program into another by hand.",
    outcome: "We set up connections that keep records the same in each system, without exporting, importing or retyping.",
    services: ["systems-integration"],
  },
  {
    id: "manual-reporting",
    problem: "Putting reports together takes hours every week or month.",
    outcome: "Reports that pull from each system automatically, so you can see how the business is going without building them by hand.",
    services: ["systems-integration", "business-automation"],
  },
  {
    id: "incoming-paperwork",
    problem: "Someone has to read and sort every email, form and document.",
    outcome: "AI tools can read, sort and send routine paperwork to the right place, with anything unclear passed to a person.",
    services: ["ai-automation"],
  },
  {
    id: "ai-start",
    problem: "We want to use AI but don't know where to start.",
    outcome: "We look at where your team spends time on reading, writing or sorting, then recommend AI only where it genuinely helps, with a person checking what matters.",
    services: ["ai-automation"],
  },
];

export function problemsForService(slug: ServiceSlug): BusinessProblem[] {
  return BUSINESS_PROBLEMS.filter((item) => item.services.includes(slug));
}

export function problemPath(item: BusinessProblem): string {
  return `${SOLUTIONS_PATH}#${item.id}`;
}
