import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Container from "@/components/ui/Container";

export default function ContactCTA() {
  return (
    <section className="hero-large-grid relative overflow-hidden bg-black py-10 text-white sm:py-20 lg:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-[220px] w-[220px] sm:-right-32 sm:-top-32 sm:h-[420px] sm:w-[420px] lg:-right-40 lg:-top-40 lg:h-[520px] lg:w-[520px]"
      >
        <div className="absolute inset-0 rounded-full border border-white/[0.04]" />
        <div className="absolute inset-[22%] rounded-full border border-white/[0.05]" />
        <div className="absolute inset-[44%] rounded-full border border-white/[0.07]" />

        <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f26a2e]" />
      </div>

      <Container className="relative z-10">
        <p className="section-label flex items-center gap-2 text-white/40">
          <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
          Start a Conversation
        </p>

        <div className="mt-4 sm:mt-6 lg:flex lg:items-end lg:justify-between lg:gap-12">
          <div>
            <h2 className="max-w-5xl text-[2.7rem] font-semibold leading-[0.88] tracking-[-0.06em] sm:text-[clamp(4rem,8vw,8rem)] sm:leading-[0.86] sm:tracking-[-0.07em]">
              Tell us what&apos;s
              <br />
              <span className="text-white/30">
                slowing you down.
              </span>
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-5 text-white/50 sm:mt-6 sm:text-base sm:leading-7">
              No technical brief required. Tell us what&apos;s manual,
              disconnected or taking too much time.
            </p>
          </div>

          <Link
            href="/contact"
            className="button-light group mt-6 flex w-full items-center justify-between rounded-full border border-white bg-white px-5 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5 sm:mt-8 sm:w-fit sm:min-w-[230px] sm:px-6 sm:py-4 lg:mt-0"
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