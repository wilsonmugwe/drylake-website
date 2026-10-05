"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import Container from "@/components/ui/Container";

const principles = [
  {
    number: "01",
    title: "Understand before building.",
    text: "The business problem comes first. Technology comes after we understand what actually needs to change.",
  },
  {
    number: "02",
    title: "Integrate before replacing.",
    text: "If something already works, keep it. Good software should connect the business, not create another silo.",
  },
  {
    number: "03",
    title: "Build for real use.",
    text: "A system has to work in the operation, not just in a demonstration. Reliability and maintainability matter.",
  },
];

export default function About() {
  return (
    <section className="mineral-texture relative overflow-hidden bg-[#f2f0e9] py-16 text-black sm:py-20 lg:py-28">
      <Container className="relative z-10">
        <div className="grid gap-7 lg:grid-cols-[0.65fr_1.35fr] lg:gap-12">
          <div>
            <p className="section-label text-black/60">
              08 / How We Think
            </p>

            <div className="mt-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

              <span className="tech-label text-black/60">
                DRYLAKE PRINCIPLES
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
              Technology should make the business
              <span className="text-black/45"> simpler.</span>
            </motion.h2>

            <p className="mt-5 max-w-2xl text-sm leading-6 text-black/60 sm:text-base sm:leading-7">
              Our job isn&apos;t to introduce more technology. It&apos;s to
              understand where technology can remove friction and make the
              operation work better.
            </p>

            <Link
              href="/about"
              className="group mt-6 inline-flex items-center gap-2 border-b border-black pb-1 text-sm font-semibold"
            >
              About Drylake

              <ArrowUpRight
                size={16}
                className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
              />
            </Link>
          </div>
        </div>

        <div className="mt-12 grid border-t border-black/10 md:grid-cols-3 lg:mt-16">
          {principles.map((principle, index) => (
            <motion.article
              key={principle.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.07 }}
              className="
                group border-b border-black/10 py-7
                md:min-h-[300px] md:border-b-0 md:border-r md:p-8
                md:first:pl-0 md:last:border-r-0 md:last:pr-0
              "
            >
              <div className="flex h-full flex-col justify-between gap-14">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-black/60">
                    {principle.number}
                  </span>

                  <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
                </div>

                <div>
                  <h3 className="max-w-xs text-2xl font-semibold leading-tight tracking-[-0.045em] sm:text-3xl">
                    {principle.title}
                  </h3>

                  <p className="mt-4 max-w-sm text-sm leading-6 text-black/60">
                    {principle.text}
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