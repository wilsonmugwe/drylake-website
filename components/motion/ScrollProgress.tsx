"use client";

import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from "react";

/*
 * Writes one custom property, --p (0..1), on its element: how far the visitor has scrolled
 * through it. CSS does the rest with calc() on translate/rotate/opacity/scale, so a story
 * moment costs one style write per frame and no animation library.
 *
 * Two readings of "through it":
 *   - pinned (viewport >= pinFrom px wide): the element is a tall track holding a sticky stage.
 *     p = 0 when its top reaches `start` of the viewport, 1 when its bottom reaches the bottom.
 *   - pass (narrower screens): p = 0 when its top is at `passStart` of the viewport height
 *     (default 90%), 1 when its top reaches `end` (default 25%; negative = above the viewport).
 *
 * `finish` (default 1) compresses either range: with finish 0.5 the story is resolved halfway
 * through it and holds that state for the rest (experience polish: resolve early, stay resolved).
 *
 * `rest` is the value rendered by the server, used without JavaScript and kept under
 * prefers-reduced-motion (the listener never attaches): each stage must read well at rest.
 * Listeners run only while the element is near the viewport (IntersectionObserver).
 */
export default function ScrollProgress({
  as: Tag = "div",
  className,
  children,
  rest,
  pinFrom = 1024,
  start = 0.25,
  passStart = 0.9,
  end = 0.25,
  finish = 1,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  rest: number;
  pinFrom?: number;
  start?: number;
  passStart?: number;
  end?: number;
  /* Fraction of the range at which --p reaches 1 (then holds): a story resolves early and stays resolved. */
  finish?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;

    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight;
      const pinned = window.innerWidth >= pinFrom && rect.height > vh * 1.2;

      const raw = pinned
        ? (vh * start - rect.top) / (rect.height - vh + vh * start)
        : (vh * passStart - rect.top) / (vh * passStart - vh * end);

      node.style.setProperty("--p", Math.min(1, Math.max(0, raw / finish)).toFixed(4));
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    let listening = false;
    const listen = (on: boolean) => {
      if (on === listening) return;
      listening = on;
      const method = on ? "addEventListener" : "removeEventListener";
      window[method]("scroll", schedule, { passive: true } as AddEventListenerOptions);
      window[method]("resize", schedule);
      if (on) schedule();
    };

    // Measure once now (no flash for a stage already on screen), then only while near view.
    update();
    const observer = new IntersectionObserver((entries) => listen(entries.some((e) => e.isIntersecting)), {
      rootMargin: "25% 0px",
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
      listen(false);
      cancelAnimationFrame(frame);
    };
  }, [pinFrom, start, passStart, end, finish]);

  return (
    <Tag ref={ref} className={className} style={{ "--p": rest } as CSSProperties}>
      {children}
    </Tag>
  );
}
