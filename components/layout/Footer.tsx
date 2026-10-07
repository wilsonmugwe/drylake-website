import BrandHomeLink from "@/components/brand/BrandHomeLink";
import DrylakeWordmark from "@/components/brand/DrylakeWordmark";
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
 * Shared footer, composed as the page's ending: the site map (every service page, Perth,
 * legal) and direct contact first, then the canonical wordmark at full width, cropped where it
 * meets the horizon (its y tail dips below the line and is cut there), then the corporate line
 * beneath. The large wordmark is decorative (the home link above carries the name), and it
 * scales with the width, so the footer stays compact on phones.
 * Links use SiteLink so "home" and section links behave exactly like the header's.
 */
export default function Footer() {
  return (
    <footer className="surface-ink overflow-hidden">
      <Container className="pt-14 sm:pt-20">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <BrandHomeLink size="footer" />

            <p className="mt-5 flex items-center gap-2 text-sm text-white/60">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-signal" />
              Perth, Western Australia
            </p>

            <div className="mt-6 flex flex-col text-sm text-white/70">
              <a href="mailto:hello@drylake.com.au" className="inline-flex min-h-[44px] w-fit items-center hover:text-white">
                hello@drylake.com.au
              </a>
              <a href="tel:+61420565457" className="inline-flex min-h-[44px] w-fit items-center hover:text-white">
                +61 420 565 457
              </a>
            </div>
          </div>

          <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-x-6 gap-y-10 lg:col-span-6 lg:col-start-7">
            {columns.map((column) => (
              <div key={column.title}>
                <p className="tech-label text-white/58">{column.title}</p>
                <ul className="mt-3">
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

        {/* The ending: the wordmark sits on the horizon and is cropped by it. */}
        <div aria-hidden="true" className="hz-footer-mark mt-14 sm:mt-20">
          <DrylakeWordmark tone="dark" label={null} height={120} className="hz-footer-word" />
        </div>
      </Container>

      <div className="border-t border-white/22">
        <Container>
          <div className="flex flex-col gap-2 py-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {ENTITY.brand} is the trading name of {ENTITY.legalName} · ABN {ENTITY.abn} ·{" "}
              {ENTITY.locality}, {ENTITY.region}
            </p>

            <p>
              © {new Date().getFullYear()} {ENTITY.legalName}.
            </p>
          </div>
        </Container>
      </div>
    </footer>
  );
}
