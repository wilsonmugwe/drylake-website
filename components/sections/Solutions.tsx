"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, Check } from "lucide-react";
import Container from "@/components/ui/Container";
import CapabilityVisual from "@/components/visuals/CapabilityVisual";

const solutions = [
  {
    number: "01",
    title: "Software that fits the business",
    label: "CUSTOM SOFTWARE",
    description:
      "When off-the-shelf software no longer fits the way your business works, we design and build systems around the actual workflow.",
    examples: [
      "Internal business systems",
      "Client & staff portals",
      "Workflow platforms",
      "Web & mobile applications",
    ],
    visual: "software" as const,
  },
  {
    number: "02",
    title: "Less repetitive work",
    label: "AUTOMATION",
    description:
      "We identify manual steps that consume time, create errors or depend on somebody remembering what happens next.",
    examples: [
      "Workflow automation",
      "Approvals & notifications",
      "Document processing",
      "AI-assisted workflows",
    ],
    visual: "automation" as const,
  },
  {
    number: "03",
    title: "Systems that work together",
    label: "INTEGRATION",
    description:
      "We connect the software your business already depends on so information can move without constant copying and re-entry.",
    examples: [
      "API integrations",
      "CRM & finance systems",
      "Payments",
      "Data synchronisation",
    ],
    visual: "integration" as const,
  },
];

export default function Solutions() {
  return (
    <section
      id="solutions"
      className="mineral-texture relative overflow-hidden bg-[#f2f0e9] py-16 text-black sm:py-20 lg:py-28"
    >
      <Container className="relative z-10">
        {/* Header */}
        <div className="grid gap-6 border-b border-black/10 pb-8 sm:pb-10 lg:grid-cols-[0.65fr_1.35fr] lg:items-end lg:gap-12">
          <div>
            <p className="section-label text-black/50">
              02 / What We Do
            </p>

            <div className="mt-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

              <span className="tech-label text-black/30">
                PROBLEM → SYSTEM
              </span>
            </div>
          </div>

          <div>
            <h2 className="max-w-4xl text-[clamp(2.8rem,6vw,6rem)] font-semibold leading-[0.92] tracking-[-0.065em]">
              Less workaround.
              <br />
              <span className="text-black/30">More workflow.</span>
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-black/60 sm:mt-5 sm:text-base sm:leading-7">
              We improve the way work moves through the business — whether that
              means building something new, connecting what you already use or
              automating the steps in between.
            </p>
          </div>
        </div>

        {/* Solutions */}
        <div className="grid lg:grid-cols-3">
          {solutions.map((solution, index) => (
            <motion.article
              key={solution.title}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{
                duration: 0.55,
                delay: index * 0.06,
              }}
              className="
                group border-b border-black/10 py-8
                lg:border-b-0 lg:border-r lg:px-8 lg:py-10
                lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0
              "
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-black/35">
                    {solution.number}
                  </span>

                  <span className="tech-label text-black/30">
                    {solution.label}
                  </span>
                </div>

                <div className="mt-6">
                  <CapabilityVisual type={solution.visual} />
                </div>

                <div className="mt-7 flex flex-1 flex-col">
                  <h3 className="max-w-sm text-2xl font-semibold leading-tight tracking-[-0.045em] sm:text-3xl">
                    {solution.title}
                  </h3>

                  <p className="mt-4 max-w-lg text-sm leading-6 text-black/60 sm:text-[0.95rem]">
                    {solution.description}
                  </p>

                  <div className="mt-6 border-t border-black/10">
                    {solution.examples.map((example) => (
                      <div
                        key={example}
                        className="flex items-center gap-3 border-b border-black/10 py-3"
                      >
                        <Check
                          size={13}
                          strokeWidth={2}
                          className="shrink-0 text-[#f26a2e]"
                        />

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

        {/* Philosophy */}
        <div className="mt-10 grid gap-5 border-t border-black/10 pt-8 sm:mt-12 sm:pt-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xl font-medium tracking-[-0.03em] sm:text-2xl">
              Sometimes you shouldn&apos;t build new software.
            </p>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
              If an existing product already solves the problem properly, we
              would rather tell you than build something your business
              doesn&apos;t need.
            </p>
          </div>

          <Link
            href="/solutions"
            className="group inline-flex w-fit items-center gap-2 border-b border-black pb-1 text-sm font-semibold"
          >
            Explore what we do

            <ArrowUpRight
              size={16}
              className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </Link>
        </div>
      </Container>
    </section>
  );
}