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
      className="relative overflow-hidden bg-black py-16 text-white sm:py-20 lg:py-28"
    >
      <div
        aria-hidden="true"
        className="hero-large-grid pointer-events-none absolute inset-0 opacity-30"
      />

      <Container className="relative z-10">
        {/* Header */}
        <div className="grid gap-7 border-b border-white/10 pb-9 sm:pb-12 lg:grid-cols-[0.65fr_1.35fr] lg:items-end lg:gap-12">
          <div>
            <p className="section-label text-white/40">
              03 / Founder-Led
            </p>

            <div className="mt-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

              <span className="tech-label text-white/30">
                PERTH / WESTERN AUSTRALIA
              </span>
            </div>
          </div>

          <div>
            <h2 className="max-w-4xl text-[clamp(2.8rem,6vw,6rem)] font-semibold leading-[0.9] tracking-[-0.065em]">
              Small team.
              <br />
              <span className="text-white/35">Direct access.</span>
            </h2>

            <p className="mt-5 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
              When you work with Drylake, you work directly with the people
              responsible for understanding the problem and delivering the
              solution.
            </p>
          </div>
        </div>

        {/* Founder cards */}
        <div className="grid md:grid-cols-2">
          {founders.map((founder, index) => (
            <motion.article
              key={founder.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: index * 0.08,
              }}
              className="
                group relative min-h-[310px] border-b border-white/10 py-8
                md:min-h-[380px] md:border-b-0 md:px-10 md:py-10
                md:first:border-r md:first:pl-0 md:last:pr-0
              "
            >
              <div className="flex h-full flex-col justify-between gap-16">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-white/25">
                    {founder.number}
                  </span>

                  <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/35">
                    {founder.role}
                  </p>

                  <h3 className="mt-3 max-w-xl text-[clamp(2.4rem,4.5vw,5rem)] font-semibold leading-[0.92] tracking-[-0.06em]">
                    {founder.name}
                  </h3>

                  <p className="mt-5 max-w-lg text-sm leading-6 text-white/50 sm:text-base sm:leading-7">
                    {founder.focus}
                  </p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Why founder-led matters */}
        <div className="border-t border-white/10 pt-8 sm:pt-10">
          <div className="grid gap-7 lg:grid-cols-[0.65fr_1.35fr] lg:gap-12">
            <p className="section-label text-white/30">
              What that means for you
            </p>

            <div>
              {principles.map((principle, index) => (
                <div
                  key={principle}
                  className="flex items-center gap-4 border-b border-white/10 py-4 first:pt-0"
                >
                  <span className="font-mono text-[0.6rem] text-[#f26a2e]">
                    0{index + 1}
                  </span>

                  <p className="flex-1 text-sm text-white/65 sm:text-base">
                    {principle}
                  </p>

                  <ArrowRight
                    size={14}
                    className="text-white/20"
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