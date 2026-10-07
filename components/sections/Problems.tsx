import ScrollProgress from "@/components/motion/ScrollProgress";
import Container from "@/components/ui/Container";
import FragmentField from "@/components/visuals/FragmentField";

type Problem = {
  number: string;
  label: string;
  title: string;
  text: string;
};

const problems: Problem[] = [
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
      <Container className="pt-20 sm:pt-28 lg:pt-36">
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

      <ScrollProgress rest={0} start={0.4} passStart={0.7} end={0} className="mt-14 sm:mt-16 lg:mt-20">
        <Container>
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-8">
            <div className="lg:sticky lg:top-[calc(var(--nav-h)+7vh)] lg:col-span-6 lg:self-start">
              <FragmentField />
            </div>

            <ol className="lg:col-span-5 lg:col-start-8">
              {problems.map((problem) => (
                <li
                  key={problem.number}
                  className="border-t border-black/12 py-10 sm:py-12 lg:flex lg:min-h-[58vh] lg:flex-col lg:justify-center lg:py-16"
                >
                  <p className="flex items-center gap-3 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-black/62">
                    <span className="text-(--orange-ink)">{problem.number}</span>
                    <span aria-hidden="true" className="h-px w-6 bg-black/20" />
                    <span>{problem.label}</span>
                  </p>

                  <h3 className="mt-5 max-w-[15ch] text-balance text-[clamp(2rem,8.6vw,3.6rem)] font-semibold leading-[0.95] tracking-[-0.055em]">
                    {problem.title}
                  </h3>

                  <p className="type-body mt-5 max-w-md text-black/62">{problem.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </ScrollProgress>

      <Container>
        <div className="grid gap-3 border-t border-black/12 py-12 lg:grid-cols-12 lg:py-16">
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
