import { ArrowUpRight, Mail, Phone } from "lucide-react";

import InView from "@/components/motion/InView";
import Container from "@/components/ui/Container";
import PrimaryCta from "@/components/ui/PrimaryCta";

/*
 * The ending (every public page): one question, one action, two direct lines to a person. It
 * closes on the horizon, a full-bleed rule that draws in and runs straight into the footer,
 * where the large cropped wordmark sits on it (components/layout/Footer.tsx).
 */
export default function ContactCTA() {
  return (
    <section className="surface-ink relative overflow-hidden">
      <Container className="relative pb-12 pt-(--section-y) sm:pb-20 lg:pb-24">
        <p className="section-label flex items-center gap-2.5 text-white/60">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-signal" />
          Start a conversation
        </p>

        <div className="mt-6 grid gap-10 sm:mt-8 sm:gap-12 lg:grid-cols-12 lg:items-end lg:gap-8">
          <div className="lg:col-span-8">
            <h2 className="type-display max-w-[11ch] text-balance">
              Have a problem <span className="text-white/45">worth fixing?</span>
            </h2>

            <p className="type-lede mt-5 max-w-xl text-white/66 sm:mt-8">
              No technical brief required. Tell us what&apos;s manual,
              disconnected or taking too much time.
            </p>

            <PrimaryCta href="/contact" size="large" className="mt-8 w-full sm:mt-10 sm:w-auto sm:min-w-[280px]">
              Start a conversation
            </PrimaryCta>
          </div>

          <div className="border-t border-white/12 pt-6 lg:col-span-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <p className="tech-label text-signal">TALK TO A PERSON, NOT A SALES QUEUE</p>

            <a
              href="tel:+61420565457"
              className="group mt-5 flex min-h-[52px] items-center justify-between border-b border-white/10"
            >
              <span className="flex items-center gap-3">
                <Phone aria-hidden="true" size={15} className="text-white/40" />
                <span className="text-[0.95rem] text-white/75">+61 420 565 457</span>
              </span>
              <ArrowUpRight aria-hidden="true" size={15} className="text-white/30 transition-colors group-hover:text-white" />
            </a>

            <a href="mailto:hello@drylake.com.au" className="group flex min-h-[52px] items-center justify-between">
              <span className="flex items-center gap-3">
                <Mail aria-hidden="true" size={15} className="text-white/40" />
                <span className="text-[0.95rem] text-white/75">hello@drylake.com.au</span>
              </span>
              <ArrowUpRight aria-hidden="true" size={15} className="text-white/30 transition-colors group-hover:text-white" />
            </a>
          </div>
        </div>
      </Container>

      <InView className="relative" threshold={0.5}>
        <span aria-hidden="true" className="dl-grow-x block h-px w-full bg-white/22" />
        <span
          aria-hidden="true"
          className="dl-fade-view absolute right-5 top-0 h-[7px] w-[7px] -translate-y-1/2 rounded-full bg-signal sm:right-8 lg:right-12"
          style={{ ["--d" as string]: "0.7s" }}
        />
      </InView>
    </section>
  );
}
