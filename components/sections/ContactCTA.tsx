import Link from "next/link";
import {
  ArrowUpRight,
  Mail,
  Phone,
} from "lucide-react";

import Container from "@/components/ui/Container";

export default function ContactCTA() {
  return (
    <section className="relative overflow-hidden bg-black py-12 text-white sm:py-20 lg:py-24">
      {/* Network geometry */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute right-[12%] top-0 h-[38%] w-px bg-white/[0.05]" />

        <div className="absolute right-[12%] top-[38%] h-px w-[22%] bg-white/[0.05]" />

        <div className="absolute right-[34%] top-[38%] h-[32%] w-px bg-white/[0.05]" />

        <div className="absolute right-[34%] top-[70%] h-px w-[18%] bg-white/[0.05]" />

        <span className="signal-dot absolute right-[11.8%] top-[37.6%] h-2 w-2 rounded-full bg-[#f26a2e]" />

        <span className="absolute right-[33.8%] top-[69.6%] h-1.5 w-1.5 rounded-full bg-white/20" />
      </div>

      <Container className="relative z-10">
        <p className="section-label flex items-center gap-2.5 text-white/55">
          <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

          Start a Conversation
        </p>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:gap-16">
          <div>
            <h2 className="max-w-5xl text-[clamp(2.9rem,13vw,4.5rem)] font-semibold leading-[0.88] tracking-[-0.065em] sm:text-[clamp(4.5rem,8vw,8rem)]">
              Tell us what&apos;s
              <br />

              <span className="text-white/45">
                slowing you down.
              </span>
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-6 text-white/55 sm:mt-6 sm:text-base sm:leading-7">
              No technical brief required. Tell us what&apos;s manual,
              disconnected or taking too much time.
            </p>

            <Link
              href="/contact"
              className="
                button-light
                group
                mt-6
                flex
                min-h-[52px]
                w-full
                items-center
                justify-between
                bg-white
                px-5
                text-sm
                font-semibold
                sm:mt-8
                sm:w-fit
                sm:min-w-[240px]
              "
            >
              <span>Start a conversation</span>

              <ArrowUpRight
                size={17}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          </div>

          <div className="border-t border-white/10 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <p className="tech-label text-[#f26a2e]">
              TALK TO A PERSON, NOT A SALES QUEUE
            </p>

            <a
              href="tel:+61420565457"
              className="group mt-4 flex items-center justify-between border-b border-white/10 py-3"
            >
              <div className="flex items-center gap-3">
                <Phone size={14} className="text-white/28" />

                <span className="text-sm text-white/62">
                  +61 420 565 457
                </span>
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
                <Mail size={14} className="text-white/28" />

                <span className="text-sm text-white/62">
                  hello@drylake.com.au
                </span>
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