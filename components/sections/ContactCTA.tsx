import Link from "next/link";
import {
  ArrowUpRight,
  Mail,
  Phone,
} from "lucide-react";

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

        <div className="mt-4 grid gap-7 sm:mt-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:gap-16">
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

            <Link
              href="/contact"
              className="button-light group mt-6 flex w-full items-center justify-between rounded-full border border-white bg-white px-5 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5 sm:mt-8 sm:w-fit sm:min-w-[230px] sm:px-6 sm:py-4"
            >
              <span>Start a conversation</span>

              <ArrowUpRight
                size={18}
                className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
              />
            </Link>
          </div>

          {/* Direct contact */}
          <div className="border-t border-white/10 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <p className="tech-label text-[#f26a2e]">
              TALK TO A PERSON, NOT A SALES QUEUE.
            </p>

            <a
              href="tel:+61420565457"
              className="group mt-4 flex items-center justify-between border-b border-white/10 pb-3"
            >
              <div className="flex items-center gap-3">
                <Phone
                  size={15}
                  className="text-white/30"
                />

                <div>
                  <span className="block text-[0.6rem] uppercase tracking-[0.12em] text-white/25">
                    Call
                  </span>

                  <span className="mt-0.5 block text-sm font-medium text-white/70">
                    +61 420 565 457
                  </span>
                </div>
              </div>

              <ArrowUpRight
                size={14}
                className="text-white/20 transition-colors group-hover:text-white"
              />
            </a>

            <a
              href="mailto:hello@drylake.com.au"
              className="group flex items-center justify-between py-3"
            >
              <div className="flex items-center gap-3">
                <Mail
                  size={15}
                  className="text-white/30"
                />

                <div>
                  <span className="block text-[0.6rem] uppercase tracking-[0.12em] text-white/25">
                    Email
                  </span>

                  <span className="mt-0.5 block text-sm font-medium text-white/70">
                    hello@drylake.com.au
                  </span>
                </div>
              </div>

              <ArrowUpRight
                size={14}
                className="text-white/20 transition-colors group-hover:text-white"
              />
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}