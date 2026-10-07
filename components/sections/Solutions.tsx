import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

import InView from "@/components/motion/InView";
import Container from "@/components/ui/Container";
import { AiDiagram, SoftwareDiagram, WorkflowDiagram } from "@/components/visuals/CapabilityDiagrams";

type Solution = {
  number: string;
  label: string;
  title: string;
  text: string;
  examples: string;
  links: { href: string; label: string }[];
  visual: ReactNode;
};

const solutions: Solution[] = [
  {
    number: "01",
    label: "OPERATIONAL SOFTWARE",
    title: "Software that fits the business.",
    text: "Internal systems, portals and applications designed around the workflows your business actually depends on.",
    examples:
      "Internal platforms / Client & staff portals / Workflow systems / Web & mobile applications",
    links: [{ href: "/services/custom-software-development", label: "Custom software development" }],
    visual: <SoftwareDiagram />,
  },
  {
    number: "02",
    label: "AUTOMATION + INTEGRATION",
    title: "Make the systems talk.",
    text: "Connect systems, remove duplicate handling and automate routine steps that slow teams down.",
    examples:
      "Workflow automation / System integrations / Approvals / Notifications / Data synchronisation",
    links: [
      { href: "/services/business-automation", label: "Business automation" },
      { href: "/services/systems-integration", label: "Systems integration" },
    ],
    visual: <WorkflowDiagram />,
  },
  {
    number: "03",
    label: "APPLIED AI",
    title: "AI where it earns its place.",
    text: "Use AI where it can improve a real workflow, reduce work or create genuinely useful functionality.",
    examples:
      "Document processing / AI-assisted workflows / Internal tools / Decision support",
    links: [{ href: "/services/ai-automation", label: "AI automation" }],
    visual: <AiDiagram />,
  },
];

/*
 * What We Do. Each capability is explained by a conceptual picture of the thing being built
 * (an operational workspace, a connected workflow, an AI step with a human check), laid out
 * as an alternating editorial spread rather than three equal cards. Copy and service links
 * unchanged.
 */
export default function Solutions() {
  return (
    <section id="solutions" className="surface-mineral relative overflow-hidden">
      <div aria-hidden="true" className="dots-mineral pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-60 [mask-image:linear-gradient(to_bottom,#000,transparent)]" />

      <Container className="relative pb-10 pt-(--section-y)">
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
      </Container>

      <div className="relative">
        {solutions.map((solution, index) => {
          const flip = index % 2 === 1;

          return (
            <InView key={solution.number} as="article" threshold={0.2}>
              <Container className="py-10 sm:py-16 lg:py-24">
                <div className="grid items-center gap-8 border-t border-black/10 pt-8 sm:gap-10 sm:pt-10 lg:grid-cols-12 lg:gap-8 lg:pt-14">
                  <div className={`lg:row-start-1 lg:col-span-5 ${flip ? "lg:col-start-8" : "lg:col-start-1"}`}>
                    <p className="flex items-center gap-3 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-black/62">
                      <span className="text-(--orange-ink)">{solution.number}</span>
                      <span aria-hidden="true" className="h-px w-6 bg-black/20" />
                      <span>{solution.label}</span>
                    </p>

                    <h3 className="type-title mt-5 max-w-[16ch]">{solution.title}</h3>

                    <p className="type-body mt-5 max-w-md text-black/62">{solution.text}</p>

                    <p className="mt-5 max-w-md font-mono text-[0.66rem] uppercase leading-5 tracking-[0.09em] text-black/62">
                      {solution.examples}
                    </p>

                    {/* Crawlable links to the service pages (no orphan pages, checklist #3). */}
                    <div className="mt-6 flex flex-wrap gap-x-6">
                      {solution.links.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="group/link inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold"
                        >
                          <span className="link-underline">{link.label}</span>
                          <ArrowUpRight
                            aria-hidden="true"
                            size={15}
                            className="text-(--orange-ink) transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5"
                          />
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className={`lg:row-start-1 lg:col-span-6 ${flip ? "lg:col-start-1" : "lg:col-start-7"}`}>
                    {solution.visual}
                  </div>
                </div>
              </Container>
            </InView>
          );
        })}
      </div>

      <Container className="relative pb-12 sm:pb-16 lg:pb-24">
        <div className="flex flex-wrap justify-end gap-x-8 border-t border-black/10 pt-6">
          <Link
            href="/services"
            className="group inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold"
          >
            All services
            <ArrowUpRight
              size={15}
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>

          <Link
            href="/solutions"
            className="group inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold"
          >
            Explore what we do
            <ArrowUpRight
              size={15}
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </div>
      </Container>
    </section>
  );
}
