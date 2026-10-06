"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useClerk } from "@clerk/nextjs";
import { LayoutDashboard, LoaderCircle, LogOut, Receipt, type LucideIcon } from "lucide-react";
import { useState } from "react";

export type ClientSection = "overview" | "billing";

export const NAV_ITEMS: Array<{
  key: ClientSection;
  label: string;
  href: string;
  icon: LucideIcon;
}> = [
  { key: "overview", label: "Overview", href: "/client", icon: LayoutDashboard },
  { key: "billing", label: "Billing", href: "/client/billing", icon: Receipt },
];

/* Project pages belong to Overview; invoice pages to Billing. */
export function sectionFromPath(pathname: string | null): ClientSection | null {
  if (!pathname?.startsWith("/client")) {
    return null;
  }

  return pathname.startsWith("/client/billing") ? "billing" : "overview";
}

/*
 * Shows the moment a nav link is clicked, before the destination has rendered. This is
 * the "something is happening" feedback; the route's loading.tsx skeleton follows.
 */
function PendingMark({ selected }: { selected: boolean }) {
  const { pending } = useLinkStatus();

  if (pending) {
    return (
      <LoaderCircle
        aria-hidden="true"
        size={14}
        className="ml-auto shrink-0 animate-spin text-[#f26a2e]"
      />
    );
  }

  return selected ? (
    <span aria-hidden="true" className="ml-auto h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
  ) : null;
}

/* The pending state is announced too, so a screen reader hears that the click landed. */
function PendingAnnouncement() {
  const { pending } = useLinkStatus();

  return pending ? <span className="sr-only"> (loading)</span> : null;
}

export function ClientNavLinks({
  fallback,
  onNavigate,
  size = "rail",
}: {
  fallback?: ClientSection;
  onNavigate?: () => void;
  size?: "rail" | "drawer";
}) {
  const active = sectionFromPath(usePathname()) ?? fallback ?? null;

  return (
    <nav aria-label="Client portal" className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const selected = item.key === active;

        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={onNavigate}
            aria-current={selected ? "page" : undefined}
            className={`group flex items-center gap-3 rounded-xl px-3 text-sm transition ${
              size === "drawer" ? "py-3" : "py-2.5"
            } ${
              selected
                ? "bg-white/10 text-white"
                : "text-white/60 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                selected ? "bg-[#f26a2e]/15" : "bg-white/[0.04]"
              }`}
            >
              <Icon
                aria-hidden="true"
                size={16}
                className={selected ? "text-[#f26a2e]" : "text-white/45 group-hover:text-white/75"}
              />
            </span>

            {item.label}
            <PendingAnnouncement />
            <PendingMark selected={selected} />
          </Link>
        );
      })}
    </nav>
  );
}

/* Clerk account menu (profile, security, sign out). Renders nothing when signed out. */
export function ClientAccountButton({ showName = false }: { showName?: boolean }) {
  return (
    <UserButton
      showName={showName}
      appearance={{
        elements: {
          avatarBox: "h-8 w-8",
          /* Padding keeps the tap target at 44px. */
          userButtonTrigger: "p-1.5 rounded-xl",
          userButtonOuterIdentifier: "text-white/80 text-sm font-medium",
        },
      }}
    />
  );
}

export function SignOutButton() {
  const { signOut } = useClerk();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <button
      type="button"
      disabled={signingOut}
      onClick={() => {
        setSigningOut(true);
        void signOut({ redirectUrl: "/" });
      }}
      className="cp-rail-item disabled:cursor-wait disabled:opacity-60"
    >
      {signingOut ? (
        <LoaderCircle aria-hidden="true" size={16} className="animate-spin" />
      ) : (
        <LogOut aria-hidden="true" size={16} />
      )}
      {signingOut ? "Signing out..." : "Sign out"}
    </button>
  );
}
