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
 * Founder-led (experience polish, 2026-10-07). Two founders side by side as one editorial spread
 * (each column: role, name, what they own, credential, what to talk to them about), instead of
 * two stacked full-width rows. Facts unchanged. No portrait or initials mark (mobile refinement
 * 2026-10-07): no photos are approved, and a placeholder treatment is not a substitute.
 *
 * variant "home": the homepage chapter (id="about", the header's About target), h2.
 * variant "page": the top of /about (each article carries the Person @id fragment from
 * lib/discovery/entity.ts, e.g. /about#benedict-wambugu), where "Small team. Direct access." is the page's h1 and the
 * founders sit inside the first desktop viewport.
 */
export default function Founders({ variant = "home" }: { variant?: "home" | "page" }) {
  const page = variant === "page";
  const Heading = page ? "h1" : "h2";
  // Names sit one level under the section heading: h2 on /about (under the h1), h3 on the homepage.
  const NameTag = page ? "h2" : "h3";

  return (
    <section
      id={page ? "founders" : "about"}
      className={`surface-paper relative overflow-hidden ${page ? "pb-(--section-y) pt-(--page-top) lg:pt-[calc(var(--nav-h)+3.5rem)]" : "py-(--section-y)"}`}
    >
      <Container>
        <div className="grid gap-5 lg:grid-cols-12 lg:gap-8">
          <p className="section-label text-black/62 lg:col-span-3 lg:pt-4">
            {page ? "About / Founder-Led" : "03 / Founder-Led"}
          </p>

          <div className="lg:col-span-9">
            <Heading className="type-section">
              Small team.{" "}
              <br />
              <span className="text-black/50">Direct access.</span>
            </Heading>

            <p className="type-lede mt-4 max-w-xl text-black/62 sm:mt-6">
              {page
                ? "Drylake is a founder-led Perth technology company. Work directly with the people responsible for understanding the problem and delivering the solution."
                : "Work directly with the people responsible for understanding the problem and delivering the solution."}
            </p>
          </div>
        </div>

        <div className={`grid border-t border-black/12 lg:grid-cols-2 ${page ? "mt-8 sm:mt-10" : "mt-(--block-gap)"}`}>
          {founders.map((founder, i) => (
            <article
              key={founder.name}
              id={page ? founder.name.toLowerCase().replace(/\s+/g, "-") : undefined}
              className={`grid content-start gap-4 py-7 sm:py-9 lg:py-10 ${
                i === 0 ? "lg:border-r lg:border-black/12 lg:pr-10" : "border-t border-black/12 lg:border-t-0 lg:pl-10"
              }`}
            >
              <div>
                <p className="flex items-center gap-3 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-black/62">
                  <span className="text-(--orange-ink)">{founder.number}</span>
                  <span aria-hidden="true" className="h-px w-5 bg-black/20" />
                  <span>{founder.role}</span>
                </p>
                <NameTag className="mt-3 text-[clamp(2.1rem,8.4vw,3.7rem)] font-semibold leading-[0.92] tracking-[-0.055em]">
                  {founder.name}
                </NameTag>
              </div>

              <p className="type-body max-w-md text-black/70">{founder.focus}</p>

              <dl className="grid gap-3 border-t border-black/10 pt-4 text-sm leading-6 sm:grid-cols-2 sm:gap-6">
                <div>
                  <dt className="tech-label text-black/55">Qualification</dt>
                  <dd className="mt-1 text-black/78">{founder.credential}</dd>
                </div>
                <div>
                  <dt className="tech-label text-black/55">Talk to {founder.name.split(" ")[0]} about</dt>
                  <dd className="mt-1 text-black/78">{founder.disciplines}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>

        {page && (
          <div className="grid gap-4 border-t border-black/12 pt-7 sm:pt-9 lg:grid-cols-12 lg:gap-8">
            <span className="tech-label text-black/62 lg:col-span-3 lg:pt-2">What founder-led means</span>

            <p className="text-pretty text-[clamp(1.3rem,4vw,2.2rem)] font-medium leading-[1.15] tracking-[-0.03em] lg:col-span-8">
              Direct communication. Clear accountability. The people discussing
              the problem with you are the same people responsible for making
              sure it gets solved properly.
            </p>
          </div>
        )}
      </Container>
    </section>
  );
}
