import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import Container from "@/components/ui/Container";
import {
  AREA_REGIONS,
  AREA_TYPES,
  SERVICE_AREAS,
  areaHref,
  isStandalone,
  type AreaRegion,
  type AreaType,
} from "@/lib/service-areas";

/*
 * The Perth service-area directory (server-rendered, crawlable, no client JS). Every area in
 * lib/service-areas.ts appears twice: as a link in the A to Z index, and as an entry grouped by
 * region and type. Standalone areas link to their own page; every other area links to its entry
 * here (#area-<slug>), so no thin per-suburb page exists.
 */
const REGION_ORDER = Object.keys(AREA_REGIONS) as AreaRegion[];
const TYPE_ORDER = Object.keys(AREA_TYPES) as AreaType[];

const ALPHABETICAL = [...SERVICE_AREAS].sort((a, b) => a.name.localeCompare(b.name, "en-AU"));

export default function AreaDirectory() {
  return (
    <>
      <section id="areas" aria-labelledby="areas-heading" className="bg-white py-(--section-y-compact) text-black">
        <Container>
          <div className="grid gap-5 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
            <p className="section-label text-black/60">Service areas</p>

            <div>
              <h2 id="areas-heading" className="max-w-4xl text-3xl font-semibold tracking-[-0.05em] sm:text-4xl lg:text-5xl">
                Businesses we work with across Perth
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-black/65">
                Drylake works with businesses in all of these areas, remotely and on site by arrangement. It has no office in any of them.
                Areas with a page of their own link straight to it; the rest are described in the directory below.
              </p>
            </div>
          </div>

          <nav aria-label="Service areas A to Z" className="mt-8 border-t border-black/10 pt-6 sm:mt-10">
            <ul className="flex flex-wrap gap-x-1 gap-y-0">
              {ALPHABETICAL.map((area) => (
                <li key={area.slug}>
                  <Link
                    href={areaHref(area)}
                    className="inline-flex min-h-[44px] items-center px-2 text-sm font-medium text-black/75 underline decoration-black/25 underline-offset-4 hover:text-black hover:decoration-black"
                  >
                    {area.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </section>

      {REGION_ORDER.map((region, index) => {
        const inRegion = SERVICE_AREAS.filter((area) => area.region === region);

        if (inRegion.length === 0) return null;

        return (
          <section
            key={region}
            id={`region-${region}`}
            aria-labelledby={`region-${region}-heading`}
            className={`${index % 2 === 0 ? "mineral-texture bg-[#f2f0e9]" : "bg-white"} py-(--section-y-compact) text-black`}
          >
            <Container>
              <div className="grid gap-5 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
                <p className="section-label text-black/60">{inRegion.length} areas</p>

                <div>
                  <h2 id={`region-${region}-heading`} className="max-w-4xl text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
                    {AREA_REGIONS[region].label}
                  </h2>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-black/65">{AREA_REGIONS[region].blurb}</p>
                </div>
              </div>

              {TYPE_ORDER.map((type) => {
                const areas = inRegion.filter((area) => area.type === type);

                if (areas.length === 0) return null;

                return (
                  <div key={type} className="mt-8">
                    <h3 className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-black/60">{AREA_TYPES[type].label}</h3>

                    <ul className="mt-3 grid gap-x-10 border-t border-black/10 md:grid-cols-2">
                      {areas.map((area) => (
                        <li key={area.slug} id={`area-${area.slug}`} className="scroll-mt-28 border-b border-black/10 py-4">
                          {isStandalone(area.slug) ? (
                            <Link
                              href={areaHref(area)}
                              className="group inline-flex min-h-[44px] items-center gap-2 text-lg font-semibold tracking-[-0.03em] underline decoration-black/25 underline-offset-4 hover:decoration-black"
                            >
                              {area.name}
                              <ArrowUpRight aria-hidden="true" size={16} className="text-black/50 group-hover:text-(--orange-ink)" />
                            </Link>
                          ) : (
                            <h4 className="flex min-h-[44px] items-center text-lg font-semibold tracking-[-0.03em]">{area.name}</h4>
                          )}
                          <p className="text-sm leading-6 text-black/65">{area.context}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </Container>
          </section>
        );
      })}
    </>
  );
}
