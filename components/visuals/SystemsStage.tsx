import type { CSSProperties } from "react";

import DrylakeWordmark from "@/components/brand/DrylakeWordmark";
import { SYSTEM_NODES, SYSTEM_WORKAROUNDS } from "@/components/visuals/horizon-geometry";

/*
 * The signature moment: the systems a business runs, first scattered and held together by dashed
 * workarounds ("copy → paste", "export.csv"), then resolved onto one spine with the Drylake
 * lockup at the junction. Driven by --p from the surrounding ScrollProgress:
 *   p 0.00-0.34  nodes travel (eased) from scattered to their place; workarounds fade by 0.30
 *   p 0.34-0.48  rest: arranged, not yet connected (mobile refinement 2026-10-07)
 *   p 0.48-0.82  the spine draws, then each system's drop connects
 *   p 0.74-1.00  the hub settles and status dots turn on
 * Desktop: horizontal spine, four systems above, four below. Phones: vertical spine, two columns.
 * Pure markup + CSS (app/public-site.css, DRYLAKE HORIZON); decorative, the caption below says it in words.
 */
export default function SystemsStage() {
  return (
    <div aria-hidden="true" className="hz-sys relative h-[470px] sm:h-[520px] lg:h-[min(64vh,600px)]">
      {/* Workarounds between scattered systems (desktop only). */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="hz-workarounds absolute inset-0 hidden h-full w-full lg:block">
        {SYSTEM_WORKAROUNDS.map(({ from, to }) => {
          const a = SYSTEM_NODES[from].d;
          const b = SYSTEM_NODES[to].d;
          const cx = (a.sx + b.sx) / 2 + 10;
          const cy = (a.sy + b.sy) / 2 - 12;
          return (
            <path
              key={`${from}-${to}`}
              d={`M ${a.sx} ${a.sy} Q ${cx} ${cy} ${b.sx} ${b.sy}`}
              fill="none"
              stroke="rgba(255,255,255,0.42)"
              strokeWidth="1"
              strokeDasharray="3 5"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      {SYSTEM_WORKAROUNDS.map(({ from, to, note }) => {
        const a = SYSTEM_NODES[from].d;
        const b = SYSTEM_NODES[to].d;
        return (
          <span
            key={note}
            className="hz-workaround-note hidden lg:block"
            style={{ left: `${(a.sx + b.sx) / 2 + 5}%`, top: `${(a.sy + b.sy) / 2 - 6}%` }}
          >
            {note}
          </span>
        );
      })}

      {/* The spine: horizontal from lg, vertical below. */}
      <span className="hz-spine hz-spine-x hidden lg:block" />
      <span className="hz-spine hz-spine-y lg:hidden" />

      {SYSTEM_NODES.map((node) => (
        <span key={`drop-${node.label}`}>
          <span
            className="hz-drop hz-drop-v hidden lg:block"
            style={{
              left: `${node.d.fx}%`,
              top: `${Math.min(node.d.fy, 50)}%`,
              height: `${Math.abs(node.d.fy - 50)}%`,
              transformOrigin: node.d.fy < 50 ? "bottom" : "top",
            }}
          />
          <span
            className="hz-drop hz-drop-h lg:hidden"
            style={{
              top: `${node.m.fy}%`,
              left: `${Math.min(node.m.fx, 50)}%`,
              width: `${Math.abs(node.m.fx - 50)}%`,
              transformOrigin: node.m.fx < 50 ? "right" : "left",
            }}
          />
        </span>
      ))}

      <span className="hz-hub">
        <DrylakeWordmark lockup tone="dark" surface="#121210" height={20} label={null} />
      </span>

      {SYSTEM_NODES.map((node) => (
        <span
          key={node.label}
          className="hz-sys-node"
          style={
            {
              "--msx": node.m.sx,
              "--msy": node.m.sy,
              "--mfx": node.m.fx,
              "--mfy": node.m.fy,
              "--mr": node.m.r,
              "--dsx": node.d.sx,
              "--dsy": node.d.sy,
              "--dfx": node.d.fx,
              "--dfy": node.d.fy,
              "--dr": node.d.r,
            } as CSSProperties
          }
        >
          <span className="hz-status" />
          {node.label}
        </span>
      ))}
    </div>
  );
}
