import {
  Building2,
  CalendarClock,
  CreditCard,
  FileText,
  FolderKanban,
  Handshake,
  LayoutDashboard,
  type LucideIcon,
  Receipt,
} from "lucide-react";

/*
 * Admin navigation, declared once for the sidebar and the mobile drawer (they used to carry
 * two copies of the same list). Presentation only: every route here already exists and
 * enforces requirePlatformAdmin itself; showing or hiding a link grants nothing.
 */
export type AdminNavItem = { label: string; href: string; icon: LucideIcon };

export const ADMIN_NAV_GROUPS: Array<{ label: string; items: AdminNavItem[] }> = [
  {
    label: "Operations",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Consultations", href: "/admin/consultations", icon: CalendarClock },
      { label: "Collaborations", href: "/admin/collaborations", icon: Handshake },
    ],
  },
  {
    label: "Clients and delivery",
    items: [
      { label: "Clients", href: "/admin/clients", icon: Building2 },
      { label: "Projects", href: "/admin/projects", icon: FolderKanban },
      { label: "Documents", href: "/admin/documents", icon: FileText },
    ],
  },
  {
    label: "Billing",
    items: [
      { label: "Invoices", href: "/admin/invoices", icon: Receipt },
      { label: "Payments", href: "/admin/payments", icon: CreditCard },
    ],
  },
];

export function isAdminNavActive(pathname: string | null, href: string) {
  if (!pathname) {
    return false;
  }

  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
