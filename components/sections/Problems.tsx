import type { ReactNode } from "react";

import InView from "@/components/motion/InView";
import Container from "@/components/ui/Container";
import {
  DisconnectedVisual,
  DoubleHandlingVisual,
  FollowUpVisual,
  SpreadsheetVisual,
} from "@/components/visuals/ProblemVisuals";

type Problem = {
  number: string;
  label: string;
  title: string;
  text: string;
  visual: ReactNode;
  /* Each statement gets its own composition, not a repeated card. */
  layout: "text-left" | "text-right" | "wide" | "narrow";
};

const problems: Problem[] = [
  {
    number: "01",
    label: "SPREADSHEETS",
    title: "The spreadsheet has become the system.",
    text: "Important processes depend on files that are becoming difficult to manage, share or scale.",
    visual: <SpreadsheetVisual />,
    layout: "text-left",
  },
  {
    number: "02",
    label: "DOUBLE HANDLING",
    title: "We're entering the same information more than once.",
    text: "Your team is copying information between systems instead of doing useful work.",
    visual: <DoubleHandlingVisual />,
    layout: "text-right",
  },
  {
    number: "03",
    label: "DISCONNECTED",
    title: "Our systems don't talk to each other.",
    text: "Information is spread across platforms, creating gaps, delays and manual work.",
    visual: <DisconnectedVisual />,
    layout: "wide",
  },
  {
    number: "04",
    label: "MANUAL",
    title: "Too much depends on manual follow-up.",
    text: "Routine work still relies on emails, reminders and somebody remembering what happens next.",
    visual: <FollowUpVisual />,
    layout: "narrow",
  },
];

function Statement({ problem }: { problem: Problem }) {
  return (
    <div>
      <p className="flex items-center gap-3 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-black/62">
        <span className="text-(--orange-ink)">{problem.number}</span>
        <span aria-hidden="true" className="h-px w-6 bg-black/20" />
        <span>{problem.label}</span>
      </p>

      <h3 className="type-statement text-balance mt-5 max-w-[14ch]">{problem.title}</h3>

      <p className="type-body mt-5 max-w-md text-black/62">{problem.text}</p>
    </div>
  );
}

export default function Problems() {
  return (
    <section id="problems" className="surface-paper relative overflow-hidden">
      <Container className="pb-6 pt-20 sm:pt-28 lg:pt-36">
        <div className="grid gap-6 lg:grid-cols-12">
          <p className="section-label text-black/62 lg:col-span-3 lg:pt-4">01 / The Problem</p>

          <div className="lg:col-span-9">
            <h2 className="type-section text-balance">
              Growth makes the
              <br className="hidden sm:block" />
              <span className="text-black/50"> cracks visible.</span>
            </h2>

            <p className="type-lede mt-7 max-w-2xl text-black/62">
              The business grows. Manual steps multiply. Systems that once
              worked well enough start getting in the way.
            </p>
          </div>
        </div>
      </Container>

      <div>
        {problems.map((problem) => (
          <InView key={problem.number} as="article" className="border-t border-black/10 first:border-t-0">
            <Container className="py-16 sm:py-20 lg:py-28">
              {problem.layout === "text-left" ? (
                <div className="grid items-center gap-12 lg:grid-cols-12">
                  <div className="lg:col-span-6">
                    <Statement problem={problem} />
                  </div>
                  <div className="lg:col-span-5 lg:col-start-8">{problem.visual}</div>
                </div>
              ) : null}

              {problem.layout === "text-right" ? (
                <div className="grid items-center gap-12 lg:grid-cols-12">
                  <div className="order-2 lg:order-1 lg:col-span-5">{problem.visual}</div>
                  <div className="order-1 lg:order-2 lg:col-span-6 lg:col-start-7">
                    <Statement problem={problem} />
                  </div>
                </div>
              ) : null}

              {problem.layout === "wide" ? (
                <div>
                  <div className="lg:ml-[25%]">
                    <Statement problem={problem} />
                  </div>
                  <div className="mt-14 lg:-mx-6">{problem.visual}</div>
                </div>
              ) : null}

              {problem.layout === "narrow" ? (
                <div className="grid items-end gap-12 lg:grid-cols-12">
                  <div className="lg:col-span-5">
                    <Statement problem={problem} />
                  </div>
                  <div className="lg:col-span-6 lg:col-start-7">{problem.visual}</div>
                </div>
              ) : null}
            </Container>
          </InView>
        ))}
      </div>

      <Container>
        <div className="grid gap-3 border-t border-black/10 py-12 lg:grid-cols-12 lg:py-16">
          <span className="tech-label text-black/62 lg:col-span-3">NEXT</span>

          <div className="lg:col-span-9">
            <p className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
              You don&apos;t need to know the technical solution.
            </p>

            <p className="type-body mt-2 max-w-xl text-black/62">
              Tell us what is slowing the business down. We&apos;ll work
              backwards from the problem.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
