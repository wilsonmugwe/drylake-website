import InView from "@/components/motion/InView";
import Container from "@/components/ui/Container";

const stages = [
  {
    number: "01",
    title: "Understand",
    text: "We learn how the business works today, where time is being lost and what actually needs to improve.",
  },
  {
    number: "02",
    title: "Design",
    text: "We work out the simplest useful solution and how it should fit with the systems and processes already in the business.",
  },
  {
    number: "03",
    title: "Build",
    text: "We develop the software, automation or integration in manageable stages around the real business workflow.",
  },
  {
    number: "04",
    title: "Launch",
    text: "We put the solution into the real environment, connect what matters and make sure the people using it can rely on it.",
  },
];

/*
 * Our Approach (nav target id="approach"). The four existing stages as one journey along the
 * Drylake Line: a horizontal rail with stations on wide screens, a vertical sequence on
 * phones (designed for the narrow screen, not a squeezed timeline). Every stage text is
 * visible and rendered exactly once. The production-engineering half that used to share
 * this section is now its own dark section (Production.tsx).
 */
export default function Approach() {
  return (
    <section id="approach" className="surface-mineral relative overflow-hidden">
      <Container className="py-(--section-y)">
        <div className="grid gap-6 lg:grid-cols-12">
          <p className="section-label text-black/62 lg:col-span-3 lg:pt-4">04 / How We Work</p>

          <div className="lg:col-span-9">
            <h2 className="type-section">
              Understand first.
              <br />
              <span className="text-black/50">Build second.</span>
            </h2>

            <p className="type-lede mt-5 sm:mt-7 max-w-xl text-black/62">
              No technical specification required. We start with the business
              problem and work forward from there.
            </p>
          </div>
        </div>

        <InView className="relative mt-(--block-gap)" threshold={0.2}>
          {/* The rail: horizontal from lg, vertical below. */}
          <span aria-hidden="true" className="dl-grow-x absolute left-0 right-0 top-[7px] hidden h-px bg-black/25 lg:block" />
          <span aria-hidden="true" className="dl-grow-y absolute bottom-6 left-[7px] top-2 w-px bg-black/25 lg:hidden" />

          <ol className="relative grid gap-9 sm:gap-12 lg:grid-cols-4 lg:gap-8">
            {stages.map((stage, index) => (
              <li
                key={stage.number}
                className="dl-fade-view relative pl-10 lg:pl-0 lg:pt-12"
                style={{ ["--d" as string]: `${0.2 + index * 0.18}s` }}
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-0 h-[15px] w-[15px] rounded-full ${
                    index === 0 ? "bg-[#f26a2e]" : "bg-[#f2f0e9] shadow-[0_0_0_1.5px_rgba(11,11,10,0.55)]"
                  }`}
                />

                <span className="block font-mono text-sm text-(--orange-ink)">{stage.number}</span>

                <h3 className="mt-3 text-[clamp(2rem,7vw,3.2rem)] font-semibold leading-none tracking-[-0.055em]">
                  {stage.title}
                </h3>

                <p className="type-body mt-4 max-w-sm text-black/65">{stage.text}</p>
              </li>
            ))}
          </ol>
        </InView>
      </Container>
    </section>
  );
}
