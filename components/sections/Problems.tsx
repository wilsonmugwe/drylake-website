"use client";

import { motion } from "motion/react";
import Container from "@/components/ui/Container";

const problems = [
  {
    number: "01",
    problem: "The spreadsheet has become the system.",
    detail:
      "Important processes depend on files that are difficult to manage, share and scale.",
  },
  {
    number: "02",
    problem: "We're entering the same information more than once.",
    detail:
      "People are copying information between systems because the tools do not connect properly.",
  },
  {
    number: "03",
    problem: "Our systems don't talk to each other.",
    detail:
      "Information is spread across different platforms, creating gaps, delays and manual work.",
  },
  {
    number: "04",
    problem: "Too much still depends on email and manual follow-up.",
    detail:
      "Routine work relies on somebody remembering what needs to happen next.",
  },
  {
    number: "05",
    problem: "Only one person really knows how this process works.",
    detail:
      "Critical knowledge lives with individuals instead of being built into a reliable system.",
  },
  {
    number: "06",
    problem: "Reporting takes longer than it should.",
    detail:
      "Getting a clear view of the business means pulling information together from multiple places.",
  },
];

export default function Problems() {
  return (
    <section
      id="problems"
      className="relative overflow-hidden bg-white py-16 text-black sm:py-20 lg:py-28"
    >
      <div
        aria-hidden="true"
        className="micro-grid pointer-events-none absolute inset-0 opacity-30"
      />

      <Container className="relative z-10">
        {/* Header */}
        <div className="grid gap-6 border-b border-black/10 pb-8 sm:pb-10 lg:grid-cols-[0.65fr_1.35fr] lg:items-end lg:gap-12">
          <div>
            <p className="section-label text-black/45">
              01 / Sound Familiar?
            </p>

            <div className="mt-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

              <span className="tech-label text-black/30">
                SIGNS YOU&apos;VE OUTGROWN THE WORKAROUND
              </span>
            </div>
          </div>

          <div>
            <h2 className="max-w-4xl text-[clamp(2.8rem,6vw,6rem)] font-semibold leading-[0.9] tracking-[-0.065em]">
              Growth makes the
              <span className="text-black/30"> cracks visible.</span>
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-black/60 sm:mt-5 sm:text-base sm:leading-7">
              Most businesses do not start with bad systems. They grow into
              them. A spreadsheet becomes critical, manual steps multiply and
              software that once worked starts getting in the way.
            </p>
          </div>
        </div>

        {/* Problems */}
        <div className="grid md:grid-cols-2">
          {problems.map((item, index) => (
            <motion.article
              key={item.number}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{
                duration: 0.45,
                delay: index * 0.04,
              }}
              className="
                group relative border-b border-black/10 py-7
                md:px-7 md:py-9 md:odd:border-r
                lg:px-9 lg:py-10
              "
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[0.65rem] text-black/30">
                  {item.number}
                </span>

                <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e] opacity-60 transition-opacity group-hover:opacity-100" />
              </div>

              <p className="mt-8 max-w-xl text-[1.55rem] font-medium leading-[1.08] tracking-[-0.045em] sm:text-[1.9rem]">
                &ldquo;{item.problem}&rdquo;
              </p>

              <p className="mt-4 max-w-lg text-sm leading-6 text-black/50 sm:text-[0.95rem]">
                {item.detail}
              </p>
            </motion.article>
          ))}
        </div>

        {/* Transition */}
        <div className="mt-10 border-l-2 border-[#f26a2e] pl-5 sm:mt-14 sm:pl-7 lg:ml-[32.5%]">
          <p className="max-w-3xl text-xl font-medium leading-snug tracking-[-0.03em] sm:text-2xl lg:text-3xl">
            You don&apos;t need to know what the technical solution is.
          </p>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55 sm:text-base">
            Tell us what is slowing the business down. We&apos;ll work
            backwards from the problem.
          </p>
        </div>
      </Container>
    </section>
  );
}