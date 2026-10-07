"use client";

import Link from "next/link";
import { Building2, Globe2, Menu, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import DrylakeWordmark from "@/components/brand/DrylakeWordmark";

import {
  ClientAccountButton,
  ClientNavLinks,
  type ClientSection,
  SignOutButton,
} from "./ClientNav";
import MessageDrylake from "./MessageDrylake";

type RailProps = {
  organizationName?: string | null;
  showNav: boolean;
  /* Streamed server node: "Switch workspace" when the user has more than one. */
  switcher?: ReactNode;
  fallback?: ClientSection;
};

function Brand() {
  return (
    <Link href={"/client"} className="flex min-h-11 flex-col justify-center gap-1.5">
      {/* Canonical wordmark (brand swap only; the rail itself is PR 4's). */}
      <DrylakeWordmark lockup tone="dark" surface="#10100f" height={22} />
      <span className="block text-[10px] uppercase tracking-[0.16em] text-white/40">
        Client portal
      </span>
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
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
        Workspace
      </p>
      <p className="mt-2 flex items-start gap-2 text-sm font-medium leading-5 text-white">
        <Building2 aria-hidden="true" size={15} className="mt-0.5 shrink-0 text-white/45" />
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

      <Link
        href="/"
        className="cp-rail-item"
      >
        <Globe2 aria-hidden="true" size={16} className="text-[#f26a2e]" />
        Drylake website
        <span aria-hidden="true" className="ml-auto text-white/25">
          ↗
        </span>
      </Link>

      <SignOutButton />

      <div className="flex items-center justify-between gap-2 border-t border-white/[0.07] px-1 pt-3">
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-white/30">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Secure session
        </span>
        <ClientAccountButton />
      </div>
    </div>
  );
}

/* Desktop navigation rail: the Admin sidebar treatment, client destinations. */
export function ClientSidebar({ organizationName, showNav, switcher, fallback }: RailProps) {
  return (
    <aside className="cp-rail hidden h-screen w-[264px] shrink-0 flex-col border-r border-white/10 bg-[#10100f] text-white lg:sticky lg:top-0 lg:flex">
      <div className="border-b border-white/10 px-5 py-5">
        <Brand />
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        <WorkspaceCard organizationName={organizationName} switcher={switcher} />

        {showNav ? (
          <div>
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
              Navigate
            </p>
            <ClientNavLinks fallback={fallback} />
          </div>
        ) : null}
      </div>

      <RailFooter organizationName={organizationName} />
    </aside>
  );
}

/* Mobile: a slim top bar and a drawer with the same contents as the rail. */
export function ClientMobileNav({ organizationName, showNav, switcher, fallback }: RailProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="cp-mobile-bar sticky top-0 z-50 flex h-16 items-center justify-between gap-3 border-b border-white/10 bg-[#10100f] px-4 text-white lg:hidden">
        <Brand />

        <div className="flex min-w-0 items-center gap-1">
          {organizationName ? (
            <span className="hidden max-w-[11rem] truncate text-sm text-white/60 sm:block">
              {organizationName}
            </span>
          ) : null}

          <button
            type="button"
            aria-label="Open portal navigation"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <Menu aria-hidden="true" size={18} />
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true" aria-label="Portal navigation">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />

          <aside className="absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-[#10100f] text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">Client portal</span>

              <button
                type="button"
                aria-label="Close portal navigation"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-white/10"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
              <WorkspaceCard organizationName={organizationName} switcher={switcher} />
              {/* Closing on click hands feedback straight to the route's loading skeleton. */}
              {showNav ? (
                <ClientNavLinks fallback={fallback} size="drawer" onNavigate={() => setOpen(false)} />
              ) : null}
            </div>

            <RailFooter organizationName={organizationName} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
