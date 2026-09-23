import Container from "@/components/ui/Container";

export default function WhatWeAreNot() {
  return (
    <section className="relative overflow-hidden bg-white py-14 text-black sm:py-20 lg:py-24">
      <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-[34%] lg:block">
        <div className="absolute left-0 top-0 h-full w-px bg-black/[0.05]" />

        <div className="topographic-lines absolute inset-0 opacity-70" />

        <span className="tech-label absolute right-12 top-12 text-black/20">
          SIGNAL / NOISE
        </span>

        <div className="absolute right-[22%] top-1/2 h-2 w-2 rounded-full bg-[#f26a2e]" />
      </div>

      <Container className="relative z-10">
        <div className="grid gap-6 lg:grid-cols-[0.65fr_1.35fr] lg:gap-12">
          <p className="section-label text-black/45">
            05 / What We Are Not
          </p>

          <div>
            <h2 className="max-w-5xl text-[clamp(2.8rem,7vw,7rem)] font-semibold leading-[0.88] tracking-[-0.07em]">
              We don&apos;t sell technology
              <span className="text-black/25"> for the sake of technology.</span>
            </h2>

            <p className="mt-5 max-w-2xl text-sm leading-6 text-black/60 sm:mt-7 sm:text-lg sm:leading-7">
              No unnecessary software. No AI because it is fashionable. No
              extra platform simply because somebody wants another
              subscription.
            </p>

            <div className="mt-5 flex max-w-2xl items-start gap-3 border-t border-black/10 pt-5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f26a2e]" />

              <p className="text-sm font-medium leading-6 text-black sm:text-lg sm:leading-7">
                We start with the problem and use the technology that makes
                sense.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}