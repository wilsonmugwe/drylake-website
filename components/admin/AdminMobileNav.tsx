"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { useState } from "react";
import {
  Building2,
  CreditCard,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  ShieldCheck,
  X,
} from "lucide-react";

const navigation = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Clients",
    href: "/admin/clients",
    icon: Building2,
  },
  {
    label: "Projects",
    href: "/admin/projects",
    icon: FolderKanban,
  },
  {
    label: "Documents",
    href: "/admin/documents",
    icon: FileText,
  },
  {
    label: "Invoices",
    href: "/admin/invoices",
    icon: Receipt,
  },
  {
    label: "Payments",
    href: "/admin/payments",
    icon: CreditCard,
  },
];

export default function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { signOut } = useClerk();

  return (
    <>
      <div className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-[#10100f] px-4 text-white lg:hidden">
        <Link
          href="/admin"
          className="flex min-h-11 items-center gap-2 font-semibold text-white"
        >
          <ShieldCheck size={18} className="text-[#f26a2e]" />
          Drylake Admin
        </Link>

        <button
          type="button"
          aria-label="Open admin navigation"
          onClick={() => setOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <Menu size={18} />
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />

          <aside className="absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-[#10100f] p-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                Drylake Admin
              </span>

              <button
                type="button"
                aria-label="Close admin navigation"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 space-y-1 py-5">
              {navigation.map((item) => {
                const Icon = item.icon;

                const selected =
                  item.href === "/admin"
                    ? pathname === item.href
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                      selected
                        ? "bg-white/10 text-white"
                        : "text-white/60 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <Icon
                      size={17}
                      className={
                        selected
                          ? "text-[#f26a2e]"
                          : "text-white/40"
                      }
                    />

                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={() => signOut({ redirectUrl: "/" })}
              className="flex items-center gap-3 border-t border-white/10 px-3 pt-5 text-sm text-white/60"
            >
              <LogOut size={17} />
              Sign out
            </button>
          </aside>
        </div>
      ) : null}
    </>
  );
}