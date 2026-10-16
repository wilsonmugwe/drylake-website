"use client";

import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import SiteLink from "@/components/navigation/SiteLink";
import type { ServicesMenuData } from "@/lib/navigation/site-nav";

/* Hover intent: open after a short dwell, close after a short grace, so a diagonal move to the
   panel or a graze past the label does not flicker it. Touch and keyboard use the button. */
const OPEN_DELAY_MS = 120;
const CLOSE_DELAY_MS = 180;

/*
 * Desktop Services dropdown, built as a disclosure (button + panel of links), not an ARIA menu:
 * the panel holds ordinary links, so Tab walks through them and screen readers keep link semantics.
 *   - Enter / Space (native button click) toggles; ArrowDown opens and focuses the first link.
 *   - Escape closes and returns focus to the button, wherever focus is inside.
 *   - Focus leaving the whole control closes it (Tab out), so it never traps or lingers.
 *   - Choosing a link closes it before SiteLink navigates (same click, no timer).
 * The links are menu.links, derived from the services data.
 */
export default function ServicesMenu({ menu }: { menu: ServicesMenuData }) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLLIElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const schedule = useCallback(
    (next: boolean, delay: number) => {
      clearTimer();
      timerRef.current = setTimeout(() => setOpen(next), delay);
    },
    [clearTimer]
  );

  useEffect(() => clearTimer, [clearTimer]);

  // Click or tap outside closes it (touch laptops, stuck hover).
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function focusFirstLink() {
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("a")?.focus());
  }

  function onKeyDown(event: KeyboardEvent<HTMLLIElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      clearTimer();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === "ArrowDown" && event.target === buttonRef.current) {
      event.preventDefault();
      clearTimer();
      setOpen(true);
      focusFirstLink();
    }
  }

  return (
    <li
      ref={rootRef}
      className="relative"
      onKeyDown={onKeyDown}
      onMouseEnter={() => schedule(true, OPEN_DELAY_MS)}
      onMouseLeave={() => schedule(false, CLOSE_DELAY_MS)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          clearTimer();
          setOpen((value) => !value);
        }}
        className="nav-link gap-1.5"
      >
        {menu.label}
        <ChevronDown
          aria-hidden="true"
          size={14}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        className="services-menu-panel absolute left-1/2 top-full z-10 w-[19rem] -translate-x-1/2 pt-2"
      >
        <div className="rounded-lg border border-white/12 bg-[#0b0b0a]/95 p-2 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          <p className="px-3 pb-1 pt-2 text-xs leading-5 text-white/60">{menu.descriptor}</p>

          <ul>
            {menu.links.map((link, index) => {
              const isAll = index === menu.links.length - 1;

              return (
                <li key={link.href + link.label}>
                  <SiteLink
                    href={link.href}
                    onNavigate={() => setOpen(false)}
                    className={`flex min-h-[44px] items-center rounded-md px-3 text-sm transition-colors hover:bg-white/8 hover:text-white ${
                      isAll ? "mt-1 border-t border-white/10 font-medium text-white" : "text-white/75"
                    }`}
                  >
                    {link.label}
                  </SiteLink>
                </li>
              );
            })}
          </ul>

          <p className="border-t border-white/10 px-3 pb-2 pt-3 text-xs leading-5 text-white/55">
            {menu.solutionsHint}
          </p>
        </div>
      </div>
    </li>
  );
}
