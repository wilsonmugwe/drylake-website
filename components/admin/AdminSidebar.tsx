"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { SIGN_OUT_REDIRECT_URL } from "@/lib/navigation/site-nav";
import {
  Building2,
  CreditCard,
  FileText,
  FolderKanban,
  Globe2,
  LayoutDashboard,
  LogOut,
  Receipt,
  ShieldCheck,
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

function isActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();

  return (
    <aside className="hidden h-screen w-[268px] shrink-0 flex-col border-r border-white/10 bg-[#10100f] text-white lg:sticky lg:top-0 lg:flex">
      <div className="border-b border-white/10 px-5 py-6">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f26a2e]/10 ring-1 ring-[#f26a2e]/25">
            <ShieldCheck size={18} className="text-[#f26a2e]" />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em]">
              Drylake
            </p>

            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/35">
              Administration
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
          Workspace
        </p>

        <div className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const selected = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  selected
                    ? "bg-white/10 text-white"
                    : "text-white/55 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    selected
                      ? "bg-[#f26a2e]/12"
                      : "bg-white/[0.03]"
                  }`}
                >
                  <Icon
                    size={16}
                    className={
                      selected
                        ? "text-[#f26a2e]"
                        : "text-white/40 group-hover:text-white/70"
                    }
                  />
                </span>

                {item.label}

                {selected ? (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/55 transition hover:bg-white/[0.06] hover:text-white"
        >
          <Globe2 size={16} className="text-[#f26a2e]" />

          Drylake website

          <span className="ml-auto text-white/25">↗</span>
        </Link>

        <button
          type="button"
          onClick={() => signOut({ redirectUrl: SIGN_OUT_REDIRECT_URL })}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/55 transition hover:bg-white/[0.06] hover:text-white"
        >
          <LogOut size={16} />
          Sign out
        </button>

        <div className="mt-3 flex items-center gap-2 border-t border-white/[0.07] px-3 pt-4 text-[10px] uppercase tracking-[0.14em] text-white/25">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Secure admin session
        </div>
      </div>
    </aside>
  );
}