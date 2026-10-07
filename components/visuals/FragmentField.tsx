import type { CSSProperties } from "react";

import { PROBLEM_FRAGMENTS, PROBLEM_LANES } from "@/components/visuals/horizon-geometry";

/*
 * The problem chapter's picture: twelve everyday work artefacts, scattered and tilted. Driven by
 * the --p of the surrounding ScrollProgress (0 = scattered, 1 = sorted into three lanes on
 * desktop, a 2 x 6 grid on phones). Sorted, but still separate: connecting them is the next
 * chapter. All movement is CSS calc() on translate/rotate in container units (app/public-site.css, DRYLAKE HORIZON).
 * Decorative; the figcaption says the same thing in words.
 */
export default function FragmentField() {
  return (
    <figure>
      <div aria-hidden="true" className="hz-frag-field relative h-[400px] sm:h-[440px] lg:h-[min(60vh,540px)]">
        <span className="hz-paper-grid absolute inset-0" />

        {PROBLEM_LANES.map((lane, i) => (
          <span key={lane} className="hz-lane hidden lg:block" style={{ top: `${24 + i * 28}%` }}>
            <span className="hz-lane-label">{lane}</span>
          </span>
        ))}

        {PROBLEM_FRAGMENTS.map((frag) => (
          <span
            key={frag.label}
            className="hz-chip"
            style={
              {
                "--msx": frag.m.sx,
                "--msy": frag.m.sy,
                "--mfx": frag.m.fx,
                "--mfy": frag.m.fy,
                "--lsx": frag.l.sx,
                "--lsy": frag.l.sy,
                "--lfx": frag.l.fx,
                "--lfy": frag.l.fy,
                "--r": frag.r,
              } as CSSProperties
            }
          >
            <span className="hz-chip-mark" />
            {frag.label}
          </span>
        ))}
      </div>

      <figcaption className="mt-5 max-w-md font-mono text-[0.68rem] uppercase leading-5 tracking-[0.1em] text-black/62">
        Spreadsheets, approvals, email, invoices, PDFs, payments, staff, the website. The pieces are
        all there. They just are not connected.
      </figcaption>
    </figure>
  );
}
