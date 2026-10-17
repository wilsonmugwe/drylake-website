import { ArrowDown } from "lucide-react";

import SiteLink from "@/components/navigation/SiteLink";
import Container from "@/components/ui/Container";
import PrimaryCta from "@/components/ui/PrimaryCta";
import { HOME_HERO } from "@/lib/home/copy";
import { PRIMARY_CTA, PRIMARY_CTA_NOTE } from "@/lib/navigation/site-nav";

/*
 * Exposed Ground hero (D54, stage 2). The four things Drylake builds ARE the headline, set as
 * poster type on dark ground; a quiet field of cracks sits behind (stage 5 replaces it with the
 * Option A animation, same geometry). The One System tile moved to its own stage below.
 *
 * LCP rule (test-pinned since PR 3): the <h1> is server-rendered with NO entrance animation, so
 * it paints at full opacity on the first frame. Spaces between the line spans keep the heading's
 * text readable to search and AI extractors ("Websites. Software. ..."), not "Websites.Software.".
 * Whole section is a server component: no client JavaScript.
 */

/* The field: cracks drawn from the same angles as the tile, scaled to a 1440 x 860 ground. */
const FIELD = [
  "M0 210 L180 180 L320 260 L470 200 L640 240 L820 170 L980 230 L1160 190 L1440 240",
  "M0 520 L150 470 L300 540 L520 490 L700 560 L900 500 L1100 560 L1300 510 L1440 540",
  "M180 180 L150 470 L120 860",
  "M470 200 L520 490 L470 860",
  "M820 170 L900 500 L860 860",
  "M1160 190 L1100 560 L1180 860",
  "M320 260 L300 540",
  "M640 240 L700 560",
  "M980 230 L1100 560",
];

export default function HomeHero() {
  return (
    <section aria-labelledby="home-title" className="eg-ground eg-hero relative isolate overflow-hidden">
      <svg
        aria-hidden="true"
        focusable="false"
        className="eg-hero-field absolute inset-0 -z-10 h-full w-full"
        viewBox="0 0 1440 860"
        preserveAspectRatio="xMidYMid slice"
      >
        <g fill="none" strokeWidth="3" stroke="#1d1b18">
          {FIELD.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </svg>

      <Container className="relative pb-16 pt-[calc(var(--nav-h)+48px)] sm:pb-24 sm:pt-[calc(var(--nav-h)+80px)] lg:pb-28 lg:pt-[calc(var(--nav-h)+110px)]">
        <p className="eg-eyebrow eg-muted">{HOME_HERO.eyebrow}</p>
        <h1 id="home-title" className="eg-poster eg-hero-title mt-7">
          {HOME_HERO.lines.map((line, i) => (
            <span key={line} className={i === HOME_HERO.signalLine ? "block text-[#f26a2e]" : "block"}>
              {line}{" "}
            </span>
          ))}
        </h1>

        {/* Below the poster: the lede on the left, the actions on the right (desktop); stacked on phones. */}
        <div className="mt-10 grid gap-7 lg:mt-14 lg:grid-cols-12 lg:items-end lg:gap-12">
          <p className="eg-lede text-[#e6e3da] lg:col-span-5">{HOME_HERO.lede}</p>
          <div className="flex flex-col gap-3 lg:col-span-6 lg:col-start-7">
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <PrimaryCta href={PRIMARY_CTA.href} location="hero" className="w-full sm:w-auto">
                {PRIMARY_CTA.label}
              </PrimaryCta>
              <SiteLink href="/#services" className="btn-ghost-dark w-full sm:w-auto">
                <span>{HOME_HERO.secondary}</span>
                <ArrowDown aria-hidden="true" size={15} />
              </SiteLink>
            </div>
            <p className="text-[0.8rem] leading-5 text-white/60 lg:text-right">{PRIMARY_CTA_NOTE}</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
