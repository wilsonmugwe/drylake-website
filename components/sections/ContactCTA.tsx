import { ArrowUpRight, Mail, Phone } from "lucide-react";

import { MARK_Y_PATH } from "@/components/brand/DrylakeMark";
import InView from "@/components/motion/InView";
import SiteLink from "@/components/navigation/SiteLink";
import Container from "@/components/ui/Container";

/*
 * The close. Strong type, one unmissable action, and the end of the Drylake Line: it crosses
 * the section and becomes the y of the Drylake mark (the same geometry as the logo, scaled
 * x3 and traced as a line), then the solid mark settles in behind it. Copy unchanged.
 * Used on every public page, so the motif closes every page the same way.
 */

/* MARK_Y_PATH under translate(201.85 168) scale(3), traced from the tail back to the arm. */
const LINE_INTO_Y =
  "M -640 186.81 H 540 C 556 186.81 566 185.4 570.76 186.81 C 581.47 190.32 598.72 229.47 615.85 229.47 C 641.38 229.47 662.68 204.39 671.98 180.3 L 730 29.88";
const Y_ARM = "M 626.74 29.88 L 678.37 163.74";

export default function ContactCTA() {
  return (
    <section className="surface-ink relative overflow-hidden">
      <Container className="relative pt-20 sm:pt-28 lg:pt-36">
        <p className="section-label flex items-center gap-2.5 text-white/60">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
          Start a Conversation
        </p>

        <div className="mt-8 grid gap-12 lg:grid-cols-12 lg:items-end lg:gap-8">
          <div className="lg:col-span-8">
            <h2 className="type-display">
              Tell us what&apos;s
              <br />
              <span className="text-white/40">slowing you down.</span>
            </h2>

            <p className="type-lede mt-8 max-w-xl text-white/62">
              No technical brief required. Tell us what&apos;s manual,
              disconnected or taking too much time.
            </p>

            <SiteLink href="/contact" className="btn-signal mt-10 w-full !min-h-[58px] !text-base sm:w-auto sm:min-w-[280px]">
              <span>Start a conversation</span>
              <ArrowUpRight aria-hidden="true" size={18} />
            </SiteLink>
          </div>

          <div className="border-t border-white/12 pt-6 lg:col-span-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <p className="tech-label text-[#f26a2e]">TALK TO A PERSON, NOT A SALES QUEUE</p>

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

      {/* The Drylake Line resolves into the mark. */}
      <InView className="relative mt-12 sm:mt-16" threshold={0.4}>
        {/* Full-bleed, cropped from the left on narrow screens so the line always enters at the edge. */}
        <svg aria-hidden="true" viewBox="-640 0 1460 290" preserveAspectRatio="xMaxYMax slice" className="block h-[166px] w-full sm:h-[232px] lg:h-[290px]">
          <g className="dl-fade-view" style={{ ["--d" as string]: "1.5s" }}>
            <g transform="translate(201.85 168) scale(3)">
              <path d={MARK_Y_PATH} fill="none" stroke="#C2703D" strokeWidth="14.18" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
            </g>
          </g>

          <path d={LINE_INTO_Y} pathLength={1} className="dl-path dl-draw-view" stroke="#f26a2e" strokeWidth="1.5" style={{ ["--d" as string]: "0.1s" }} />
          <path d={Y_ARM} pathLength={1} className="dl-path dl-draw-view" stroke="#f26a2e" strokeWidth="1.5" style={{ ["--d" as string]: "1.05s" }} />
        </svg>
      </InView>
    </section>
  );
}
