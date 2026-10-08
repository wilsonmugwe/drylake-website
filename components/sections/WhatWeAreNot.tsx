"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import Container from "@/components/ui/Container";

const productionWork = [
  "Authentication",
  "Permissions",
  "Data validation",
  "Integrations",
  "Audit trails",
  "Monitoring",
  "Backups",
  "Recovery",
  "Documentation",
];

export default function WhatWeAreNot() {
  return (
    <section className="relative overflow-hidden bg-[#090909] py-16 text-white sm:py-20 lg:py-28">
      <div
        aria-hidden="true"
        className="hero-large-grid pointer-events-none absolute inset-0 opacity-30"
      />

      <div className="pointer-events-none absolute right-[-180px] top-1/2 hidden h-[520px] w-[520px] -translate-y-1/2 rounded-full border border-white/[0.04] lg:block">
        <div className="absolute inset-20 rounded-full border border-white/[0.05]" />
        <div className="absolute inset-40 rounded-full border border-white/[0.07]" />
      </div>

      <Container className="relative z-10">
        <div className="grid gap-10 lg:grid-cols-[0.65fr_1.35fr] lg:gap-12">
          <div>
            <p className="section-label text-white/55">
              06 / Production Matters
            </p>

            <div className="mt-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

              <span className="tech-label text-white/55">
                BEYOND THE DEMO
              </span>
            </div>
          </div>

          <div>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-sm font-medium uppercase tracking-[0.16em] text-white/55"
            >
              The demo works.
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 }}
              className="mt-3 max-w-5xl text-[clamp(3rem,7vw,7rem)] font-semibold leading-[0.87] tracking-[-0.07em]"
            >
              That&apos;s the
              <span className="text-white/45"> easy part.</span>
            </motion.h2>

            <p className="mt-6 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
              Business software has to keep working after the presentation is
              over. The less visible parts are often the parts the operation
              depends on most.
            </p>

            <div className="mt-9 grid border-t border-white/10 sm:grid-cols-2 lg:mt-12">
              {productionWork.map((item, index) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.035 }}
                  className="
                    flex items-center gap-3 border-b border-white/10 py-4
                    sm:px-5 sm:odd:border-r sm:odd:pl-0
                  "
                >
                  <Check
                    size={14}
                    strokeWidth={2}
                    className="shrink-0 text-[#f26a2e]"
                  />

                  <span className="text-sm text-white/60 sm:text-base">
                    {item}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="mt-12 border-l-2 border-[#f26a2e] pl-5 sm:mt-16 sm:pl-7">
              <p className="text-[clamp(2.2rem,5vw,5rem)] font-semibold leading-[0.92] tracking-[-0.06em]">
                The boring part{" "}
                <br />
                <span className="text-white/45">is the hard part.</span>
              </p>

              <p className="mt-4 max-w-xl text-sm leading-6 text-white/55 sm:text-base">
                We care about the parts that make software dependable when your
                business actually starts relying on it.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}