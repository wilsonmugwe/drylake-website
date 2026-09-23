"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import Container from "@/components/ui/Container";

const values = [
  {
    title: "Innovation",
    text: "Find better ways to solve difficult problems.",
  },
  {
    title: "Integrity",
    text: "Build responsibly, communicate clearly and do what we say.",
  },
  {
    title: "Impact",
    text: "Create technology that produces meaningful value.",
  },
];

export default function About() {
  return (
    <section
      id="about"
      className="mineral-texture relative overflow-hidden bg-[#f2f0e9] py-20 text-black sm:py-24 lg:py-28"
    >
      <Container className="relative z-10">
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <p className="section-label text-black/40">05 / Drylake</p>

          <div>
            <motion.h2
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-4xl text-[clamp(2.8rem,6vw,6rem)] font-semibold leading-[0.92] tracking-[-0.065em]"
            >
              Built close to
              <span className="text-black/30"> the problem.</span>
            </motion.h2>

            <p className="mt-7 max-w-2xl text-base leading-7 text-black/55 sm:text-lg">
              Drylake is a Perth-based technology company building practical
              software and technical systems for Australian businesses.
            </p>

            <p className="mt-4 max-w-2xl text-base leading-7 text-black/55 sm:text-lg">
              We start by understanding how the operation actually works.
              Technology comes after.
            </p>

            <Link
              href="/about"
              className="group mt-7 inline-flex items-center gap-2 text-sm font-semibold"
            >
              About Drylake
              <ArrowUpRight
                size={16}
                className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
              />
            </Link>
          </div>
        </div>

        <div className="mt-16 grid border-t border-black/10 md:grid-cols-3">
          {values.map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.07 }}
              className="border-b border-black/10 py-7 md:border-b-0 md:p-7 md:first:pl-0 md:not-last:border-r"
            >
              <span className="font-mono text-xs text-black/30">
                0{index + 1}
              </span>

              <h3 className="mt-8 text-3xl font-semibold tracking-[-0.05em]">
                {value.title}
              </h3>

              <p className="mt-3 max-w-sm text-sm leading-6 text-black/50">
                {value.text}
              </p>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}