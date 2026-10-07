import DrylakeMark from "@/components/brand/DrylakeMark";
import InView from "@/components/motion/InView";
import Container from "@/components/ui/Container";

const systems = ["Microsoft 365", "Xero", "MYOB", "Payments", "CRM", "APIs"];

/*
 * Contrast moment: a full-bleed dark band. The systems a business already runs sit as
 * stations on one Drylake Line that ends at the Drylake mark: nothing replaced, everything
 * connected. Horizontal rail on wide screens, vertical rail on phones. Copy unchanged.
 */
export default function Integrations() {
  return (
    <section className="surface-ink relative overflow-hidden">
      <div aria-hidden="true" className="grid-ink pointer-events-none absolute inset-0 opacity-70" />

      <Container className="relative py-20 sm:py-28 lg:py-36">
        <div className="grid gap-8 lg:grid-cols-12">
          <p className="section-label flex items-center gap-2.5 self-start text-white/60 lg:col-span-3 lg:pt-4">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
            Work With What You Have
          </p>

          <div className="lg:col-span-9">
            <h2 className="type-section">
              Don&apos;t replace
              <br />
              <span className="text-white/40">what already works.</span>
            </h2>

            <p className="type-lede mt-7 max-w-xl text-white/62">
              We can connect, extend and build around the systems your
              business already depends on.
            </p>
          </div>
        </div>

        <InView className="mt-16 lg:mt-24" threshold={0.3}>
          {/* Wide: one horizontal line, stations alternating above and below. */}
          <div aria-hidden="true" className="relative hidden h-[190px] lg:block">
            <span className="dl-grow-x absolute left-0 right-[84px] top-1/2 h-px bg-white/30" />
            <span className="dl-grow-x absolute left-[70%] right-[84px] top-1/2 h-px bg-[#f26a2e]" style={{ ["--d" as string]: "0.7s" }} />

            {systems.map((system, index) => {
              const left = `${4 + index * 13}%`;
              const above = index % 2 === 0;
              return (
                <div key={system} className="dl-fade-view absolute top-1/2" style={{ left, ["--d" as string]: `${0.2 + index * 0.1}s` }}>
                  <span className="absolute -left-[4px] -top-[4px] h-[9px] w-[9px] rounded-full bg-[#0b0b0a] shadow-[0_0_0_1.5px_rgba(255,255,255,0.55)]" />
                  <span className={`absolute left-0 w-px bg-white/20 ${above ? "bottom-2 h-12" : "top-2 h-12"}`} />
                  <span
                    className={`absolute -translate-x-1/2 whitespace-nowrap rounded-[3px] bg-[#121210] px-3 py-2 font-mono text-[0.72rem] uppercase tracking-[0.12em] text-white/75 shadow-[0_0_0_1px_rgba(255,255,255,0.14)] ${above ? "bottom-14" : "top-14"}`}
                  >
                    {system}
                  </span>
                </div>
              );
            })}

            <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-3">
              <DrylakeMark className="h-[60px] w-[60px]" />
            </div>
          </div>

          {/* Phones and tablets: a vertical rail. */}
          <ol aria-label="Systems Drylake can connect" className="relative lg:hidden">
            <span aria-hidden="true" className="dl-grow-y absolute bottom-7 left-[5px] top-2 w-px bg-white/30" />
            {systems.map((system, index) => (
              <li key={system} className="dl-fade-view relative flex min-h-[48px] items-center gap-5 pl-0" style={{ ["--d" as string]: `${0.1 + index * 0.08}s` }}>
                <span aria-hidden="true" className="relative z-10 h-[11px] w-[11px] shrink-0 rounded-full bg-[#0b0b0a] shadow-[0_0_0_1.5px_rgba(255,255,255,0.55)]" />
                <span className="font-mono text-[0.78rem] uppercase tracking-[0.12em] text-white/75">{system}</span>
              </li>
            ))}
            <li className="relative mt-3 flex items-center gap-4">
              <span aria-hidden="true" className="absolute -top-3 left-[5px] h-3 w-px bg-[#f26a2e]" />
              <DrylakeMark className="relative z-10 -ml-[14px] h-10 w-10" />
              <span className="text-lg font-semibold tracking-[-0.03em]">Drylake</span>
            </li>
          </ol>

          {/* The wide rail is decorative; keep the system names available to assistive tech. */}
          <p className="sr-only hidden lg:block">{systems.join(", ")}</p>
        </InView>

        <p className="mt-14 border-t border-white/10 pt-5 text-xs leading-5 text-white/55">
          Integrations depend on the capabilities and access provided by each
          platform.
        </p>
      </Container>
    </section>
  );
}
