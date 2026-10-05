"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  Building2,
  CreditCard,
  FileText,
  FolderKanban,
  Globe2,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  Receipt,
  Settings,
  ShieldCheck,
  UserRoundSearch,
  X,
} from "lucide-react";

const sections = [
  {
    label: null,
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        disabled: false,
      },
    ],
  },
  {
    label: "Workspace",
    items: [
      {
        label: "Conversations",
        href: "/admin/conversations",
        icon: MessageSquareText,
        disabled: true,
      },
      {
        label: "Clients",
        href: "/admin/clients",
        icon: Building2,
        disabled: false,
      },
      {
        label: "Projects",
        href: "/admin/projects",
        icon: FolderKanban,
        disabled: true,
      },
      {
        label: "Documents",
        href: "/admin/documents",
        icon: FileText,
        disabled: true,
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Invoices",
        href: "/admin/invoices",
        icon: Receipt,
        disabled: true,
      },
      {
        label: "Payments",
        href: "/admin/payments",
        icon: CreditCard,
        disabled: true,
      },
    ],
  },
  {
    label: "Activity",
    items: [
      {
        label: "Enquiries",
        href: "/admin/enquiries",
        icon: UserRoundSearch,
        disabled: true,
      },
      {
        label: "Notifications",
        href: "/admin/notifications",
        icon: Bell,
        disabled: true,
      },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminMobileNav() {
  const pathname = usePathname();

  /*
   * The menu is open only for the path it was opened on, so any navigation closes it
   * without a setState-in-effect (react-hooks/set-state-in-effect).
   */
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (next: boolean) => setOpenedOn(next ? pathname : null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-[68px] items-center justify-between border-b border-black/[0.08] bg-[#f3f1eb]/95 px-5 text-[#11110f] backdrop-blur-xl lg:hidden">
        <Link
          href="/admin"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#11110f]">
            <ShieldCheck
              size={16}
              strokeWidth={1.8}
              className="text-[#f26a2e]"
            />
          </div>

          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em]">
              Drylake
            </p>
            <p className="mt-0.5 text-[0.5rem] uppercase tracking-[0.16em] text-black/40">
              Admin
            </p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open admin navigation"
          aria-expanded={open}
          className="flex h-10 w-10 touch-manipulation items-center justify-center rounded-xl border border-black/[0.1] bg-white/60 text-black/70 active:scale-95"
        >
          <Menu size={19} />
        </button>
      </header>

      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close admin navigation"
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity duration-150 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          className={`absolute right-0 top-0 flex h-[100dvh] w-[88%] max-w-[360px] flex-col border-l border-white/[0.08] bg-[#0b0b0a] text-white shadow-[-30px_0_90px_rgba(0,0,0,0.35)] transition-transform duration-200 ease-out ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="shrink-0 border-b border-white/[0.08] px-5 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#f26a2e]/25 bg-[#f26a2e]/[0.08]">
                  <ShieldCheck size={17} className="text-[#f26a2e]" />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.21em]">
                    Drylake
                  </p>
                  <p className="mt-1 text-[0.52rem] uppercase tracking-[0.16em] text-white/35">
                    Administration
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="flex h-10 w-10 touch-manipulation items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/60 active:scale-95"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
            <div className="space-y-7">
              {sections.map((section, sectionIndex) => (
                <div key={section.label ?? sectionIndex}>
                  {section.label && (
                    <p className="mb-2 px-3 text-[0.52rem] font-semibold uppercase tracking-[0.2em] text-white/30">
                      {section.label}
                    </p>
                  )}

                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(pathname, item.href);

                      if (item.disabled) {
                        return (
                          <div
                            key={item.href}
                            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/30"
                          >
                            <div className="flex h-8 w-8 items-center justify-center">
                              <Icon size={16} className="text-white/25" />
                            </div>

                            <span>{item.label}</span>

                            <span className="ml-auto text-[0.45rem] uppercase tracking-[0.11em] text-white/20">
                              Soon
                            </span>
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch
                          onClick={() => setOpen(false)}
                          className={`relative flex touch-manipulation items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                            active
                              ? "bg-white/[0.075] text-white"
                              : "text-white/58 active:bg-white/[0.05]"
                          }`}
                        >
                          {active && (
                            <span className="absolute bottom-3 left-0 top-3 w-[2px] rounded-r-full bg-[#f26a2e]" />
                          )}

                          <div className="flex h-8 w-8 items-center justify-center">
                            <Icon
                              size={16}
                              className={
                                active
                                  ? "text-[#f26a2e]"
                                  : "text-white/40"
                              }
                            />
                          </div>

                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          <div className="shrink-0 border-t border-white/[0.08] bg-[#0b0b0a] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/30">
              <Settings size={16} />
              <span>Settings</span>
              <span className="ml-auto text-[0.45rem] uppercase tracking-[0.11em] text-white/20">
                Soon
              </span>
            </div>

            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/58"
            >
              <Globe2 size={16} className="text-[#f26a2e]" />
              <span>Drylake website</span>
              <span className="ml-auto text-white/30">↗</span>
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}