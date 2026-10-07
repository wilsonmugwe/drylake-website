"use client";

import { useEffect, useRef, type CSSProperties } from "react";

import {
  HERO_FRAGMENTS,
  HERO_NOISE,
  HERO_SIGNAL,
  HERO_SIGNAL_X,
} from "@/components/visuals/horizon-geometry";

const LENS_RADIUS = 170;

const offset = (dx: number, dy: number, r: number, f = 1) =>
  `translate(${dx * f}px, ${dy * f}px) rotate(${r * f}deg)`;

/*
 * The hero horizon: one rule edge to edge. Left of the orange node, the workarounds: ticks at odd
 * heights, rotated and floating, with a few stray file names. Right of it, the system: an even
 * ruler. Decorative (aria-hidden); the headline carries the meaning.
 *
 * Enhancement, desktop only (fine pointer + hover + motion allowed): the pointer is a "clarity
 * lens". Noise near it straightens onto the line; move away and it drifts back. Styles are written
 * straight to the elements (no React re-render), rAF-throttled. Server markup is the full,
 * static picture, so nothing waits for JavaScript and the headline (LCP) is untouched.
 */
export default function HorizonField() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const field = ref.current;
    const hero = field?.closest("section");
    const capable =
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!field || !hero || !capable) {
      return;
    }

    const items = Array.from(field.querySelectorAll<HTMLElement>("[data-noise]"));
    let centres: number[] = [];
    let frame = 0;
    let pointerX: number | null = null;

    const measure = () => {
      centres = items.map((el) => {
        const box = el.getBoundingClientRect();
        return box.left + box.width / 2;
      });
    };

    const paint = () => {
      frame = 0;
      items.forEach((el, i) => {
        const f = pointerX === null ? 1 : Math.min(1, Math.abs(centres[i] - pointerX) / LENS_RADIUS);
        el.style.transform = offset(Number(el.dataset.dx), Number(el.dataset.dy), Number(el.dataset.r), f);
      });
    };

    const onMove = (event: PointerEvent) => {
      if (!centres.length) measure();
      pointerX = event.clientX;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      pointerX = null;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onResize = () => {
      centres = [];
    };

    field.dataset.lens = "on";
    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", onResize);

    return () => {
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className="hz-field relative h-[92px] sm:h-[112px] lg:h-[128px]">
      <span className="hz-horizon" />

      {HERO_NOISE.map((tick) => (
        <span
          key={`n${tick.x}`}
          data-noise=""
          data-dx={tick.dx}
          data-dy={tick.dy}
          data-r={tick.r}
          className="hz-tick hz-tick-noise"
          style={{ left: `${tick.x}%`, height: tick.h, opacity: tick.o, transform: offset(tick.dx, tick.dy, tick.r) }}
        />
      ))}

      {HERO_FRAGMENTS.map((frag, i) => (
        <span
          key={frag.label}
          data-noise=""
          data-dx={0}
          data-dy={frag.y}
          data-r={frag.r}
          className={`hz-fragment ${i > 1 ? "hidden sm:block" : ""}`}
          style={{ left: `${frag.x}%`, top: 10, transform: offset(0, frag.y, frag.r) }}
        >
          {frag.label}
        </span>
      ))}

      <span className="hz-node" style={{ left: `${HERO_SIGNAL_X}%` }} />

      {HERO_SIGNAL.map((tick, i) => (
        <span
          key={`s${tick.x}`}
          className="hz-tick hz-tick-signal"
          style={{ left: `${tick.x}%`, height: tick.h, ["--d" as string]: `${0.5 + i * 0.018}s` } as CSSProperties}
        />
      ))}

      <span className="hz-marker left-0">Fragmented</span>
      <span className="hz-marker right-0 text-right">Connected</span>
    </div>
  );
}
