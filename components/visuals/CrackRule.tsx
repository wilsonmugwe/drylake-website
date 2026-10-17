import { LAKEBED_CONNECTIONS } from "@/components/visuals/lakebed-geometry";

/*
 * Crack divider (Exposed Ground, D54). Every section divider is the mark's own crack, enlarged:
 * the horizontal run through the tile (LAKEBED_CONNECTIONS "M4 49 L44 40" then "M44 40 L61 43.5
 * L96 34") is stretched across the width, with a short branch where the tile's cracks meet.
 * Server-rendered SVG, decorative (aria-hidden). Draws itself on entry where scroll-driven
 * animation exists (app/exposed-ground.css); otherwise it is simply there.
 *
 * `flip` mirrors the line so consecutive dividers do not repeat; `signal` lights the branch in
 * the action orange, used once per page at most (orange means act, or One system).
 */

/* Tile points (0..100) along the run, read from the geometry so the divider follows the mark. */
const RUN: readonly (readonly [number, number])[] = [
  [4, 49],
  [44, 40],
  [61, 43.5],
  [96, 34],
];
const BRANCH_FROM: readonly [number, number] = [44, 40];
const BRANCH_TO: readonly [number, number] = [55, 64];

/* Sanity: both segments exist in the mark's own crack list. */
export const CRACK_SOURCE = LAKEBED_CONNECTIONS.filter(
  (d) => d === "M4 49 L44 40" || d === "M44 40 L61 43.5 L96 34" || d === "M44 40 L55 64"
);

const W = 1000;
const H = 40;
const x = (v: number) => Math.round(((v - 4) / 92) * W * 10) / 10;
const y = (v: number) => Math.round(((v - 34) / 15) * (H * 0.5) * 10) / 10 + 4;

const RUN_D = RUN.map(([px, py], i) => `${i === 0 ? "M" : "L"}${x(px)} ${y(py)}`).join(" ");
const BRANCH_D = `M${x(BRANCH_FROM[0])} ${y(BRANCH_FROM[1])} L${x(BRANCH_TO[0])} ${H}`;

export default function CrackRule({
  flip = false,
  signal = false,
  className,
}: {
  flip?: boolean;
  signal?: boolean;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={["eg-crack", className].filter(Boolean).join(" ")}
      style={{ transform: flip ? "scaleX(-1)" : undefined, height: "clamp(24px, 3vw, 40px)" }}
    >
      <path d={RUN_D} pathLength={1} />
      <path d={BRANCH_D} pathLength={1} className={signal ? "eg-crack-signal" : undefined} />
    </svg>
  );
}
