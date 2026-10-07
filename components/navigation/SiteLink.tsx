"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";

import { isPlainLeftClick, resolveNavClick } from "@/lib/navigation/site-nav";

type SiteLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  /* Runs before the navigation or scroll, e.g. to close the mobile menu. */
  onNavigate?: () => void;
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/*
 * The one link used by the public navigation, the brand control and the "Back to Drylake"
 * links. A different page is a normal next/link navigation (the router puts the new page at
 * the top or at its hash target, see app/layout.tsx data-scroll-behavior). A click that
 * would leave the URL unchanged is resolved here, because <Link> treats that as "nothing to
 * do": the brand link on "/" scrolls to the top, a section link on "/" scrolls its section
 * into view every time, even when the hash is already in the URL.
 *
 * No timers: the scroll runs synchronously in the click handler. Section offsets for the
 * sticky header come from CSS scroll-margin-top (app/globals.css), not from arithmetic here.
 */
export default function SiteLink({ href, onNavigate, onClick, ...props }: SiteLinkProps) {
  const pathname = usePathname();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (!isPlainLeftClick(event)) {
      return;
    }

    onNavigate?.();

    const action = resolveNavClick({
      href,
      currentPath: pathname,
      currentHash: window.location.hash.replace(/^#/, ""),
    });

    if (action.kind === "navigate") {
      return;
    }

    const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";

    if (action.kind === "scroll-top") {
      event.preventDefault();

      if (action.replaceUrl) {
        window.history.replaceState(null, "", action.replaceUrl);
      }

      window.scrollTo({ top: 0, behavior });
      return;
    }

    const target = document.getElementById(action.id);

    if (!target) {
      return;
    }

    event.preventDefault();

    if (action.pushUrl) {
      window.history.pushState(null, "", action.pushUrl);
    }

    target.scrollIntoView({ behavior, block: "start" });

    // Move keyboard and screen-reader focus to the section without a second scroll.
    if (!target.hasAttribute("tabindex")) {
      target.setAttribute("tabindex", "-1");
    }
    target.focus({ preventScroll: true });
  }

  return <Link href={href} onClick={handleClick} {...props} />;
}
