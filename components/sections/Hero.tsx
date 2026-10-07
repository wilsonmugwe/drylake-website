import { ArrowDown } from "lucide-react";

import SiteLink from "@/components/navigation/SiteLink";
import Container from "@/components/ui/Container";
import PrimaryCta from "@/components/ui/PrimaryCta";
import HorizonField from "@/components/visuals/HorizonField";

/*
 * Chapter 0, the opening. No image of any kind: the typography is the visual. The headline is
 * set at poster scale, its last line lands on the Drylake Horizon, and under that line the
 * workarounds (irregular, floating ticks and stray file names) give way to an even ruler at one
 * orange node: clarity from complexity, before the visitor scrolls.
 *
 * LCP: the <h1> is server-rendered and only rises by transform (never opacity), so it paints on
 * the first frame. The field is a small client component; its server markup is the full static
 * picture and its only script is the desktop pointer lens.
 */
export default function Hero() {
  return (
    <section className="surface-ink hz-hero relative isolate overflow-hidden">
      <div aria-hidden="true" className="hz-grid pointer-events-none absolute inset-0 -z-10" />

      <div className="flex min-h-[100svh] flex-col pb-7 pt-[calc(var(--nav-h)+32px)] sm:pt-[calc(var(--nav-h)+52px)] lg:pb-9">
        <Container>
          <div className="section-label dl-fade-load flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-white/60">
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
        </Container>

        <div className="flex flex-1 flex-col justify-center py-10 sm:py-12">
          <Container>
            <h1 className="hz-display">
              <span className="dl-rise-load block" style={{ ["--d" as string]: "0.02s" }}>
                Your business
              </span>
              <span className="dl-rise-load block sm:pl-[0.82em]" style={{ ["--d" as string]: "0.08s" }}>
                shouldn&apos;t run
              </span>
              <span className="dl-rise-load block text-white/45" style={{ ["--d" as string]: "0.14s" }}>
                on workarounds.
              </span>
            </h1>

            <div className="mt-3 sm:mt-4">
              <HorizonField />
            </div>
          </Container>
        </div>

        <Container>
          <div className="dl-fade-load grid gap-8 lg:grid-cols-12 lg:items-end" style={{ ["--d" as string]: "0.3s" }}>
            <p className="type-lede max-w-[34rem] text-white/66 lg:col-span-6">
              Drylake builds practical software, automation and connected
              systems for Australian businesses that have outgrown manual
              processes.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row lg:col-span-6 lg:justify-end">
              <PrimaryCta href="/contact" className="w-full sm:w-auto sm:min-w-[232px]">
                Start a conversation
              </PrimaryCta>

              <SiteLink href="/#approach" className="btn-ghost-dark w-full sm:w-auto sm:min-w-[188px]">
                <span>How we work</span>
                <ArrowDown aria-hidden="true" size={15} />
              </SiteLink>
            </div>
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-white/55 sm:mt-12">
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
