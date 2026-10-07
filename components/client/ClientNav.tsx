"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useClerk } from "@clerk/nextjs";
import { SIGN_OUT_REDIRECT_URL } from "@/lib/navigation/site-nav";
import { ChevronDown, LayoutDashboard, LoaderCircle, LogOut, Receipt, type LucideIcon } from "lucide-react";
import { type MouseEvent, useState } from "react";

import { isSamePageDestination, splitDestination } from "./section-anchor";
import { goToSection } from "./WorkspaceAnchors";

export type ClientSection = "overview" | "billing";

/* A section of a real page, reachable by its id (polish brief 17 and 18). */
export type NavSection = { id: string; label: string };

/*
 * The Workspace information architecture. Every entry is a real route or a real section of
 * one (an id rendered by the view, test-pinned in tests/workspace-polish.test.mjs). Nothing
 * here points at a capability the Workspace does not have: there are no member, settings or
 * agreements pages, so there are no entries for them (docs/design/2026-10-07-drylake-workspace.md).
 */
export const OVERVIEW_SECTIONS: NavSection[] = [
  { id: "needs-attention", label: "Needs your attention" },
  { id: "projects", label: "Projects" },
  { id: "recent-activity", label: "Recent activity" },
  { id: "documents", label: "Documents" },
];

export const BILLING_SECTIONS: NavSection[] = [
  { id: "to-pay", label: "To pay" },
  { id: "invoice-history", label: "Invoice history" },
  { id: "paying-online", label: "Paying online" },
];

/* Shown only while a project is open: its own sections, under Overview. */
export const PROJECT_SECTIONS: NavSection[] = [
  { id: "project-status", label: "Status and progress" },
  { id: "milestones", label: "Milestones" },
  { id: "updates", label: "Updates" },
  { id: "project-documents", label: "Documents" },
];

export const NAV_ITEMS: Array<{
  key: ClientSection;
  label: string;
  /* Short description shown in the drawer, where there is room for it. */
  hint: string;
  href: string;
  icon: LucideIcon;
  sections: NavSection[];
}> = [
  {
    key: "overview",
    label: "Overview",
    hint: "Projects, activity and documents",
    href: "/client",
    icon: LayoutDashboard,
    sections: OVERVIEW_SECTIONS,
  },
  {
    key: "billing",
    label: "Billing",
    hint: "Invoices and payments",
    href: "/client/billing",
    icon: Receipt,
    sections: BILLING_SECTIONS,
  },
];

/* "/client/projects/<id>" while a project is open, else null. */
export function projectPathFrom(pathname: string | null): string | null {
  const match = pathname?.match(/^\/client\/projects\/[^/#?]+$/);

  return match ? match[0] : null;
}

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
        className="ml-auto shrink-0 animate-spin text-signal"
      />
    );
  }

  return selected ? (
    <span aria-hidden="true" className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
  ) : null;
}

/* The pending state is announced too, so a screen reader hears that the click landed. */
function PendingAnnouncement() {
  const { pending } = useLinkStatus();

  return pending ? <span className="sr-only"> (loading)</span> : null;
}

/*
 * One section link. On the page already on screen it moves focus in place (Next's <Link> is
 * a no-op for an identical URL + hash, and the drawer must close first); from another page
 * it is an ordinary client navigation and WorkspaceAnchors lands on the section on arrival.
 */
function SectionNavLink({
  href,
  label,
  pathname,
  size,
  onNavigate,
}: {
  href: string;
  label: string;
  pathname: string | null;
  size: "rail" | "drawer";
  onNavigate?: () => void;
}) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return; // new tab / window: let the browser have it
    }

    onNavigate?.();

    if (isSamePageDestination(href, pathname)) {
      event.preventDefault();
      goToSection(splitDestination(href).anchor as string);
    }
  }

  return (
    <li>
      <Link href={href} onClick={onClick} className={`cp-nav-sub ${size === "drawer" ? "min-h-11" : "min-h-9"}`}>
        <span className="min-w-0 truncate">{label}</span>
        <PendingAnnouncement />
        <PendingMark selected={false} />
      </Link>
    </li>
  );
}

/*
 * Grouped Workspace navigation (polish brief 17 and 19).
 *
 *   rail    every group shows its sections: one glance, one click to a specific place.
 *   drawer  each group is a disclosure (the group link + a separate expand button), the
 *           current group open: a short, thumb-sized list that drills down on demand.
 */
export function ClientNavLinks({
  fallback,
  onNavigate,
  size = "rail",
}: {
  fallback?: ClientSection;
  onNavigate?: () => void;
  size?: "rail" | "drawer";
}) {
  const pathname = usePathname();
  const active = sectionFromPath(pathname) ?? fallback ?? null;
  const projectPath = projectPathFrom(pathname);
  const [expanded, setExpanded] = useState<ClientSection | null>(active);

  return (
    <nav aria-label="Workspace">
      <ul className="space-y-1.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const selected = item.key === active;
          const open = size === "rail" || expanded === item.key;
          const listId = `workspace-nav-${size}-${item.key}`;

          return (
            <li key={item.key}>
              <div className="flex items-stretch gap-1">
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={selected ? "page" : undefined}
                  className={`group relative flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-app px-3 text-sm transition ${
                    size === "drawer" ? "py-2.5" : "py-2"
                  } ${
                    selected
                      ? "bg-white/[0.08] font-medium text-white"
                      : "text-white/70 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  {selected ? (
                    <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-signal" />
                  ) : null}
                  <Icon
                    aria-hidden="true"
                    size={17}
                    className={selected ? "shrink-0 text-white" : "shrink-0 text-white/60 group-hover:text-white/85"}
                  />

                  <span className="min-w-0">
                    <span className="block">{item.label}</span>
                    {size === "drawer" ? (
                      <span className="block text-xs font-normal text-white/60">{item.hint}</span>
                    ) : null}
                  </span>
                  <PendingAnnouncement />
                  <PendingMark selected={selected} />
                </Link>

                {size === "drawer" ? (
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-label={`${item.label} sections`}
                    onClick={() => setExpanded(open ? null : item.key)}
                    className="flex w-12 shrink-0 items-center justify-center rounded-app text-white/70 transition hover:bg-white/[0.05] hover:text-white"
                  >
                    <ChevronDown
                      aria-hidden="true"
                      size={18}
                      className={`cp-chevron ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                ) : null}
              </div>

              {open ? (
                <ul id={listId} aria-label={`${item.label} sections`} className="cp-nav-subs">
                  {item.sections.map((section) => (
                    <SectionNavLink
                      key={section.id}
                      href={`${item.href}#${section.id}`}
                      label={section.label}
                      pathname={pathname}
                      size={size}
                      onNavigate={onNavigate}
                    />
                  ))}

                  {item.key === "overview" && projectPath ? (
                    <li>
                      <p className="cp-nav-subhead">This project</p>
                      <ul aria-label="This project">
                        {PROJECT_SECTIONS.map((section) => (
                          <SectionNavLink
                            key={section.id}
                            href={`${projectPath}#${section.id}`}
                            label={section.label}
                            pathname={pathname}
                            size={size}
                            onNavigate={onNavigate}
                          />
                        ))}
                      </ul>
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
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
        void signOut({ redirectUrl: SIGN_OUT_REDIRECT_URL });
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
