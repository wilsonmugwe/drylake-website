import Container from "@/components/ui/Container";

const founders = [
  {
    number: "01",
    name: "Benedict Wambugu",
    role: "Co-founder & CEO",
    focus:
      "Business leadership, strategy and making sure the solution addresses the problem the business actually needs solved.",
    credential: "Master of Project Management",
    disciplines: "Strategy / Project Management / Commercial",
  },
  {
    number: "02",
    name: "Wilson Mugwe",
    role: "Co-founder & Head of Technology",
    focus:
      "Software engineering, technical architecture and taking systems from idea through to reliable delivery.",
    credential: "Bachelor of Computer Science, majoring in Software Engineering",
    disciplines: "Engineering / Architecture / AI",
  },
];

/*
 * The human moment: quiet paper, large names, restrained rules, lots of air. No photos are
 * approved, so none are shown (and none are generated). Copy unchanged; id="about" is the
 * About navigation target.
 */
export default function Founders() {
  return (
    <section id="about" className="surface-paper relative overflow-hidden">
      <Container className="py-(--section-y)">
        <div className="grid gap-6 lg:grid-cols-12">
          <p className="section-label text-black/62 lg:col-span-3 lg:pt-4">03 / Founder-Led</p>

          <div className="lg:col-span-9">
            <h2 className="type-section">
              Small team.
              <br />
              <span className="text-black/50">Direct access.</span>
            </h2>

            <p className="type-lede mt-5 sm:mt-7 max-w-xl text-black/62">
              Work directly with the people responsible for understanding the
              problem and delivering the solution.
            </p>
          </div>
        </div>

        <div className="mt-(--block-gap)">
          {founders.map((founder) => (
            <article
              key={founder.name}
              className="grid gap-6 border-t border-black/12 py-8 sm:py-12 lg:grid-cols-12 lg:gap-8 lg:py-16"
            >
              <span className="font-mono text-xs text-(--orange-ink) lg:col-span-1 lg:pt-3">{founder.number}</span>

              <div className="lg:col-span-6">
                <p className="tech-label text-black/62">{founder.role}</p>
                <h3 className="mt-4 text-[clamp(2.4rem,10vw,5.4rem)] font-semibold leading-[0.9] tracking-[-0.06em]">
                  {founder.name}
                </h3>
              </div>

              <div className="lg:col-span-4 lg:col-start-9 lg:pt-8">
                <p className="type-body text-black/70">{founder.focus}</p>

                {founder.credential && (
                  <p className="mt-4 text-sm leading-6 text-black/75">{founder.credential}</p>
                )}

                <p className="tech-label mt-6 border-t border-black/10 pt-4 text-black/62">
                  {founder.disciplines}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="grid gap-5 border-t border-black/12 pt-8 sm:pt-10 lg:grid-cols-12 lg:pt-14">
          <span className="tech-label text-black/62 lg:col-span-3 lg:pt-2">
            What founder-led means
          </span>

          <p className="text-pretty text-[clamp(1.45rem,4.4vw,2.6rem)] font-medium leading-[1.12] tracking-[-0.035em] lg:col-span-8">
            Direct communication. Clear accountability. The people discussing
            the problem with you are the same people responsible for making
            sure it gets solved properly.
          </p>
        </div>
      </Container>
    </section>
  );
}
