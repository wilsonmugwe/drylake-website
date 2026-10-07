import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import Container from "@/components/ui/Container";
import { SERVICES, SERVICES_PATH, type Service } from "@/lib/discovery/entity";

/*
 * The service lines as a list of real links (server-rendered, crawlable). Used on /services,
 * /solutions, /perth, /about and as "related services" on each service page, so every
 * service page is reachable from several directions without crowding the navbar.
 */
export default function ServiceIndex({
  id = "services",
  label = "Services",
  heading,
  intro,
  services = SERVICES,
  tone = "white",
  showAllLink = false,
  secondaryLink,
}: {
  id?: string;
  label?: string;
  heading: string;
  intro?: string;
  services?: readonly Service[];
  tone?: "white" | "warm";
  showAllLink?: boolean;
  secondaryLink?: { href: string; label: string };
}) {
  const headingId = `${id}-heading`;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={`${tone === "warm" ? "bg-[#f2f0e9]" : "bg-white"} py-16 text-black lg:py-24`}
    >
      <Container>
        <div className="grid gap-5 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
          <p className="section-label text-black/60">{label}</p>

          <div>
            <h2
              id={headingId}
              className="max-w-4xl text-3xl font-semibold tracking-[-0.05em] sm:text-4xl lg:text-5xl"
            >
              {heading}
            </h2>

            {intro ? (
              <p className="mt-4 max-w-2xl text-base leading-7 text-black/65">{intro}</p>
            ) : null}
          </div>
        </div>

        <ul className="mt-10 border-t border-black/10">
          {services.map((service) => (
            <li key={service.slug} className="border-b border-black/10">
              <Link
                href={service.path}
                className="group grid min-h-[64px] gap-2 py-5 sm:grid-cols-[0.8fr_1.2fr_auto] sm:items-center sm:gap-8"
              >
                <span className="text-lg font-semibold tracking-[-0.03em] sm:text-xl">
                  {service.name}
                </span>

                <span className="text-sm leading-6 text-black/60">{service.summary}</span>

                <ArrowUpRight
                  aria-hidden="true"
                  size={18}
                  className="hidden shrink-0 text-black/50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-(--orange-ink) sm:block"
                />
              </Link>
            </li>
          ))}
        </ul>

        {showAllLink || secondaryLink ? (
          <div className="mt-8 flex flex-wrap gap-x-8">
            {showAllLink ? (
              <Link
                href={SERVICES_PATH}
                className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline"
              >
                All services
                <ArrowUpRight aria-hidden="true" size={15} />
              </Link>
            ) : null}

            {secondaryLink ? (
              <Link
                href={secondaryLink.href}
                className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline"
              >
                {secondaryLink.label}
                <ArrowUpRight aria-hidden="true" size={15} />
              </Link>
            ) : null}
          </div>
        ) : null}
      </Container>
    </section>
  );
}
