import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

import SiteLink from "@/components/navigation/SiteLink";
import { PRIMARY_CTA } from "@/lib/navigation/site-nav";

/*
 * The canonical primary call to action ("Start a conversation"), brief of 2026-10-07: white
 * background, dark text, everywhere on the public site. Styles are the .btn-primary class in
 * app/public-site.css (unlayered on purpose, so the public `a { color: inherit }` reset and
 * Tailwind utilities never repaint it). Use this component, not the class by hand.
 *
 * size     compact = 44 px (header), default = 48 px, large = 58 px (hero close, mobile menu).
 * surface  dark (default): white on ink. light: white with an ink hairline, for white/mineral
 *          sections where a borderless white button would vanish.
 * Layout classes (width, margin) go in className; colour/size never do.
 */
export type PrimaryCtaProps = {
  href?: string;
  children?: ReactNode;
  size?: "compact" | "default" | "large";
  surface?: "dark" | "light";
  className?: string;
  /* Analytics label for cta_click (lib/analytics/events.ts CTA_LOCATIONS). Omit to infer it from the page. */
  location?: string;
  onNavigate?: () => void;
};

const ICON_SIZE = { compact: 15, default: 16, large: 18 } as const;

export default function PrimaryCta({
  href = PRIMARY_CTA.href,
  children = PRIMARY_CTA.label,
  size = "default",
  surface = "dark",
  className,
  location,
  onNavigate,
}: PrimaryCtaProps) {
  return (
    <SiteLink
      href={href}
      onNavigate={onNavigate}
      data-size={size}
      data-surface={surface}
      data-cta-location={location}
      className={className ? `btn-primary ${className}` : "btn-primary"}
    >
      <span>{children}</span>
      <ArrowUpRight aria-hidden="true" size={ICON_SIZE[size]} />
    </SiteLink>
  );
}
