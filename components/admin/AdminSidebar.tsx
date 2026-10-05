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
    <aside className="hidden h-screen w-[270px] shrink-0 border-r border-white/[0.07] bg-[#070707] lg:sticky lg:top-0 lg:flex lg:flex-col">
      {/* =====================================================
          BRAND
      ===================================================== */}

      <div className="border-b border-white/[0.07] px-6 py-7">
        <Link href="/admin" className="group block">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f26a2e]/20 bg-[#f26a2e]/[0.06]">
              <ShieldCheck
                size={17}
                strokeWidth={1.7}
                className="text-[#f26a2e]"
              />
            </div>

            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white">
                Drylake
              </p>

              <p className="mt-1 text-[0.55rem] font-medium uppercase tracking-[0.18em] text-white/25">
                Administration
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* =====================================================
          NAVIGATION
      ===================================================== */}

      <nav className="flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-7">
          {navigation.map((group, groupIndex) => (
            <div key={group.label ?? groupIndex}>
              {group.label && (
                <p className="mb-2 px-3 text-[0.52rem] font-semibold uppercase tracking-[0.2em] text-white/20">
                  {group.label}
                </p>
              )}

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isRouteActive(pathname, item.href);

                  if (item.disabled) {
                    return (
                      <div
                        key={item.href}
                        className="flex cursor-default items-center justify-between rounded-xl px-3 py-2.5 text-sm text-white/20"
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={16} strokeWidth={1.7} />

                          <span>{item.label}</span>
                        </div>

                        <span className="text-[0.46rem] font-semibold uppercase tracking-[0.12em] text-white/15">
                          Soon
                        </span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm transition duration-200 ${
                        active
                          ? "bg-white/[0.055] text-white"
                          : "text-white/40 hover:bg-white/[0.025] hover:text-white/75"
                      }`}
                    >
                      {active && (
                        <div className="absolute bottom-2 left-0 top-2 w-[2px] rounded-full bg-[#f26a2e]" />
                      )}

                      <Icon
                        size={16}
                        strokeWidth={1.7}
                        className={
                          active
                            ? "text-[#f26a2e]"
                            : "text-white/30 transition-colors group-hover:text-white/60"
                        }
                      />

                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* =====================================================
          BOTTOM
      ===================================================== */}

      <div className="border-t border-white/[0.07] p-4">
        <div className="space-y-1">
          <div className="flex cursor-default items-center justify-between rounded-xl px-3 py-2.5 text-sm text-white/20">
            <div className="flex items-center gap-3">
              <Settings size={16} strokeWidth={1.7} />

              <span>Settings</span>
            </div>

            <span className="text-[0.46rem] font-semibold uppercase tracking-[0.12em] text-white/15">
              Soon
            </span>
          </div>

          <Link
            href="/"
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/35 transition hover:bg-white/[0.025] hover:text-white/70"
          >
            <Globe2
              size={16}
              strokeWidth={1.7}
              className="text-white/25 transition group-hover:text-[#f26a2e]"
            />

            <span>Drylake website</span>

            <span className="ml-auto text-white/20">↗</span>
          </Link>
        </div>

        <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.015] px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#f26a2e] opacity-20" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#f26a2e]" />
            </span>

            <span className="text-[0.58rem] font-medium uppercase tracking-[0.14em] text-white/30">
              Admin session
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}