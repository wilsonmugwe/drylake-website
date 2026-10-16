/*
 * PR 8 (2026-10-16): navigation and conversion. The Services dropdown is DERIVED from the
 * services data (never a second hand-kept list), the primary nav stays within the landing-page
 * limit of six items plus the CTA, and the footer is a navigation hub. Source-level checks pin the
 * wiring; the keyboard and layout behaviour is proven in tests/e2e/navigation-dropdown.spec.ts.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { FOOTER_COLUMNS, SERVICES_MENU } from "../lib/navigation/services-menu.ts";
import { PRIMARY_CTA, PRIMARY_CTA_NOTE, PRIMARY_NAV } from "../lib/navigation/site-nav.ts";
import { SERVICES, SERVICES_PATH } from "../lib/discovery/services.ts";
import { BUSINESS_PHONE } from "../lib/site.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("primary navigation data", () => {
  it("has at most six items (landing-page Pattern 6), CTA separate", () => {
    assert.ok(PRIMARY_NAV.length <= 6, `${PRIMARY_NAV.length} items`);
    assert.ok(!PRIMARY_NAV.some((item) => item.href === PRIMARY_CTA.href), "the CTA is not also a nav item");
  });

  it("Services is a menu whose children are derived from the services data plus All services", () => {
    const services = PRIMARY_NAV.find((item) => item.label === "Services");
    assert.equal(services?.menu, true, "Services carries a menu");
    assert.equal(services.href, SERVICES_PATH);

    const links = SERVICES_MENU.links;
    assert.deepEqual(
      links.slice(0, SERVICES.length).map((link) => [link.label, link.href]),
      SERVICES.map((service) => [service.name, service.path])
    );
    assert.deepEqual(links.at(-1), { label: "All services", href: SERVICES_PATH });
    assert.equal(links.length, SERVICES.length + 1);
  });

  it("separates what we build (Services) from business problems (Solutions)", () => {
    const labels = PRIMARY_NAV.map((item) => item.label);
    assert.ok(labels.includes("Services") && labels.includes("Solutions"));
    assert.equal(PRIMARY_NAV.find((item) => item.label === "Solutions")?.href, "/solutions");
    assert.match(SERVICES_MENU.descriptor, /build/i);
    assert.match(SERVICES_MENU.solutionsHint, /problem/i);
  });

  it("links Perth, and keeps existing URLs", () => {
    assert.equal(PRIMARY_NAV.find((item) => item.label === "Perth")?.href, "/perth");
    assert.equal(PRIMARY_NAV.find((item) => item.label === "Contact")?.href, "/contact");
    assert.equal(PRIMARY_CTA.label, "Start Free Consultation");
    assert.equal(PRIMARY_CTA.href, "/consultation");
  });

  it("uses no em dash in any visitor-facing nav string", () => {
    const strings = JSON.stringify({ PRIMARY_NAV, SERVICES_MENU, FOOTER_COLUMNS, PRIMARY_CTA_NOTE });
    assert.ok(!strings.includes("—"));
  });
});

describe("footer as a navigation hub", () => {
  const hrefs = FOOTER_COLUMNS.flatMap((column) => column.links.map((link) => link.href));

  it("carries services (all five + index), solutions, Perth, about, contact, consultation, privacy, terms", () => {
    for (const service of SERVICES) assert.ok(hrefs.includes(service.path), service.path);
    for (const href of [SERVICES_PATH, "/solutions", "/perth", "/about", "/contact", "/consultation", "/privacy", "/terms"]) {
      assert.ok(hrefs.includes(href), href);
    }
  });

  it("links the Security & Privacy page (PR #84) next to the privacy policy", () => {
    assert.ok(hrefs.includes("/security-privacy"));
    assert.ok(hrefs.includes("/privacy"));
  });

  it("has no duplicate destinations within the footer", () => {
    assert.equal(new Set(hrefs).size, hrefs.length);
  });
});

describe("components wiring", () => {
  it("the header (server wrapper) derives the menu from data; the client header renders it and still maps PRIMARY_NAV", () => {
    assert.match(code("components/layout/Navbar.tsx"), /SERVICES_MENU/);
    const navbar = code("components/layout/NavbarClient.tsx");
    assert.match(navbar, /<ServicesMenu\b/);
    assert.match(navbar, /PRIMARY_NAV\.map/);
  });

  it("the services menu is an accessible disclosure with hover intent", () => {
    const menu = code("components/navigation/ServicesMenu.tsx");
    assert.match(menu, /aria-expanded/);
    assert.match(menu, /aria-controls/);
    assert.match(menu, /"Escape"/);
    assert.match(menu, /"ArrowDown"/);
    assert.match(menu, /setTimeout/, "hover intent uses a delay");
    assert.match(menu, /menu\.links/);
    assert.ok(!/from "next\/link"/.test(menu), "links go through SiteLink");
  });

  it("the mobile menu has an expandable Services group using the same data and the tap-to-call link", () => {
    const menu = code("components/layout/MobileMenu.tsx");
    assert.match(menu, /aria-expanded/);
    assert.match(menu, /aria-controls/);
    assert.match(menu, /servicesMenu\.links/);
    assert.match(menu, /BUSINESS_PHONE\.href/);
  });

  it("the services copy stays out of the client bundle (site-nav.ts is imported by client components)", () => {
    for (const file of ["lib/navigation/site-nav.ts", "components/layout/NavbarClient.tsx", "components/navigation/ServicesMenu.tsx"]) {
      assert.ok(!/discovery\/(services|entity)/.test(code(file)), file);
    }
  });

  it("only the verified business line is used for click-to-call", () => {
    assert.equal(BUSINESS_PHONE.href, "tel:+61433448000");
    assert.equal(BUSINESS_PHONE.display, "0433 448 000");
  });

  it("PRIMARY_CTA_NOTE stays defined for pages that put the CTA beside body copy", () => {
    assert.match(PRIMARY_CTA_NOTE, /Free 30-minute consultation/);
  });
});
