"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Show, UserButton } from "@clerk/nextjs";

import BrandHomeLink from "@/components/brand/BrandHomeLink";
import MobileMenu from "@/components/layout/MobileMenu";
import SkipLink from "@/components/layout/SkipLink";
import ClientAccessLink from "@/components/navigation/ClientAccessLink";
import SiteLink from "@/components/navigation/SiteLink";
import Container from "@/components/ui/Container";
import { HOME_PATH, PRIMARY_CTA, PRIMARY_NAV } from "@/lib/navigation/site-nav";

/*
 * Public header. Fixed, so it stays reachable; transparent over the dark homepage hero and
 * a compact blurred bar once the page scrolls (or from the start on every other route).
 * Scroll state comes from an IntersectionObserver on a sentinel at the top of the document,
 * not a scroll listener.
 *
 * Hierarchy: Drylake (identity, home) / What We Do, Our Approach, About, Contact
 * (exploration) / Client Login (existing-client utility) / Start a Conversation (the one
 * primary action, in signal orange).
 */
export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const tone = pathname === HOME_PATH ? "clear" : "solid";

  // Stable identities: MobileMenu's lock/focus effect depends on them.
  const closeMenu = useCallback(() => {
    setOpen(false);
    toggleRef.current?.focus({ preventScroll: true });
  }, []);
  const closeForNavigation = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <SkipLink />

      {/* Top-of-document sentinel: out of view = the page has scrolled. */}
      <div ref={sentinelRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-8 w-px" />

      <header className="site-header" data-tone={tone} data-scrolled={scrolled ? "true" : "false"}>
        <Container className="h-full">
          <nav aria-label="Primary navigation" className="flex h-full items-center justify-between gap-6">
            <BrandHomeLink />

            {/* Desktop: exploration links */}
            <ul className="hidden items-center gap-7 lg:flex xl:gap-9">
              {PRIMARY_NAV.map((item) => (
                <li key={item.label}>
                  <SiteLink href={item.href} className="nav-link">
                    {item.label}
                  </SiteLink>
                </li>
              ))}
            </ul>

            {/* Desktop: utility + primary action */}
            <div className="hidden items-center gap-5 lg:flex">
              <ClientAccessLink className="nav-link !text-[0.82rem]" />

              <Show when="signed-in">
                <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
              </Show>

              <span aria-hidden="true" className="h-5 w-px bg-white/15" />

              <SiteLink href={PRIMARY_CTA.href} className="btn-signal !min-h-[44px] !text-[0.85rem]">
                <span>{PRIMARY_CTA.label}</span>
                <ArrowUpRight aria-hidden="true" size={15} />
              </SiteLink>
            </div>

            {/* Mobile: menu control */}
            <button
              ref={toggleRef}
              type="button"
              aria-expanded={open}
              aria-controls="mobile-navigation"
              onClick={() => setOpen(true)}
              className="flex min-h-[44px] items-center gap-3 pl-3 text-sm font-medium text-white/80 lg:hidden"
            >
              <span>Menu</span>
              <span aria-hidden="true" className="flex w-5 flex-col items-end gap-[5px]">
                <span className="h-px w-5 bg-current" />
                <span className="h-px w-3.5 bg-[#f26a2e]" />
              </span>
            </button>
          </nav>
        </Container>
      </header>

      {open ? <MobileMenu onClose={closeMenu} onNavigate={closeForNavigation} /> : null}
    </>
  );
}
