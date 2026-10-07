"use client";

import DrylakeMark from "@/components/brand/DrylakeMark";
import SiteLink from "@/components/navigation/SiteLink";
import { HOME_PATH } from "@/lib/navigation/site-nav";

/*
 * [mark] Drylake: one control, always "home + top" (SiteLink resolves a click on "/" to a
 * scroll to the top and drops any stale hash; from any other route it navigates to "/").
 */
export default function BrandHomeLink({
  onNavigate,
  size = "header",
}: {
  onNavigate?: () => void;
  size?: "header" | "footer";
}) {
  const footer = size === "footer";

  return (
    <SiteLink
      href={HOME_PATH}
      onNavigate={onNavigate}
      aria-label="Drylake — Home"
      className="group inline-flex min-h-[44px] shrink-0 items-center gap-2.5"
    >
      <DrylakeMark
        className={`${footer ? "h-10 w-10" : "h-7 w-7 lg:h-[30px] lg:w-[30px]"} shrink-0 transition-transform duration-300 group-hover:-rotate-3`}
      />
      <span
        className={`${footer ? "text-[1.9rem]" : "text-[1.18rem] lg:text-[1.26rem]"} font-semibold leading-none tracking-[-0.045em] text-white`}
      >
        Drylake
      </span>
    </SiteLink>
  );
}
