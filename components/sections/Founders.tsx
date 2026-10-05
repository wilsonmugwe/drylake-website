"use client";

import { motion } from "motion/react";

import Container from "@/components/ui/Container";

const founders = [
  {
    number: "01",
    name: "Benedict Wambugu",
    role: "Co-founder & CEO",
    focus:
      "Business leadership, strategy and making sure the solution addresses the problem the business actually needs solved.",
    credential: "Master of Project Management, Edith Cowan University",
    disciplines: "Strategy / Project Management / Commercial",
  },
  {
    number: "02",
    name: "Wilson Mugwe",
    role: "Co-founder & Head of Technology",
    focus:
      "Software engineering, technical architecture and taking systems from idea through to reliable delivery.",
    credential: "Bachelor of Computer Science, majoring in Software Engineering",
    disciplines: "Engineering / Architecture / AI",
  },
];

export default function Founders() {
  return (
    <section
      id="about"
      className="relative overflow-hidden bg-white py-12 text-black sm:py-20 lg:py-24"
    >
      <Container>
        <div className="grid gap-5 border-b border-black/10 pb-8 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16 lg:pb-12">
          <div>
            <p className="section-label text-black/38">
              03 / Founder-Led
            </p>
          </div>

          <div>
            <h2 className="max-w-5xl text-[clamp(2.55rem,11vw,4rem)] font-semibold leading-[0.92] tracking-[-0.06em] sm:text-[clamp(4rem,6.5vw,6.5rem)]">
              Small team.
              <br />

              <span className="text-black/24">
                Direct access.
              </span>
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-6 text-black/50 sm:mt-6 sm:text-base sm:leading-7">
              Work directly with the people responsible for understanding the
              problem and delivering the solution.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2">
          {founders.map((founder, index) => (
            <motion.article
              key={founder.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.45,
                delay: index * 0.05,
              }}
              className="
                border-b
                border-black/10
                py-7
                md:min-h-[330px]
                md:border-b-0
                md:py-10
                md:first:border-r
                md:first:pr-10
                md:last:pl-10
              "
            >
              <div className="flex h-full flex-col justify-between gap-12">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#f26a2e]">
                    {founder.number}
                  </span>

                  <span className="tech-label text-black/25">
                    {founder.role}
                  </span>
                </div>

                <div>
                  <h3 className="text-[2.25rem] font-semibold leading-[0.95] tracking-[-0.055em] sm:text-[clamp(2.8rem,4vw,4.7rem)]">
                    {founder.name}
                  </h3>

                  <p className="mt-4 max-w-lg text-sm leading-6 text-black/50 sm:text-base sm:leading-7">
                    {founder.focus}
                  </p>

                  {founder.credential && (
                    <p className="mt-3 max-w-lg text-sm leading-6 text-black/70">
                      {founder.credential}
                    </p>
                  )}

                  <p className="tech-label mt-5 text-black/25">
                    {founder.disciplines}
                  </p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        <div className="grid gap-4 border-t border-black/10 pt-6 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
          <span className="tech-label text-black/25">
            What founder-led means
          </span>

          <p className="max-w-3xl text-sm leading-6 text-black/50 sm:text-base">
            Direct communication. Clear accountability. The people discussing
            the problem with you are the same people responsible for making
            sure it gets solved properly.
          </p>
        </div>
      </Container>
    </section>
  );
}