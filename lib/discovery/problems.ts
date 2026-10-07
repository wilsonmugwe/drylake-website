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
 * can build. No statistics, savings, client results or time claims. No em dashes.
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
  {
    id: "double-entry",
    problem: "Staff enter the same information into more than one system.",
    outcome: "Connected systems remove duplicate entry: information is entered once and appears where it is needed.",
    services: ["systems-integration", "business-automation"],
  },
  {
    id: "lost-enquiries",
    problem: "Important enquiries disappear into inboxes.",
    outcome: "Enquiries create a record and reach the right person automatically, so nothing waits to be noticed.",
    services: ["web-development", "business-automation"],
  },
  {
    id: "document-requests",
    problem: "Customers keep asking for documents and updates.",
    outcome: "Client portals give customers one place to see their documents, progress and invoices.",
    services: ["custom-software-development", "web-development"],
  },
  {
    id: "email-approvals",
    problem: "Approvals sit in email.",
    outcome: "Requests route to the right person, the decision is recorded and the work moves on.",
    services: ["business-automation"],
  },
  {
    id: "critical-spreadsheet",
    problem: "A spreadsheet has become a critical system.",
    outcome: "Purpose-built software gives the process proper records, permissions and history that a shared file cannot hold safely.",
    services: ["custom-software-development"],
  },
  {
    id: "manual-transfer",
    problem: "Teams move data between software by hand.",
    outcome: "Integrations keep records in step between systems, without exports, imports or retyping.",
    services: ["systems-integration"],
  },
  {
    id: "manual-reporting",
    problem: "Reporting means hours of manual consolidation.",
    outcome: "Reports that draw from each system give management visibility without assembling it by hand.",
    services: ["systems-integration", "business-automation"],
  },
  {
    id: "disconnected-systems",
    problem: "Existing systems do not communicate.",
    outcome: "Connecting them, rather than replacing them, closes the gaps while the business keeps the software that still works.",
    services: ["systems-integration", "custom-software-development"],
  },
  {
    id: "incoming-paperwork",
    problem: "Incoming paperwork has to be read and sorted by hand.",
    outcome: "AI can read, check and route it, with anything unclear passed to a person.",
    services: ["ai-automation"],
  },
];

export function problemsForService(slug: ServiceSlug): BusinessProblem[] {
  return BUSINESS_PROBLEMS.filter((item) => item.services.includes(slug));
}

export function problemPath(item: BusinessProblem): string {
  return `${SOLUTIONS_PATH}#${item.id}`;
}
