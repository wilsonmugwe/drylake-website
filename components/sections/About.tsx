"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import Container from "@/components/ui/Container";

const values = [
  {
    number: "01",
    title: "Innovation",
    text: "Find better ways to solve difficult problems.",
    code: "BETTER / WAYS",
  },
  {
    number: "02",
    title: "Integrity",
    text: "Build responsibly, communicate clearly and do what we say.",
    code: "CLEAR / WORK",
  },
  {
    number: "03",
    title: "Impact",
    text: "Create technology that produces meaningful value.",
    code: "REAL / VALUE",
  },
];

export default function About() {
  return (
    <section
      id="about"
      className="mineral-texture relative overflow-hidden bg-[#f2f0e9] py-14 text-black sm:py-20 lg:py-28"
    >
      {/* architectural depth */}

      <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-[28%] lg:block">
        <div className="absolute left-0 top-0 h-full w-px bg-black/[0.05]" />

        <div className="absolute right-16 top-24 h-52 w-52 rounded-full border border-black/[0.05]" />

        <div className="absolute right-28 top-36 h-28 w-28 rounded-full border border-black/[0.07]" />

        <span className="tech-label absolute right-16 top-16 text-black/20">
          DRYLAKE / 007
        </span>
      </div>

      {/* mobile background geometry */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 top-12 h-40 w-40 lg:hidden"
      >
        <div className="absolute inset-0 rounded-full border border-black/[0.04]" />
        <div className="absolute inset-10 rounded-full border border-black/[0.06]" />
      </div>

      <Container className="relative z-10">
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[0.65fr_1.35fr] lg:gap-12">
          <div>
            <p className="section-label text-black/50">
              07 / Drylake
            </p>

            <div className="mt-3 flex items-center gap-2 sm:mt-5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

              <span className="tech-label text-black/30">
                PERTH / WESTERN AUSTRALIA
              </span>
            </div>
          </div>

          <div>
            <motion.h2
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.65,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="max-w-4xl text-[clamp(2.7rem,6vw,6rem)] font-semibold leading-[0.92] tracking-[-0.065em]"
            >
              Built close to the problem.
            </motion.h2>

            <div className="mt-4 max-w-2xl sm:mt-7">
              <p className="text-sm leading-6 text-black/65 sm:text-lg sm:leading-7">
                Drylake builds practical software and technical systems around
                the way businesses actually work.
              </p>

              <p className="mt-3 text-sm font-medium leading-6 text-black sm:mt-4 sm:text-lg sm:leading-7">
                We start by understanding how the operation actually works.
                Technology comes after.
              </p>
            </div>

            <Link
              href="/about"
              className="group mt-5 inline-flex items-center gap-2 border-b border-black pb-1 text-sm font-semibold text-black sm:mt-7"
            >
              About Drylake

              <ArrowUpRight
                size={16}
                className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
              />
            </Link>
          </div>
        </div>

        {/* =====================================================
            VALUES
            ===================================================== */}

        <div className="mt-8 grid border-t border-black/10 sm:mt-12 md:grid-cols-3 lg:mt-14">
          {values.map((value, index) => (
            <motion.article
              key={value.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.07 }}
              className="group relative overflow-hidden border-b border-black/10 py-5 sm:py-7 md:min-h-[270px] md:border-b-0 md:p-8 md:first:pl-0 md:not-last:border-r"
            >
              {/* giant number */}

              <span className="pointer-events-none absolute -right-2 -top-4 text-[6.5rem] font-semibold leading-none tracking-[-0.08em] text-black/[0.025] transition-all duration-500 group-hover:text-black/[0.045] sm:-top-5 sm:text-[10rem]">
                {value.number}
              </span>

              <div className="relative z-10 flex h-full flex-col justify-between gap-8 sm:gap-12 md:gap-16">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-black/40">
                    {value.number}
                  </span>

                  <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e] opacity-50 transition-opacity group-hover:opacity-100" />
                </div>

                <div>
                  <span className="tech-label text-black/30">
                    {value.code}
                  </span>

                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] transition-transform duration-300 group-hover:translate-x-1 sm:mt-3 sm:text-3xl">
                    {value.title}
                  </h3>

                  <p className="mt-2 max-w-sm text-sm leading-6 text-black/60 transition-colors group-hover:text-black/80 sm:mt-3">
                    {value.text}
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