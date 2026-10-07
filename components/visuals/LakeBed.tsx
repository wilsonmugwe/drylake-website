import type { CSSProperties } from "react";

import { BRAND_INK, TILE_OCHRE, TILE_OCHRE_PLATE, TILE_PLATES } from "@/components/brand/DrylakeMark";
import {
  LAKEBED_CONNECTIONS,
  LAKEBED_JUNCTIONS,
  LAKEBED_PLATES,
  LAKEBED_VIEW,
  LAKEBED_WORKAROUNDS,
  lakebedPct,
} from "@/components/visuals/lakebed-geometry";

/*
 * The hero picture (experience polish, 2026-10-07): the Drylake tile at poster scale, broken
 * apart. Its five plates are the parts of an ordinary business; the cracks carry the workarounds
 * holding them together today. One finite CSS timeline (app/public-site.css, LAKE BED): the plates
 * lock together, each workaround is struck through, the cracks light up as connections and the
 * ochre plate turns on as "One system". It comes to rest as the Drylake mark.
 *
 * Server component, no client JavaScript. The markup IS the resolved state (fill attributes,
 * zero offsets); the broken state exists only inside the keyframes' "from", so reduced motion
 * and no-CSS-animation browsers show the finished, readable mark. Decorative: the figcaption
 * beside it carries the meaning in words. Never the LCP element: the h1 is larger and static.
 */
export default function LakeBed({ surface = "#0b0b0a" }: { surface?: string }) {
  return (
    <div aria-hidden="true" className="lb relative aspect-square w-full">
      <svg viewBox={LAKEBED_VIEW} className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <clipPath id="lb-tile" clipPathUnits="userSpaceOnUse">
            <rect x="4" y="4" width="92" height="92" rx="18" />
          </clipPath>
        </defs>

        {TILE_PLATES.map((d, i) => {
          const plate = LAKEBED_PLATES[i];
          return (
            <g key={d} className="lb-plate" style={{ "--dx": `${plate.dx}px`, "--dy": `${plate.dy}px`, "--r": `${plate.r}deg`, "--i": i } as CSSProperties}>
              <path
                d={d}
                clipPath="url(#lb-tile)"
                className={i === TILE_OCHRE_PLATE ? "lb-fill lb-fill-ochre" : "lb-fill"}
                fill={i === TILE_OCHRE_PLATE ? TILE_OCHRE : BRAND_INK.dark}
                stroke={surface}
                strokeWidth="4.5"
                strokeLinejoin="round"
              />
            </g>
          );
        })}

        <g clipPath="url(#lb-tile)">
          {LAKEBED_CONNECTIONS.map((d, i) => (
            <path
              key={d}
              d={d}
              pathLength={1}
              className="lb-link"
              style={{ "--i": i } as CSSProperties}
              fill="none"
              strokeWidth="0.42"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>

        {LAKEBED_JUNCTIONS.map(([x, y]) => (
          <g key={`${x}-${y}`} className="lb-node" transform={`translate(${x} ${y})`}>
            <circle r="2.6" fill={surface} />
            <circle r="1.3" className="lb-node-dot" />
          </g>
        ))}
      </svg>

      {/* Labels in HTML (crisp type at every size), placed in the SVG's coordinate space. */}
      <div className="lb-labels absolute inset-0">
        {LAKEBED_PLATES.map((plate, i) => (
          <span
            key={plate.label}
            className={i === TILE_OCHRE_PLATE ? "lb-label lb-label-ochre" : "lb-label"}
            style={
              {
                left: `${lakebedPct(plate.lx)}%`,
                top: `${lakebedPct(plate.ly)}%`,
                "--dx": plate.dx,
                "--dy": plate.dy,
                "--i": i,
              } as CSSProperties
            }
          >
            {i === TILE_OCHRE_PLATE && <span className="lb-status" />}
            {plate.label}
          </span>
        ))}

        {LAKEBED_WORKAROUNDS.map((note, i) => (
          <span
            key={note.text}
            className="lb-note"
            style={{ left: `${lakebedPct(note.x)}%`, top: `${lakebedPct(note.y)}%`, "--i": i, "--rot": `${note.rot}deg` } as CSSProperties}
          >
            {note.text}
          </span>
        ))}
      </div>
    </div>
  );
}
