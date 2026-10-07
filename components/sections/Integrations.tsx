import ScrollProgress from "@/components/motion/ScrollProgress";
import Container from "@/components/ui/Container";
import SystemsStage from "@/components/visuals/SystemsStage";

const systems = ["Microsoft 365", "Xero", "MYOB", "Payments", "CRM", "APIs"];

/*
 * Chapter 2, the signature moment (dark): fragmented systems resolve into one connected system.
 * Desktop: a tall track (ScrollProgress) holds a pinned stage; scrolling through it dissolves
 * the workarounds and connects every system to one spine. Phones: no pinning; the stage
 * resolves as it crosses the screen. Under reduced motion (and without JavaScript) the stage
 * rests in its connected state. The state readout and the caption carry the meaning in words.
 * Copy kept: "Don't replace what already works", the platform list and its caveat.
 *
 * overflow-clip (not hidden) so the sticky stage still pins.
 */
export default function Integrations() {
  return (
    <section className="surface-ink relative overflow-clip">
      <div aria-hidden="true" className="grid-ink pointer-events-none absolute inset-0 opacity-60" />

      <ScrollProgress rest={1} start={0} passStart={0.1} end={-0.55} className="hz-sys-track relative lg:h-[250vh]">
        <div className="lg:sticky lg:top-0 lg:flex lg:h-[100svh] lg:items-center">
          <Container className="relative w-full pt-20 sm:pt-28 lg:pb-6 lg:pt-[calc(var(--nav-h)+12px)]">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-8">
              <div className="lg:col-span-5">
                <p className="section-label flex items-center gap-2.5 text-white/60">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-signal" />
                  Work With What You Have
                </p>

                <h2 className="mt-6 text-[clamp(2.35rem,10.6vw,3.8rem)] font-semibold leading-[0.93] tracking-[-0.058em] sm:text-[clamp(3.6rem,8vw,5.2rem)] lg:text-[clamp(3.2rem,4.1vw,5rem)]">
                  Don&apos;t replace
                  <br />
                  <span className="text-white/45">what already works.</span>
                </h2>

                <p className="type-lede mt-7 max-w-md text-white/66">
                  We can connect, extend and build around the systems your
                  business already depends on.
                </p>

                <div aria-hidden="true" className="hz-readout mt-10 hidden font-mono text-[0.7rem] uppercase tracking-[0.14em] lg:grid">
                  <span className="hz-readout-0 text-white/60">01 / Disconnected. Workarounds hold it together.</span>
                  <span className="hz-readout-1 text-white/60">02 / Connecting.</span>
                  <span className="hz-readout-2 text-white/80">
                    <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-signal align-middle" />
                    03 / One system.
                  </span>
                </div>
              </div>

              <figure className="lg:col-span-7">
                <SystemsStage />
                <figcaption className="mt-5 font-mono text-[0.68rem] uppercase leading-5 tracking-[0.1em] text-white/60">
                  Website, CRM, email, accounting, documents, payments, staff and customers:
                  connected through one system instead of copied between them.
                </figcaption>
              </figure>
            </div>
          </Container>
        </div>
      </ScrollProgress>

      <Container className="relative pb-20 pt-14 sm:pb-24 lg:pb-28 lg:pt-10">
        <div className="grid gap-5 border-t border-white/12 pt-6 lg:grid-cols-12">
          <p className="tech-label text-white/60 lg:col-span-3">Works alongside</p>

          <ul aria-label="Systems Drylake can connect" className="flex flex-wrap gap-x-6 gap-y-3 lg:col-span-9">
            {systems.map((system) => (
              <li key={system} className="font-mono text-[0.8rem] uppercase tracking-[0.12em] text-white/80">
                {system}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-8 text-xs leading-5 text-white/55">
          Integrations depend on the capabilities and access provided by each
          platform.
        </p>
      </Container>
    </section>
  );
}
