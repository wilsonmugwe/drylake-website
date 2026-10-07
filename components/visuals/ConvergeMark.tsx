import type { CSSProperties } from "react";

import { BRAND_INK, TILE_OCHRE, TILE_OCHRE_PLATE, TILE_PLATES } from "@/components/brand/DrylakeMark";

/*
 * The phone hero picture (mobile refinement, 2026-10-07): FRAGMENTED -> CONNECTED in one still.
 * The five plates of the Drylake tile lie scattered on the left as dark shards (the parts of a
 * business, two carrying faint interface rows); orange paths leave each shard and converge on
 * one node, which runs into the assembled tile on the right: the same plates, now one system.
 *
 * Replaces the labelled lake-bed tile below 640 px only (Hero.tsx); tablet and desktop keep the
 * approved LakeBed. The markup IS the finished picture: the paths' one-off draw lives only in a
 * keyframe "from" (app/public-site.css, CONVERGE), so reduced motion and no-animation browsers
 * show the complete still. Server component, fixed aspect ratio (no layout shift), decorative.
 */

const VIEW_W = 360;
const VIEW_H = 300;

// Where each tile plate lies when fragmented: centre (x, y), rotation, and the plate's own
// centroid in tile space so it can be moved there. Order matches TILE_PLATES.
const SHARDS = [
  { x: 40, y: 50, r: -14, cx: 25, cy: 27, rows: 0 },
  { x: 130, y: 32, r: 9, cx: 69, cy: 22, rows: 2 },
  { x: 46, y: 192, r: 11, cx: 28, cy: 70, rows: 3 },
  { x: 116, y: 130, r: 19, cx: 72, cy: 53, rows: 0 },
  { x: 132, y: 250, r: -9, cx: 72, cy: 81, rows: 0 },
] as const;

const SHARD_SCALE = 0.95;
const NODE = { x: 208, y: 150 };
// The assembled tile (tile space 0..100) and the point where the line enters its left crack.
const TILE = { x: 236, y: 94, s: 1.12 };
const ENTRY = { x: TILE.x + 8 * TILE.s, y: NODE.y };

function shardTransform(s: (typeof SHARDS)[number]) {
  return `translate(${s.x} ${s.y}) rotate(${s.r}) scale(${SHARD_SCALE}) translate(${-s.cx} ${-s.cy})`;
}

function pathFrom(s: (typeof SHARDS)[number]) {
  const c1 = s.x + (NODE.x - s.x) * 0.55;
  return `M ${s.x} ${s.y} C ${c1} ${s.y} ${NODE.x - 30} ${NODE.y} ${NODE.x} ${NODE.y}`;
}

export default function ConvergeMark() {
  return (
    <div aria-hidden="true" className="cv relative w-full" style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}>
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <radialGradient id="cv-glow">
            <stop offset="0" style={{ stopColor: "var(--signal)", stopOpacity: 0.16 }} />
            <stop offset="1" style={{ stopColor: "var(--signal)", stopOpacity: 0 }} />
          </radialGradient>
        </defs>

        <circle cx={TILE.x + 50 * TILE.s} cy={TILE.y + 50 * TILE.s} r="104" fill="url(#cv-glow)" />

        {/* Paths first, so each one emerges from under its shard. */}
        {SHARDS.map((s, i) => (
          <path key={`p-${i}`} d={pathFrom(s)} pathLength={1} className="cv-path" style={{ "--i": i } as CSSProperties} />
        ))}
        <path d={`M ${NODE.x} ${NODE.y} H ${ENTRY.x}`} pathLength={1} className="cv-path cv-path-in" />

        {SHARDS.map((s, i) => (
          <g key={`s-${i}`} transform={shardTransform(s)}>
            <path d={TILE_PLATES[i]} className="cv-shard" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {Array.from({ length: s.rows }, (_, row) => (
              <rect key={row} x={s.cx - 12} y={s.cy - 6 + row * 6} width={row === s.rows - 1 ? 14 : 22} height="1.6" rx="0.8" className="cv-row" />
            ))}
          </g>
        ))}

        <g className="cv-node" transform={`translate(${NODE.x} ${NODE.y})`}>
          <circle r="7" className="cv-node-ring" />
          <circle r="3" className="cv-node-dot" />
        </g>

        <g transform={`translate(${TILE.x} ${TILE.y}) scale(${TILE.s})`}>
          <rect x="4" y="4" width="92" height="92" rx="18" fill="#141412" />
          {TILE_PLATES.map((d, i) => (
            <path
              key={d}
              d={d}
              fill={i === TILE_OCHRE_PLATE ? TILE_OCHRE : BRAND_INK.dark}
              stroke="#0b0b0a"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />
          ))}
        </g>
      </svg>

      <span className="cv-label" style={{ left: `${((TILE.x + 50 * TILE.s) / VIEW_W) * 100}%`, top: `${((TILE.y + 100 * TILE.s + 14) / VIEW_H) * 100}%` }}>
        <span className="cv-label-dot" />
        One system
      </span>
    </div>
  );
}
