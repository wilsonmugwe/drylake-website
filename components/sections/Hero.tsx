import { ArrowDown } from "lucide-react";

import SiteLink from "@/components/navigation/SiteLink";
import Container from "@/components/ui/Container";
import PrimaryCta from "@/components/ui/PrimaryCta";
import LakeBed from "@/components/visuals/LakeBed";

/*
 * The opening (experience polish, 2026-10-07; concept: docs/design/2026-10-07-experience-polish.md).
 * Headline left, the lake bed right: the Drylake tile at poster scale, its plates labelled as the
 * parts of a business and its cracks carrying today's workarounds, locking together into the mark.
 * The next chapter opens on "Growth makes the cracks visible", so the picture hands straight on.
 *
 * No 100svh slide: the hero is as tall as its content (one desktop viewport with the problem
 * chapter showing beneath it). Phones: headline, then the tile beside its caption, then the
 * proposition and the actions, all inside the first screen on a 375 x 812 phone.
 *
 * LCP: the <h1> is server-rendered with no entrance animation, so its lines paint at full
 * opacity, in place, on the first frame (PR 3 rule, test-pinned). The whole hero is a server
 * component; the lake bed's motion is one finite CSS timeline with no client JavaScript.
 */
export default function Hero() {
  return (
    <section className="surface-ink hz-hero relative isolate overflow-hidden">
      <div aria-hidden="true" className="hz-grid pointer-events-none absolute inset-0 -z-10" />

      <div className="pb-8 pt-[calc(var(--nav-h)+20px)] sm:pb-10 sm:pt-[calc(var(--nav-h)+36px)] lg:pb-12 lg:pt-[calc(var(--nav-h)+40px)]">
        <Container>
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

          <div className="lb-hero mt-6 grid gap-x-10 sm:mt-10 lg:mt-10 lg:grid-cols-12 lg:grid-rows-[1fr_auto_auto_1fr]">
            <h1 className="hz-display lg:col-span-7 lg:row-start-2">
              <span className="block">Your business</span>
              <span className="block pl-[0.82em]">shouldn&apos;t run</span>
              <span className="block text-white/45">on workarounds.</span>
            </h1>

            <figure className="lb-figure mt-6 grid grid-cols-[minmax(88px,0.8fr)_minmax(0,2fr)] items-end gap-3 sm:mt-10 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] sm:gap-8 lg:col-span-5 lg:col-start-8 lg:row-span-4 lg:row-start-1 lg:mt-0 lg:flex lg:flex-col lg:items-end">
              <figcaption className="pb-2 font-mono text-[0.6rem] uppercase leading-[1.6] tracking-[0.08em] text-white/60 sm:text-[0.68rem] lb-caption lg:-mt-6 lg:w-full lg:max-w-[460px] lg:pb-0">
                Quotes, customers, jobs, invoices: held together by copy, paste and email.
                <span className="text-white/85"> Until they are one system.</span>
              </figcaption>
              <div className="w-full lg:-order-1 lg:max-w-[460px]">
                <LakeBed />
              </div>
            </figure>

            <div className="mt-7 sm:mt-10 lg:col-span-7 lg:row-start-3 lg:mt-9">
              <p className="type-lede max-w-[34rem] text-white/70">
                Drylake builds practical software and automation for Australian
                businesses that have outgrown spreadsheets, email and double handling.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:mt-8">
                <PrimaryCta href="/contact" className="w-full sm:w-auto sm:min-w-[232px]">
                  Start a conversation
                </PrimaryCta>

                <SiteLink href="/#approach" className="btn-ghost-dark w-full sm:w-auto sm:min-w-[188px]">
                  <span>How we work</span>
                  <ArrowDown aria-hidden="true" size={15} />
                </SiteLink>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-white/55 sm:mt-12">
            <span>Australian company</span>
            <span aria-hidden="true">/</span>
            <span>Founder-led</span>
            <span aria-hidden="true">/</span>
            <span>Perth, WA</span>
          </div>
        </Container>
      </div>
    </section>
  );
}
