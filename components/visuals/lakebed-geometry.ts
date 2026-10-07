/*
 * Geometry for the hero lake bed (components/visuals/LakeBed.tsx). Pure data in the tile's own
 * coordinate space (0..100, the plates of components/brand/DrylakeMark.tsx TILE_PLATES), so the
 * resolved picture is exactly the Drylake mark. Tests import this file.
 */

/* Room around the tile for the broken state (plates drift up to ~7 units out). */
export const LAKEBED_VIEW = "-6 -6 112 112";
const VIEW_MIN = -6;
const VIEW_SIZE = 112;

/** A tile coordinate as a percentage of the visual's box (for the HTML label layer). */
export const lakebedPct = (v: number) => Math.round(((v - VIEW_MIN) / VIEW_SIZE) * 10000) / 100;

/*
 * Per plate, in TILE_PLATES order: the business area it stands for, where its label sits, and how
 * far it starts from home (dx/dy in tile units, r in degrees): outward from the tile's centre, so
 * the broken tile reads as one thing cracked apart, not as random confetti.
 */
export const LAKEBED_PLATES: readonly { label: string; lx: number; ly: number; dx: number; dy: number; r: number }[] = [
  { label: "Quotes", lx: 22, ly: 26, dx: -6, dy: -5, r: -5 },
  { label: "Customers", lx: 72, ly: 19, dx: 6, dy: -6, r: 4 },
  { label: "Jobs", lx: 24, ly: 72, dx: -6, dy: 5, r: 4 },
  { label: "One system", lx: 73, ly: 53.5, dx: 7, dy: 0, r: -3 },
  { label: "Invoices", lx: 75, ly: 82, dx: 4, dy: 7, r: -4 },
];

/*
 * The workarounds living in the cracks today (struck through as the plates lock). Each one is
 * set along its crack (rot, degrees), so it reads as written into the gap and never sits on a
 * plate's label.
 */
export const LAKEBED_WORKAROUNDS: readonly { text: string; x: number; y: number; rot: number }[] = [
  { text: "copy → paste", x: 45.6, y: 21, rot: -85 },
  { text: "re: fwd", x: 21, y: 44.8, rot: -12.7 },
  { text: "export.csv", x: 48.6, y: 81, rot: -69.4 },
  { text: "typed twice", x: 80, y: 38.5, rot: -15 },
];

/* Crack centrelines: drawn as connections once the plates have locked. */
export const LAKEBED_CONNECTIONS: readonly string[] = [
  "M47 4 L44 40",
  "M4 49 L44 40",
  "M44 40 L61 43.5 L96 34",
  "M44 40 L55 64",
  "M55 64 L43 96",
  "M55 64 L70 69 L96 65",
];

/* Where cracks meet: a node on each once connected. */
export const LAKEBED_JUNCTIONS: readonly (readonly [number, number])[] = [
  [44, 40],
  [55, 64],
];
