import Image from "next/image";

import DrylakeMark from "@/components/brand/DrylakeMark";
import SiteLink from "@/components/navigation/SiteLink";
import Container from "@/components/ui/Container";
import { ENTITY, SERVICES, SERVICES_PATH } from "@/lib/discovery/entity";
import { CLIENT_LOGIN } from "@/lib/navigation/site-nav";

const columns = [
  {
    title: "What we do",
    links: [
      { label: "What We Do", href: "/solutions" },
      { label: "Services", href: SERVICES_PATH },
      ...SERVICES.map((service) => ({ label: service.name, href: service.path })),
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Our Approach", href: "/#approach" },
      { label: "About", href: "/about" },
      { label: "Perth", href: "/perth" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy", href: "/privacy" },
      { label: CLIENT_LOGIN.label, href: CLIENT_LOGIN.href },
    ],
  },
];

/*
 * Shared footer: the site map (every service page, Perth, legal) under a large wordmark.
 * Links use SiteLink so "home" and section links behave exactly like the header's.
 */
export default function Footer() {
  return (
    <footer className="surface-ink border-t border-white/10">
      <Container className="pt-16 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SiteLink href="/" aria-label="Drylake — Home" className="inline-flex min-h-[44px] items-center gap-4">
              <DrylakeMark surface="#0b0b0a" className="h-[44px] w-[44px] sm:h-[54px] sm:w-[54px]" />
              <Image
                src="/brand/drylake-wordmark-dark-bg.svg"
                alt=""
                width={1657}
                height={516}
                unoptimized
                className="h-[44px] w-auto sm:h-[56px]"
              />
            </SiteLink>

            <p className="mt-5 flex items-center gap-2 text-sm text-white/60">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
              Perth, Western Australia
            </p>

            <div className="mt-8 flex flex-col text-sm text-white/70">
              <a href="mailto:hello@drylake.com.au" className="inline-flex min-h-[44px] w-fit items-center hover:text-white">
                hello@drylake.com.au
              </a>
              <a href="tel:+61420565457" className="inline-flex min-h-[44px] w-fit items-center hover:text-white">
                +61 420 565 457
              </a>
            </div>
          </div>

          <nav aria-label="Footer navigation" className="grid gap-10 sm:grid-cols-2 lg:col-span-6 lg:col-start-7">
            {columns.map((column) => (
              <div key={column.title}>
                <p className="tech-label text-white/58">{column.title}</p>
                <ul className="mt-4">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <SiteLink
                        href={link.href}
                        className="inline-flex min-h-[44px] items-center text-sm text-white/68 transition-colors hover:text-white"
                      >
                        {link.label}
                      </SiteLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-16 flex flex-col gap-2 border-t border-white/[0.08] py-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
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
