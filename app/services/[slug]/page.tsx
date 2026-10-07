import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import ContactCTA from "@/components/sections/ContactCTA";
import ServiceIndex from "@/components/sections/ServiceIndex";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import Container from "@/components/ui/Container";
import {
  ENTITY,
  SERVICES,
  SERVICES_PATH,
  findService,
  relatedServices,
} from "@/lib/discovery/entity";
import {
  breadcrumbNode,
  faqNode,
  serviceNode,
  webPageNode,
} from "@/lib/discovery/structured-data";
import { pageMetadata } from "@/lib/seo";
import { serviceShareImage } from "@/lib/seo-pages";

/*
 * One page per service line (lib/discovery/services.ts). Statically generated: no auth, no
 * data, so every crawler gets the same complete HTML. Unknown slugs 404.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = findService((await params).slug);

  if (!service) {
    return {};
  }

  return pageMetadata({
    title: service.title,
    description: service.description,
    path: service.path,
    image: serviceShareImage(service.slug),
    imageAlt: `Drylake: ${service.name} for Australian businesses`,
  });
}

export default async function ServicePage({ params }: Props) {
  const service = findService((await params).slug);

  if (!service) {
    notFound();
  }

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Services", path: SERVICES_PATH },
    { name: service.name, path: service.path },
  ];

  return (
    <>
      <JsonLd
        nodes={[
          webPageNode({
            path: service.path,
            name: service.title,
            description: service.description,
            breadcrumb: crumbs,
          }),
          breadcrumbNode(service.path, crumbs),
          serviceNode(service),
          faqNode(service.path, service.faqs),
        ]}
      />

      <Navbar />

      <main id="main-content" tabIndex={-1} className="bg-white text-black outline-none">
        <Container className="pb-16 pt-32 sm:pb-20 sm:pt-40">
          <Breadcrumbs crumbs={crumbs} />

          <p className="section-label mt-10 text-black/60">{service.name}</p>

          <h1 className="type-section text-balance mt-5 max-w-5xl">
            {service.headline}
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-black/65 sm:text-lg sm:leading-8">
            {service.intro}
          </p>

          <Link
            href="/contact"
            className="btn-signal mt-8"
          >
            <span>Start a Conversation</span>
            <ArrowUpRight aria-hidden="true" size={15} />
          </Link>
        </Container>

        <section aria-labelledby="problem-heading" className="mineral-texture bg-[#f2f0e9] py-16 lg:py-24">
          <Container>
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <h2 id="problem-heading" className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                {service.problemHeading}
              </h2>

              <div className="space-y-5 text-base leading-7 text-black/70">
                {service.problem.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          </Container>
        </section>

        <section aria-labelledby="builds-heading" className="py-16 lg:py-24">
          <Container>
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <h2 id="builds-heading" className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                What Drylake can build
              </h2>

              <ul className="divide-y divide-black/10 border-y border-black/10">
                {service.builds.map((item) => (
                  <li key={item} className="py-4 text-base leading-7 text-black/75">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <h2 id="use-cases-heading" className="mt-20 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
              Where it fits
            </h2>

            <ul aria-labelledby="use-cases-heading" className="mt-8 grid gap-px border border-black/10 bg-black/10 md:grid-cols-2">
              {service.useCases.map((useCase) => (
                <li key={useCase.title} className="bg-white p-6 sm:p-8">
                  <h3 className="text-xl font-semibold tracking-[-0.03em]">{useCase.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-black/65">{useCase.text}</p>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        <section aria-labelledby="approach-heading" className="bg-[#f2f0e9] py-16 lg:py-24">
          <Container>
            <h2 id="approach-heading" className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
              How we approach it
            </h2>

            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {service.approach.map((step, index) => (
                <li key={step.title} className="border-t border-black/15 pt-6">
                  <span className="font-mono text-xs text-(--orange-ink)">0{index + 1}</span>
                  <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-black/65">{step.text}</p>
                </li>
              ))}
            </ol>
          </Container>
        </section>

        <section aria-labelledby="production-heading" className="bg-black py-16 text-white lg:py-24">
          <Container>
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div>
                <p className="section-label text-white/55">Production matters</p>
                <h2 id="production-heading" className="mt-4 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                  {service.productionHeading}
                </h2>
              </div>

              <ul className="divide-y divide-white/10 border-y border-white/10">
                {service.production.map((item) => (
                  <li key={item} className="flex gap-3 py-4 text-base leading-7 text-white/75">
                    <span aria-hidden="true" className="mt-[0.7rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#f26a2e]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </section>

        <section aria-labelledby="faq-heading" className="py-16 lg:py-24">
          <Container>
            <h2 id="faq-heading" className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
              Questions
            </h2>

            {/* <details> stays server-rendered, so the answers are in the initial HTML. */}
            <div className="mt-8 divide-y divide-black/10 border-y border-black/10">
              {service.faqs.map((faq) => (
                <details key={faq.question} className="group py-5">
                  <summary className="cursor-pointer list-none text-lg font-medium tracking-[-0.02em]">
                    {faq.question}
                  </summary>
                  <p className="mt-3 max-w-3xl text-base leading-7 text-black/65">{faq.answer}</p>
                </details>
              ))}
            </div>

            <p className="mt-10 max-w-3xl text-sm leading-6 text-black/60">
              {ENTITY.brand} is the trading name of {ENTITY.legalName} (ABN {ENTITY.abn}), a technology
              company based in {ENTITY.locality}, {ENTITY.region}, working with businesses across{" "}
              {ENTITY.country}. <Link href="/perth" className="underline underline-offset-4">More about Drylake in Perth</Link>.
            </p>
          </Container>
        </section>

        <ServiceIndex
          id="related-services"
          label="Related"
          heading="Related services"
          services={relatedServices(service)}
          tone="warm"
          showAllLink
        />

        <ContactCTA />
      </main>

      <Footer />
    </>
  );
}
