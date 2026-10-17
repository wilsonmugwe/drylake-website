import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import Container from "@/components/ui/Container";
import { SERVICES } from "@/lib/discovery/services";
import { HOME_SERVICE_ROWS, HOME_SERVICES_EYEBROW } from "@/lib/home/copy";

/*
 * 02 · What we build: five giant type rows (Instrument-style: the services are the headline).
 * Each row is one link to its service page, so the homepage keeps an internal link to every
 * service (tested). Hover/focus: the word shifts to signal and the arrow moves; no hidden content.
 * The id "services" is the hero's "What we build" target; "solutions" stays for older links.
 */
export default function HomeServices() {
  return (
    <section id="services" aria-labelledby="what-we-build" className="eg-ground scroll-mt-24">
      <span id="solutions" aria-hidden="true" />
      <Container className="pb-24 pt-8 sm:pb-32 lg:pb-36">
        <h2 id="what-we-build" className="eg-eyebrow eg-signal-text">
          {HOME_SERVICES_EYEBROW}
        </h2>
        <ul className="mt-10">
          {HOME_SERVICE_ROWS.map((row, i) => {
            const service = SERVICES.find((s) => s.slug === row.slug);
            if (!service) throw new Error(`HOME_SERVICE_ROWS: unknown service ${row.slug}`);
            return (
              <li key={row.slug} className="eg-rule last:border-b last:border-b-[#2a2824]">
                {/* The visible text is the accessible name (WCAG 2.5.3): word, then its line. */}
                <Link href={service.path} className="eg-row group">
                  <span aria-hidden="true" className="eg-row-num">0{i + 1}</span>
                  <span className="eg-row-word">{row.word} </span>
                  <span className="eg-row-line">
                    {row.line}
                    <ArrowUpRight aria-hidden="true" size={20} className="eg-row-arrow" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <Link href="/services" className="eg-link mt-8 inline-flex min-h-[44px] items-center gap-2">
          All services
          <ArrowUpRight aria-hidden="true" size={16} />
        </Link>
      </Container>
    </section>
  );
}
