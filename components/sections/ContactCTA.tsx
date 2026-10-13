import type { ReactNode } from "react";
import { ArrowUpRight, Mail, Phone } from "lucide-react";

import InView from "@/components/motion/InView";
import Container from "@/components/ui/Container";
import PrimaryCta from "@/components/ui/PrimaryCta";
import SiteLink from "@/components/navigation/SiteLink";
import { CONTACT_PATH, PRIMARY_CTA, PRIMARY_CTA_NOTE } from "@/lib/navigation/site-nav";
import { BUSINESS_PHONE } from "@/lib/site";

/*
 * The ending (every public page): one question, one action, two direct lines to a person. It
 * closes on the horizon, a full-bleed rule that draws in and runs straight into the footer,
 * where the cropped wordmark sits as the full stop (components/layout/Footer.tsx).
 *
 * `aside` (homepage): the questions block (FAQ) follows as its own full-width band under the
 * call to action and the direct lines (mobile refinement 2026-10-07: it was a five-column side
 * panel, too narrow on desktop), so "conversation" is still one place: the ask, the phone number
 * and the answers to what an owner would wonder first.
 */
export default function ContactCTA({ aside }: { aside?: ReactNode }) {
  const lines = (
    <>
      <p className="tech-label text-signal">TALK TO A PERSON, NOT A SALES QUEUE</p>

      <a href={BUSINESS_PHONE.href} className="group mt-4 flex min-h-[52px] items-center justify-between border-b border-white/10">
        <span className="flex items-center gap-3">
          <Phone aria-hidden="true" size={15} className="text-white/40" />
          <span className="text-[0.95rem] text-white/75">{BUSINESS_PHONE.display}</span>
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
    </>
  );

  return (
    <section className="surface-ink relative overflow-hidden">
      <Container className="relative pb-10 pt-(--section-y) sm:pb-14 lg:pb-16">
        <p className="section-label flex items-center gap-2.5 text-white/60">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-signal" />
          Discuss your project
        </p>

        <div className="mt-6 grid gap-10 sm:mt-8 sm:gap-12 lg:grid-cols-12 lg:items-end lg:gap-8">
          <div className="lg:col-span-8">
            <h2 className="type-display max-w-[11ch] text-balance">
              Have a problem <span className="text-white/45">worth fixing?</span>
            </h2>

            <p className="type-lede mt-5 max-w-xl text-white/66 sm:mt-7">
              No technical brief needed. Tell us what you want built, or what
              is taking your team too much time.
            </p>

            <PrimaryCta href={PRIMARY_CTA.href} size="large" className="mt-7 w-full sm:mt-9 sm:w-auto sm:min-w-[280px]">
              {PRIMARY_CTA.label}
            </PrimaryCta>
            <p className="mt-3 text-[0.8rem] leading-5 text-white/60">{PRIMARY_CTA_NOTE}</p>
            {/* The second way in (brief, Task 3): the contact form is never replaced by booking. */}
            <p className="mt-5 text-sm leading-6 text-white/66">
              Prefer to write?{" "}
              <SiteLink href={CONTACT_PATH} className="font-semibold text-white underline underline-offset-4 hover:text-signal">
                Send us a message
              </SiteLink>
              {" "}and a founder will reply.
            </p>
          </div>

          <div className="border-t border-white/12 pt-6 lg:col-span-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">{lines}</div>
        </div>

        {aside && <div className="mt-12 border-t border-white/12 pt-10 sm:mt-16 sm:pt-14 lg:mt-(--section-y) lg:pt-16">{aside}</div>}
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
