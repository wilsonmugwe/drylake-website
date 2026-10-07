import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import Container from "@/components/ui/Container";

type Glyph = "software" | "automation" | "ai" | "connected";

type Service = {
  number: string;
  name: string;
  statement: string;
  text: string;
  examples: string;
  href: string;
  glyph: Glyph;
};

/* Each row links to its service page (lib/discovery/services.ts slugs). */
const services: Service[] = [
  {
    number: "01",
    name: "Custom Software",
    statement: "Software that fits the business.",
    text: "Internal systems, portals and applications designed around the workflows your business actually depends on.",
    examples: "Internal platforms / Client & staff portals / Workflow systems / Web & mobile applications",
    href: "/services/custom-software-development",
    glyph: "software",
  },
  {
    number: "02",
    name: "Automation",
    statement: "Fewer manual steps.",
    text: "Remove duplicate handling and automate the routine steps that slow teams down.",
    examples: "Workflow automation / System integrations / Approvals / Notifications / Data synchronisation",
    href: "/services/business-automation",
    glyph: "automation",
  },
  {
    number: "03",
    name: "AI",
    statement: "AI where it earns its place.",
    text: "Use AI where it can improve a real workflow, reduce work or create genuinely useful functionality.",
    examples: "Document processing / AI-assisted workflows / Internal tools / Decision support",
    href: "/services/ai-automation",
    glyph: "ai",
  },
  {
    number: "04",
    name: "Connected Systems",
    statement: "Make the systems talk.",
    text: "Connect the platforms you already use, so information moves between them instead of being typed in twice.",
    examples: "Integrations / Shared data / Existing platforms / Reporting",
    href: "/services/systems-integration",
    glyph: "connected",
  },
];

/* A small system fragment per service, drawn on the row's hover/focus (desktop). Decorative. */
function ServiceGlyph({ glyph }: { glyph: Glyph }) {
  const stroke = { stroke: "currentColor", strokeWidth: 1.25, fill: "none", vectorEffect: "non-scaling-stroke" as const };
  return (
    <svg aria-hidden="true" viewBox="0 0 64 40" className="hz-glyph h-10 w-16">
      {glyph === "software" && (
        <>
          <rect x="2" y="4" width="60" height="32" {...stroke} />
          <path d="M2 12 H62 M20 12 V36" {...stroke} />
          <path d="M26 20 H52 M26 27 H44" {...stroke} />
        </>
      )}
      {glyph === "automation" && (
        <>
          <circle cx="8" cy="20" r="4" {...stroke} />
          <circle cx="32" cy="20" r="4" {...stroke} />
          <circle cx="56" cy="20" r="4" {...stroke} />
          <path d="M12 20 H28 M36 20 H52 M24 16 L28 20 L24 24 M48 16 L52 20 L48 24" {...stroke} />
        </>
      )}
      {glyph === "ai" && (
        <>
          <rect x="2" y="8" width="18" height="24" {...stroke} />
          <path d="M20 20 H40" {...stroke} />
          <path d="M44 14 H62 M44 20 H58 M44 26 H62" {...stroke} />
        </>
      )}
      {glyph === "connected" && (
        <>
          <path d="M2 20 H62" {...stroke} />
          <path d="M14 6 V20 M32 34 V20 M50 6 V20" {...stroke} />
          <rect x="9" y="2" width="10" height="6" {...stroke} />
          <rect x="27" y="32" width="10" height="6" {...stroke} />
          <rect x="45" y="2" width="10" height="6" {...stroke} />
        </>
      )}
    </svg>
  );
}

/*
 * Chapter 3, What We Do (light, nav target #solutions). Not cards: four editorial rows on
 * hairlines, each one link to its service page. Desktop: hovering or focusing a row moves the
 * name, draws a horizon under it and reveals a small system fragment; everything the row says is
 * visible without hover, so touch and keyboard users lose nothing. Phones: rows stack.
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

            <p className="type-lede mt-5 sm:mt-7 max-w-2xl text-black/62">
              We build and connect technology that helps growing Australian
              businesses operate more effectively.
            </p>
          </div>
        </div>

        <ol className="mt-(--block-gap) border-b border-black/12">
          {services.map((service) => (
            <li key={service.number} className="border-t border-black/12">
              <Link href={service.href} className="hz-row group relative grid gap-x-8 gap-y-3 py-7 sm:gap-y-4 sm:py-10 lg:grid-cols-12 lg:items-center lg:py-12">
                <span className="hz-row-line" aria-hidden="true" />

                <span className="font-mono text-sm text-(--orange-ink) lg:col-span-1">{service.number}</span>

                <div className="lg:col-span-5">
                  <h3 className="hz-row-name text-[clamp(2.5rem,11vw,5.4rem)] font-semibold leading-[0.9] tracking-[-0.06em]">
                    {service.name}
                  </h3>
                </div>

                <span className="block lg:col-span-5">
                  <span className="block text-lg font-semibold tracking-[-0.02em] sm:text-xl">{service.statement}</span>
                  <span className="type-body mt-2 block max-w-md text-black/66">{service.text}</span>
                  <span className="mt-4 block max-w-md font-mono text-[0.64rem] uppercase leading-5 tracking-[0.09em] text-black/62">
                    {service.examples}
                  </span>
                </span>

                <span className="flex items-center justify-between gap-4 lg:col-span-1 lg:flex-col lg:items-end">
                  <span className="hidden text-black/45 lg:block">
                    <ServiceGlyph glyph={service.glyph} />
                  </span>
                  <span className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold lg:min-h-0">
                    <span className="lg:sr-only">Explore {service.name}</span>
                    <ArrowUpRight aria-hidden="true" size={22} className="hz-row-arrow text-(--orange-ink)" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </Container>

      <Container className="relative pb-12 sm:pb-16 lg:pb-24">
        <div className="flex flex-wrap gap-x-8 pt-4 sm:justify-end">
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
