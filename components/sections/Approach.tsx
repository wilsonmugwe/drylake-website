"use client";

import { motion } from "motion/react";
import Container from "@/components/ui/Container";

const stages = ["Discover", "Design", "Build", "Deploy", "Evolve"];

export default function Approach() {
  return (
    <section
      id="approach"
      className="relative overflow-hidden bg-[#0a0a0a] py-20 text-white sm:py-24 lg:py-28"
    >
      <Container>
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="section-label text-white/35">02 / How We Work</p>
          </div>

          <div>
            <h2 className="max-w-4xl text-[clamp(2.8rem,6vw,6rem)] font-semibold leading-[0.92] tracking-[-0.065em]">
              Start with the problem.
              <span className="text-white/30"> Build what matters.</span>
            </h2>

            <p className="mt-6 max-w-xl text-base leading-7 text-white/50">
              We understand the operation first, then design the technology
              around the outcome rather than forcing the problem into a
              predefined tool.
            </p>
          </div>
        </div>

        <div className="mt-14 border-t border-white/10">
          {stages.map((stage, index) => (
            <motion.div
              key={stage}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="group grid grid-cols-[55px_1fr_auto] items-center border-b border-white/10 py-5 sm:grid-cols-[80px_1fr_auto] lg:py-6"
            >
              <span className="font-mono text-xs text-white/25">
                0{index + 1}
              </span>

              <span className="text-2xl font-medium tracking-[-0.04em] transition-transform duration-300 group-hover:translate-x-2 sm:text-3xl">
                {stage}
              </span>

              <span className="text-xs uppercase tracking-[0.15em] text-white/25">
                {index === stages.length - 1 ? "Improve" : "Next"}
              </span>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}