import type { CSSProperties } from "react";

import { LAKEFIELD_TALL, LAKEFIELD_WIDE, type LakeField as Field } from "@/components/visuals/lakebed-geometry";

/*
 * The lake bed behind the whole hero (composition pass, 2026-10-07): a cracked field of dark
 * plates that bleeds off every edge, so the headline is set ON the lake bed and the cracks run
 * around and under the type. Plates are a hair lighter than the ink (#141412 on #0b0b0a), so
 * white type keeps ~18:1 and the grey third line ~5:1. A few cracks light up as connections
 * when the tile (LakeBed) locks. Server-rendered SVG, sliced to cover; decorative.
 */
function FieldSvg({ field, className }: { field: Field; className: string }) {
  return (
    <svg viewBox={field.view} preserveAspectRatio="xMidYMid slice" className={className}>
      <g className="lf-plates">
        {field.plates.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      {field.links.map((d, i) => (
        <path key={d} d={d} pathLength={1} className="lf-link" style={{ "--i": i } as CSSProperties} />
      ))}
      {field.nodes.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="4" className="lf-node" />
      ))}
    </svg>
  );
}

export default function LakeField() {
  return (
    <div aria-hidden="true" className="lf pointer-events-none absolute inset-0 -z-10">
      <FieldSvg field={LAKEFIELD_WIDE} className="absolute inset-0 hidden h-full w-full sm:block" />
      <FieldSvg field={LAKEFIELD_TALL} className="absolute inset-0 h-full w-full sm:hidden" />
    </div>
  );
}
