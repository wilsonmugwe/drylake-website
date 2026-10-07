import { ArrowDown } from "lucide-react";

import SiteLink from "@/components/navigation/SiteLink";
import Container from "@/components/ui/Container";
import PrimaryCta from "@/components/ui/PrimaryCta";
import ConvergeMark from "@/components/visuals/ConvergeMark";
import LakeBed from "@/components/visuals/LakeBed";
import LakeField from "@/components/visuals/LakeField";

/*
 * The opening (experience polish, 2026-10-07; concept: docs/design/2026-10-07-experience-polish.md).
 * Composition pass: the lake bed IS the hero. A cracked field of plates bleeds off every edge and
 * the headline is set on it; the Drylake tile sits in the field, breaking off the right edge on
 * desktop (beside, never under, the type), locking from broken plates into the mark. A few field
 * cracks light up as connections with it, running under the headline. The hero ends on a cracked
 * edge, and the next chapter opens with "Growth makes the cracks visible."
 *
 * Phones (under 640 px, mobile refinement 2026-10-07): composed for the phone, not the desktop
 * picture compressed. The first screen (.hz-first) is location, headline, one still picture
 * (ConvergeMark: fragments converging on the assembled tile) and the proposition; the actions
 * start just below it, so the opening reads as a complete composition. Tablet and desktop keep
 * the approved lake-bed tile and caption unchanged (.lb-figure is hidden only on phones).
 *
 * LCP: the <h1> is server-rendered with no entrance animation, so its lines paint at full
 * opacity, in place, on the first frame (PR 3 rule, test-pinned). Whole hero = server components;
 * the motion is one finite CSS timeline with no client JavaScript.
 */
export default function Hero() {
  return (
    <section className="surface-ink hz-hero relative isolate overflow-hidden">
      <LakeField />

      <div className="relative pb-14 pt-[calc(var(--nav-h)+20px)] sm:pb-16 sm:pt-[calc(var(--nav-h)+36px)] lg:pb-20 lg:pt-[calc(var(--nav-h)+40px)]">
        <Container className="relative">
          <div className="hz-first">
            <div className="section-label flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-white/60">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-signal" />
                <span>Perth / Western Australia</span>
                <span aria-hidden="true" className="hidden text-white/35 sm:inline">/</span>
                <span className="hidden sm:inline">Software Engineering</span>
              </p>
              <p aria-hidden="true" className="hidden text-white/45 md:block">
                31.95° S&nbsp;&nbsp;115.86° E
              </p>
            </div>

            <h1 className="hz-display relative z-10 mt-6 sm:mt-10 lg:mt-14">
              <span className="block">Your business</span>
              <span className="block pl-[0.82em]">shouldn&apos;t run</span>
              <span className="block text-white/78 lg:text-white/45">on workarounds.</span>
            </h1>

            <figure className="lb-figure hidden sm:block">
              <div className="lb-tile">
                <LakeBed />
              </div>
              <figcaption className="lb-caption font-mono text-[0.62rem] uppercase leading-[1.6] tracking-[0.1em] text-white/60 sm:text-[0.68rem]">
                <span>Quotes, customers, jobs, invoices: held together by copy, paste and email.</span>
                <span className="text-white/85"> Until they are one system.</span>
              </figcaption>
            </figure>

            <div className="hz-first-art sm:hidden">
              <ConvergeMark />
            </div>

            <div className="relative z-10 mt-6 sm:mt-10 lg:mt-12 lg:max-w-[38rem]">
              <p className="type-lede max-w-[34rem] text-white/72">
                Drylake builds practical software and automation for Australian
                businesses that have outgrown spreadsheets, email and double handling.
              </p>
            </div>
          </div>

          {/* Not positioned on purpose: a new stacking context here re-rasterised the CTA label on
              desktop (sub-pixel AA). Nothing overlaps the actions at any width. */}
          <div className="lg:max-w-[38rem]">
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <PrimaryCta href="/contact" className="w-full sm:w-auto sm:min-w-[232px]">
                Start a conversation
              </PrimaryCta>

              <SiteLink href="/#approach" className="btn-ghost-dark w-full sm:w-auto sm:min-w-[188px]">
                <span>How we work</span>
                <ArrowDown aria-hidden="true" size={15} />
              </SiteLink>
            </div>
          </div>

          <div className="relative z-10 mt-8 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-white/55 sm:mt-12">
            <span>Australian company</span>
            <span aria-hidden="true">/</span>
            <span>Founder-led</span>
            <span aria-hidden="true">/</span>
            <span>Perth, WA</span>
          </div>
        </Container>
      </div>

      {/* The hero breaks off on a cracked edge into the problem chapter (paper). */}
      <svg aria-hidden="true" viewBox="0 0 1600 40" preserveAspectRatio="none" className="absolute inset-x-0 bottom-[-1px] h-5 w-full sm:h-7 lg:h-9">
        <path d="M0 40 V22 L140 30 L265 12 L420 26 L560 18 L690 33 L830 15 L985 28 L1110 9 L1260 24 L1390 16 L1600 30 V40 Z" fill="#ffffff" />
      </svg>
    </section>
  );
}
