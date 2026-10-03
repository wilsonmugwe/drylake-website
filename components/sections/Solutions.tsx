"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  Bot,
  Boxes,
  Workflow,
} from "lucide-react";

import Container from "@/components/ui/Container";

const solutions = [
  {
    number: "01",
    label: "OPERATIONAL SOFTWARE",
    title: "Software that fits the business.",
    text: "Internal systems, portals and applications designed around the workflows your business actually depends on.",
    examples: [
      "Internal platforms",
      "Client & staff portals",
      "Workflow systems",
      "Web & mobile applications",
    ],
    icon: Boxes,
  },
  {
    number: "02",
    label: "AUTOMATION & INTEGRATION",
    title: "Less repetitive work.",
    text: "Connect systems, remove duplicate handling and automate routine steps that slow teams down.",
    examples: [
      "Workflow automation",
      "System integrations",
      "Approvals & notifications",
      "Data synchronisation",
    ],
    icon: Workflow,
  },
  {
    number: "03",
    label: "APPLIED AI",
    title: "AI where it earns its place.",
    text: "Use AI where it can improve a real workflow, reduce work or create genuinely useful functionality.",
    examples: [
      "Document processing",
      "AI-assisted workflows",
      "Internal tools",
      "Decision support",
    ],
    icon: Bot,
  },
];

export default function Solutions() {
  return (
    <section
      id="solutions"
      className="relative overflow-hidden bg-[#f2f0e9] py-10 text-black sm:py-20 lg:py-24"
    >
      <Container>
        {/* Heading */}
        <div className="grid gap-4 border-b border-black/10 pb-6 sm:gap-6 sm:pb-8 lg:grid-cols-[0.65fr_1.35fr] lg:gap-12 lg:pb-10">
          <div>
            <p className="section-label text-black/40">
              02 / What We Do
            </p>

            <div className="mt-2.5 flex items-center gap-2 sm:mt-4">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

              <span className="tech-label text-black/30">
                PROBLEM → SYSTEM
              </span>
            </div>
          </div>

          <div>
            <h2 className="max-w-4xl text-[2.35rem] font-semibold leading-[0.93] tracking-[-0.055em] sm:text-[clamp(3rem,6vw,6rem)] sm:leading-[0.9] sm:tracking-[-0.065em]">
              Less workaround.
              <span className="text-black/25"> More workflow.</span>
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-black/55 sm:mt-5 sm:text-base sm:leading-7">
              We build and connect technology that helps growing businesses
              operate more effectively.
            </p>
          </div>
        </div>

        {/* Solutions */}
        <div className="grid lg:grid-cols-3">
          {solutions.map((solution, index) => {
            const Icon = solution.icon;

            return (
              <motion.article
                key={solution.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.05,
                }}
                className="
                  group border-b border-black/10 py-5
                  sm:py-8
                  lg:min-h-[390px] lg:border-b-0 lg:border-r lg:px-7
                  lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0
                "
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[0.65rem] text-black/30 sm:text-xs">
                    {solution.number}
                  </span>

                  <Icon
                    size={18}
                    strokeWidth={1.5}
                    className="text-black/30 transition-colors group-hover:text-[#f26a2e]"
                  />
                </div>

                <p className="tech-label mt-4 text-black/30 sm:mt-7">
                  {solution.label}
                </p>

                <h3 className="mt-1.5 max-w-sm text-xl font-semibold leading-tight tracking-[-0.04em] sm:mt-2 sm:text-2xl">
                  {solution.title}
                </h3>

                <p className="mt-2.5 max-w-sm text-sm leading-5 text-black/50 sm:mt-3 sm:leading-6">
                  {solution.text}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-x-4 border-t border-black/10 pt-3 sm:mt-6 sm:block sm:pt-4">
                  {solution.examples.map((example) => (
                    <div
                      key={example}
                      className="flex items-start gap-2 py-1"
                    >
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#f26a2e]" />

                      <span className="text-xs leading-5 text-black/45 sm:text-sm">
                        {example}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.article>
            );
          })}
        </div>

        <div className="flex justify-end pt-5 sm:border-t sm:border-black/10">
          <Link
            href="/solutions"
            className="group inline-flex items-center gap-2 text-sm font-semibold"
          >
            Explore what we do

            <ArrowUpRight
              size={15}
              className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </Link>
        </div>
      </Container>
    </section>
  );
}