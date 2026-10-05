"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

export type ClientSection = "overview" | "billing";

const NAV_ITEMS: Array<{ key: ClientSection; label: string; href: string }> = [
  { key: "overview", label: "Overview", href: "/client" },
  { key: "billing", label: "Billing", href: "/client/billing" },
];

function sectionFromPath(pathname: string | null): ClientSection | null {
  if (!pathname?.startsWith("/client")) {
    return null;
  }

  return pathname.startsWith("/client/billing") ? "billing" : "overview";
}

/*
 * Primary portal navigation. The active item comes from the URL; `fallback` only applies
 * when the view is rendered outside /client (e.g. a local preview harness).
 */
export function ClientNav({ fallback }: { fallback?: ClientSection }) {
  const active = sectionFromPath(usePathname()) ?? fallback;

  return (
    <nav aria-label="Client portal" className="-mb-px flex gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === active;

        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className="cp-nav-link"
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/* Clerk account menu (profile, sign out). Renders nothing when signed out. */
export function ClientAccountButton() {
  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: "h-9 w-9",
          /* 4px padding around the 36px avatar keeps the tap target at 44px. */
          userButtonTrigger: "p-1",
        },
      }}
    />
  );
}
