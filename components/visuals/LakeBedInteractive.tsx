"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { X } from "lucide-react";

import { TILE_PLATES } from "@/components/brand/DrylakeMark";
import {
  LAKEBED_PHONE_VIEW,
  LAKEBED_PLATES,
  LAKEBED_POPOVERS,
  LAKEBED_TILE_VIEW,
  platePolygon,
  viewPct,
} from "@/components/visuals/lakebed-geometry";

/*
 * Interaction layer for the hero lake bed. The picture itself stays the server-rendered <LakeBed>
 * passed in as children; this island adds one button per plate on top of it, clipped to that
 * plate's own outline, so the whole plate is the target.
 *
 * Homepage clarity (2026-10-10): selecting a plate opens a small card beside it (the problem, and
 * how we help) on the same page: no navigation, no URL change, no modal. The cards use the native
 * Popover API (popover="auto"), which puts them in the top layer, so the hero's overflow never
 * clips them, and gives us, from the browser:
 *   click the plate again   closes it          click outside   closes it
 *   Escape                  closes it, focus back on the plate
 *   another plate           closes the first: only one auto popover is ever open
 * We only position the card (above the plate's label, or below when there is no room, always
 * clamped inside the viewport) and mirror which one is open into data-active for the CSS.
 *
 * Hover and focus still light a plate's connections (data-active) without opening anything, so
 * the resting picture and its hover effect are unchanged. Contract: at most one plate is open.
 */
type Variant = "tile" | "phone";

/* The focus ring / popover anchor around each plate's label, in tile units. */
const MARK_W = 30;
const MARK_H = 18;
/* Space kept between the card and the viewport edge, and between the card and its plate. */
const EDGE = 12;
const GAP = 10;

function place(card: HTMLElement, anchor: HTMLElement) {
  const a = anchor.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const w = card.offsetWidth;
  const h = card.offsetHeight;
  const left = Math.min(Math.max(a.left + a.width / 2 - w / 2, EDGE), Math.max(vw - w - EDGE, EDGE));
  const above = a.top - GAP - h;
  const below = a.bottom + GAP;
  // Above the plate by default; below it when above would leave the viewport but below fits.
  const side = above < EDGE && below + h <= vh - EDGE ? "below" : "above";
  card.style.left = `${Math.round(left)}px`;
  card.style.top = `${Math.round(side === "above" ? Math.max(above, EDGE) : below)}px`;
  card.dataset.side = side;
}

