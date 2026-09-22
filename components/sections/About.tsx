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
    text: "Technology should create meaningful and measurable value.",
  },
];

export default function About() {
  return (
    <section
      id="about"
      className="mineral-texture relative overflow-hidden bg-[#f1efe8] py-20 sm:py-24 lg:py-28"
    >
      <Container className="relative z-10">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="section-label text-black/40">03 / Drylake</p>
          </div>

          <div>
            <motion.h2
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-4xl text-[clamp(2.8rem,6vw,6rem)] font-semibold leading-[0.92] tracking-[-0.065em]"
            >
              Technology should solve problems,
              <span className="text-black/30"> not create more of them.</span>
            </motion.h2>

            <p className="mt-7 max-w-2xl text-base leading-7 text-black/55 sm:text-lg">
              Drylake builds intelligent technology around real operational
              needs. We combine software, AI and automation to help
              organisations work more effectively and create room for growth.
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
            <div
              key={value.title}
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
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}