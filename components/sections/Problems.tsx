"use client";

import { motion } from "motion/react";
import Container from "@/components/ui/Container";

const problems = [
  {
    number: "01",
    title: "The spreadsheet has become the system.",
    text: "Important processes depend on files that are becoming difficult to manage, share or scale.",
  },
  {
    number: "02",
    title: "We're entering the same information more than once.",
    text: "Your team is copying information between systems instead of doing useful work.",
  },
  {
    number: "03",
    title: "Our systems don't talk to each other.",
    text: "Information is spread across platforms, creating gaps, delays and manual work.",
  },
  {
    number: "04",
    title: "Too much depends on manual follow-up.",
    text: "Routine work still relies on emails, reminders and somebody remembering what happens next.",
  },
];

export default function Problems() {
  return (
    <section
      id="problems"
      className="relative overflow-hidden bg-white py-10 text-black sm:py-20 lg:py-24"
    >
      <Container>
        {/* Heading */}
        <div className="grid gap-4 border-b border-black/10 pb-6 sm:gap-6 sm:pb-8 lg:grid-cols-[0.65fr_1.35fr] lg:gap-12 lg:pb-10">
          <div>
            <p className="section-label text-black/40">
              01 / Sound Familiar?
            </p>

            <div className="mt-2.5 flex items-center gap-2 sm:mt-4">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

              <span className="tech-label text-black/30">
                SIGNS YOU&apos;VE OUTGROWN THE WORKAROUND
              </span>
            </div>
          </div>

          <div>
            <h2 className="max-w-4xl text-[2.35rem] font-semibold leading-[0.93] tracking-[-0.055em] sm:text-[clamp(3rem,6vw,6rem)] sm:leading-[0.9] sm:tracking-[-0.065em]">
              Growth makes the
              <span className="text-black/25"> cracks visible.</span>
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-black/55 sm:mt-5 sm:text-base sm:leading-7">
              The business grows. Manual steps multiply. Systems that once
              worked well enough start getting in the way.
            </p>
          </div>
        </div>

        {/* Problems */}
        <div className="grid sm:grid-cols-2">
          {problems.map((problem, index) => (
            <motion.article
              key={problem.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.4,
                delay: index * 0.04,
              }}
              className="
                group border-b border-black/10 py-5
                sm:min-h-[210px] sm:px-7 sm:py-7
                sm:odd:border-r sm:odd:pl-0
                sm:even:pr-0
              "
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[0.65rem] text-black/30 sm:text-xs">
                  {problem.number}
                </span>

                <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e] opacity-50" />
              </div>

              <h3 className="mt-4 max-w-md text-xl font-semibold leading-[1.05] tracking-[-0.04em] sm:mt-7 sm:text-2xl">
                {problem.title}
              </h3>

              <p className="mt-2.5 max-w-md text-sm leading-5 text-black/50 sm:mt-3 sm:leading-6">
                {problem.text}
              </p>
            </motion.article>
          ))}
        </div>

        {/* Transition */}
        <div className="pt-5 sm:border-t sm:border-black/10 sm:pt-6">
          <p className="text-sm font-semibold leading-5">
            You don&apos;t need to know what the technical solution is.
          </p>

          <p className="mt-1.5 max-w-xl text-sm leading-5 text-black/45 sm:mt-2 sm:leading-6">
            Tell us what is slowing the business down. We&apos;ll work
            backwards from the problem.
          </p>
        </div>
      </Container>
    </section>
  );
}