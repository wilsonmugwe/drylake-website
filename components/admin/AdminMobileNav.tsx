"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile header */}

      <header className="sticky top-0 z-40 flex h-[70px] items-center justify-between border-b border-white/[0.07] bg-[#070707]/90 px-5 backdrop-blur-xl lg:hidden">
        <Link
          href="/admin"
          className="flex items-center gap-3"
          onClick={() => setOpen(false)}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f26a2e]/20 bg-[#f26a2e]/[0.06]">
            <ShieldCheck
              size={15}
              strokeWidth={1.7}
              className="text-[#f26a2e]"
            />
          </div>

          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-white">
              Drylake
            </p>

            <p className="mt-0.5 text-[0.5rem] uppercase tracking-[0.16em] text-white/25">
              Admin
            </p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open admin navigation"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] text-white/60 transition hover:text-white"
        >
          <Menu size={18} />
        </button>
      </header>

      {/* Overlay */}

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close admin navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          {/* Drawer */}

          <div className="absolute bottom-0 right-0 top-0 flex w-[86%] max-w-[340px] flex-col border-l border-white/[0.08] bg-[#080808] shadow-[-30px_0_100px_rgba(0,0,0,0.65)]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f26a2e]/20 bg-[#f26a2e]/[0.06]">
                  <ShieldCheck
                    size={16}
                    className="text-[#f26a2e]"
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                    Drylake
                  </p>

                  <p className="mt-1 text-[0.52rem] uppercase tracking-[0.16em] text-white/25">
                    Administration
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-white/45"
              >
                <X size={17} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-6">
              <div className="space-y-7">
                {sections.map((section, sectionIndex) => (
                  <div key={section.label ?? sectionIndex}>
                    {section.label && (
                      <p className="mb-2 px-3 text-[0.52rem] font-semibold uppercase tracking-[0.2em] text-white/20">
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
                              className="flex items-center justify-between rounded-xl px-3 py-3 text-sm text-white/20"
                            >
                              <div className="flex items-center gap-3">
                                <Icon size={16} />

                                {item.label}
                              </div>

                              <span className="text-[0.45rem] uppercase tracking-[0.12em] text-white/15">
                                Soon
                              </span>
                            </div>
                          );
                        }

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                              active
                                ? "bg-white/[0.055] text-white"
                                : "text-white/40"
                            }`}
                          >
                            <Icon
                              size={16}
                              className={
                                active
                                  ? "text-[#f26a2e]"
                                  : "text-white/30"
                              }
                            />

                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </nav>

            <div className="border-t border-white/[0.07] p-4">
              <div className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/20">
                <Settings size={16} />
                Settings

                <span className="ml-auto text-[0.45rem] uppercase tracking-[0.12em]">
                  Soon
                </span>
              </div>

              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/40"
              >
                <Globe2 size={16} />
                Drylake website
                <span className="ml-auto">↗</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}