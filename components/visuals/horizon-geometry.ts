/*
 * Deterministic geometry for the Drylake Horizon visuals (problem field, systems stage), so the
 * server and the browser render identical markup (no hydration mismatch) and the page looks the
 * same on every visit. Pure data: no React, no DOM; tests import it. The hero's seeded noise
 * ruler went with the old hero (experience polish); the hero's lake bed lives in
 * lakebed-geometry.ts.
 */

/* ----------------------------------------------------------- problem field ---- */

/*
 * The problem chapter's twelve work artefacts. s* = scattered position (% of the field),
 * f* = ordered position. m* = phones (2 columns x 6 rows), l* = desktop (3 lanes x 4).
 */
export type Fragment = {
  label: string;
  lane: 0 | 1 | 2;
  r: number;
  m: { sx: number; sy: number; fx: number; fy: number };
  l: { sx: number; sy: number; fx: number; fy: number };
};

export const PROBLEM_LANES = ["Records", "Steps", "Channels"] as const;

const FRAGMENT_LABELS: readonly [string, 0 | 1 | 2][] = [
  ["spreadsheet.xlsx", 0],
  ["customer data", 0],
  ["invoice", 0],
  ["PDF", 0],
  ["manual approval", 1],
  ["copy → paste", 1],
  ["follow-up", 1],
  ["staff", 1],
  ["email", 2],
  ["CRM", 2],
  ["payments", 2],
  ["website", 2],
];

/* Hand-placed scatter: never piled up, readable at rest. Phones (SCATTER_M) have no overlapping
   chips at 320-430 px, which is the picture reduced-motion visitors keep (experience polish fixed
   PR 3's deferred overlaps: "customer data" / "website" and "copy → paste" / "follow-up"). */
const SCATTER_L: readonly [number, number, number][] = [
  [24, 18, -9], [68, 12, 6], [44, 34, 12], [85, 40, -14],
  [18, 52, 7], [58, 56, -6], [36, 76, -11], [80, 70, 9],
  [12, 86, 5], [62, 86, -8], [86, 92, 13], [40, 8, -4],
];
const SCATTER_M: readonly [number, number][] = [
  [30, 10], [74, 23], [44, 35], [20, 40],
  [76, 48], [34, 56], [68, 67], [26, 73],
  [70, 81], [34, 91], [80, 95], [80, 4],
];

export const PROBLEM_FRAGMENTS: readonly Fragment[] = FRAGMENT_LABELS.map(([label, lane], i) => {
  const slot = FRAGMENT_LABELS.slice(0, i).filter(([, l]) => l === lane).length;
  return {
    label,
    lane,
    r: SCATTER_L[i][2],
    l: { sx: SCATTER_L[i][0], sy: SCATTER_L[i][1], fx: 16 + slot * 22.5, fy: 24 + lane * 28 },
    m: { sx: SCATTER_M[i][0], sy: SCATTER_M[i][1], fx: i % 2 === 0 ? 27 : 73, fy: 9 + Math.floor(i / 2) * 16.4 },
  };
});

/* ---------------------------------------------------------- systems stage ---- */

export type SystemNode = {
  label: string;
  /* d = desktop, m = phones; s = scattered, f = connected (centre, % of the stage). */
  d: { sx: number; sy: number; fx: number; fy: number; r: number };
  m: { sx: number; sy: number; fx: number; fy: number; r: number };
};

export const SYSTEM_NODES: readonly SystemNode[] = [
  { label: "Website", d: { sx: 18, sy: 14, fx: 12, fy: 22, r: -7 }, m: { sx: 30, sy: 6, fx: 22, fy: 12, r: -6 } },
  { label: "Customer details", d: { sx: 46, sy: 30, fx: 31, fy: 22, r: 9 }, m: { sx: 74, sy: 18, fx: 78, fy: 12, r: 8 } },
  { label: "Emails", d: { sx: 78, sy: 12, fx: 69, fy: 22, r: -4 }, m: { sx: 24, sy: 30, fx: 22, fy: 32, r: 5 } },
  { label: "Customers", d: { sx: 90, sy: 46, fx: 88, fy: 22, r: 11 }, m: { sx: 70, sy: 38, fx: 78, fy: 32, r: -9 } },
  { label: "Bookkeeping", d: { sx: 12, sy: 62, fx: 12, fy: 78, r: 6 }, m: { sx: 34, sy: 60, fx: 22, fy: 68, r: 7 } },
  { label: "Documents", d: { sx: 36, sy: 86, fx: 31, fy: 78, r: -10 }, m: { sx: 72, sy: 70, fx: 78, fy: 68, r: -5 } },
  { label: "Payments", d: { sx: 64, sy: 72, fx: 69, fy: 78, r: 5 }, m: { sx: 26, sy: 86, fx: 22, fy: 88, r: -8 } },
  { label: "Team", d: { sx: 84, sy: 88, fx: 88, fy: 78, r: -8 }, m: { sx: 68, sy: 94, fx: 78, fy: 88, r: 6 } },
];

/* Dashed workarounds between scattered systems (desktop), with what they really are. */
export const SYSTEM_WORKAROUNDS: readonly { from: number; to: number; note: string }[] = [
  { from: 2, to: 4, note: "copy → paste" },
  { from: 1, to: 5, note: "export.csv" },
  { from: 3, to: 6, note: "re: fwd" },
];