export default function LakeBedInteractive({
  variant = "tile",
  caption,
  children,
}: {
  variant?: Variant;
  /* The resting caption (tile only). */
  caption?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const marks = useRef<(HTMLSpanElement | null)[]>([]);
  const baseId = useId().replace(/:/g, "");
  const phone = variant === "phone";
  const view = phone ? LAKEBED_PHONE_VIEW : LAKEBED_TILE_VIEW;
  const pct = (v: number) => viewPct(v, view);
  const unit = 100 / view.size;

  const reposition = useCallback(() => {
    if (open === null) return;
    const card = cards.current[open];
    const mark = marks.current[open];
    if (card && mark) place(card, mark);
  }, [open]);

  // Mirror the browser's open/closed state (it owns light dismiss and Escape).
  useEffect(() => {
    const els = cards.current;
    const handlers = els.map((card, i) => {
      if (!card) return null;
      const onToggle = (event: Event) => {
        const next = (event as ToggleEvent).newState === "open";
        setOpen((current) => (next ? i : current === i ? null : current));
      };
      const onBeforeToggle = (event: Event) => {
        const mark = marks.current[i];
        if ((event as ToggleEvent).newState === "open" && mark) {
          // Measured before the first paint, so the card never flashes in the wrong place.
          requestAnimationFrame(() => place(card, mark));
        }
      };
      card.addEventListener("toggle", onToggle);
      card.addEventListener("beforetoggle", onBeforeToggle);
      return { card, onToggle, onBeforeToggle };
    });
    return () => {
      for (const h of handlers) {
        if (!h) continue;
        h.card.removeEventListener("toggle", h.onToggle);
        h.card.removeEventListener("beforetoggle", h.onBeforeToggle);
      }
    };
  }, []);

  // The card follows its plate while the page scrolls or resizes.
  useEffect(() => {
    if (open === null) return;
    reposition();
    let frame = 0;
    const onMove = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(reposition);
    };
    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("resize", onMove);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onMove);
      window.removeEventListener("resize", onMove);
    };
  }, [open, reposition]);

  const active = open ?? hovered;

  return (
    <>
      <div
        className={phone ? "lb-ix relative" : "lb-tile lb-ix relative"}
        data-active={active ?? undefined}
        data-open={open ?? undefined}
      >
        {children}

        <div
          role="group"
          aria-label="Common business problems. Select one to see how we help."
          className="lb-hits absolute inset-0"
        >
          {LAKEBED_PLATES.map((plate, i) => {
            const cardId = `${baseId}-card-${i}`;
            return (
              <button
                key={plate.label}
                type="button"
                className="lb-hit"
                popoverTarget={cardId}
                aria-expanded={open === i}
                aria-controls={cardId}
                style={{ clipPath: platePolygon(TILE_PLATES[i], view) } as CSSProperties}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") setHovered(i);
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType === "mouse") setHovered(null);
                }}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
              >
                <span
                  ref={(el) => {
                    marks.current[i] = el;
                  }}
                  aria-hidden="true"
                  className="lb-hit-mark"
                  style={{
                    left: `${pct(plate.lx)}%`,
                    top: `${pct(plate.ly)}%`,
                    width: `${MARK_W * unit}%`,
                    height: `${MARK_H * unit}%`,
                  }}
                />
                <span className="sr-only">{plate.label}</span>
              </button>
            );
          })}
        </div>

        {/* Each card follows its button in the DOM, so Tab moves from a plate into its open card. */}
        {LAKEBED_PLATES.map((plate, i) => {
          const cardId = `${baseId}-card-${i}`;
          const titleId = `${cardId}-title`;
          const copy = LAKEBED_POPOVERS[i];
          return (
            <div
              key={plate.label}
              ref={(el) => {
                cards.current[i] = el;
              }}
              id={cardId}
              popover="auto"
              role="dialog"
              aria-labelledby={titleId}
              className="lb-pop"
            >
              <div className="flex items-start justify-between gap-4">
                <p id={titleId} className="lb-pop-title">
                  {i === 3 && <span aria-hidden="true" className="lb-pop-dot" />}
                  {plate.label}
                </p>
                <button
                  type="button"
                  className="lb-pop-close"
                  popoverTarget={cardId}
                  popoverTargetAction="hide"
                  aria-label={`Close ${plate.label}`}
                >
                  <X aria-hidden="true" size={14} />
                </button>
              </div>

              <dl className="mt-3 grid gap-3">
                <div>
                  <dt className="lb-pop-kicker">The problem</dt>
                  <dd className="lb-pop-text">{copy.problem}</dd>
                </div>
                <div className="lb-pop-help">
                  <dt className="lb-pop-kicker lb-pop-kicker-help">How we help</dt>
                  <dd className="lb-pop-text text-white/88">{copy.help}</dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>

      {phone ? (
        <p className="lb-explain font-mono text-[0.68rem] uppercase leading-[1.6] tracking-[0.1em] text-white/60">
          Tap a tile to see how we help.
        </p>
      ) : (
        <figcaption className="lb-caption font-mono text-[0.62rem] uppercase leading-[1.6] tracking-[0.1em] text-white/60 sm:text-[0.68rem]">
          {caption}
          <span className="lb-hint mt-1 block text-white/50">Select a tile to see how we help.</span>
        </figcaption>
      )}
    </>
  );
}
