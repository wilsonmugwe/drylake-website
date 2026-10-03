import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import Container from "@/components/ui/Container";

const prompts = [
  "A process that takes too much manual work",
  "Systems that don't work well together",
  "Software your business has outgrown",
];

export default function ContactCTA() {
  return (
    <section className="hero-large-grid relative overflow-hidden bg-black py-16 text-white sm:py-20 lg:py-28">
      {/* Architectural depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 -top-28 h-[280px] w-[280px] sm:-right-32 sm:-top-32 sm:h-[420px] sm:w-[420px] lg:-right-40 lg:-top-40 lg:h-[520px] lg:w-[520px]"
      >
        <div className="absolute inset-0 rounded-full border border-white/[0.04]" />
        <div className="absolute inset-[18%] rounded-full border border-white/[0.05]" />
        <div className="absolute inset-[36%] rounded-full border border-white/[0.07]" />

        <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f26a2e]" />
      </div>

      <Container className="relative z-10">
        <div className="grid gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:items-end lg:gap-16">
          {/* Main message */}
          <div>
            <p className="section-label flex items-center gap-2.5 text-white/40">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
              Start a Conversation
            </p>

            <h2 className="mt-5 max-w-5xl text-[clamp(3rem,8vw,8rem)] font-semibold leading-[0.86] tracking-[-0.07em]">
              Tell us what&apos;s
              <br />

              <span className="text-white/30">
                slowing you down.
              </span>
            </h2>

            <p className="mt-6 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
              You don&apos;t need a technical brief or a finished idea.
              Tell us what&apos;s manual, disconnected, unreliable or taking
              too much time. We&apos;ll start there.
            </p>
          </div>

          {/* Conversation prompts */}
          <div className="border-t border-white/10 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <p className="tech-label text-white/30">
              A GOOD PLACE TO START
            </p>

            <div className="mt-4">
              {prompts.map((prompt) => (
                <div
                  key={prompt}
                  className="flex items-start gap-3 border-b border-white/10 py-3.5"
                >
                  <Check
                    size={13}
                    className="mt-1 shrink-0 text-[#f26a2e]"
                  />

                  <span className="text-sm leading-6 text-white/50">
                    {prompt}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 flex flex-col gap-5 border-t border-white/10 pt-6 sm:mt-12 sm:flex-row sm:items-center sm:justify-between sm:pt-8">
          <div>
            <p className="text-sm font-medium text-white/80">
              Not sure what the solution is?
            </p>

            <p className="mt-1 text-sm text-white/35">
              That&apos;s what the first conversation is for.
            </p>
          </div>

          <Link
            href="/contact"
            className="button-light group flex w-full items-center justify-between rounded-full border border-white bg-white px-6 py-3.5 text-sm font-semibold transition-transform hover:-translate-y-0.5 sm:w-fit sm:min-w-[245px] sm:py-4"
          >
            <span>Start a conversation</span>

            <ArrowUpRight
              size={18}
              className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </Link>
        </div>
      </Container>
    </section>
  );
}