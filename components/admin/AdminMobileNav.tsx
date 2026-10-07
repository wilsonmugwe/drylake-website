"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { SIGN_OUT_REDIRECT_URL } from "@/lib/navigation/site-nav";
import { LogOut, Menu, X } from "lucide-react";

import DrylakeWordmark from "@/components/brand/DrylakeWordmark";
import { useModalDrawer } from "@/components/shell/useModalDrawer";

import { ADMIN_NAV_GROUPS, isAdminNavActive } from "./admin-nav";

/*
 * Admin navigation below lg: a top bar and a modal drawer.
 *
 * The drawer had no dialog semantics and no focus trap (a deferred defect from PR 4). It now
 * shares the Workspace drawer contract (components/shell/useModalDrawer): role="dialog" +
 * aria-modal, focus moves to the close button, Tab and Shift+Tab stay inside, Escape and
 * the scrim close it, focus returns to the menu button, the scroll lock is released, and
 * navigating closes it. Presentation only: routes, data and permissions are untouched.
 */
export default function AdminMobileNav() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { open, openDrawer, close, toggleRef, panelRef, onKeyDown } = useModalDrawer();

  return (
    <>
      <div className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-[#10100f] px-4 text-white lg:hidden">
        <Link href="/admin" className="flex min-h-11 items-center gap-3 font-semibold text-white">
          {/* Canonical wordmark (brand slot swap only, D13). Name: "Drylake Admin". */}
          <DrylakeWordmark lockup tone="dark" surface="#10100f" height={19} label={null} />
          <span aria-hidden="true" className="h-5 w-px bg-white/15" />
          <span aria-hidden="true" className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.16em] text-white/70">
            Admin
          </span>
          <span className="sr-only">Drylake Admin, dashboard</span>
        </Link>

        <button
          ref={toggleRef}
          type="button"
          aria-label="Open admin navigation"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls="admin-drawer"
          onClick={openDrawer}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 text-white/85 transition hover:bg-white/10 hover:text-white"
        >
          <Menu aria-hidden="true" size={18} />
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div aria-hidden="true" className="admin-scrim absolute inset-0 bg-black/55" onClick={close} />

          <div
            ref={panelRef}
            id="admin-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            onKeyDown={onKeyDown}
            className="admin-drawer absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-[#10100f] text-white shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <span className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.16em] text-white/70">
                Drylake Admin
              </span>

              <button
                type="button"
                data-autofocus
                aria-label="Close admin navigation"
                onClick={close}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-white/85 hover:bg-white/10 hover:text-white"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            <nav aria-label="Admin" className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-5">
              {ADMIN_NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="px-3 pb-2 font-mono text-[0.62rem] font-medium uppercase tracking-[0.16em] text-white/55">
                    {group.label}
                  </p>

                  <ul className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const selected = isAdminNavActive(pathname, item.href);

                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={close}
                            aria-current={selected ? "page" : undefined}
                            className={`relative flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm transition ${
                              selected
                                ? "bg-white/10 font-medium text-white"
                                : "text-white/70 hover:bg-white/[0.06] hover:text-white"
                            }`}
                          >
                            {selected ? (
                              <span aria-hidden="true" className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-[#f26a2e]" />
                            ) : null}
                            <Icon aria-hidden="true" size={17} className={selected ? "text-white" : "text-white/60"} />
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>

            <div className="border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => signOut({ redirectUrl: SIGN_OUT_REDIRECT_URL })}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-white/70 transition hover:bg-white/[0.06] hover:text-white"
              >
                <LogOut aria-hidden="true" size={17} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
