"use client";

import DrylakeWordmark from "@/components/brand/DrylakeWordmark";
import SiteLink from "@/components/navigation/SiteLink";
import { HOME_PATH } from "@/lib/navigation/site-nav";

/* Header and footer lockup sizes (wordmark height in px; the tile scales with it). */
const SIZES = { header: 26, footer: 48 } as const;

/*
 * [tile] Drylake: one control, always "home + top" (SiteLink resolves a click on "/" to a
 * scroll to the top and drops any stale hash; from any other route it navigates to "/").
 * Used by the public header, the mobile menu and the footer, so all three show the same
 * canonical lockup (DrylakeWordmark: ochre y, letters adapted to the dark surface).
 */
export default function BrandHomeLink({
  onNavigate,
  size = "header",
}: {
  onNavigate?: () => void;
  size?: keyof typeof SIZES;
}) {
  return (
    <SiteLink
      href={HOME_PATH}
      onNavigate={onNavigate}
      aria-label="Drylake home"
      className="group inline-flex min-h-[44px] shrink-0 items-center"
    >
      <DrylakeWordmark
        lockup
        tone="dark"
        surface="#0b0b0a"
        height={SIZES[size]}
        label={null}
        markClassName="transition-transform duration-300 group-hover:-rotate-3"
      />
    </SiteLink>
  );
}
