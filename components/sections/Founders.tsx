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
    <section className="relative overflow-hidden bg-white py-20 text-black sm:py-24 lg:py-28">
      <Container>
        <div className="grid gap-8 border-b border-black/10 pb-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <div>
            <p className="section-label text-black/45">
              06 / People
            </p>

            <div className="mt-5 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

              <span className="tech-label text-black/30">
                PEOPLE / DRYLAKE
              </span>
            </div>
          </div>

          <h2 className="max-w-4xl text-[clamp(3rem,6vw,6rem)] font-semibold leading-[0.9] tracking-[-0.065em]">
            People behind Drylake.
          </h2>
        </div>

        <div className="grid md:grid-cols-2">
          {founders.map((founder, index) => (
            <motion.article
              key={founder.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="group relative overflow-hidden border-b border-black/10 py-9 md:min-h-[360px] md:border-b-0 md:p-10 md:first:border-r md:first:pl-0"
            >
              {/* Oversized founder number */}
              <span className="pointer-events-none absolute -right-5 top-0 text-[11rem] font-semibold leading-none tracking-[-0.09em] text-black/[0.025] transition-all duration-500 group-hover:-translate-y-2 group-hover:text-black/[0.045] sm:text-[14rem]">
                {founder.number}
              </span>

              {/* technical geometry */}
              <div className="pointer-events-none absolute right-8 top-8 h-20 w-20 rounded-full border border-black/[0.05] opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                <div className="absolute inset-5 rounded-full border border-black/[0.08]" />
                <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f26a2e]" />
              </div>

              <div className="relative z-10 flex h-full flex-col justify-between gap-20">
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
                  <p className="text-sm font-medium text-black/55 transition-colors group-hover:text-black">
                    {founder.role}
                  </p>

                  <h3 className="mt-3 max-w-xl text-[clamp(2.5rem,4.5vw,5rem)] font-semibold leading-[0.92] tracking-[-0.06em] transition-transform duration-300 group-hover:translate-x-1">
                    {founder.name}
                  </h3>

                  <p className="mt-5 max-w-md leading-7 text-black/60">
                    {founder.focus}
                  </p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </Container>
    </section>
  );
}