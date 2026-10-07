import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import Container from "@/components/ui/Container";

type Service = {
  number: string;
  name: string;
  statement: string;
  text: string;
  examples: string;
  href: string;
};

/*
 * Each row links to its service page (lib/discovery/services.ts slugs). Experience polish: the
 * outcome leads and the capability name follows, in words an owner uses. AI is one row among four
 * (the standalone AI chapter is gone, brief section 6): what it does for the work, with a person
 * checking what matters.
 */
const services: Service[] = [
  {
    number: "01",
    name: "Custom Software",
    statement: "Software that fits the business.",
    text: "Internal systems, portals and apps built around how your business actually works, instead of bending the business around a product.",
    examples: "Internal platforms / Client & staff portals / Job and workflow systems / Web & mobile applications",
    href: "/services/custom-software-development",
  },
  {
    number: "02",
    name: "Automation",
    statement: "Fewer manual steps.",
    text: "The routine steps your team repeats every day, done automatically: less double handling, fewer reminders, fewer mistakes.",
    examples: "Approvals / Reminders & follow-ups / Notifications / Keeping records in sync",
    href: "/services/business-automation",
  },
  {
    number: "03",
    name: "Connected Systems",
    statement: "Make the systems talk.",
    text: "Connect the platforms you already use, so information moves between them instead of being typed in twice.",
    examples: "Accounting & CRM / Shared customer data / Existing platforms / Reporting",
    href: "/services/systems-integration",
  },
  {
    number: "04",
    name: "AI",
    statement: "AI where it earns its place.",
    text: "Reading documents, sorting enquiries, drafting replies: AI where it genuinely saves work, with a person checking what matters.",
    examples: "Document processing / Sorting & routing enquiries / Drafting & summaries / Decision support",
    href: "/services/ai-automation",
  },
];

/*
 * Chapter 3, What We Do (light, nav target #solutions). Not cards: four editorial rows on
 * hairlines, each one link to its service page. The outcome is the headline of each row; the
 * service name is its label. Desktop: hovering or focusing a row draws a rule under it and nudges
 * the arrow; everything is visible without hover. Phones: one compact column per row.
 */
export default function WhatWeDo() {
  return (
    <section id="solutions" className="surface-mineral relative overflow-hidden">
      <Container className="relative pb-6 pt-(--section-y)">
        <div className="grid gap-6 lg:grid-cols-12">
          <p className="section-label text-black/62 lg:col-span-3 lg:pt-4">02 / What We Do</p>

          <div className="lg:col-span-9">
            <h2 className="type-section">
              Less workaround.
              <br />
              <span className="text-black/50">More workflow.</span>
            </h2>

            <p className="type-lede mt-5 max-w-2xl text-black/62 sm:mt-6">
              We build software, automate the repetitive work and join up the
              systems you already use, so your team spends less time on admin.
            </p>
          </div>
        </div>

        <ol className="mt-(--block-gap) border-b border-black/12">
          {services.map((service) => (
            <li key={service.number} className="border-t border-black/12">
              <Link href={service.href} className="hz-row group relative grid gap-x-8 gap-y-2 py-6 sm:py-8 lg:grid-cols-12 lg:items-baseline lg:py-8">
                <span className="hz-row-line" aria-hidden="true" />

                <span className="flex items-center gap-3 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-black/62 lg:col-span-2 lg:block">
                  <span className="text-(--orange-ink)">{service.number}</span>
                  <span aria-hidden="true" className="h-px w-5 bg-black/20 lg:hidden" />
                  <span className="lg:mt-2 lg:block">{service.name}</span>
                </span>

                <h3 className="hz-row-name text-[clamp(1.85rem,7.4vw,3.3rem)] font-semibold leading-[0.95] tracking-[-0.05em] lg:col-span-5">
                  {service.statement}
                </h3>

                <span className="block lg:col-span-4">
                  <span className="type-body block max-w-md text-black/68">{service.text}</span>
                  <span className="mt-3 block max-w-md font-mono text-[0.62rem] uppercase leading-5 tracking-[0.09em] text-black/62">
                    {service.examples}
                  </span>
                </span>

                {/* Phones: the arrow sits at the top right of the row (the whole row is the link). */}
                <span className="absolute right-0 top-5 sm:top-7 lg:static lg:col-span-1 lg:flex lg:justify-end">
                  <span className="sr-only">Explore {service.name}</span>
                  <ArrowUpRight aria-hidden="true" size={22} className="hz-row-arrow text-(--orange-ink)" />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </Container>

      <Container className="relative pb-(--section-y)">
        <div className="flex flex-wrap gap-x-8 pt-3 sm:justify-end">
          <Link href="/services/web-development" className="group inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold">
            <span className="link-underline">Web development</span>
            <ArrowUpRight aria-hidden="true" size={15} />
          </Link>
          <Link href="/services" className="group inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold">
            <span className="link-underline">All services</span>
            <ArrowUpRight aria-hidden="true" size={15} />
          </Link>
          <Link href="/solutions" className="group inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold">
            <span className="link-underline">Explore what we do</span>
            <ArrowUpRight aria-hidden="true" size={15} />
          </Link>
        </div>
      </Container>
    </section>
  );
}
