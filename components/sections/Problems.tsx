import Link from "next/link";
import { ArrowRight } from "lucide-react";

import ScrollProgress from "@/components/motion/ScrollProgress";
import Container from "@/components/ui/Container";
import FragmentField from "@/components/visuals/FragmentField";
import { VALUE_EXAMPLE_NOTE, VALUE_EXAMPLES, type ValueExample } from "@/lib/value-examples";

type Problem = {
  number: string;
  /* Its fuller entry on /solutions (lib/discovery/problems.ts): problem -> solution -> service. */
  anchor: string;
  label: string;
  /* The situation, in the owner's own words. */
  title: string;
  /* What Drylake does about it, in plain English. */
  text: string;
  /* An illustrative calculation (lib/value-examples.ts), never a client result. */
  example: ValueExample;
};

/*
 * Plain-English messaging (2026-10-13): each row is a situation an owner recognises, the fix, and
 * a worked example with its assumptions. No claims about results: the numbers are calculations.
 */
const problems: Problem[] = [
  {
    number: "01",
    anchor: "critical-spreadsheet",
    label: "SPREADSHEETS",
    title: "We're managing bookings and jobs through emails and spreadsheets.",
    text: "We build one simple system for your bookings, customers and jobs, so everyone works from the same up-to-date information.",
    example: VALUE_EXAMPLES.searching,
  },
  {
    number: "02",
    anchor: "double-entry",
    label: "DOUBLE HANDLING",
    title: "Our staff enter the same customer details into three systems.",
    text: "We connect those systems so the information only needs to be entered once, where the software supports it.",
    example: VALUE_EXAMPLES.doubleEntry,
  },
  {
    number: "03",
    anchor: "repeat-messages",
    label: "FOLLOW-UPS",
    title: "We keep sending the same reminders and messages to customers.",
    text: "We set up software that sends routine reminders and follow-ups at the right time, so nobody has to remember.",
    example: VALUE_EXAMPLES.reminders,
  },
  {
    number: "04",
    anchor: "lost-enquiries",
    label: "ENQUIRIES",
    title: "We answer the same customer questions all day.",
    text: "We can build website forms and AI tools that answer common questions, sort enquiries and draft replies, with your team checking anything that matters.",
    example: VALUE_EXAMPLES.enquiries,
  },
];

/*
 * Chapter 1, the problem (light). Desktop: the fragment field is pinned on the left while the
 * four situations pass on the right; reading them sorts the scattered work artefacts into lanes.
 * Phones: the field sits above the statements and sorts itself as it crosses the screen. No
 * cards: situations are editorial rows on hairlines.
 *
 * overflow-clip (not hidden) so the sticky field still pins.
 */
export default function Problems() {
  return (
    <section id="problems" className="surface-paper relative overflow-clip">
      <Container className="pt-(--section-y)">
        <div className="grid gap-6 lg:grid-cols-12">
          <p className="section-label text-black/62 lg:col-span-3 lg:pt-4">01 / The Problem</p>

          <div className="lg:col-span-9">
            {/* Homepage clarity (2026-10-10): the outcome, in the owner's words. Three short lines, the
                third muted, same oversized type-section scale; each line is its own block so the
                break points are fixed and nothing wraps awkwardly at any width. */}
            <h2 className="type-section">
              <span className="block">Less paperwork.</span>
              <span className="block">Less chasing.</span>
              <span className="block text-balance text-black/50">More time for your business.</span>
            </h2>

            <p className="type-lede mt-5 sm:mt-7 max-w-2xl text-black/62">
              Small, repeated tasks add up. {VALUE_EXAMPLES.staffCost.text}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-black/60">
              {VALUE_EXAMPLE_NOTE}
            </p>
          </div>
        </div>
      </Container>

      {/* Experience polish: both layouts start sorting as the field enters, finish early (finish)
          and hold the sorted lanes on screen. Desktop: sorted by the second statement; phones: sorted
          by the time the whole field is on screen. */}
      <ScrollProgress rest={0} start={0.9} finish={0.42} passStart={0.98} end={-0.28} className="mt-8 sm:mt-12 lg:mt-14">
        <Container>
          <div className="grid gap-8 sm:gap-14 lg:grid-cols-12 lg:gap-8">
            <div className="lg:sticky lg:top-[calc(var(--nav-h)+7vh)] lg:col-span-6 lg:self-start">
              <FragmentField />
            </div>

            <ol className="lg:col-span-5 lg:col-start-8">
              {problems.map((problem) => (
                <li
                  key={problem.number}
                  className="border-t border-black/12 py-7 sm:py-10 lg:flex lg:min-h-[36vh] lg:flex-col lg:justify-center lg:py-10"
                >
                  <p className="flex items-center gap-3 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-black/62">
                    <span className="text-(--orange-ink)">{problem.number}</span>
                    <span aria-hidden="true" className="h-px w-6 bg-black/20" />
                    <span>{problem.label}</span>
                  </p>

                  <h3 className="mt-4 max-w-[18ch] sm:mt-5 text-balance text-[clamp(1.7rem,6.8vw,2.7rem)] font-semibold leading-[0.98] tracking-[-0.05em]">
                    {problem.title}
                  </h3>

                  <p className="type-body mt-4 max-w-md text-black/62 sm:mt-5">{problem.text}</p>

                  <p className="mt-4 max-w-md border-l-2 border-black/15 pl-3 text-sm leading-6 text-black/70">
                    <span className="block font-mono text-[0.62rem] uppercase tracking-[0.12em] text-black/62">For example</span>
                    {problem.example.text}
                    <span className="mt-1 block text-xs leading-5 text-black/60">Assumes {problem.example.assumptions}</span>
                  </p>

                  <Link
                    href={`/solutions#${problem.anchor}`}
                    className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-black underline decoration-black/25 underline-offset-4 transition-colors hover:decoration-black sm:mt-5"
                  >
                    How this gets fixed
                    <ArrowRight aria-hidden="true" size={14} />
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </ScrollProgress>

      <Container>
        <div className="grid gap-3 border-t border-black/12 py-8 sm:py-10 lg:grid-cols-12 lg:py-12">
          <span className="tech-label text-black/62 lg:col-span-3">NEXT</span>

          <div className="lg:col-span-9">
            {/* Final refinement 2026-10-08: this block repeated the closing reassurance ("No technical
                brief required", ContactCTA and the FAQ). It now carries the problem-led path instead. */}
            <Link
              href="/solutions"
              className="group inline-flex min-h-11 items-center gap-3 text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
            >
              <span className="underline decoration-black/20 underline-offset-[6px] transition-colors group-hover:decoration-black">
                See every business problem we solve
              </span>
              <ArrowRight aria-hidden="true" size={20} />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
