"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Building2, Menu, X } from "lucide-react";
import type { ReactNode } from "react";

import DrylakeWordmark from "@/components/brand/DrylakeWordmark";
import { useModalDrawer } from "@/components/shell/useModalDrawer";

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

/*
 * Mobile and tablet (below lg): a slim top bar and a modal sheet with the rail's contents.
 *
 * The sheet rises from the bottom edge, so the navigation sits in the thumb's reach and the
 * groups open in place (polish brief 19). Dialog contract (components/shell/useModalDrawer):
 * role="dialog" + aria-modal, focus moves into the sheet on open, Tab and Shift+Tab stay
 * inside it, Escape and the scrim close it, focus returns to the menu button on close, the
 * page scroll lock is always released (close, navigation or unmount), and a section link on
 * the current page closes the sheet before it moves focus to that section.
 */
export function ClientMobileNav({ organizationName, showNav, switcher, fallback }: RailProps) {
  const pathname = usePathname();
  const { open, openDrawer, close, toggleRef, panelRef, onKeyDown } = useModalDrawer();
  const section = sectionFromPath(pathname) ?? fallback ?? null;
  const sectionLabel = showNav ? NAV_ITEMS.find((item) => item.key === section)?.label : null;

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
            onClick={openDrawer}
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
            className="cp-drawer absolute inset-x-0 bottom-0 flex max-h-[88svh] flex-col rounded-t-[1.25rem] border-t border-white/10 bg-rail text-white shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[24rem] sm:rounded-[1.25rem] sm:border"
          >
            {/* Grab handle: decoration that says "sheet"; closing is the button, Escape or the scrim. */}
            <span aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/20 sm:hidden" />

            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 pb-2 pt-1 sm:py-3">
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

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-4">
              {/* Navigation first: it is why the sheet was opened. Closing on click hands
                  feedback straight to the route's loading skeleton (or to the section). */}
              <NavGroup showNav={showNav} fallback={fallback} size="drawer" onNavigate={close} />
              <WorkspaceCard organizationName={organizationName} switcher={switcher} />
            </div>

            <div className="shrink-0 pb-[env(safe-area-inset-bottom)]">
              <RailFooter organizationName={organizationName} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
