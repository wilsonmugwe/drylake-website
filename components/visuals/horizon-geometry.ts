/*
 * Deterministic geometry for the Drylake Horizon visuals. Computed at module load from a fixed
 * seed, so the server and the browser render identical markup (no hydration mismatch) and the
 * page looks the same on every visit. Pure data: no React, no DOM; tests import it.
 */

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

/* ---------------------------------------------------------------- hero field ---- */

export type Tick = { x: number; h: number; dx: number; dy: number; r: number; o: number };

/* Where noise ends and the ruler starts (% of the field width). */
export const HERO_SIGNAL_X = 46;

/** Left of the signal node: irregular, rotated, floating ticks (the workarounds). */
export const HERO_NOISE: readonly Tick[] = (() => {
  const rand = seeded(20261007);
  const ticks: Tick[] = [];
  let x = 0.8;
  while (x < HERO_SIGNAL_X - 2.5) {
    ticks.push({
      x: round(x, 2),
      h: Math.round(6 + rand() * 34),
      dx: Math.round((rand() - 0.5) * 14),
      dy: Math.round((rand() - 0.62) * 34),
      r: Math.round((rand() - 0.5) * 34),
      o: round(0.22 + rand() * 0.4, 2),
    });
    x += 0.55 + rand() * 1.6;
  }
  return ticks;
})();

/** Right of the signal node: an even ruler (the system). */
export const HERO_SIGNAL: readonly { x: number; h: number }[] = (() => {
  const ticks: { x: number; h: number }[] = [];
  for (let i = 0, x = HERO_SIGNAL_X + 2; x <= 99.6; i += 1, x += 1.35) {
    ticks.push({ x: round(x, 2), h: i % 8 === 0 ? 30 : i % 4 === 0 ? 20 : 10 });
  }
  return ticks;
})();

/** A few work fragments floating among the noise (desktop shows all, phones the first two). */
export const HERO_FRAGMENTS: readonly { label: string; x: number; y: number; r: number }[] = [
  { label: "final_v3.xlsx", x: 4, y: 46, r: -5 },
  { label: "copy → paste", x: 21, y: -30, r: 4 },
  { label: "re: re: fwd", x: 31, y: 58, r: -3 },
  { label: "manual check", x: 12, y: 84, r: 3 },
  { label: "TODO", x: 38, y: -24, r: -6 },
];

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

/* Hand-placed scatter: overlapping a little, never piled up, readable at rest. */
const SCATTER_L: readonly [number, number, number][] = [
  [24, 18, -9], [68, 12, 6], [44, 34, 12], [85, 40, -14],
  [18, 52, 7], [58, 56, -6], [36, 76, -11], [80, 70, 9],
  [12, 86, 5], [62, 86, -8], [86, 92, 13], [40, 8, -4],
];
const SCATTER_M: readonly [number, number][] = [
  [30, 10], [72, 16], [52, 30], [22, 38],
  [76, 44], [40, 54], [64, 64], [26, 72],
  [70, 80], [34, 90], [80, 94], [76, 5],
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
  { label: "CRM", d: { sx: 46, sy: 30, fx: 31, fy: 22, r: 9 }, m: { sx: 74, sy: 18, fx: 78, fy: 12, r: 8 } },
  { label: "Email", d: { sx: 78, sy: 12, fx: 69, fy: 22, r: -4 }, m: { sx: 24, sy: 30, fx: 22, fy: 32, r: 5 } },
  { label: "Customers", d: { sx: 90, sy: 46, fx: 88, fy: 22, r: 11 }, m: { sx: 70, sy: 38, fx: 78, fy: 32, r: -9 } },
  { label: "Accounting", d: { sx: 12, sy: 62, fx: 12, fy: 78, r: 6 }, m: { sx: 34, sy: 60, fx: 22, fy: 68, r: 7 } },
  { label: "Documents", d: { sx: 36, sy: 86, fx: 31, fy: 78, r: -10 }, m: { sx: 72, sy: 70, fx: 78, fy: 68, r: -5 } },
  { label: "Payments", d: { sx: 64, sy: 72, fx: 69, fy: 78, r: 5 }, m: { sx: 26, sy: 86, fx: 22, fy: 88, r: -8 } },
  { label: "Staff", d: { sx: 84, sy: 88, fx: 88, fy: 78, r: -8 }, m: { sx: 68, sy: 94, fx: 78, fy: 88, r: 6 } },
];

/* Dashed workarounds between scattered systems (desktop), with what they really are. */
export const SYSTEM_WORKAROUNDS: readonly { from: number; to: number; note: string }[] = [
  { from: 2, to: 4, note: "copy → paste" },
  { from: 1, to: 5, note: "export.csv" },
  { from: 3, to: 6, note: "re: fwd" },
];
