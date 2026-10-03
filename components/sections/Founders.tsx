"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

import Container from "@/components/ui/Container";

const founders = [
  {
    number: "01",
    name: "Benedict Wambugu",
    role: "Co-founder & CEO",
    focus:
      "Business leadership, strategy and making sure the solution addresses the problem the business actually needs solved.",
  },
  {
    number: "02",
    name: "Wilson Mugwe",
    role: "Co-founder & Head of Technology",
    focus:
      "Software engineering, technical architecture and taking systems from idea through to reliable delivery.",
  },
];

const principles = [
  "Direct access to the founders",
  "Clear communication without unnecessary technical jargon",
  "Accountability from discovery through delivery",
];

export default function Founders() {
  return (
    <section
      id="about"
      className="relative overflow-hidden bg-black py-10 text-white sm:py-20 lg:py-28"
    >
      <div
        aria-hidden="true"
        className="hero-large-grid pointer-events-none absolute inset-0 opacity-30"
      />

      <Container className="relative z-10">
        {/* Header */}
        <div className="grid gap-4 border-b border-white/10 pb-6 sm:gap-7 sm:pb-12 lg:grid-cols-[0.65fr_1.35fr] lg:items-end lg:gap-12">
          <div>
            <p className="section-label text-white/40">
              03 / Founder-Led
            </p>

            <div className="mt-2.5 flex items-center gap-2 sm:mt-4">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

              <span className="tech-label text-white/30">
                PERTH / WESTERN AUSTRALIA
              </span>
            </div>
          </div>

          <div>
            <h2 className="max-w-4xl text-[2.4rem] font-semibold leading-[0.92] tracking-[-0.055em] sm:text-[clamp(2.8rem,6vw,6rem)] sm:leading-[0.9] sm:tracking-[-0.065em]">
              Small team.
              <br />

              <span className="text-white/35">
                Direct access.
              </span>
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-5 text-white/55 sm:mt-5 sm:text-base sm:leading-7">
              Work directly with the people responsible for understanding the
              problem and delivering the solution.
            </p>
          </div>
        </div>

        {/* Founder cards */}
        <div className="grid md:grid-cols-2">
          {founders.map((founder, index) => (
            <motion.article
              key={founder.name}
              initial={{
                opacity: 0,
                y: 16,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
              }}
              transition={{
                duration: 0.45,
                delay: index * 0.06,
              }}
              className="
                group relative border-b border-white/10 py-5
                sm:py-8
                md:min-h-[380px]
                md:border-b-0
                md:px-10
                md:py-10
                md:first:border-r
                md:first:pl-0
                md:last:pr-0
              "
            >
              <div className="sm:flex sm:h-full sm:flex-col sm:justify-between sm:gap-10 md:gap-16">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[0.62rem] text-white/25 sm:text-xs">
                    {founder.number}
                  </span>

                  <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
                </div>

                <div className="mt-5 sm:mt-8 md:mt-0">
                  <p className="text-[0.65rem] font-medium uppercase tracking-[0.12em] text-white/35 sm:text-xs">
                    {founder.role}
                  </p>

                  <h3 className="mt-2 text-[2rem] font-semibold leading-[0.94] tracking-[-0.055em] sm:mt-3 sm:text-[clamp(2.4rem,4.5vw,5rem)] sm:leading-[0.92] sm:tracking-[-0.06em]">
                    {founder.name}
                  </h3>

                  <p className="mt-3 max-w-lg text-sm leading-5 text-white/50 sm:mt-5 sm:text-base sm:leading-7">
                    {founder.focus}
                  </p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Why founder-led matters */}
        <div className="pt-5 sm:border-t sm:border-white/10 sm:pt-10">
          <div className="grid gap-3 sm:gap-7 lg:grid-cols-[0.65fr_1.35fr] lg:gap-12">
            <p className="section-label text-white/30">
              What that means for you
            </p>

            <div>
              {principles.map((principle, index) => (
                <div
                  key={principle}
                  className="flex items-center gap-3 border-b border-white/10 py-2.5 sm:gap-4 sm:py-4 sm:first:pt-0"
                >
                  <span className="font-mono text-[0.58rem] text-[#f26a2e] sm:text-[0.6rem]">
                    0{index + 1}
                  </span>

                  <p className="flex-1 text-xs leading-5 text-white/65 sm:text-base">
                    {principle}
                  </p>

                  <ArrowRight
                    size={13}
                    className="text-white/20 sm:h-[14px] sm:w-[14px]"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}