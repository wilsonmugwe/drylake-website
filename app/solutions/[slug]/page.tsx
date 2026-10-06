import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import ContactCTA from "@/components/sections/ContactCTA";
import JsonLd from "@/components/seo/JsonLd";
import Container from "@/components/ui/Container";
import { ENTITY, SERVICES } from "@/lib/discovery/entity";
import {
  breadcrumbNode,
  faqNode,
  serviceNode,
  webPageNode,
} from "@/lib/discovery/structured-data";
import { pageMetadata } from "@/lib/seo";

/*
 * One page per service line (lib/discovery/entity.ts SERVICES). Statically generated: no
 * auth, no data, so every crawler gets the same complete HTML. Unknown slugs 404.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }));
}

type Props = { params: Promise<{ slug: string }> };

function findService(slug: string) {
  return SERVICES.find((service) => service.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = findService((await params).slug);

  if (!service) {
    return {};
  }

  return pageMetadata({ title: service.title, description: service.description, path: service.path });
}

const STEPS = [
  {
    title: "Understand the problem",
    text: "We learn the workflow, the people doing it and where time or information is lost before choosing any technology.",
  },
  {
    title: "Design and build",
    text: "We build the smallest system that solves the problem properly, and keep the software you already rely on where it still fits.",
  },
  {
    title: "Run and improve",
    text: "We hand over clearly, support what we build and improve it as the business learns what it needs next.",
  },
];

export default async function ServicePage({ params }: Props) {
  const service = findService((await params).slug);

  if (!service) {
    notFound();
  }

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Solutions", path: "/solutions" },
    { name: service.name, path: service.path },
  ];
  const others = SERVICES.filter((other) => other.slug !== service.slug);

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
          <nav aria-label="Breadcrumb" className="text-sm text-black/60">
            <ol className="flex flex-wrap items-center gap-2">
              {crumbs.map((crumb, index) => (
                <li key={crumb.path} className="flex items-center gap-2">
                  {index > 0 ? <span aria-hidden="true">/</span> : null}
                  {index < crumbs.length - 1 ? (
                    <Link href={crumb.path} className="underline-offset-4 hover:underline">
                      {crumb.name}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-black">
                      {crumb.name}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          <p className="section-label mt-10 text-black/60">{service.name}</p>

          <h1 className="mt-5 max-w-4xl text-[clamp(2.6rem,6vw,5.2rem)] font-semibold leading-[0.95] tracking-[-0.06em]">
            {service.headline}
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-black/65">{service.intro}</p>
        </Container>

        <section aria-labelledby="builds-heading" className="mineral-texture bg-[#f2f0e9] py-16 lg:py-24">
          <Container>
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <h2 id="builds-heading" className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                What Drylake builds
              </h2>

              <ul className="divide-y divide-black/10 border-y border-black/10">
                {service.builds.map((item) => (
                  <li key={item} className="py-4 text-base leading-7 text-black/75">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </section>

        <section aria-labelledby="approach-heading" className="py-16 lg:py-24">
          <Container>
            <h2 id="approach-heading" className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
              How we work
            </h2>

            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="border-t border-black/10 pt-6">
                  <span className="font-mono text-xs text-[#c2531f]">0{index + 1}</span>
                  <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-black/65">{step.text}</p>
                </li>
              ))}
            </ol>
          </Container>
        </section>

        <section aria-labelledby="faq-heading" className="bg-[#f2f0e9] py-16 lg:py-24">
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
              company based in {ENTITY.locality}, {ENTITY.region}.
            </p>
          </Container>
        </section>

        <section aria-labelledby="related-heading" className="py-16 lg:py-20">
          <Container>
            <h2 id="related-heading" className="text-2xl font-semibold tracking-[-0.04em]">
              Other Drylake services
            </h2>

            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {others.map((other) => (
                <li key={other.slug}>
                  <Link
                    href={other.path}
                    className="group flex min-h-[64px] items-center justify-between gap-4 border border-black/10 px-5 py-4 text-base font-medium transition hover:border-black/30"
                  >
                    {other.name}
                    <ArrowUpRight aria-hidden="true" size={17} className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        <ContactCTA />
      </main>

      <Footer />
    </>
  );
}
