"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/*
 * Marks a wrapper data-inview="false" once mounted below the fold, then "true" when it
 * scrolls into view, so CSS (.dl-draw-view, .dl-fade-view) can draw the Drylake Line on
 * arrival. Server HTML carries no attribute, which CSS treats as "already drawn": without
 * JavaScript, or under reduced motion, everything is simply visible. One observer per
 * wrapper, disconnected after the first reveal (nothing re-animates on scroll back).
 */
export default function InView({
  as: Tag = "div",
  className,
  children,
  threshold = 0.25,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  threshold?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;

    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const rect = node.getBoundingClientRect();

    // Already on screen at mount: leave it drawn, no flash.
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      return;
    }

    node.dataset.inview = "false";

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          node.dataset.inview = "true";
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [threshold]);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
