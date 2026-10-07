"use client";

import { useCallback, useEffect, useRef } from "react";
import { ArrowUpRight, X } from "lucide-react";

import BrandHomeLink from "@/components/brand/BrandHomeLink";
import ClientAccessLink from "@/components/navigation/ClientAccessLink";
import SiteLink from "@/components/navigation/SiteLink";
import Container from "@/components/ui/Container";
import { ENTITY } from "@/lib/discovery/entity";
import { PRIMARY_CTA, PRIMARY_NAV } from "@/lib/navigation/site-nav";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/*
 * Full-screen mobile navigation, designed as its own screen rather than a dropdown.
 * Modal dialog semantics: focus moves in on open, Tab is trapped, Escape and the Close
 * button close it and return focus to the Menu button, and the page behind cannot scroll.
 * Choosing a destination closes the menu in the same click that navigates or scrolls, so
 * there is no timer and no visible jump.
 */
export default function MobileMenu({
  onClose,
  onNavigate,
}: {
  onClose: () => void;
  onNavigate: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousOverflowRef = useRef("");

  /*
   * Release the scroll lock in the same click, BEFORE SiteLink scrolls. Measured on a 390 px
   * viewport: a section scroll started while <html> still had overflow: hidden landed 59 px
   * short of its scroll-margin. Unmount cleanup restores the same value again (idempotent).
   */
  const handleNavigate = useCallback(() => {
    document.documentElement.style.overflow = previousOverflowRef.current;
    onNavigate();
  }, [onNavigate]);

  useEffect(() => {
    const panel = panelRef.current;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    previousOverflowRef.current = previousOverflow;

    // Lock the page behind. overflow only (no position: fixed trick), so the scroll
    // position is never rewritten when the menu closes.
    root.style.overflow = "hidden";
    panel?.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panel) {
        return;
      }

      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (item) => item.offsetParent !== null
      );
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    // The menu is a mobile surface: close it if the viewport grows to desktop.
    const desktop = window.matchMedia("(min-width: 1024px)");
    function onDesktop(event: MediaQueryListEvent) {
      if (event.matches) onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onDesktop);

    return () => {
      root.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onDesktop);
    };
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      id="mobile-navigation"
      role="dialog"
      aria-modal="true"
      aria-label="Site navigation"
      className="mobile-menu lg:hidden"
    >
      <Container className="flex h-[var(--nav-h)] shrink-0 items-center justify-between">
        <BrandHomeLink onNavigate={handleNavigate} />

        <button
          type="button"
          data-autofocus
          onClick={onClose}
          className="flex min-h-[44px] items-center gap-2 pl-3 text-sm font-medium text-white/80"
        >
          Close
          <X aria-hidden="true" size={18} />
        </button>
      </Container>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <Container className="flex flex-1 flex-col pb-8 pt-6">
          <nav aria-label="Mobile navigation">
            <ul className="border-t border-white/10">
              {PRIMARY_NAV.map((item, index) => (
                <li
                  key={item.label}
                  className="mobile-menu-item border-b border-white/10"
                  style={{ ["--i" as string]: index }}
                >
                  <SiteLink
                    href={item.href}
                    onNavigate={handleNavigate}
                    className="group flex min-h-[68px] items-center justify-between gap-4 py-3"
                  >
                    <span className="flex items-baseline gap-4">
                      <span className="font-mono text-[0.7rem] text-white/45">0{index + 1}</span>
                      <span className="text-[2rem] font-semibold leading-none tracking-[-0.05em] text-white">
                        {item.label}
                      </span>
                    </span>
                    <ArrowUpRight aria-hidden="true" size={20} className="text-white/35 transition-colors group-hover:text-[#f26a2e]" />
                  </SiteLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mobile-menu-item mt-auto pt-10" style={{ ["--i" as string]: PRIMARY_NAV.length }}>
            <ClientAccessLink
              onNavigate={handleNavigate}
              className="flex min-h-[52px] items-center justify-between px-1 text-base font-medium text-white/75"
            >
              {(label) => (
                <>
                  {label}
                  <ArrowUpRight aria-hidden="true" size={17} className="text-white/40" />
                </>
              )}
            </ClientAccessLink>

            <SiteLink
              href={PRIMARY_CTA.href}
              onNavigate={handleNavigate}
              className="btn-signal mt-3 w-full !min-h-[60px] !text-base"
            >
              <span>{PRIMARY_CTA.label}</span>
              <ArrowUpRight aria-hidden="true" size={18} />
            </SiteLink>

            <div className="mt-8 flex items-center justify-between gap-4 border-t border-white/10 pt-5 text-xs text-white/55">
              <a href={`mailto:${ENTITY.email}`} className="inline-flex min-h-[44px] items-center">
                {ENTITY.email}
              </a>
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
                {ENTITY.locality}, {ENTITY.regionCode}
              </span>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
}
