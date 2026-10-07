import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import InView from "@/components/motion/InView";
import Container from "@/components/ui/Container";

/* Practical verbs, each with a concrete input and output. No claims of results. */
const verbs = [
  { verb: "Extract.", input: "invoice.pdf", output: "supplier, amount, due date" },
  { verb: "Classify.", input: "inbound email", output: "quote, support or accounts" },
  { verb: "Summarise.", input: "long email thread", output: "three lines and the next step" },
  { verb: "Route.", input: "new enquiry", output: "the right person, with context" },
  { verb: "Assist.", input: "draft reply", output: "reviewed and sent by your team" },
  { verb: "Predict.", input: "past jobs", output: "likely workload next week" },
];

/*
 * Chapter 4, applied AI (restrained, dark). Typography and plain input-to-output lines, nothing
 * else: no robots, brains, glow or gradients. Each row's connector draws once on arrival
 * (InView); the words are always visible, so nothing depends on the motion.
 */
export default function AppliedAI() {
  return (
    <section className="hz-surface-ink-3 relative overflow-hidden">
      <Container className="py-20 sm:py-28 lg:py-36">
        <div className="grid gap-6 lg:grid-cols-12">
          <p className="section-label flex items-center gap-2.5 self-start text-white/60 lg:col-span-3 lg:pt-4">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-signal" />
            Applied AI
          </p>

          <div className="lg:col-span-9">
            <h2 className="type-section">
              AI, applied
              <br />
              <span className="text-white/45">to the actual work.</span>
            </h2>

            <p className="type-lede mt-7 max-w-xl text-white/66">
              We use AI where it removes real effort from a workflow, with a
              person kept in the loop wherever judgement matters.
            </p>
          </div>
        </div>

        <InView as="ol" className="mt-14 border-t border-white/12 lg:mt-20" threshold={0.2}>
          {verbs.map((row, index) => (
            <li
              key={row.verb}
              className="grid gap-x-8 gap-y-2 border-b border-white/12 py-6 sm:grid-cols-12 sm:items-center sm:py-7"
            >
              <span className="text-[clamp(2rem,8vw,3.6rem)] font-semibold leading-none tracking-[-0.05em] sm:col-span-5 lg:col-span-4">
                {row.verb}
              </span>

              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.74rem] uppercase tracking-[0.1em] sm:col-span-7 lg:col-span-8">
                <span className="text-white/60">{row.input}</span>
                <span aria-hidden="true" className="relative hidden h-px w-16 bg-white/20 sm:block">
                  <span
                    className="dl-grow-x absolute inset-0 bg-signal"
                    style={{ ["--d" as string]: `${0.15 + index * 0.12}s` }}
                  />
                </span>
                <span className="sr-only">to</span>
                <span aria-hidden="true" className="text-white/40 sm:hidden">→</span>
                <span className="text-white/88">{row.output}</span>
              </span>
            </li>
          ))}
        </InView>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-lg text-sm leading-6 text-white/62">
            Where AI does not earn its place, we leave it out. The right answer
            is sometimes a simpler workflow.
          </p>
          <Link href="/services/ai-automation" className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-white">
            <span className="link-underline">AI automation</span>
            <ArrowUpRight aria-hidden="true" size={15} className="text-signal" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
