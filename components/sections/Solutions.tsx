"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  Bot,
  Boxes,
  Code2,
  Workflow,
} from "lucide-react";
import Container from "@/components/ui/Container";

const solutions = [
  {
    number: "01",
    title: "AI & Intelligent Systems",
    description:
      "Practical AI systems, assistants and intelligent workflows designed around how your business actually operates.",
    icon: Bot,
  },
  {
    number: "02",
    title: "Business Automation",
    description:
      "Replace repetitive work and disconnected processes with reliable automated workflows.",
    icon: Workflow,
  },
  {
    number: "03",
    title: "Custom Software",
    description:
      "Purpose-built digital platforms and applications that solve problems generic software cannot.",
    icon: Code2,
  },
  {
    number: "04",
    title: "Systems Integration",
    description:
      "Connect the tools, data and platforms your business already depends on.",
    icon: Boxes,
  },
];

export default function Solutions() {
  return (
    <section
      id="solutions"
      className="mineral-texture relative overflow-hidden bg-[#f1efe8] py-20 text-[#090909] sm:py-24 lg:py-28"
    >
      <Container className="relative z-10">
        <div className="grid gap-8 border-b border-black/10 pb-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <div>
            <p className="section-label text-black/40">01 / What We Build</p>
          </div>

          <h2 className="max-w-4xl text-[clamp(2.8rem,6vw,6rem)] font-semibold leading-[0.92] tracking-[-0.065em]">
            Technology built around the problem.
          </h2>
        </div>

        <div className="grid lg:grid-cols-2">
          {solutions.map((solution, index) => {
            const Icon = solution.icon;

            return (
              <motion.div
                key={solution.title}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="group border-b border-black/10 py-8 transition-colors lg:min-h-[250px] lg:p-9 lg:odd:border-r"
              >
                <div className="flex h-full flex-col justify-between gap-12">
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-xs text-black/35">
                      {solution.number}
                    </span>

                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 transition-all duration-300 group-hover:bg-black group-hover:text-white">
                      <Icon size={18} strokeWidth={1.6} />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
                      {solution.title}
                    </h3>

                    <p className="mt-3 max-w-lg text-sm leading-6 text-black/55 sm:text-base">
                      {solution.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="pt-9">
          <Link
            href="/solutions"
            className="group inline-flex items-center gap-2 text-sm font-semibold"
          >
            Explore all solutions
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