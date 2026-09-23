import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Container from "@/components/ui/Container";

export default function ContactCTA() {
  return (
    <section className="hero-large-grid relative overflow-hidden bg-black py-14 text-white sm:py-20 lg:py-28">
      {/* architectural rings */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 -top-28 h-[280px] w-[280px] sm:-right-32 sm:-top-32 sm:h-[420px] sm:w-[420px] lg:-right-40 lg:-top-40 lg:h-[520px] lg:w-[520px]"
      >
        <div className="absolute inset-0 rounded-full border border-white/[0.05]" />

        <div className="absolute inset-[18%] rounded-full border border-white/[0.06]" />

        <div className="absolute inset-[36%] rounded-full border border-white/[0.08]" />

        <div className="absolute left-1/2 top-0 h-full w-px bg-white/[0.035]" />

        <div className="absolute left-0 top-1/2 h-px w-full bg-white/[0.035]" />

        <span className="signal-dot absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f26a2e]" />
      </div>

      {/* technical detail */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-8 right-8 hidden items-center gap-3 lg:flex"
      >
        <span className="tech-label text-white/20">
          INPUT
        </span>

        <div className="h-px w-12 bg-white/15" />

        <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
      </div>

      <Container className="relative z-10">
        <p className="section-label flex items-center gap-2.5 text-white/40">
          <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

          Start a Project
        </p>

        <div className="mt-4 flex flex-col gap-6 sm:mt-6 sm:gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <div>
            <h2 className="max-w-5xl text-[clamp(2.9rem,8vw,8rem)] font-semibold leading-[0.86] tracking-[-0.07em]">
              Tell us what is
              <br />

              <span className="text-white/30">
                slowing you down.
              </span>
            </h2>

            <p className="mt-4 max-w-lg text-sm leading-6 text-white/50 sm:mt-6 sm:text-base sm:leading-7">
              Describe the problem in your own words. We&apos;ll start there.
            </p>
          </div>

          <Link
            href="/contact"
            className="button-light group flex w-full items-center justify-between rounded-full border border-white bg-white px-5 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5 sm:w-fit sm:min-w-[230px] sm:px-6 sm:py-4"
          >
            <span>
              Start a conversation
            </span>

            <ArrowUpRight
              size={18}
              className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </Link>
        </div>

        {/* mobile technical endpoint */}

        <div className="mt-7 flex items-center gap-3 border-t border-white/10 pt-4 sm:mt-10 lg:hidden">
          <span className="tech-label text-white/20">
            PROBLEM
          </span>

          <div className="h-px flex-1 bg-white/10" />

          <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

          <span className="tech-label text-white/30">
            START HERE
          </span>
        </div>
      </Container>
    </section>
  );
}