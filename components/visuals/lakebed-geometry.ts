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

/* ------------------------------------------------------------ the full field ---- */

/*
 * Composition pass (2026-10-07): the lake bed is the whole hero, not an object in it. A cracked
 * field of plates bleeds off every edge behind the headline; the tile above sits in it. The field
 * is a jittered grid (deterministic, seeded), so server and browser draw identical markup.
 * Each plate is a quad; each grid line is a crack. A few cracks are "lit" as connections.
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

export type LakeField = {
  view: string;
  plates: readonly string[];
  /* Lit cracks: polylines along grid lines (horizontal rows / vertical columns). */
  links: readonly string[];
  nodes: readonly (readonly [number, number])[];
};

function buildField(cols: number, rows: number, w: number, h: number, seed: number, litRows: number[], litCols: number[]): LakeField {
  const rand = seeded(seed);
  const cw = w / cols;
  const ch = h / rows;
  const pt: [number, number][][] = [];
  for (let i = 0; i <= cols; i += 1) {
    pt[i] = [];
    for (let j = 0; j <= rows; j += 1) {
      // Edge points sit outside the box so plates bleed off every side.
      const x = i === 0 ? -cw * 0.3 : i === cols ? w + cw * 0.3 : i * cw + (rand() - 0.5) * cw * 0.55;
      const y = j === 0 ? -ch * 0.3 : j === rows ? h + ch * 0.3 : j * ch + (rand() - 0.5) * ch * 0.6;
      pt[i][j] = [Math.round(x), Math.round(y)];
    }
  }
  const plates: string[] = [];
  for (let i = 0; i < cols; i += 1) {
    for (let j = 0; j < rows; j += 1) {
      const [a, b, c, d] = [pt[i][j], pt[i + 1][j], pt[i + 1][j + 1], pt[i][j + 1]];
      plates.push(`M${a[0]} ${a[1]} L${b[0]} ${b[1]} L${c[0]} ${c[1]} L${d[0]} ${d[1]} Z`);
    }
  }
  const links: string[] = [];
  const nodes: [number, number][] = [];
  for (const j of litRows) links.push(pt.map((col) => col[j]).map(([x, y], k) => `${k ? "L" : "M"}${x} ${y}`).join(" "));
  for (const i of litCols) links.push(pt[i].map(([x, y], k) => `${k ? "L" : "M"}${x} ${y}`).join(" "));
  for (const j of litRows) for (const i of litCols) nodes.push(pt[i][j]);
  return { view: `0 0 ${w} ${h}`, plates, links, nodes };
}

/* Desktop: 9 x 5 plates over a 16:9 box. Phones: 4 x 8 over a tall box. */
export const LAKEFIELD_WIDE: LakeField = buildField(9, 5, 1600, 900, 20261007, [3], [2, 7]);
export const LAKEFIELD_TALL: LakeField = buildField(4, 8, 420, 900, 70226621, [5], [3]);
