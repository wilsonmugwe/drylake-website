/*
 * Navigation data DERIVED from the services data (PR 8, 2026-10-16). PURE, no React. Server-side
 * only by convention: components/layout/Navbar.tsx and Footer.tsx (server components) import this
 * and hand plain props to the client header, so the full services copy never reaches the browser.
 *
 * A new service page appears in the header dropdown, the mobile menu and the footer the moment it
 * is added to lib/discovery/services.ts. There is no second hand-kept list.
 */

import { SERVICES, SERVICES_PATH } from "../discovery/services.ts";
import {
  CONSULTATION_PATH,
  CONTACT_PATH,
  SERVICES_MENU_COPY,
  type NavItem,
  type ServicesMenuData,
} from "./site-nav.ts";

export type { ServicesMenuData };

export const SERVICES_MENU: ServicesMenuData = {
  ...SERVICES_MENU_COPY,
  links: [
    ...SERVICES.map((service): NavItem => ({ label: service.name, href: service.path })),
    { label: "All services", href: SERVICES_PATH },
  ],
};

/* Footer as a navigation hub: every audience path and legal page, services derived from data. */
export const FOOTER_COLUMNS: readonly { title: string; links: readonly NavItem[] }[] = [
  {
    title: "Services",
    links: [SERVICES_MENU.links[SERVICES_MENU.links.length - 1], ...SERVICES_MENU.links.slice(0, -1)],
  },
  {
    title: "Company",
    links: [
      { label: "Solutions", href: "/solutions" },
      { label: "Perth service areas", href: "/perth" },
      { label: "About", href: "/about" },
      { label: "Questions", href: "/faq" },
      { label: "Contact", href: CONTACT_PATH },
      { label: "Free consultation", href: CONSULTATION_PATH },
      { label: "Collaborate", href: "/collaborate" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Client Login", href: "/portal" },
    ],
  },
];
