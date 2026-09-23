import Container from "@/components/ui/Container";

export default function WhatWeAreNot() {
  return (
    <section className="relative overflow-hidden bg-white py-16 text-black sm:py-20 lg:py-24">
      {/* technical transition detail */}
      <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-[34%] lg:block">
        <div className="absolute left-0 top-0 h-full w-px bg-black/[0.05]" />
        <div className="topographic-lines absolute inset-0 opacity-70" />

        <span className="tech-label absolute right-12 top-12 text-black/20">
          SIGNAL / NOISE
        </span>

        <div className="absolute right-[22%] top-1/2 h-2 w-2 rounded-full bg-[#f26a2e]" />
      </div>

      <Container className="relative z-10">
        <div className="grid gap-8 lg:grid-cols-[0.65fr_1.35fr]">
          <p className="section-label text-black/45">
            03 / What We Are Not
          </p>

          <div>
            <h2 className="max-w-5xl text-[clamp(3rem,7vw,7rem)] font-semibold leading-[0.88] tracking-[-0.07em]">
              We don&apos;t sell noise.
            </h2>

            <p className="mt-7 max-w-2xl text-base leading-7 text-black/60 sm:text-lg">
              We are not here to tell you to post more, chase another platform
              or add another tool to the stack.
            </p>

            <p className="mt-4 max-w-2xl text-base leading-7 text-black sm:text-lg">
              We build the thing your customers and your team actually need to
              work.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}