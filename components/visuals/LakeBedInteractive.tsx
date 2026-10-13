"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { LAKEBED_EXPLANATIONS, LAKEBED_PHONE_VIEW, LAKEBED_PLATES, lakebedPct, viewPct } from "@/components/visuals/lakebed-geometry";

/*
 * Interaction layer for the hero lake bed (final corrections, 2026-10-13). The picture itself stays
 * the server-rendered <LakeBed> passed in as children; this island adds one transparent button per
 * plate on top of it and sets data-active on its wrapper. CSS (app/public-site.css, LAKE BED
 * INTERACTION) dims the other cracks and labels, so the selected plate's connections stand out.
 * Nothing moves and no geometry changes: the resting picture is pixel-identical to before.
 *
 *   mouse     hover selects, leaving clears
 *   keyboard  Tab focuses a plate and selects it, Escape clears
 *   touch     tap selects, tapping elsewhere clears
 *
 * The short explanation appears where the caption sits (tile) or in a line under the tiles (phone).
 * Contract: active is null or an index into LAKEBED_PLATES; at most one plate is ever selected.
 */
type Variant = "tile" | "phone";

/* Hit area per plate, in tile units, centred on the plate's label. Sized so no two overlap. */
const HIT_W = 30;
const HIT_H = 18;

export default function LakeBedInteractive({
  variant = "tile",
  caption,
  children,
}: {
  variant?: Variant;
  /* The resting caption (tile only); the explanation replaces it while a plate is selected. */
  caption?: ReactNode;
  children: ReactNode;
}) {
  const [active, setActive] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const phone = variant === "phone";
  const pct = (v: number) => (phone ? viewPct(v, LAKEBED_PHONE_VIEW) : lakebedPct(v));
  const unit = phone ? 100 / LAKEBED_PHONE_VIEW.size : 100 / 112;

  // Touch has no hover or blur on iOS: a tap anywhere outside the picture clears the selection.
  useEffect(() => {
    if (active === null) return;
    const onDown = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setActive(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [active]);

  const explanation =
    active === null ? null : (
      <>
        <span className="text-white/85">{LAKEBED_PLATES[active].label}.</span> {LAKEBED_EXPLANATIONS[active]}
      </>
    );

  return (
    <>
      <div
        ref={root}
        className={phone ? "lb-ix relative" : "lb-tile lb-ix relative"}
        data-active={active ?? undefined}
        onKeyDown={(event) => {
          if (event.key === "Escape") setActive(null);
        }}
      >
        {children}

        <div role="group" aria-label="How the parts of a business connect" className="lb-hits absolute inset-0">
          {LAKEBED_PLATES.map((plate, i) => (
            <button
              key={plate.label}
              type="button"
              className="lb-hit"
              aria-pressed={active === i}
              aria-describedby={`${baseId}-${i}`}
              style={
                {
                  left: `${pct(plate.lx)}%`,
                  top: `${pct(plate.ly)}%`,
                  width: `${HIT_W * unit}%`,
                  height: `${HIT_H * unit}%`,
                } as CSSProperties
              }
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") setActive(i);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === "mouse") setActive(null);
              }}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(i)}
            >
              <span className="sr-only">{plate.label}</span>
            </button>
          ))}
          {/* Descriptions sit outside the buttons, so each button's name stays just its label. */}
          {LAKEBED_EXPLANATIONS.map((text, i) => (
            <span key={text} id={`${baseId}-${i}`} className="sr-only">
              {text}
            </span>
          ))}
        </div>
      </div>

      {phone ? (
        <p aria-hidden="true" className="lb-explain font-mono text-[0.68rem] uppercase leading-[1.6] tracking-[0.1em] text-white/60">
          {explanation}
        </p>
      ) : (
        <figcaption className="lb-caption font-mono text-[0.62rem] uppercase leading-[1.6] tracking-[0.1em] text-white/60 sm:text-[0.68rem]">
          {explanation ?? caption}
        </figcaption>
      )}
    </>
  );
}
