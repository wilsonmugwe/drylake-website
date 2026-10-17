/*
 * Homepage copy, Exposed Ground (D54, stage 2). One module so the whole homepage can be read and
 * reviewed in one place (docs/content/2026-10-17-homepage-copy.md lists every string and its
 * source). Most lines come from the approved concept canvas (Main board) or from already-approved
 * site copy (lib/brand-story.ts, lib/navigation/site-nav.ts). No claims of customers, results,
 * reviews or numbers. Target: under 350 visible words on the page (was about 1,950).
 */

export const HOME_HERO = {
  eyebrow: "Drylake · Perth, Western Australia",
  /* The four things Drylake builds, as the headline (concept canvas). */
  lines: ["Websites.", "Software.", "Automation.", "AI."],
  signalLine: 2,
  lede: "We build the systems that run your business, then get out of the way.",
  secondary: "What we build",
} as const;

export const HOME_SYSTEM = {
  eyebrow: "01 · Strip it back",
  title: ["Four jobs.", "One system."],
  text: "Select a plate to see how we help.",
} as const;

/*
 * The service rows: poster word + one line, each opening its service page. Lines are short
 * restatements of each page's own summary (lib/discovery/services.ts); nothing new is claimed.
 */
export const HOME_SERVICES_EYEBROW = "02 · What we build";
export const HOME_SERVICE_ROWS = [
  { word: "Websites", slug: "web-development", line: "Fast sites that bring in enquiries and bookings." },
  { word: "Software", slug: "custom-software-development", line: "Portals, booking and job systems built around your work." },
  { word: "Automation", slug: "business-automation", line: "Reminders, approvals and data entry that run themselves." },
  { word: "Integration", slug: "systems-integration", line: "The tools you already use, finally talking to each other." },
  { word: "AI", slug: "ai-automation", line: "AI where it saves real time, with a person checking." },
] as const;

export const HOME_CRACKS = {
  eyebrow: "03 · Find the cracks",
  title: "Where the time actually goes.",
  items: ["Typed in twice.", "Lost in the inbox.", "Chased by phone.", "Three versions of the truth."],
  close: "We look at how the work really happens first. Sometimes the answer is small.",
} as const;

export const HOME_APPROACH_EYEBROW = "04 · How we work";
/* The philosophy steps (lib/brand-story.ts PHILOSOPHY_STEPS) with the concept canvas's short lines. */
export const HOME_APPROACH_LINES = [
  "A free 30-minute conversation about how the business runs.",
  "A proposal naming the problem, the fix and the price.",
  "Built, tested and handed over, with progress in your Workspace.",
] as const;

export const HOME_WORKSPACE = {
  eyebrow: "05 · Drylake Workspace",
  title: "Your project, in one place.",
  points: ["Progress and milestones", "Documents", "Invoices, paid by card"],
  caption: "The real Drylake Workspace, sample data.",
  imageAlt:
    "Drylake Workspace overview with sample data: two projects with progress bars, recent updates, shared documents and an invoice awaiting payment.",
} as const;

export const HOME_FOUNDERS = {
  eyebrow: "06 · Who you work with",
  title: "Two founders. A direct line.",
  more: "About Drylake",
} as const;

export const HOME_QUESTIONS = {
  eyebrow: "Questions",
  more: "All questions",
} as const;

export const HOME_CLOSE = {
  secondary: "Send us a message",
} as const;
