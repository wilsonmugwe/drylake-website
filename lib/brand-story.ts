/*
 * The Drylake brand story: ONE statement of why the company is called Drylake, read by the
 * /about section, the short homepage band and tests (brand story workstream, 2026-10-16).
 * PURE: no framework imports.
 *
 * Owner-approved 2026-10-16: PHILOSOPHY and TAGLINE may be used on the site. The metaphor is
 * used in ONE block per page (BrandStory); the rest of the site stays plain-English and literal.
 * No em dashes (visitor-facing).
 */

export const PHILOSOPHY_STEPS = ["Strip it back.", "Find the cracks.", "Build back better."] as const;
export const PHILOSOPHY = PHILOSOPHY_STEPS.join(" ");

export const TAGLINE = "See what lies beneath. Build what comes next.";

/* Homepage band: short, and does not displace the hero's "websites, software, automation" message. */
export const BRAND_STORY_SHORT =
  "When a lake dries, the ground underneath is finally visible, cracks and all. We do the same for your business: look at how it really runs, find what is holding it back, then build practical technology to fix it.";

/* /about: why the name, what the metaphor stands for, why understanding comes first. */
export const BRAND_STORY_PARAGRAPHS: readonly string[] = [
  "When a lake dries, the water recedes and the ground underneath becomes visible. Cracks, weak spots and conditions that were hidden for years are suddenly easy to see.",
  "Most businesses have the same thing under the surface: hidden inefficiencies, disconnected systems, repetitive processes, outdated technology and temporary workarounds that quietly became permanent. Drylake is named for looking at that ground honestly.",
  "That is why understanding comes before recommending anything. We strip operations back to see what is actually happening, find the underlying problems, and only then build practical technology to address them. Technology should solve a real operational challenge, not add complexity.",
];

/* How Drylake approaches a problem, one line per step of the philosophy. */
export const BRAND_STORY_STEPS: ReadonlyArray<{ title: string; text: string }> = [
  {
    title: "Strip it back",
    text: "Look at how the work really happens, with the people who do it, before anyone talks about software.",
  },
  {
    title: "Find the cracks",
    text: "Name the real problem: the double entry, the lost enquiries, the workaround nobody remembers starting.",
  },
  {
    title: "Build back better",
    text: "Build the simplest practical fix, and say so when the answer is a small change or an existing tool.",
  },
];

/* Lightly ties the seven-stage process to "understand first" (Approach.tsx). */
export const APPROACH_UNDERSTAND_FIRST = "We start by understanding the problem, then recommend what to build.";
