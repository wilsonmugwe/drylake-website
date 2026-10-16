import { ArrowDown } from "lucide-react";

import SiteLink from "@/components/navigation/SiteLink";
import Container from "@/components/ui/Container";
import InView from "@/components/motion/InView";
import PrimaryCta from "@/components/ui/PrimaryCta";
import LakeBed from "@/components/visuals/LakeBed";
import LakeBedInteractive from "@/components/visuals/LakeBedInteractive";
import LakeField from "@/components/visuals/LakeField";
import { PRIMARY_CTA, PRIMARY_CTA_NOTE } from "@/lib/navigation/site-nav";

/*
 * The opening (experience polish, 2026-10-07; concept: docs/design/2026-10-07-experience-polish.md).
 * Composition pass: the lake bed IS the hero. A cracked field of plates bleeds off every edge and
 * the headline is set on it; the Drylake tile sits in the field, breaking off the right edge on
 * desktop (beside, never under, the type), locking from broken plates into the mark. A few field
 * cracks light up as connections with it, running under the headline. The hero ends on a cracked
 * edge, and the next chapter opens with "Growth makes the cracks visible."
 *
 * Phones (under 640 px, final refinement 2026-10-08): MESSAGE -> EXPLANATION -> the five plates
 * ASSEMBLE -> CTA, in document order. The headline and the proposition paint first and never
 * animate; below them the five lake-bed plates (the same plates and labels as desktop, a phone
 * composition, LakeBed variant="phone") start apart and lock into the Drylake tile once, then
 * stay. InView holds that timeline until the tiles are on screen; without JavaScript or under
 * reduced motion the finished composition renders immediately. The CTA follows in normal flow,
 * never delayed by script. Tablet and desktop keep the approved lake-bed tile and caption.
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
                <span className="hidden sm:inline">Websites, Software &amp; Automation</span>
              </p>
              <p aria-hidden="true" className="hidden text-white/45 md:block">
                31.95° S&nbsp;&nbsp;115.86° E
              </p>
            </div>

            {/* Plain-English messaging (2026-10-13): visitors could not say what Drylake does, so the
                headline now SAYS it. Longer than the old three-word lines, so it is set one step
                smaller (hz-display-plain) and held left of the lake-bed tile on desktop. Still
                server-rendered, no entrance animation (LCP rule). */}
            {/* Final corrections (2026-10-13): the headline and lede as approved, no AI in either. */}
            <h1 className="hz-display hz-display-plain relative z-10 mt-6 sm:mt-10 lg:mt-14">
              Technology that makes{" "}
              <span className="text-white/78">running your business easier.</span>
            </h1>

            {/* The picture stays server-rendered (children); LakeBedInteractive adds the plate
                buttons and the small same-page card each one opens (homepage clarity 2026-10-10). */}
            <figure className="lb-figure hidden sm:block">
              <LakeBedInteractive
                caption={
                  <>
                    <span>Quotes, invoices, scheduling, enquiries: held together by copy, paste and email.</span>
                    <span className="text-white/85"> Until they work together.</span>
                  </>
                }
              >
                <LakeBed />
              </LakeBedInteractive>
            </figure>

            <div className="relative z-10 mt-6 sm:mt-10 lg:mt-12 lg:max-w-[38rem]">
              <p className="type-lede max-w-[34rem] text-white/72">
                We build websites, business software and automation tools that save time,
                reduce manual work and help your business run smoothly.
              </p>
            </div>

            <InView className="hz-assemble sm:hidden" threshold={0.4}>
              <LakeBedInteractive variant="phone">
                <LakeBed variant="phone" />
              </LakeBedInteractive>
            </InView>
          </div>

          {/* Not positioned on purpose: a new stacking context here re-rasterised the CTA label on
              desktop (sub-pixel AA). Nothing overlaps the actions at any width. */}
          <div className="lg:max-w-[38rem]">
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <PrimaryCta href={PRIMARY_CTA.href} location="hero" className="w-full sm:w-auto sm:min-w-[232px]">
                {PRIMARY_CTA.label}
              </PrimaryCta>

              <SiteLink href="/#solutions" className="btn-ghost-dark w-full sm:w-auto sm:min-w-[188px]">
                <span>See what we build</span>
                <ArrowDown aria-hidden="true" size={15} />
              </SiteLink>
            </div>
            <p className="mt-3 text-[0.8rem] leading-5 text-white/60">{PRIMARY_CTA_NOTE}</p>
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
