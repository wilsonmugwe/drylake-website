"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Building2,
  CreditCard,
  FileText,
  FolderKanban,
  Globe2,
  LayoutDashboard,
  MessageSquareText,
  Receipt,
  Settings,
  ShieldCheck,
  UserRoundSearch,
} from "lucide-react";

type NavigationItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
  disabled?: boolean;
};

type NavigationGroup = {
  label?: string;
  items: NavigationItem[];
};

const navigation: NavigationGroup[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
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

function isRouteActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-[280px] shrink-0 border-r border-white/[0.08] bg-[#0a0a0a] lg:sticky lg:top-0 lg:flex lg:flex-col">
      {/* Brand */}

      <div className="relative overflow-hidden border-b border-white/[0.08] px-6 py-7">
        <div className="pointer-events-none absolute -left-10 -top-16 h-44 w-44 rounded-full bg-[#f26a2e]/[0.07] blur-[70px]" />

        <Link href="/admin" className="group relative block">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#f26a2e]/30 bg-[#f26a2e]/[0.08]">
              <ShieldCheck
                size={18}
                strokeWidth={1.8}
                className="text-[#f26a2e]"
              />
            </div>

            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-white">
                Drylake
              </p>

              <p className="mt-1 text-[0.55rem] font-medium uppercase tracking-[0.18em] text-white/40">
                Administration
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}

      <nav className="flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-7">
          {navigation.map((group, groupIndex) => (
            <div key={group.label ?? groupIndex}>
              {group.label && (
                <p className="mb-2.5 px-3 text-[0.53rem] font-semibold uppercase tracking-[0.21em] text-white/35">
                  {group.label}
                </p>
              )}

              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isRouteActive(pathname, item.href);

                  if (item.disabled) {
                    return (
                      <div
                        key={item.href}
                        className="flex cursor-default items-center justify-between rounded-xl px-3 py-3 text-sm text-white/28"
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            size={16}
                            strokeWidth={1.7}
                            className="text-white/22"
                          />

                          <span>{item.label}</span>
                        </div>

                        <span className="rounded-full border border-white/[0.06] px-2 py-1 text-[0.45rem] font-semibold uppercase tracking-[0.12em] text-white/22">
                          Soon
                        </span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border px-3 py-3 text-sm font-medium transition duration-150 ${
                        active
                          ? "border-[#f26a2e]/18 bg-[#f26a2e]/[0.075] text-white"
                          : "border-transparent text-white/62 hover:border-white/[0.07] hover:bg-white/[0.035] hover:text-white"
                      }`}
                    >
                      {active && (
                        <div className="absolute bottom-2.5 left-0 top-2.5 w-[2px] rounded-r-full bg-[#f26a2e]" />
                      )}

                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          active
                            ? "bg-[#f26a2e]/10"
                            : "bg-white/[0.02]"
                        }`}
                      >
                        <Icon
                          size={16}
                          strokeWidth={1.8}
                          className={
                            active
                              ? "text-[#f26a2e]"
                              : "text-white/42 transition-colors group-hover:text-white/70"
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

      {/* Bottom */}

      <div className="border-t border-white/[0.08] bg-black/20 p-4">
        <div className="flex cursor-default items-center justify-between rounded-xl px-3 py-3 text-sm text-white/28">
          <div className="flex items-center gap-3">
            <Settings
              size={16}
              strokeWidth={1.7}
              className="text-white/22"
            />

            <span>Settings</span>
          </div>

          <span className="rounded-full border border-white/[0.06] px-2 py-1 text-[0.45rem] font-semibold uppercase tracking-[0.12em] text-white/22">
            Soon
          </span>
        </div>

        <Link
          href="/"
          className="group mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-white/55 transition hover:bg-white/[0.035] hover:text-white"
        >
          <Globe2
            size={16}
            strokeWidth={1.7}
            className="text-[#f26a2e]"
          />

          <span>Drylake website</span>

          <span className="ml-auto text-white/30">↗</span>
        </Link>

        <div className="mt-4 rounded-xl border border-[#f26a2e]/15 bg-[#f26a2e]/[0.04] px-3.5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f26a2e] opacity-20" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#f26a2e]" />
            </span>

            <span className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-white/45">
              Secure admin session
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}