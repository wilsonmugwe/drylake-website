"use client";

import { motion } from "motion/react";
import Container from "@/components/ui/Container";

const capabilities = [
  {
    number: "01",
    title: "Software Engineering",
    description:
      "Web applications, internal platforms, portals and software built around real business workflows.",
  },
  {
    number: "02",
    title: "Automation & AI",
    description:
      "Automation and applied AI used where they can genuinely reduce work, improve decisions or make a process better.",
  },
  {
    number: "03",
    title: "APIs & Integrations",
    description:
      "Connect platforms and move information between systems without unnecessary copying, re-entry or manual handling.",
  },
  {
    number: "04",
    title: "Data & Reporting",
    description:
      "Bring operational information together so teams can understand what is happening and make better decisions.",
  },
  {
    number: "05",
    title: "Cloud & Infrastructure",
    description:
      "Hosting, environments, deployment and the technical foundations required to keep systems running reliably.",
  },
  {
    number: "06",
    title: "Web & Mobile",
    description:
      "Digital experiences designed around the customers, staff and workflows that actually use them.",
  },
];

export default function Capabilities() {
  return (
    <section className="relative overflow-hidden bg-white py-16 text-black sm:py-20 lg:py-28">
      <div
        aria-hidden="true"
        className="micro-grid pointer-events-none absolute inset-0 opacity-25"
      />

      <Container className="relative z-10">
        <div className="grid gap-6 border-b border-black/10 pb-8 lg:grid-cols-[0.65fr_1.35fr] lg:gap-12 lg:pb-10">
          <div>
            <p className="section-label text-black/60">
              05 / Capabilities
            </p>

            <div className="mt-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

              <span className="tech-label text-black/60">
                THE TOOL FOLLOWS THE PROBLEM
              </span>
            </div>
          </div>

          <div>
            <h2 className="max-w-4xl text-[clamp(2.7rem,6vw,6rem)] font-semibold leading-[0.9] tracking-[-0.065em]">
              Different technology.
              <br />
              <span className="text-black/45">Same objective.</span>
            </h2>

            <p className="mt-5 max-w-2xl text-sm leading-6 text-black/60 sm:text-base sm:leading-7">
              We don&apos;t begin with a preferred technology and look for
              somewhere to use it. We choose the tools that make sense for the
              business problem.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((capability, index) => (
            <motion.article
              key={capability.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.45,
                delay: index * 0.05,
              }}
              className="
                group relative min-h-[190px] border-b border-black/10 py-7
                sm:min-h-[220px] sm:px-6 sm:py-8 sm:odd:border-r
                lg:min-h-[240px] lg:border-r lg:px-7 lg:py-9
              "
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-black/60">
                  {capability.number}
                </span>

                <span className="h-2 w-2 rounded-full border border-black/20 transition-all duration-300 group-hover:border-[#f26a2e] group-hover:bg-[#f26a2e]" />
              </div>

              <div className="mt-9 sm:mt-11">
                <h3 className="max-w-xs text-xl font-medium tracking-[-0.035em] sm:text-2xl">
                  {capability.title}
                </h3>

                <p className="mt-3 max-w-sm text-sm leading-6 text-black/60 transition-colors group-hover:text-black/70">
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