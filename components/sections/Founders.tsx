"use client";

import { motion } from "motion/react";
import Container from "@/components/ui/Container";

const founders = [
  {
    number: "01",
    name: "Benedict Wambugu",
    role: "Co-Founder & CEO",
    focus: "Business leadership, strategy and operations.",
  },
  {
    number: "02",
    name: "Wilson Mugwe",
    role: "Co-Founder & Head of Technology",
    focus: "Technology, software engineering and technical delivery.",
  },
];

export default function Founders() {
  return (
    <section className="bg-white py-20 text-black sm:py-24 lg:py-28">
      <Container>
        <div className="grid gap-8 border-b border-black/10 pb-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <p className="section-label text-black/35">06 / People</p>

          <h2 className="max-w-4xl text-[clamp(3rem,6vw,6rem)] font-semibold leading-[0.9] tracking-[-0.065em]">
            People behind
            <span className="text-black/25"> Drylake.</span>
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
              whileHover={{ y: -5 }}
              className="group border-b border-black/10 py-9 md:min-h-[300px] md:p-9 md:first:border-r md:first:pl-0"
            >
              <div className="flex h-full flex-col justify-between gap-16">
                <span className="font-mono text-xs text-black/30">
                  {founder.number}
                </span>

                <div>
                  <p className="text-sm font-medium text-black/40">
                    {founder.role}
                  </p>

                  <h3 className="mt-2 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
                    {founder.name}
                  </h3>

                  <p className="mt-4 max-w-md leading-7 text-black/50">
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