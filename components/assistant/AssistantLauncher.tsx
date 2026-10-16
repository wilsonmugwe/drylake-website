"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { usePathname } from "next/navigation";

/*
 * The floating launcher. Deliberately tiny: it is the ONLY assistant code in the page's initial
 * JavaScript. The chat panel (Turnstile, form, messages) is a dynamic import that starts loading
 * on first hover, focus or touch intent, and is required on click. Homepage budget:
 * tests/e2e/performance.spec.ts.
 *
 * It must never cover a control. Every frame that the page scrolls or resizes, it measures the
 * elements below (footer, submit buttons, anything marked data-assistant-avoid or a sticky CTA)
 * and, if one would sit under the button, lifts the button to rest just above it. Safe-area
 * insets are honoured through env(). Hidden on signed-in app areas, where there is no sales chat.
 */
const SIZE = 48;
const EDGE = 16;
const GAP = 12;
const AVOID =
  "footer a, footer button, button[type='submit'], form input:not([type='hidden']), form textarea, form select, a[href^='tel:'], a[href^='mailto:'], [data-assistant-avoid], [data-sticky-cta]";
/* Beyond this the button would float mid-page; it hides instead until the obstacle scrolls away. */
const MAX_LIFT_RATIO = 0.4;
const HIDDEN_PREFIXES = ["/admin", "/portal", "/client", "/sign-in", "/sign-up", "/consultation/manage"];

type PanelProps = { onClose: () => void; guided: boolean };

export default function AssistantLauncher({ guided }: { guided: boolean }) {
  const pathname = usePathname() ?? "/";
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [Panel, setPanel] = useState<ComponentType<PanelProps> | null>(null);
  const [open, setOpen] = useState(false);
  const [lift, setLift] = useState(0);
  const [suppressed, setSuppressed] = useState(false);
  const hidden = HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  const load = useCallback(() => {
    void import("./AssistantPanel").then((module) => setPanel(() => module.default));
  }, []);

  useEffect(() => {
    if (hidden) return;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const x1 = vw - EDGE;
      const x0 = x1 - SIZE;
      const rects = [...document.querySelectorAll(AVOID)]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh && r.right > x0 - GAP && r.left < x1 + GAP);
      let next = 0;
      let blocked = false;
      // A lifted button may land on another element, so settle over a few passes.
      for (let pass = 0; pass < 6; pass++) {
        const top = vh - EDGE - SIZE - next - GAP;
        const bottom = vh - EDGE - next + GAP;
        const hit = rects.filter((r) => r.top < bottom && r.bottom > top);
        blocked = hit.length > 0;
        if (!blocked) break;
        next = Math.max(next, vh - Math.min(...hit.map((r) => r.top)) - EDGE + GAP);
      }
      setLift(next);
      setSuppressed(blocked || next > vh * MAX_LIFT_RATIO);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [hidden, pathname]);

  if (hidden) return null;

  return (
    <>
      {!(open && Panel) && (
        <button
          ref={buttonRef}
          type="button"
          aria-label={guided ? "Chat with Drylake's assistant" : "Chat with Drylake's AI assistant"}
          aria-haspopup="dialog"
          data-assistant-launcher
          onPointerEnter={load}
          onFocus={load}
          onTouchStart={load}
          onClick={() => {
            load();
            setOpen(true);
          }}
          style={{
            right: `max(${EDGE}px, calc(env(safe-area-inset-right, 0px) + ${EDGE}px))`,
            bottom: `calc(env(safe-area-inset-bottom, 0px) + ${EDGE}px)`,
            width: SIZE,
            height: SIZE,
            transform: `translateY(${-lift}px)`,
            visibility: suppressed ? "hidden" : "visible",
          }}
          className="fixed z-40 flex items-center justify-center rounded-full border border-white/20 bg-ink text-white shadow-[0_8px_24px_-8px_rgba(11,11,10,0.6)] outline-none motion-safe:transition-transform motion-safe:duration-150 hover:bg-ink-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4581f]"
        >
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.6-.8L3 21l1.9-5.4A8.4 8.4 0 0 1 3 11.5 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z" />
          </svg>
        </button>
      )}
      {open && Panel && (
        <Panel
          guided={guided}
          onClose={() => {
            setOpen(false);
            // Return focus to the launcher once it has re-rendered.
            requestAnimationFrame(() => buttonRef.current?.focus());
          }}
        />
      )}
    </>
  );
}
