import type { CSSProperties } from "react";

import { TILE_OCHRE, TILE_OCHRE_PLATE, TILE_PLATES } from "@/components/brand/DrylakeMark";

/*
 * The Drylake product environment: the quiet ground the Workspace and Admin canvases sit on
 * (polish brief 15 and 16). ONE primitive, two variants, so both products stay one family:
 *
 *   workspace  client-facing: a dot field, a horizon with a slightly lighter "sky" above it,
 *              and the tile's cracks drawn large and faint, its ochre plate barely tinted.
 *   admin      operational: a measured line grid (minor + major), the horizon as a ruler
 *              with ticks, the same cracks as construction lines with registration marks
 *              at their joints, ochre only on those marks.
 *
 * Background only. It is aria-hidden, takes no pointer events, sits behind the content
 * (z-index 0 inside an `isolate` parent) and is drawn with CSS backgrounds and one static
 * inline SVG: no image request, no JavaScript, no animation, no scroll listener. It scrolls
 * with the page and fades out below the header band, so long pages read as plain canvas
 * and every white card keeps its own opaque surface (contrast is decided by the cards).
 *
 * The geometry is the tile's own (TILE_PLATES), so the environment is the brand mark at
 * landscape scale, not a borrowed pattern. The ochre comes from TILE_OCHRE (never retyped).
 */

export type EnvironmentVariant = "workspace" | "admin";

/* Joints where three plates meet (tile coordinates): admin marks them like a survey. */
const JOINTS: Array<[number, number]> = [
  [44, 8],
  [40, 38],
  [46, 36],
  [42, 44],
  [48, 42],
  [56, 62],
  [70, 70],
  [92, 36],
];

export default function ProductEnvironment({ variant }: { variant: EnvironmentVariant }) {
  const admin = variant === "admin";

  return (
    <div
      aria-hidden="true"
      data-environment={variant}
      className="dl-env"
      style={{ "--dl-env-accent": TILE_OCHRE } as CSSProperties}
    >
      <div className="dl-env-field" />
      <div className="dl-env-horizon" />

      <svg className="dl-env-cracks" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" focusable="false">
        {TILE_PLATES.map((d, index) => (
          <path
            key={d}
            d={d}
            className={index === TILE_OCHRE_PLATE ? "dl-env-plate dl-env-plate-accent" : "dl-env-plate"}
            vectorEffect="non-scaling-stroke"
            strokeDasharray={admin && index !== TILE_OCHRE_PLATE ? "3 3" : undefined}
          />
        ))}

        {admin
          ? JOINTS.map(([x, y]) => (
              <g key={`${x}-${y}`} className="dl-env-joint">
                <circle cx={x} cy={y} r={0.9} vectorEffect="non-scaling-stroke" />
                <path d={`M${x - 2.4} ${y} H${x + 2.4} M${x} ${y - 2.4} V${y + 2.4}`} vectorEffect="non-scaling-stroke" />
              </g>
            ))
          : null}
      </svg>
    </div>
  );
}
