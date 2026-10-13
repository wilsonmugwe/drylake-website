import InView from "@/components/motion/InView";
import Container from "@/components/ui/Container";

/*
 * Homepage clarity (2026-10-10): the whole engagement, from the first call to handover, so an
 * owner knows what happens before committing. It replaces the four-stage Understand / Design /
 * Build / Launch list rather than sitting beside it (one process section, not two).
 *
 * Commercial accuracy (drylake-ops: proposal, MSA + SOW, initial invoice, Workspace invitation,
 * milestones, acceptance, handover): no fixed timelines, no unlimited revisions, no automatic IP
 * transfer, and hosting, maintenance or support only where the agreement includes them. The note
 * under the stages says so in words.
 */
const stages = [
  {
    number: "01",
    title: "Let's talk",
    text: "We start by learning about your business, the challenges you're facing and what you'd like to achieve.",
  },
  {
    number: "02",
    title: "We work out what's needed",
    text: "We look at your requirements and recommend an approach that makes sense for your business.",
  },
  {
    number: "03",
    title: "You receive a proposal",
    text: "We explain what we'll build, what it will cost, the expected timeline and what's included. The agreed work is documented before we begin.",
  },
  {
    number: "04",
    title: "We get everything set up",
    text: "Once the agreements are signed and the required initial payment is arranged, we set up your project and give you access to your Drylake Workspace, your private online project area.",
  },
  {
    number: "05",
    title: "We build your solution",
    text: "We develop the agreed solution, share progress updates and check in with you at important milestones.",
  },
  {
    number: "06",
    title: "We test everything",
    text: "We check that the solution works as agreed, review feedback and address issues within the agreed scope.",
  },
  {
    number: "07",
    title: "We launch and hand over",
    text: "Once everything is approved, we launch your solution and provide the documentation, access and support included in your agreement.",
  },
];

/*
 * How We Work (nav target id="approach"). Seven stations along the Drylake Line: a vertical
 * sequence on phones, two columns on tablets, four then three on desktop, each station carrying
 * its own segment of the rail so the line reads across both rows. Every stage text is visible and
 * rendered exactly once.
 */
export default function Approach() {
  return (
    <section id="approach" className="surface-mineral relative overflow-hidden">
      <Container className="py-(--section-y)">
        <div className="grid gap-6 lg:grid-cols-12">
          <p className="section-label text-black/62 lg:col-span-3 lg:pt-4">04 / How We Work</p>

          <div className="lg:col-span-9">
            <h2 className="type-section">
              From first conversation{" "}
              <br className="hidden sm:block" />
              <span className="text-black/50">to launch.</span>
            </h2>

            <p className="type-lede mt-5 sm:mt-7 max-w-xl text-black/62">
              Getting started shouldn&apos;t be complicated. Here&apos;s what working with Drylake looks like.
            </p>
          </div>
        </div>

        <InView className="relative mt-(--block-gap)" threshold={0.15}>
          {/* The rail on phones: one vertical line. Wider screens draw it per station (below). */}
          <span aria-hidden="true" className="dl-grow-y absolute bottom-6 left-[7px] top-2 w-px bg-black/25 sm:hidden" />

          <ol className="relative grid gap-7 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-10 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-12">
            {stages.map((stage, index) => (
              <li
                key={stage.number}
                className="dl-fade-view relative pl-10 sm:pl-0 sm:pt-10"
                style={{ ["--d" as string]: `${0.15 + index * 0.1}s` }}
              >
                <span aria-hidden="true" className="dl-grow-x absolute left-0 right-0 top-[7px] hidden h-px bg-black/25 sm:block" />
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-0 h-[15px] w-[15px] rounded-full ${
                    index === 0 ? "bg-[#f26a2e]" : "bg-[#f2f0e9] shadow-[0_0_0_1.5px_rgba(11,11,10,0.55)]"
                  }`}
                />

                <span className="block font-mono text-sm text-(--orange-ink)">{stage.number}</span>

                <h3 className="mt-2 text-balance text-[clamp(1.45rem,5.2vw,1.9rem)] font-semibold leading-[1.02] tracking-[-0.045em]">
                  {stage.title}
                </h3>

                <p className="type-body mt-3 max-w-sm text-black/65">{stage.text}</p>
              </li>
            ))}
          </ol>
        </InView>

        <p className="mt-10 max-w-2xl border-t border-black/12 pt-5 text-sm leading-6 text-black/62 sm:mt-14">
          Every project is different, so timelines, inclusions and any hosting, maintenance or ongoing
          support are set out in your proposal and agreement before work begins.
        </p>
      </Container>
    </section>
  );
}
