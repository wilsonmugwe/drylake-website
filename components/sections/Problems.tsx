import Link from "next/link";
import { ArrowRight } from "lucide-react";

import ScrollProgress from "@/components/motion/ScrollProgress";
import Container from "@/components/ui/Container";
import FragmentField from "@/components/visuals/FragmentField";

type Problem = {
  number: string;
  /* Its fuller entry on /solutions (lib/discovery/problems.ts): problem -> solution -> service. */
  anchor: string;
  label: string;
  title: string;
  text: string;
};

const problems: Problem[] = [
  {
    number: "01",
    anchor: "critical-spreadsheet",
    label: "SPREADSHEETS",
    title: "The spreadsheet has become the system.",
    text: "Important processes depend on files that are becoming difficult to manage, share or scale.",
  },
  {
    number: "02",
    anchor: "double-entry",
    label: "DOUBLE HANDLING",
    title: "We're entering the same information more than once.",
    text: "Your team is copying information between systems instead of doing useful work.",
  },
  {
    number: "03",
    anchor: "disconnected-systems",
    label: "DISCONNECTED",
    title: "Our systems don't talk to each other.",
    text: "Information is spread across platforms, creating gaps, delays and manual work.",
  },
  {
    number: "04",
    anchor: "email-approvals",
    label: "MANUAL",
    title: "Too much depends on manual follow-up.",
    text: "Routine work still relies on emails, reminders and somebody remembering what happens next.",
  },
];

/*
 * Chapter 1, the problem (light). Desktop: the fragment field is pinned on the left while the
 * four statements pass on the right; reading them sorts the scattered work artefacts into lanes.
 * Phones: the field sits above the statements and sorts itself as it crosses the screen. No
 * cards: statements are editorial rows on hairlines. Copy unchanged.
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
            <h2 className="type-section text-balance">
              Growth makes the{" "}
              <br className="hidden sm:block" />
              <span className="text-black/50"> cracks visible.</span>
            </h2>

            <p className="type-lede mt-5 sm:mt-7 max-w-2xl text-black/62">
              The business grows. Manual steps multiply. Systems that once
              worked well enough start getting in the way.
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

                  <h3 className="mt-4 max-w-[15ch] sm:mt-5 text-balance text-[clamp(1.9rem,8.2vw,3.2rem)] font-semibold leading-[0.95] tracking-[-0.055em]">
                    {problem.title}
                  </h3>

                  <p className="type-body mt-4 max-w-md text-black/62 sm:mt-5">{problem.text}</p>

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
