import "server-only";

import { BASE_PROJECTS, type ProjectOption } from "./catalog.ts";

/*
 * Server-side project options for /collaborate.
 *
 * Owner decision (2026-10-16): Abbicare stays HIDDEN until its owners give permission. The flag
 * COLLABORATION_ABBICARE_ENABLED is read on the server only. While it is not exactly "true",
 * the name appears nowhere a visitor or a crawler can see: not in the page HTML, JSON-LD,
 * llms.txt, the RSC payload or any client JavaScript. This module is `server-only` so a client
 * component cannot import it by accident; the page passes the resulting options down as props.
 *
 * The flag is read when the page renders (statically at build time on Vercel), so changing it
 * needs a redeploy. That is intended: it is an owner-approved publication, not a runtime toggle.
 */

export const ABBICARE_OPTION: ProjectOption = { value: "abbicare", label: "Abbicare" };

/*
 * Neutral wording only. Abbicare is a separate organisation; this states what Drylake is open to
 * discussing and claims no partnership, endorsement, case study or project detail.
 */
export const ABBICARE_NOTE = {
  heading: "Abbicare",
  lead:
    "Abbicare is a separate organisation. If you are proposing something relating to Abbicare, you can choose it as the project of interest.",
  topics: [
    "Website technology",
    "E-commerce integrations (Next.js with WordPress and WooCommerce)",
    "Accessibility and user experience",
    "Product catalogue systems",
    "Operational improvements",
    "Relevant partnerships",
  ],
  disclaimer:
    "Listing Abbicare here does not mean there is a partnership, endorsement or case study. No project details are shared.",
} as const;

type FlagEnv = Readonly<Record<string, string | undefined>>;

export function abbicareEnabled(env: FlagEnv): boolean {
  return env.COLLABORATION_ABBICARE_ENABLED?.trim().toLowerCase() === "true";
}

/* Drylake, BRONNIE, then Abbicare only when enabled, then Other last. */
export function projectOptions(env: FlagEnv): ProjectOption[] {
  const options: ProjectOption[] = BASE_PROJECTS.map((p) => ({ ...p }));
  if (abbicareEnabled(env)) {
    options.splice(options.length - 1, 0, ABBICARE_OPTION);
  }
  return options;
}
