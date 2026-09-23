"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  Braces,
  Cable,
  Settings2,
  Workflow,
} from "lucide-react";
import Container from "@/components/ui/Container";

const solutions = [
  {
    number: "01",
    title: "Custom Software",
    description:
      "Purpose-built applications and digital platforms for problems that off-the-shelf software does not solve properly.",
    icon: Braces,
  },
  {
    number: "02",
    title: "Business Automation",
    description:
      "Reduce repetitive administration and connect workflows that currently depend on somebody remembering the next step.",
    icon: Workflow,
  },
  {
    number: "03",
    title: "Systems Integration",
    description:
      "Connect the software, platforms and data your organisation already depends on.",
    icon: Cable,
  },
  {
    number: "04",
    title: "Technical Setup",
    description:
      "Domains, business email, websites, forms, bookings and the technical details that should simply work.",
    icon: Settings2,
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
          <p className="section-label text-black/40">01 / What We Do</p>

          <div>
            <h2 className="max-w-4xl text-[clamp(2.8rem,6vw,6rem)] font-semibold leading-[0.92] tracking-[-0.065em]">
              Technology built around
              <span className="text-black/30"> the problem.</span>
            </h2>

            <p className="mt-5 max-w-xl leading-7 text-black/50">
              We choose the technology after we understand what needs to work.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2">
          {solutions.map((solution, index) => {
            const Icon = solution.icon;

            return (
              <motion.article
                key={solution.title}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                className="group border-b border-black/10 py-8 lg:min-h-[285px] lg:p-9 lg:odd:border-r"
              >
                <div className="flex h-full flex-col justify-between gap-12">
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-xs text-black/35">
                      {solution.number}
                    </span>

                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-black/10 transition-all duration-300 group-hover:rotate-6 group-hover:bg-black group-hover:text-white">
                      <Icon size={19} strokeWidth={1.6} />
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
              </motion.article>
            );
          })}
        </div>

        <Link
          href="/solutions"
          className="group mt-9 inline-flex items-center gap-2 text-sm font-semibold"
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