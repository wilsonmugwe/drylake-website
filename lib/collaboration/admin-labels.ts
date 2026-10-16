/*
 * Labels for the admin pages and the internal notification email. These cover every project the
 * database can store, whatever the public flag says today, so an existing proposal for an
 * owner-gated project stays readable. NEVER import this from a client component or from the
 * public /collaborate page: it names the gated project and would ship it to visitors.
 * (tests/collaboration.test.mjs fails if a client component or the public page imports it.)
 */

export const PROJECT_LABELS: Record<string, string> = {
  drylake: "Drylake",
  bronnie: "BRONNIE",
  abbicare: "Abbicare",
  other: "Other",
};

export const PROJECT_FILTER_OPTIONS = Object.entries(PROJECT_LABELS).map(([value, label]) => ({ value, label }));
