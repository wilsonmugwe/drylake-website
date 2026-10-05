"use client";

import { motion } from "motion/react";

import Container from "@/components/ui/Container";

const problems = [
  {
    number: "01",
    label: "SPREADSHEETS",
    title: "The spreadsheet has become the system.",
    text: "Important processes depend on files that are becoming difficult to manage, share or scale.",
  },
  {
    number: "02",
    label: "DOUBLE HANDLING",
    title: "We're entering the same information more than once.",
    text: "Your team is copying information between systems instead of doing useful work.",
  },
  {
    number: "03",
    label: "DISCONNECTED",
    title: "Our systems don't talk to each other.",
    text: "Information is spread across platforms, creating gaps, delays and manual work.",
  },
  {
    number: "04",
    label: "MANUAL",
    title: "Too much depends on manual follow-up.",
    text: "Routine work still relies on emails, reminders and somebody remembering what happens next.",
  },
];

export default function Problems() {
  return (
    <section
      id="problems"
      className="relative bg-white py-12 text-black sm:py-20 lg:py-24"
    >
      <Container>
        <div className="grid gap-5 border-b border-black/10 pb-8 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16 lg:pb-12">
          <div>
            <p className="section-label text-black/60">
              01 / The Problem
            </p>
          </div>

          <div>
            <h2 className="max-w-5xl text-[clamp(2.55rem,11vw,4rem)] font-semibold leading-[0.92] tracking-[-0.06em] sm:text-[clamp(4rem,6.5vw,6.5rem)]">
              Growth makes the
              <br className="hidden sm:block" />
              <span className="text-black/45">
                {" "}cracks visible.
              </span>
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-black/60 sm:mt-6 sm:text-base sm:leading-7">
              The business grows. Manual steps multiply. Systems that once
              worked well enough start getting in the way.
            </p>
          </div>
        </div>

        <div>
          {problems.map((problem, index) => (
            <motion.article
              key={problem.number}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{
                duration: 0.4,
                delay: index * 0.035,
              }}
              className="
                group
                grid
                gap-2
                border-b
                border-black/10
                py-5
                sm:py-7
                lg:grid-cols-[0.12fr_0.25fr_0.9fr_0.7fr]
                lg:items-start
                lg:gap-8
                lg:py-8
              "
            >
              <span className="font-mono text-[0.62rem] text-(--orange-ink) sm:text-xs">
                {problem.number}
              </span>

              <span className="tech-label text-black/60">
                {problem.label}
              </span>

              <h3 className="max-w-xl text-xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-2xl lg:text-[1.7rem]">
                {problem.title}
              </h3>

              <p className="max-w-lg text-sm leading-5 text-black/60 sm:leading-6">
                {problem.text}
              </p>
            </motion.article>
          ))}
        </div>

        <div className="grid gap-2 pt-6 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16 lg:pt-8">
          <span className="tech-label text-black/60">
            NEXT
          </span>

          <div>
            <p className="text-sm font-semibold sm:text-base">
              You don&apos;t need to know the technical solution.
            </p>

            <p className="mt-1.5 max-w-xl text-sm leading-6 text-black/60">
              Tell us what is slowing the business down. We&apos;ll work
              backwards from the problem.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}