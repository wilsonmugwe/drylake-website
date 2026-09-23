"use client";

import { motion } from "motion/react";
import Container from "@/components/ui/Container";

const founders = [
  {
    number: "01",
    name: "Benedict Wambugu",
    role: "Co-Founder & CEO",
    focus: "Business leadership, strategy and operations.",
    code: "BUSINESS / STRATEGY",
  },
  {
    number: "02",
    name: "Wilson Mugwe",
    role: "Co-Founder & Head of Technology",
    focus: "Technology, software engineering and technical delivery.",
    code: "TECHNOLOGY / DELIVERY",
  },
];

export default function Founders() {
  return (
    <section className="relative overflow-hidden bg-white py-14 text-black sm:py-20 lg:py-28">
      {/* subtle architectural background */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-30"
      >
        <div className="micro-grid absolute inset-0" />
      </div>

      <Container className="relative z-10">
        <div className="grid gap-5 border-b border-black/10 pb-7 sm:gap-8 sm:pb-10 lg:grid-cols-[0.65fr_1.35fr] lg:items-end lg:gap-12">
          <div>
            <p className="section-label text-black/45">
              08 / People
            </p>

            <div className="mt-3 flex items-center gap-2 sm:mt-5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

              <span className="tech-label text-black/30">
                PEOPLE / DRYLAKE
              </span>
            </div>
          </div>

          <h2 className="max-w-4xl text-[clamp(2.7rem,6vw,6rem)] font-semibold leading-[0.9] tracking-[-0.065em]">
            People behind Drylake.
          </h2>
        </div>

        <div className="grid md:grid-cols-2">
          {founders.map((founder, index) => (
            <motion.article
              key={founder.name}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="group relative overflow-hidden border-b border-black/10 py-6 sm:py-8 md:min-h-[360px] md:border-b-0 md:p-10 md:first:border-r md:first:pl-0"
            >
              {/* oversized founder number */}

              <span className="pointer-events-none absolute -right-3 top-0 text-[8rem] font-semibold leading-none tracking-[-0.09em] text-black/[0.025] transition-all duration-500 group-hover:-translate-y-2 group-hover:text-black/[0.045] sm:-right-5 sm:text-[14rem]">
                {founder.number}
              </span>

              {/* technical geometry */}

              <div className="pointer-events-none absolute right-5 top-5 h-16 w-16 rounded-full border border-black/[0.05] opacity-50 transition-opacity duration-500 group-hover:opacity-100 sm:right-8 sm:top-8 sm:h-20 sm:w-20">
                <div className="absolute inset-4 rounded-full border border-black/[0.08] sm:inset-5" />

                <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f26a2e]" />
              </div>

              <div className="relative z-10 flex h-full flex-col justify-between gap-10 sm:gap-14 md:gap-20">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-black/40">
                    {founder.number}
                  </span>

                  <div className="h-px w-8 bg-black/15 transition-all duration-300 group-hover:w-14 group-hover:bg-[#f26a2e]" />

                  <span className="tech-label text-black/30">
                    {founder.code}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-black/50 transition-colors group-hover:text-black sm:text-sm sm:normal-case sm:tracking-normal">
                    {founder.role}
                  </p>

                  <h3 className="mt-2 max-w-xl text-[clamp(2.25rem,4.5vw,5rem)] font-semibold leading-[0.92] tracking-[-0.06em] transition-transform duration-300 group-hover:translate-x-1 sm:mt-3">
                    {founder.name}
                  </h3>

                  <p className="mt-3 max-w-md text-sm leading-6 text-black/60 sm:mt-5 sm:text-base sm:leading-7">
                    {founder.focus}
                  </p>

                  <div className="mt-5 flex items-center gap-3 border-t border-black/10 pt-3 sm:mt-7">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

                    <span className="tech-label text-black/25">
                      DRYLAKE / {founder.number}
                    </span>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </Container>
    </section>
  );
}