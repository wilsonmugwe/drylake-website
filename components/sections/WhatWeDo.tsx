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
 * Each row links to its service page (lib/discovery/services.ts slugs). Plain-English messaging
 * (2026-10-13): five rows, one per service, websites first because visitors could not tell
 * Drylake builds websites. The label is the service in everyday words, the headline says what it
 * does for the business, and the examples are things an owner would recognise.
 */
const services: Service[] = [
  {
    number: "01",
    name: "Websites",
    statement: "Websites that bring in work.",
    text: "We build professional websites that make it easier for customers to find your business, understand what you offer and get in touch.",
    examples: "Business websites / Enquiry & booking forms / Redesigns / Customer-facing web features",
    href: "/services/web-development",
  },
  {
    number: "02",
    name: "Custom Software & Apps",
    statement: "Software built for how you work.",
    text: "Still running your business through spreadsheets and paperwork? We build software that keeps your information organised and makes everyday work easier.",
    examples: "Customer portals / Booking systems / Staff dashboards / Job tracking",
    href: "/services/custom-software-development",
  },
  {
    number: "03",
    name: "Business Automation",
    statement: "Less repetitive work.",
    text: "We help your business spend less time on repetitive tasks by setting up software that handles them automatically.",
    examples: "Appointment reminders / Enquiry follow-ups / Recurring reports / Routine documents",
    href: "/services/business-automation",
  },
  {
    number: "04",
    name: "Connecting Your Systems",
    statement: "Your tools, working together.",
    text: "Using several tools that don't talk to each other? We connect them so you don't have to keep entering the same information.",
    examples: "Website to customer list / Bookings to calendars / Software to accounting / One customer record",
    href: "/services/systems-integration",
  },
  {
    number: "05",
    name: "AI for Business",
    statement: "AI for the everyday admin.",
    text: "We build AI tools that help your team handle repetitive work, find information and respond to customers faster, with people staying in control where needed.",
    examples: "Answering common questions / Searching documents / Drafting replies / Sorting enquiries",
    href: "/services/ai-automation",
  },
];

/*
 * Chapter 3, What We Do (light, nav target #solutions). Not cards: five editorial rows on
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
              What we build.{" "}
              <br />
              <span className="text-black/50">What it does for you.</span>
            </h2>

            <p className="type-lede mt-5 max-w-2xl text-black/62 sm:mt-6">
              Websites, business software, automations and AI tools, built so your
              team spends less time on paperwork and more time on customers.
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
          <Link href="/services" className="group inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold">
            <span className="link-underline">All services</span>
            <ArrowUpRight aria-hidden="true" size={15} />
          </Link>
          <Link href="/solutions" className="group inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold">
            <span className="link-underline">Problems we solve</span>
            <ArrowUpRight aria-hidden="true" size={15} />
          </Link>
        </div>
      </Container>
    </section>
  );
}
