"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { SIGN_OUT_REDIRECT_URL } from "@/lib/navigation/site-nav";
import { ArrowUpRight, Globe2, LogOut } from "lucide-react";

import DrylakeWordmark from "@/components/brand/DrylakeWordmark";

import { ADMIN_NAV_GROUPS, isAdminNavActive } from "./admin-nav";

/*
 * Desktop admin rail (lg and up). Same family as the Workspace rail (dark surface, canonical
 * wordmark, signal edge on the current item), arranged for operations: grouped by job.
 * Presentation only (polish brief 16): routes, data and permissions are untouched.
 */
export default function AdminSidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();

  return (
    <aside
      aria-label="Drylake Admin"
      className="hidden h-screen w-[268px] shrink-0 flex-col border-r border-white/10 bg-[#10100f] text-white lg:sticky lg:top-0 lg:flex"
    >
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/admin" className="flex min-h-11 items-center gap-3">
          {/* Canonical wordmark (brand slot swap only, D13). */}
          <DrylakeWordmark lockup tone="dark" surface="#10100f" height={22} label={null} />
          <span aria-hidden="true" className="h-5 w-px bg-white/15" />
          <span aria-hidden="true" className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.16em] text-white/70">
            Admin
          </span>
          <span className="sr-only">Drylake Admin, dashboard</span>
        </Link>
      </div>

      <nav aria-label="Admin" className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
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
                      aria-current={selected ? "page" : undefined}
                      className={`group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                        selected
                          ? "bg-white/10 font-medium text-white"
                          : "text-white/70 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      {selected ? (
                        <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-[#f26a2e]" />
                      ) : null}
                      <Icon
                        aria-hidden="true"
                        size={17}
                        className={selected ? "shrink-0 text-white" : "shrink-0 text-white/60 group-hover:text-white/85"}
                      />
                      {item.label}
                      {selected ? (
                        <span aria-hidden="true" className="ml-auto h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/70 transition hover:bg-white/[0.06] hover:text-white"
        >
          <Globe2 aria-hidden="true" size={16} className="text-white/60" />
          Drylake website
          <ArrowUpRight aria-hidden="true" size={14} className="ml-auto text-white/55" />
        </Link>

        <button
          type="button"
          onClick={() => signOut({ redirectUrl: SIGN_OUT_REDIRECT_URL })}
          className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/70 transition hover:bg-white/[0.06] hover:text-white"
        >
          <LogOut aria-hidden="true" size={16} />
          Sign out
        </button>

        <div className="mt-3 flex items-center gap-2 border-t border-white/[0.07] px-3 pt-4 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-white/55">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Secure admin session
        </div>
      </div>
    </aside>
  );
}
