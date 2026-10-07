import { ArrowDown, ArrowUpRight } from "lucide-react";

import SiteLink from "@/components/navigation/SiteLink";
import Container from "@/components/ui/Container";
import SystemsMap from "@/components/visuals/SystemsMap";

/*
 * Signature moment. Copy is the approved homepage copy, unchanged. Presentation: display
 * type at editorial scale with deliberate line breaks, and the systems map beside it (the
 * first appearance of the Drylake Line). Server component: the only motion is CSS that plays
 * once on load, and the headline animates transform only (never opacity), so it paints
 * immediately for LCP.
 */
export default function Hero() {
  return (
    <section className="surface-ink relative isolate overflow-hidden">
      <div aria-hidden="true" className="dots-ink pointer-events-none absolute inset-0 -z-10 opacity-60" />

      <Container className="relative flex min-h-[100dvh] flex-col pb-8 pt-[calc(var(--nav-h)+36px)] sm:pt-[calc(var(--nav-h)+56px)] lg:pb-10">
        <div className="grid flex-1 items-center gap-10 lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-7 xl:col-span-7">
            <p className="section-label dl-fade-load flex flex-wrap items-center gap-x-3 gap-y-1 text-white/60">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
              <span>Perth / Western Australia</span>
              <span aria-hidden="true" className="hidden text-white/35 sm:inline">/</span>
              <span className="hidden sm:inline">Software Engineering</span>
            </p>

            <h1 className="type-display mt-7 sm:mt-9">
              <span className="dl-rise-load block" style={{ ["--d" as string]: "0.02s" }}>
                Your business
              </span>
              <span className="dl-rise-load block" style={{ ["--d" as string]: "0.08s" }}>
                shouldn&apos;t run
              </span>
              <span className="dl-rise-load block text-white/40" style={{ ["--d" as string]: "0.14s" }}>
                on workarounds.
              </span>
            </h1>

            <div className="dl-fade-load mt-8 sm:mt-10" style={{ ["--d" as string]: "0.3s" }}>
              <p className="type-lede max-w-[34rem] text-white/62">
                Drylake builds practical software, automation and connected
                systems for Australian businesses that have outgrown manual
                processes.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <SiteLink href="/contact" className="btn-signal w-full sm:w-auto sm:min-w-[232px]">
                  <span>Start a conversation</span>
                  <ArrowUpRight aria-hidden="true" size={16} />
                </SiteLink>

                <SiteLink href="/#approach" className="btn-ghost-dark w-full sm:w-auto sm:min-w-[188px]">
                  <span>How we work</span>
                  <ArrowDown aria-hidden="true" size={15} />
                </SiteLink>
              </div>
            </div>
          </div>

          <div className="relative -mx-1 lg:col-span-5 lg:-mr-6 xl:-mr-10">
            <SystemsMap />
          </div>
        </div>

        {/* The Drylake Line leaves the hero here and runs on into the page. */}
        <div className="mt-10 flex items-end justify-between gap-6 border-t border-white/10 pt-5 sm:mt-14">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-white/55">
            <span>Australian company</span>
            <span aria-hidden="true">/</span>
            <span>Founder-led</span>
            <span aria-hidden="true">/</span>
            <span>Perth, WA</span>
          </div>

          <span aria-hidden="true" className="relative hidden h-10 w-px bg-white/15 sm:block">
            <span className="absolute -left-[3px] bottom-0 h-[7px] w-[7px] rounded-full bg-[#f26a2e]" />
          </span>
        </div>
      </Container>
    </section>
  );
}
