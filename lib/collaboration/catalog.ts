/*
 * Collaboration proposals: the fixed vocabularies shared by the public form, the API, the admin
 * pages and the emails. PURE and safe in the browser: no env, no framework imports.
 *
 * The owner-gated project option is deliberately NOT in this file (it lives in projects.ts, which
 * is server-only), so the word never reaches the client bundle while the flag is off.
 */

export const COLLABORATION_CATEGORIES = [
  { value: "technology", label: "Technology collaboration" },
  { value: "product_development", label: "Product development partnership" },
  { value: "business_partnership", label: "Business partnership" },
  { value: "pilot_project", label: "Pilot project" },
  { value: "integration", label: "Integration proposal" },
  { value: "research_innovation", label: "Research or innovation" },
  { value: "supplier_service_provider", label: "Supplier or service provider proposal" },
  { value: "other", label: "Something else" },
] as const;

export type CollaborationCategory = (typeof COLLABORATION_CATEGORIES)[number]["value"];

export const COLLABORATION_CATEGORY_VALUES: readonly string[] = COLLABORATION_CATEGORIES.map((c) => c.value);

/* Projects offered to every visitor. Optional, owner-gated projects come from projects.ts. */
export const BASE_PROJECTS = [
  { value: "drylake", label: "Drylake" },
  { value: "bronnie", label: "BRONNIE" },
  { value: "other", label: "Other" },
] as const;

export type ProjectOption = { value: string; label: string };

export const PROPOSAL_STATUSES = [
  { value: "new", label: "New" },
  { value: "under_review", label: "Under review" },
  { value: "contacted", label: "Contacted" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number]["value"];

export const PROPOSAL_STATUS_VALUES: readonly string[] = PROPOSAL_STATUSES.map((s) => s.value);

export const STATUS_LABELS: Record<string, string> = Object.fromEntries(PROPOSAL_STATUSES.map((s) => [s.value, s.label]));

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  COLLABORATION_CATEGORIES.map((c) => [c.value, c.label])
);

export const COLLABORATION_LIMITS = {
  name: 120,
  organisation: 160,
  email: 200,
  summaryMin: 20,
  summary: 3000,
  website: 200,
  notes: 5000,
} as const;

export const MAX_COLLABORATION_REQUEST_BYTES = 12_000;

/* Turnstile action for the collaboration form: a contact-form token cannot be replayed here. */
export const COLLABORATION_ACTION = "collaboration";
