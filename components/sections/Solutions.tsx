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
      "Purpose-built applications and digital platforms for problems that off-the-shelf software does not solve properly.",
    visual: "software" as const,
  },
  {
    number: "02",
    title: "Business Automation",
    description:
      "Reduce repetitive administration and connect workflows that currently depend on somebody remembering the next step.",
    visual: "automation" as const,
  },
  {
    number: "03",
    title: "Systems Integration",
    description:
      "Connect the software, platforms and data your organisation already depends on.",
    visual: "integration" as const,
  },
  {
    number: "04",
    title: "Technical Setup",
    description:
      "Domains, business email, websites, forms, bookings and the technical details that should simply work.",
    visual: "setup" as const,
  },
];

export default function Solutions() {
  return (
    <section
      id="solutions"
      className="mineral-texture relative overflow-hidden bg-[#f2f0e9] py-20 text-black sm:py-24 lg:py-28"
    >
      <Container className="relative z-10">
        <div className="grid gap-8 border-b border-black/10 pb-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <p className="section-label text-black/50">
            01 / What We Do
          </p>

          <div>
            <h2 className="max-w-4xl text-[clamp(2.8rem,6vw,6rem)] font-semibold leading-[0.92] tracking-[-0.065em]">
              Technology built around the problem.
            </h2>

            <p className="mt-5 max-w-xl leading-7 text-black/60">
              We choose the technology after we understand what needs to work.
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
              className="group border-b border-black/10 py-8 lg:p-9 lg:odd:border-r"
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

                <div className="mt-7">
                  <CapabilityVisual type={solution.visual} />
                </div>

                <div className="mt-7">
                  <h3 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
                    {solution.title}
                  </h3>

                  <p className="mt-3 max-w-lg text-sm leading-6 text-black/60 sm:text-base">
                    {solution.description}
                  </p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        <Link
          href="/solutions"
          className="group mt-9 inline-flex items-center gap-2 border-b border-black pb-1 text-sm font-semibold"
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