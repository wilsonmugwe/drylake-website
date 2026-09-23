"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import Container from "@/components/ui/Container";
import CapabilityVisual from "@/components/visuals/CapabilityVisual";

const solutions = [
  {
    number: "01",
    title: "Custom Software",
    description:
      "Purpose-built software for processes and problems that off-the-shelf tools do not solve properly.",
    examples: [
      "Web applications",
      "Internal tools",
      "Client portals",
      "Mobile solutions",
    ],
    visual: "software" as const,
  },
  {
    number: "02",
    title: "Business Automation",
    description:
      "Reduce repetitive administration and connect workflows that currently depend on somebody remembering the next step.",
    examples: [
      "Workflow automation",
      "Notifications",
      "Document processing",
      "AI-assisted workflows",
    ],
    visual: "automation" as const,
  },
  {
    number: "03",
    title: "Systems Integration",
    description:
      "Connect the software, platforms and data your organisation already depends on so information moves where it should.",
    examples: [
      "APIs",
      "CRM integration",
      "Payment systems",
      "Data synchronisation",
    ],
    visual: "integration" as const,
  },
  {
    number: "04",
    title: "Technical Setup",
    description:
      "Set up and connect the technical foundations a business needs to operate properly.",
    examples: [
      "Microsoft 365",
      "Domains & email",
      "Cloud setup",
      "Platform migration",
    ],
    visual: "setup" as const,
  },
];

export default function Solutions() {
  return (
    <section
      id="solutions"
      className="mineral-texture relative overflow-hidden bg-[#f2f0e9] py-16 text-black sm:py-20 lg:py-28"
    >
      <Container className="relative z-10">
        <div className="grid gap-6 border-b border-black/10 pb-8 sm:pb-10 lg:grid-cols-[0.65fr_1.35fr] lg:items-end lg:gap-12">
          <p className="section-label text-black/50">
            01 / What We Do
          </p>

          <div>
            <h2 className="max-w-4xl text-[clamp(2.8rem,6vw,6rem)] font-semibold leading-[0.92] tracking-[-0.065em]">
              Technology built around the problem.
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-6 text-black/60 sm:mt-5 sm:text-base sm:leading-7">
              Software, automation and technical systems designed around the
              way your business actually needs to work.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2">
          {solutions.map((solution, index) => (
            <motion.article
              key={solution.title}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.55, delay: index * 0.05 }}
              className="group border-b border-black/10 py-7 lg:p-9 lg:odd:border-r"
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-black/40">
                    {solution.number}
                  </span>

                  <span className="tech-label flex items-center gap-2 text-black/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
                    SYSTEM
                  </span>
                </div>

                <div className="mt-5 sm:mt-7">
                  <CapabilityVisual type={solution.visual} />
                </div>

                <div className="mt-6 sm:mt-7">
                  <h3 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
                    {solution.title}
                  </h3>

                  <p className="mt-3 max-w-lg text-sm leading-6 text-black/60 sm:text-base sm:leading-7">
                    {solution.description}
                  </p>

                  <div className="mt-5 grid grid-cols-2 border-t border-black/10">
                    {solution.examples.map((example, exampleIndex) => (
                      <div
                        key={example}
                        className={`
                          flex items-center gap-2 border-b border-black/10 py-3
                          ${exampleIndex % 2 === 0 ? "pr-3" : "border-l pl-3"}
                        `}
                      >
                        <span className="h-1 w-1 shrink-0 rounded-full bg-[#f26a2e]" />
                        <span className="text-xs text-black/55 sm:text-sm">
                          {example}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        <Link
          href="/solutions"
          className="group mt-7 inline-flex items-center gap-2 border-b border-black pb-1 text-sm font-semibold sm:mt-9"
        >
          Explore what we do

          <ArrowUpRight
            size={16}
            className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
          />
        </Link>
      </Container>
    </section>
  );
}