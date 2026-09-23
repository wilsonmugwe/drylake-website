import Container from "@/components/ui/Container";

export default function WhatWeAreNot() {
  return (
    <section className="relative overflow-hidden bg-white py-20 text-black sm:py-24 lg:py-28">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[0.65fr_1.35fr]">
          <p className="section-label text-black/35">03 / What We Are Not</p>

          <div>
            <h2 className="max-w-5xl text-[clamp(3rem,7vw,7rem)] font-semibold leading-[0.88] tracking-[-0.07em]">
              We don&apos;t sell
              <span className="text-black/25"> noise.</span>
            </h2>

            <p className="mt-7 max-w-2xl text-base leading-7 text-black/55 sm:text-lg">
              We are not here to tell you to post more, chase another platform
              or add another tool to the stack.
            </p>

            <p className="mt-4 max-w-2xl text-base leading-7 text-black/80 sm:text-lg">
              We build the thing your customers and your team actually need to
              work.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}