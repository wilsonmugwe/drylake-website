import BrandHomeLink from "@/components/brand/BrandHomeLink";
import DrylakeWordmark from "@/components/brand/DrylakeWordmark";
import SiteLink from "@/components/navigation/SiteLink";
import Container from "@/components/ui/Container";
import { ENTITY } from "@/lib/discovery/entity";
import { FOOTER_COLUMNS } from "@/lib/navigation/services-menu";
import { BUSINESS_PHONE } from "@/lib/site";

/*
 * Shared footer, composed as the page's full stop (experience polish, 2026-10-07): the site map
 * (every service page, Perth, legal) and direct contact, then one closing line: the canonical
 * wordmark, cropped where it sits on the horizon (its y tail dips below the line and is cut),
 * with the corporate details beside it. Desktop: the wordmark takes two thirds of the row instead
 * of a full-width band; phones: full width, about 60 px tall. Link rows are 44 px tap targets on
 * touch sizes and 34 px on desktop. The large wordmark is decorative (the home link above carries
 * the name). Links use SiteLink so "home" and section links behave exactly like the header's.
 */
export default function Footer() {
  return (
    <footer className="surface-ink overflow-hidden">
      <Container className="pt-10 sm:pt-14 lg:pt-16">
        <div className="grid gap-8 sm:gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <BrandHomeLink size="footer" />

            <p className="mt-4 flex items-center gap-2 text-sm text-white/60">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-signal" />
              Perth, Western Australia
            </p>

            <div className="mt-3 flex flex-wrap gap-x-6 text-sm text-white/70 lg:flex-col">
              <a href="mailto:hello@drylake.com.au" className="inline-flex min-h-[44px] w-fit items-center hover:text-white lg:min-h-[34px]">
                hello@drylake.com.au
              </a>
              <a href={BUSINESS_PHONE.href} className="inline-flex min-h-[44px] w-fit items-center hover:text-white lg:min-h-[34px]">
                {BUSINESS_PHONE.display}
              </a>
            </div>
          </div>

          <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:col-span-8 lg:col-start-5">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title}>
                <p className="tech-label text-white/58">{column.title}</p>
                <ul className="mt-2">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <SiteLink
                        href={link.href}
                        className="inline-flex min-h-[44px] items-center text-sm text-white/68 transition-colors hover:text-white lg:min-h-[34px]"
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

        {/* The full stop: the wordmark sits on the horizon and is cropped by it. */}
        <div className="mt-10 grid items-end gap-x-8 gap-y-5 sm:mt-14 lg:grid-cols-12">
          <div aria-hidden="true" className="hz-footer-mark lg:col-span-8">
            <DrylakeWordmark tone="dark" label={null} height={120} className="hz-footer-word" />
          </div>

          <div className="flex flex-col gap-1.5 pb-4 text-xs leading-5 text-white/60 lg:col-span-4 lg:items-end lg:pb-5 lg:text-right">
            <p>
              {ENTITY.brand} is the trading name of {ENTITY.legalName}
            </p>
            <p>
              ABN {ENTITY.abn} · {ENTITY.locality}, {ENTITY.region}
            </p>
            <p>
              © {new Date().getFullYear()} {ENTITY.legalName}.
            </p>
          </div>
        </div>
      </Container>

      <div className="hz-footer-horizon border-t border-white/22 pb-[max(1.25rem,var(--safe-bottom))]" />
    </footer>
  );
}
