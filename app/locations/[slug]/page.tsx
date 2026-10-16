import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import ContactCTA from "@/components/sections/ContactCTA";
import ServiceIndex from "@/components/sections/ServiceIndex";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import Container from "@/components/ui/Container";
import PrimaryCta from "@/components/ui/PrimaryCta";
import { ENTITY, PERTH_PATH, SERVICES, findService } from "@/lib/discovery/entity";
import { locationServiceNode } from "@/lib/discovery/location-structured-data";
import { breadcrumbNode, faqNode, webPageNode } from "@/lib/discovery/structured-data";
import { PRIMARY_CTA, PRIMARY_CTA_NOTE } from "@/lib/navigation/site-nav";
import { pageMetadata } from "@/lib/seo";
import { LOCATION_PAGES, locationPageSeo } from "@/lib/service-area-pages";
import { STANDALONE_AREA_SLUGS, areaHref, findArea, locationPath } from "@/lib/service-areas";

/*
 * Standalone service-area pages (first batch, lib/service-areas.ts STANDALONE_AREA_SLUGS).
 * Statically generated, server-rendered. Unknown slugs 404, so a suburb without distinct
 * content in lib/service-area-pages.ts can never become a thin doorway page.
 *
 * Honest by construction: the service-area line states there is no office in the suburb,
 * examples are framed as examples (copy lives in lib/service-area-pages.ts, guarded by
 * tests/service-areas.test.mjs), structured data is a Service with areaServed and never
 * LocalBusiness, an address, reviews or ratings.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return STANDALONE_AREA_SLUGS.map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

const STEPS = [
  { title: "Free 30-minute consultation", text: "We talk through how the business runs today and where time is being lost. No technical brief is needed." },
  { title: "Map the workflow", text: "Before anything is built we map the real process, so the system fits how your team already works." },
  { title: "Build in stages", text: "The most useful part comes first, so you can use it while the next part is built." },
  { title: "Support after launch", text: "Drylake stays available for fixes and changes once the work is live." },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  if (!STANDALONE_AREA_SLUGS.includes(slug)) return {};

  const seo = locationPageSeo(slug);

  return pageMetadata({ ...seo });
}

export default async function LocationPage({ params }: Props) {
  const { slug } = await params;
  const area = findArea(slug);
  const page = LOCATION_PAGES[slug];

  if (!area || !page || !STANDALONE_AREA_SLUGS.includes(slug)) notFound();

  const seo = locationPageSeo(slug);
  const path = locationPath(slug);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Perth", path: PERTH_PATH },
    { name: area.name, path },
  ];
  const nearby = page.nearby.map((nearbySlug) => findArea(nearbySlug)).filter((entry) => entry !== undefined);

  return (
    <>
      <JsonLd
        nodes={[
          webPageNode({ path, name: seo.title, description: seo.description, breadcrumb: crumbs }),
          breadcrumbNode(path, crumbs),
          locationServiceNode(slug),
          faqNode(path, page.faqs),
        ]}
      />

      <Navbar />

      <main id="main-content" tabIndex={-1} className="bg-white text-black outline-none">
        <Container className="pb-(--section-y-compact) pt-(--page-top) sm:pb-20">
          <Breadcrumbs crumbs={crumbs} />

          <p className="section-label mt-6 text-black/60 sm:mt-10">{page.eyebrow}</p>

          <h1 className="type-section text-balance mt-5 max-w-5xl">{page.headline}</h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-black/65 sm:text-lg sm:leading-8">{page.intro}</p>

          <PrimaryCta href={PRIMARY_CTA.href} surface="light" className="mt-8">
            {PRIMARY_CTA.label}
          </PrimaryCta>
          <p className="mt-3 text-sm leading-6 text-black/60">{PRIMARY_CTA_NOTE}</p>

          {/* The honest service-area line, on every location page. */}
          <p className="mt-6 max-w-2xl border-l-2 border-black/15 pl-4 text-sm leading-6 text-black/70">
            {ENTITY.brand} is based in {ENTITY.locality} and has no office in {area.name}. It works with businesses in{" "}
            {area.name} remotely, and on site by arrangement.
          </p>
        </Container>

        <section aria-labelledby="mix-heading" className="mineral-texture bg-[#f2f0e9] py-(--section-y-compact)">
          <Container>
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <h2 id="mix-heading" className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                {page.mixHeading}
              </h2>

              <div className="space-y-5 text-base leading-7 text-black/70">
                {page.mix.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                <p className="border-t border-black/10 pt-5 text-sm leading-6 text-black/65">{area.context}</p>
              </div>
            </div>
          </Container>
        </section>

        <section aria-labelledby="fits-heading" className="py-(--section-y-compact)">
          <Container>
            <h2 id="fits-heading" className="max-w-3xl text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
              {page.fitsHeading}
            </h2>

            <ul className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
              {page.fits.map((fit) => (
                <li key={fit.who} className="border-t border-black/15 pt-6">
                  <h3 className="text-xl font-semibold tracking-[-0.03em]">{fit.who}</h3>
                  <p className="mt-2 text-base leading-7 text-black/70">{fit.example}</p>
                  <p className="mt-3 text-sm leading-6 text-black/60">
                    Relevant services:{" "}
                    {fit.services.map((serviceSlug, index) => {
                      const service = findService(serviceSlug);

                      return service ? (
                        <span key={serviceSlug}>
                          {index > 0 ? ", " : ""}
                          <Link href={service.path} className="inline-flex min-h-[44px] items-center underline underline-offset-4">
                            {service.name}
                          </Link>
                        </span>
                      ) : null;
                    })}
                  </p>
                </li>
              ))}
            </ul>

            <p className="mt-8 max-w-3xl text-sm leading-6 text-black/60">{page.examplesNote}</p>
          </Container>
        </section>

        <ServiceIndex
          id="location-services"
          tone="warm"
          label="What we build"
          heading={`Five ways Drylake can help a business in ${area.name}`}
          intro="The same five service lines are available to businesses everywhere in Perth. The examples above show where each tends to fit."
          services={SERVICES}
          showAllLink
        />

        <section aria-labelledby="process-heading" className="bg-black py-(--section-y-compact) text-white">
          <Container>
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div>
                <p className="section-label text-white/55">How it works</p>
                <h2 id="process-heading" className="mt-4 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                  {page.localHeading}
                </h2>
                <p className="mt-5 text-base leading-7 text-white/70">{page.localNote}</p>
              </div>

              <ol className="divide-y divide-white/10 border-y border-white/10">
                {STEPS.map((step, index) => (
                  <li key={step.title} className="flex gap-4 py-4 text-base leading-7 text-white/75">
                    <span aria-hidden="true" className="font-mono text-sm text-white/70">{`0${index + 1}`}</span>
                    <span>
                      <span className="block font-semibold text-white">{step.title}</span>
                      {step.text}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </Container>
        </section>

        <section aria-labelledby="location-faq-heading" className="py-(--section-y-compact)">
          <Container>
            <h2 id="location-faq-heading" className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
              Questions from {area.name} businesses
            </h2>

            <div className="mt-8 divide-y divide-black/10 border-y border-black/10">
              {page.faqs.map((faq) => (
                <details key={faq.question} className="py-3">
                  <summary className="flex min-h-[44px] cursor-pointer list-none items-center text-lg font-medium tracking-[-0.02em]">
                    {faq.question}
                  </summary>
                  <p className="mt-3 max-w-3xl text-base leading-7 text-black/65">{faq.answer}</p>
                </details>
              ))}
            </div>

            <h3 className="mt-12 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-black/60">Nearby areas</h3>
            <ul className="mt-2 flex flex-wrap gap-x-1">
              {nearby.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={areaHref(entry)}
                    className="inline-flex min-h-[44px] items-center px-2 text-base font-medium underline decoration-black/30 underline-offset-4 hover:decoration-black"
                  >
                    {entry.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={PERTH_PATH}
                  className="inline-flex min-h-[44px] items-center px-2 text-base font-medium underline decoration-black/30 underline-offset-4 hover:decoration-black"
                >
                  All Perth service areas
                </Link>
              </li>
            </ul>

            <p className="mt-10 max-w-3xl text-sm leading-6 text-black/60">
              {ENTITY.brand} is the trading name of {ENTITY.legalName} (ABN {ENTITY.abn}).{" "}
              <Link href="/about" className="underline underline-offset-4">
                About Drylake and its founders
              </Link>
              .
            </p>
          </Container>
        </section>

        <ContactCTA />
      </main>

      <Footer />
    </>
  );
}
