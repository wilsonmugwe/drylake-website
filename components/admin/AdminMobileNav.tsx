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
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* ======================================================
          MOBILE HEADER
      ====================================================== */}

      <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between border-b border-white/[0.08] bg-[#090909]/95 px-5 backdrop-blur-2xl lg:hidden">
        <Link
          href="/admin"
          className="flex items-center gap-3"
          onClick={() => setOpen(false)}
        >
          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-[#f26a2e]/30 bg-[#f26a2e]/[0.09] shadow-[0_0_30px_rgba(242,106,46,0.08)]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#f26a2e]/10 to-transparent" />

            <ShieldCheck
              size={17}
              strokeWidth={1.8}
              className="relative text-[#f26a2e]"
            />
          </div>

          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-white">
              Drylake
            </p>

            <p className="mt-1 text-[0.52rem] font-medium uppercase tracking-[0.18em] text-white/45">
              Admin
            </p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open admin navigation"
          aria-expanded={open}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.055] text-white/80 transition active:scale-95 active:bg-white/[0.09]"
        >
          <Menu size={20} strokeWidth={1.8} />
        </button>
      </header>

      {/* ======================================================
          MOBILE DRAWER
          Always mounted so opening is immediate.
      ====================================================== */}

      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        {/* Overlay */}

        <button
          type="button"
          aria-label="Close admin navigation"
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/70 backdrop-blur-[3px] transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Drawer */}

        <aside
          className={`absolute bottom-0 right-0 top-0 flex w-[88%] max-w-[370px] flex-col border-l border-white/[0.1] bg-[#0d0d0d] shadow-[-30px_0_100px_rgba(0,0,0,0.75)] transition-transform duration-200 ease-out ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Accent */}

          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-24 -top-20 h-64 w-64 rounded-full bg-[#f26a2e]/[0.08] blur-[90px]" />

            <div
              className="absolute inset-0 opacity-[0.018]"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)
                `,
                backgroundSize: "54px 54px",
              }}
            />
          </div>

          {/* Header */}

          <div className="relative flex items-center justify-between border-b border-white/[0.09] px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#f26a2e]/30 bg-[#f26a2e]/[0.09]">
                <ShieldCheck
                  size={18}
                  strokeWidth={1.8}
                  className="text-[#f26a2e]"
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white">
                  Drylake
                </p>

                <p className="mt-1 text-[0.55rem] font-medium uppercase tracking-[0.17em] text-white/45">
                  Administration
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.035] text-white/65 transition active:scale-95"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation */}

          <nav className="relative flex-1 overflow-y-auto px-4 py-5">
            <div className="space-y-7">
              {sections.map((section, sectionIndex) => (
                <div key={section.label ?? sectionIndex}>
                  {section.label && (
                    <p className="mb-2.5 px-3 text-[0.55rem] font-semibold uppercase tracking-[0.22em] text-white/38">
                      {section.label}
                    </p>
                  )}

                  <div className="space-y-1.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(pathname, item.href);

                      if (item.disabled) {
                        return (
                          <div
                            key={item.href}
                            className="flex items-center justify-between rounded-xl border border-transparent px-3.5 py-3.5 text-sm text-white/30"
                          >
                            <div className="flex items-center gap-3.5">
                              <Icon
                                size={17}
                                strokeWidth={1.7}
                                className="text-white/25"
                              />

                              <span>{item.label}</span>
                            </div>

                            <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-[0.45rem] font-semibold uppercase tracking-[0.12em] text-white/25">
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
                          className={`relative flex items-center gap-3.5 overflow-hidden rounded-xl border px-3.5 py-3.5 text-sm font-medium transition ${
                            active
                              ? "border-[#f26a2e]/20 bg-[#f26a2e]/[0.09] text-white"
                              : "border-transparent text-white/72 hover:border-white/[0.07] hover:bg-white/[0.04] hover:text-white"
                          }`}
                        >
                          {active && (
                            <span className="absolute bottom-3 left-0 top-3 w-[2px] rounded-r-full bg-[#f26a2e]" />
                          )}

                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                              active
                                ? "bg-[#f26a2e]/10"
                                : "bg-white/[0.025]"
                            }`}
                          >
                            <Icon
                              size={16}
                              strokeWidth={1.8}
                              className={
                                active
                                  ? "text-[#f26a2e]"
                                  : "text-white/50"
                              }
                            />
                          </div>

                          <span>{item.label}</span>

                          {active && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          {/* Bottom */}

          <div className="relative border-t border-white/[0.09] bg-black/20 p-4">
            <div className="flex items-center justify-between rounded-xl px-3.5 py-3 text-sm text-white/30">
              <div className="flex items-center gap-3">
                <Settings size={17} className="text-white/25" />

                <span>Settings</span>
              </div>

              <span className="rounded-full border border-white/[0.07] px-2 py-1 text-[0.45rem] uppercase tracking-[0.12em] text-white/25">
                Soon
              </span>
            </div>

            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-white/65 transition hover:bg-white/[0.04] hover:text-white"
            >
              <Globe2 size={17} className="text-[#f26a2e]" />

              <span>Drylake website</span>

              <span className="ml-auto text-white/35">↗</span>
            </Link>

            <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-[#f26a2e]/15 bg-[#f26a2e]/[0.045] px-3.5 py-3">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f26a2e] opacity-20" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#f26a2e]" />
              </span>

              <span className="text-[0.55rem] font-semibold uppercase tracking-[0.15em] text-white/45">
                Secure admin session
              </span>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}