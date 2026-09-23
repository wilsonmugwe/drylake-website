"use client";

import { motion } from "motion/react";
import Container from "@/components/ui/Container";

const capabilities = [
  {
    number: "01",
    title: "AI & Intelligent Systems",
    description:
      "Use AI where it can remove work, improve decisions or create genuinely useful functionality.",
  },
  {
    number: "02",
    title: "Cloud & Infrastructure",
    description:
      "The hosting, environments and technical foundations that keep digital systems running.",
  },
  {
    number: "03",
    title: "Data & Analytics",
    description:
      "Turn operational data into useful information, reporting and decision support.",
  },
  {
    number: "04",
    title: "Web & Mobile",
    description:
      "Digital products designed around the people and workflows that actually use them.",
  },
  {
    number: "05",
    title: "APIs & Integrations",
    description:
      "Connect platforms and move information between systems without unnecessary manual work.",
  },
  {
    number: "06",
    title: "Technical SEO",
    description:
      "Search foundations covering crawlability, indexing, structure, performance and implementation.",
  },
];

export default function Capabilities() {
  return (
    <section className="relative overflow-hidden bg-black py-16 text-white sm:py-20 lg:py-24">
      <div className="hero-large-grid pointer-events-none absolute inset-0 opacity-40" />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-1/2 hidden h-[520px] w-[520px] -translate-y-1/2 lg:block"
      >
        <div className="absolute inset-0 rounded-full border border-white/[0.05]" />
        <div className="absolute inset-20 rounded-full border border-white/[0.06]" />
        <div className="absolute inset-40 rounded-full border border-white/[0.08]" />
      </div>

      <Container className="relative z-10">
        <div className="grid gap-6 border-b border-white/10 pb-8 lg:grid-cols-[0.65fr_1.35fr] lg:gap-12 lg:pb-10">
          <p className="section-label text-white/40">
            04 / Capabilities
          </p>

          <div>
            <h2 className="max-w-4xl text-[clamp(2.7rem,6vw,6rem)] font-semibold leading-[0.9] tracking-[-0.065em]">
              Different tools.
              <span className="text-white/30"> Same objective.</span>
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-6 text-white/55 sm:mt-5 sm:text-base sm:leading-7">
              These are capabilities we can bring into a project when the
              problem calls for them.
            </p>
          </div>
        </div>

        <div className="mt-0 grid sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((capability, index) => (
            <motion.article
              key={capability.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: index * 0.05 }}
              className="
                group relative min-h-[180px] border-b border-white/10 py-6
                sm:min-h-[210px] sm:px-6 sm:py-7 sm:odd:border-r
                lg:min-h-[230px] lg:border-r lg:px-7 lg:py-8
              "
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-white/25">
                  {capability.number}
                </span>

                <span className="h-2 w-2 rounded-full border border-white/25 transition-all duration-300 group-hover:border-[#f26a2e] group-hover:bg-[#f26a2e]" />
              </div>

              <div className="mt-8 sm:mt-10">
                <h3 className="max-w-xs text-xl font-medium tracking-[-0.035em] sm:text-2xl">
                  {capability.title}
                </h3>

                <p className="mt-3 max-w-sm text-sm leading-6 text-white/45 transition-colors group-hover:text-white/65">
                  {capability.description}
                </p>
              </div>

              <div className="absolute bottom-0 left-0 h-px w-0 bg-[#f26a2e] transition-all duration-500 group-hover:w-full" />
            </motion.article>
          ))}
        </div>
      </Container>
    </section>
  );
}