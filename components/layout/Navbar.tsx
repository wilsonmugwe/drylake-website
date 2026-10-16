import NavbarClient from "@/components/layout/NavbarClient";
import { SERVICES_MENU } from "@/lib/navigation/services-menu";

/*
 * Public header entry point. A server component so the Services dropdown links can be derived
 * from the services data without shipping that data to the browser (see lib/navigation/site-nav.ts).
 * All behaviour lives in NavbarClient.
 */
export default function Navbar() {
  return <NavbarClient servicesMenu={SERVICES_MENU} />;
}
