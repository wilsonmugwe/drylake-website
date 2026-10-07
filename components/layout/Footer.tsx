import Image from "next/image";
import Link from "next/link";

import Container from "@/components/ui/Container";
import { ENTITY, SERVICES, SERVICES_PATH } from "@/lib/discovery/entity";

const links = [
  {
    label: "What We Do",
    href: "/solutions",
  },
  {
    label: "Services",
    href: SERVICES_PATH,
  },
  ...SERVICES.map((service) => ({ label: service.name, href: service.path })),
  {
    label: "How We Work",
    href: "/#approach",
  },
  {
    label: "About",
    href: "/about",
  },
  {
    label: "Perth",
    href: "/perth",
  },
  {
    label: "Contact",
    href: "/contact",
  },
  {
    label: "Privacy",
    href: "/privacy",
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black text-white">
      <Container>
        <div className="grid gap-6 py-7 sm:grid-cols-[0.8fr_1.2fr] sm:items-end sm:py-9 lg:grid-cols-[0.55fr_1.45fr]">
          {/* Brand */}
          <div>
            <Link
              href="/"
              aria-label="Drylake home"
              className="inline-flex"
            >
              <Image
                src="/brand/drylake-wordmark-dark-bg.svg"
                alt="Drylake"
                width={1657}
                height={516}
                unoptimized
                className="h-[28px] w-auto sm:h-[32px]"
              />
            </Link>

            <p className="mt-1 text-xs text-white/55">
              Perth, Western Australia
            </p>
          </div>

          <div className="sm:text-right">
            <nav
              aria-label="Footer navigation"
              className="flex flex-wrap gap-x-5 gap-y-2 sm:justify-end"
            >
              {links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-xs text-white/45 transition-colors hover:text-white sm:text-sm"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Both links are 44px touch targets (WCAG 2.5.8); no gap, so the visual spacing stays close. */}
            <div className="mt-4 flex flex-col text-xs text-white/55 sm:items-end">
              <a
                href="mailto:hello@drylake.com.au"
                className="inline-flex min-h-[44px] items-center transition-colors hover:text-white"
              >
                hello@drylake.com.au
              </a>

              <a
                href="tel:+61420565457"
                className="inline-flex min-h-[44px] items-center transition-colors hover:text-white"
              >
                +61 420 565 457
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1 border-t border-white/[0.08] py-4 text-[0.65rem] text-white/55 sm:flex-row sm:items-center sm:justify-between sm:text-xs">
          <p>
            {ENTITY.brand} is the trading name of {ENTITY.legalName} · ABN {ENTITY.abn} ·{" "}
            {ENTITY.locality}, {ENTITY.region}
          </p>

          <p>
            © {new Date().getFullYear()} {ENTITY.legalName}.
          </p>
        </div>
      </Container>
    </footer>
  );
}