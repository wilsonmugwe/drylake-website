"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Building2, Menu, X } from "lucide-react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import DrylakeWordmark from "@/components/brand/DrylakeWordmark";

import {
  ClientAccountButton,
  ClientNavLinks,
  type ClientSection,
  NAV_ITEMS,
  SignOutButton,
  sectionFromPath,
} from "./ClientNav";
import MessageDrylake from "./MessageDrylake";

type RailProps = {
  organizationName?: string | null;
  showNav: boolean;
  /* Streamed server node: "Switch workspace" when the user has more than one. */
  switcher?: ReactNode;
  fallback?: ClientSection;
};

/* The rail surface; the tile's cracks are drawn in it. Same value as the bg-rail token. */
const RAIL_SURFACE = "#10100f";

/* The product name every signed-in screen carries: the canonical wordmark + "Workspace". */
export const WORKSPACE_NAME = "Drylake Workspace";

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/client" className="group flex min-h-11 items-center gap-3 rounded-app">
      <DrylakeWordmark lockup tone="dark" surface={RAIL_SURFACE} height={compact ? 19 : 22} label={null} />
      <span aria-hidden="true" className="h-5 w-px bg-white/15" />
      <span aria-hidden="true" className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.16em] text-white/70">
        Workspace
      </span>
      <span className="sr-only">{WORKSPACE_NAME}, overview</span>
    </Link>
  );
}

function WorkspaceCard({
  organizationName,
  switcher,
}: {
  organizationName?: string | null;
  switcher?: ReactNode;
}) {
  if (!organizationName) {
    return null;
  }

  return (
    <div className="rounded-app-card border border-white/10 bg-white/[0.03] p-3.5">
      <p className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.16em] text-white/55">
        Organisation
      </p>
      <p className="mt-2 flex items-start gap-2 text-sm font-medium leading-5 text-white">
        <Building2 aria-hidden="true" size={15} className="mt-0.5 shrink-0 text-white/55" />
        <span className="min-w-0 break-words">{organizationName}</span>
      </p>
      {switcher}
    </div>
  );
}

function RailFooter({ organizationName }: { organizationName?: string | null }) {
  return (
    <div className="space-y-1 border-t border-white/10 p-3">
      <MessageDrylake variant="rail" organizationName={organizationName} />

      <Link href="/" className="cp-rail-item">
        <ArrowUpRight aria-hidden="true" size={16} className="text-white/60" />
        Drylake website
      </Link>

      <SignOutButton />

      <div className="flex items-center justify-between gap-2 border-t border-white/[0.07] px-1 pt-3">
        <span className="flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-white/55">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Secure session
        </span>
        <ClientAccountButton />
      </div>
    </div>
  );
}

function NavGroup({
  showNav,
  fallback,
  size,
  onNavigate,
}: {
  showNav: boolean;
  fallback?: ClientSection;
  size: "rail" | "drawer";
  onNavigate?: () => void;
}) {
  if (!showNav) {
    return null;
  }

  return (
    <div>
      <p className="px-3 pb-2 font-mono text-[0.62rem] font-medium uppercase tracking-[0.16em] text-white/55">
        Navigate
      </p>
      <ClientNavLinks fallback={fallback} size={size} onNavigate={onNavigate} />
    </div>
  );
}

/* Desktop navigation rail (lg and up). */
export function ClientSidebar({ organizationName, showNav, switcher, fallback }: RailProps) {
  return (
    <aside
      aria-label={WORKSPACE_NAME}
      className="cp-rail hidden h-screen w-[272px] shrink-0 flex-col border-r border-white/10 bg-rail text-white lg:sticky lg:top-0 lg:flex"
    >
      <div className="border-b border-white/10 px-5 py-5">
        <Brand />
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        <WorkspaceCard organizationName={organizationName} switcher={switcher} />
        <NavGroup showNav={showNav} fallback={fallback} size="rail" />
      </div>

      <RailFooter organizationName={organizationName} />
    </aside>
  );
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/*
 * Mobile and tablet (below lg): a slim top bar and a modal drawer with the rail's contents.
 *
 * Dialog contract (PR 1 deferred this here): role="dialog" + aria-modal, focus moves into the
 * drawer on open, Tab and Shift+Tab stay inside it, Escape and the scrim close it, focus
 * returns to the menu button on close, and the page scroll lock is always released (close,
 * navigation or unmount).
 */
export function ClientMobileNav({ organizationName, showNav, switcher, fallback }: RailProps) {
  const pathname = usePathname();
  // The drawer is open FOR a path: navigating anywhere (a link inside it, or browser back)
  // closes it without an effect.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt !== null && openAt === pathname;
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const section = sectionFromPath(pathname) ?? fallback ?? null;
  const sectionLabel = showNav ? NAV_ITEMS.find((item) => item.key === section)?.label : null;

  const close = useCallback(() => setOpenAt(null), []);

  // Scroll lock + initial focus while open; release + focus return when it closes.
  useEffect(() => {
    if (!open) {
      if (wasOpen.current) {
        wasOpen.current = false;
        toggleRef.current?.focus();
      }

      return;
    }

    wasOpen.current = true;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      root.style.overflow = previousOverflow;
    };
  }, [open]);

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    // The "Start a conversation" form is a native modal <dialog> nested in the drawer: it owns
    // its own keyboard (Escape closes the form only, Tab stays in the form).
    if ((event.target as HTMLElement).closest("dialog[open]")) {
      return;
    }

    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }

    if (event.key !== "Tab" || !panelRef.current) {
      return;
    }

    const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) => element.offsetParent !== null || element === document.activeElement
    );

    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <div className="cp-mobile-bar sticky top-0 z-50 flex h-16 items-center justify-between gap-3 border-b border-white/10 bg-rail px-4 text-white lg:hidden">
        <Brand compact />

        <div className="flex min-w-0 items-center gap-2">
          {sectionLabel ? (
            <span className="hidden truncate text-sm text-white/70 sm:block">{sectionLabel}</span>
          ) : null}

          <button
            ref={toggleRef}
            type="button"
            aria-label="Open Workspace menu"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls="workspace-drawer"
            onClick={() => setOpenAt(pathname)}
            className="flex h-11 w-11 items-center justify-center rounded-app border border-white/15 text-white/85 transition hover:bg-white/10 hover:text-white"
          >
            <Menu aria-hidden="true" size={18} />
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div aria-hidden="true" className="cp-scrim absolute inset-0 bg-neutral-950/55" onClick={close} />

          <div
            ref={panelRef}
            id="workspace-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Workspace menu"
            onKeyDown={onKeyDown}
            className="cp-drawer absolute right-0 top-0 flex h-full w-[88%] max-w-sm flex-col bg-rail text-white shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <span className="flex items-center gap-3">
                <DrylakeWordmark lockup tone="dark" surface={RAIL_SURFACE} height={18} label={null} />
                <span className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.16em] text-white/70">
                  Workspace
                </span>
              </span>

              <button
                type="button"
                data-autofocus
                aria-label="Close Workspace menu"
                onClick={close}
                className="flex h-11 w-11 items-center justify-center rounded-app text-white/85 hover:bg-white/10 hover:text-white"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
              <WorkspaceCard organizationName={organizationName} switcher={switcher} />
              {/* Closing on click hands feedback straight to the route's loading skeleton. */}
              <NavGroup showNav={showNav} fallback={fallback} size="drawer" onNavigate={close} />
            </div>

            <RailFooter organizationName={organizationName} />
          </div>
        </div>
      ) : null}
    </>
  );
}
