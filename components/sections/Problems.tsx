"use client";

import { motion } from "motion/react";
import Container from "@/components/ui/Container";

const problems = [
  {
    number: "001",
    problem: "We're doing too much manually.",
    route: "AUTOMATION",
  },
  {
    number: "002",
    problem: "Our systems don't talk to each other.",
    route: "INTEGRATION",
  },
  {
    number: "003",
    problem: "Our website isn't doing enough for us.",
    route: "WEB",
  },
  {
    number: "004",
    problem: "A critical process still lives in spreadsheets.",
    route: "SOFTWARE",
  },
  {
    number: "005",
    problem: "We need to move away from our current platform.",
    route: "MIGRATION",
  },
  {
    number: "006",
    problem: "Customers should be able to do this online.",
    route: "DIGITAL",
  },
  {
    number: "007",
    problem: "We want to use AI, but only where it makes sense.",
    route: "AI",
  },
  {
    number: "008",
    problem: "Our website isn't appearing properly in search.",
    route: "SEO",
  },
];

export default function Problems() {
  return (
    <section className="relative overflow-hidden bg-white py-16 text-black sm:py-20 lg:py-28">
      <div className="pointer-events-none absolute inset-0 micro-grid opacity-30" />

      <Container className="relative z-10">
        <div className="grid gap-6 border-b border-black/10 pb-8 sm:pb-10 lg:grid-cols-[0.65fr_1.35fr] lg:gap-12">
          <p className="section-label text-black/45">
            02 / Problems We Solve
          </p>

          <div>
            <h2 className="max-w-4xl text-[clamp(2.7rem,6vw,6rem)] font-semibold leading-[0.9] tracking-[-0.065em]">
              You don&apos;t need to know
              <span className="text-black/30"> what the solution is.</span>
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-6 text-black/60 sm:mt-5 sm:text-base sm:leading-7">
              Tell us what is slowing the business down. We work backwards from
              the problem and determine what technology, if any, should solve it.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2">
          {problems.map((item, index) => (
            <motion.article
              key={item.number}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.45, delay: index * 0.035 }}
              className="
                group relative border-b border-black/10 py-5
                md:px-6 md:py-7 md:odd:border-r
                lg:px-8 lg:py-8
              "
            >
              <div className="flex items-start justify-between gap-6">
                <span className="font-mono text-[0.65rem] text-black/30">
                  REQUEST / {item.number}
                </span>

                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
                  <span className="tech-label text-[0.5rem] text-black/35">
                    {item.route}
                  </span>
                </div>
              </div>

              <p className="mt-5 max-w-xl text-xl font-medium leading-tight tracking-[-0.035em] sm:text-2xl">
                &ldquo;{item.problem}&rdquo;
              </p>

              <div className="mt-6 flex items-center gap-3">
                <span className="tech-label text-[0.48rem] text-black/25">
                  INPUT
                </span>

                <div className="relative h-px flex-1 overflow-hidden bg-black/10">
                  <motion.div
                    initial={{ x: "-100%" }}
                    whileInView={{ x: "100%" }}
                    viewport={{ once: false }}
                    transition={{
                      duration: 2.5,
                      delay: index * 0.08,
                      repeat: Infinity,
                      repeatDelay: 2,
                    }}
                    className="absolute h-px w-1/3 bg-[#f26a2e]"
                  />
                </div>

                <span className="h-2 w-2 rounded-full border border-[#f26a2e] bg-white transition-colors group-hover:bg-[#f26a2e]" />
              </div>
            </motion.article>
          ))}
        </div>
      </Container>
    </section>
  );
}