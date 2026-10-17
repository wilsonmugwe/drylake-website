import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import JsonLd from "@/components/seo/JsonLd";
import Container from "@/components/ui/Container";
import CrackRule from "@/components/visuals/CrackRule";
import { BRONNIE_PAGE as C } from "@/lib/bronnie/copy";
import { breadcrumbNode, webPageNode } from "@/lib/discovery/structured-data";
import { pageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

const SEO = PAGE_SEO.bronnie;

export const metadata: Metadata = pageMetadata(SEO);

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "BRONNIE", path: "/bronnie" },
];

/*
 * BRONNIE (Exposed Ground, D54). Drylake's own product, in development. Statements must stay
 * true: nothing is generally available; no customers, pilots, results or deployments are claimed;
 * capabilities are design intent. Copy lives in lib/bronnie/copy.ts and is Ben-approved before
 * publication. No SoftwareApplication/Product schema: there is no product to offer yet.
 */
export default function BronniePage() {
  return (
    <>
      <JsonLd
        nodes={[
          webPageNode({ path: SEO.path, name: SEO.title, description: SEO.description, breadcrumb: CRUMBS }),
          breadcrumbNode(SEO.path, CRUMBS),
        ]}
      />
      <Navbar />

      <main id="main-content" tabIndex={-1} className="outline-none">
        {/* Ground: the name at poster scale, the approved sentence, the honest stamp. */}
        <section className="eg-ground relative overflow-hidden pb-16 pt-(--page-top) sm:pb-24 sm:pt-44 lg:pt-48">
          <Container>
            <p className="eg-eyebrow eg-muted">{C.eyebrow}</p>
            <h1 className="eg-poster mt-6">{C.name}</h1>
            <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:items-end">
              <p className="eg-lede lg:col-span-7">{C.description}</p>
              <p className="lg:col-span-5 lg:justify-self-end">
                <span className="eg-eyebrow inline-flex min-h-[44px] items-center gap-3 rounded-full border border-[#f26a2e] px-5 text-[#f26a2e]">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#f26a2e]" />
                  {C.stamp}
                </span>
              </p>
            </div>
          </Container>
        </section>

        {/* Crust: three honest columns, then the progress line. */}
        <section aria-labelledby="stages" className="eg-crust py-16 sm:py-24">
          <Container>
            <h2 id="stages" className="eg-h2">{C.stagesHeading}</h2>
            <ol className="mt-10 grid gap-x-10 sm:grid-cols-3">
              {C.stages.map((stage, i) => (
                <li key={stage.heading} className="eg-rule-strong pt-5 pb-8">
                  <span className="eg-numeral eg-signal-text">0{i + 1}</span>
                  <h3 className="eg-h3 mt-4">{stage.heading}</h3>
                  <p className="eg-muted mt-3 max-w-[34ch] text-base leading-7">{stage.text}</p>
                </li>
              ))}
            </ol>

            <div className="mt-14">
              <h2 className="eg-eyebrow eg-signal-text">{C.progressHeading}</h2>
              <ol className="mt-6 grid grid-cols-2 gap-y-6 sm:grid-cols-4 lg:grid-cols-8">
                {C.phases.map((phase) => (
                  <li key={phase.label} className="eg-rule flex flex-col gap-3 pt-4 pr-3" data-state={phase.state}>
                    <span
                      aria-hidden="true"
                      className={
                        phase.state === "done"
                          ? "h-3 w-3 rounded-full bg-[#17191e]"
                          : phase.state === "now"
                            ? "h-3 w-3 rounded-full bg-[#f26a2e] ring-4 ring-[#f26a2e]/25"
                            : "h-3 w-3 rounded-full border border-[#17191e]/50"
                      }
                    />
                    <span className={phase.state === "next" ? "eg-muted text-sm" : "text-sm font-semibold"}>
                      {phase.label}
                      <span className="sr-only">
                        {phase.state === "done" ? " (complete)" : phase.state === "now" ? " (current stage)" : " (not started)"}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="eg-muted mt-6 max-w-[60ch] text-base leading-7">{C.progressNote}</p>
            </div>
          </Container>
        </section>

        {/* Ground: the first module as type, then the control model as four steps. */}
        <section aria-labelledby="module" className="eg-ground py-16 sm:py-24">
          <Container>
            <CrackRule signal />
            <div className="mt-12 grid gap-12 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <h2 id="module" className="eg-h2">{C.moduleHeading}</h2>
                <p className="eg-muted mt-5 text-base leading-7">{C.moduleIntro}</p>
              </div>
              <ul className="lg:col-span-7">
                {C.moduleItems.map((item) => (
                  <li key={item} className="eg-rule eg-h3 py-5">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <h2 className="eg-h2 mt-24">{C.principlesHeading}</h2>
            <ol className="mt-10 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
              {C.principles.map((p, i) => (
                <li key={p.title} className="eg-rule pt-5 pb-8">
                  <span className="eg-numeral text-[#f26a2e]">0{i + 1}</span>
                  <h3 className="eg-h3 mt-4">{p.title}</h3>
                  <p className="eg-muted mt-3 text-base leading-7">{p.text}</p>
                </li>
              ))}
            </ol>
            <p className="eg-muted mt-4 max-w-[60ch] text-base leading-7">{C.systemsNote}</p>
            <p className="eg-muted mt-10 text-sm">{C.status}</p>
          </Container>
        </section>

        <section aria-labelledby="pilot" className="eg-signal py-16 sm:py-20">
          <Container className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="pilot" className="eg-poster-md">{C.ctaHeading}</h2>
              <p className="mt-4 text-base">{C.ctaText}</p>
            </div>
            <Link href="/collaborate" className="eg-pill-dark self-start sm:self-auto">
              {C.ctaLabel}
            </Link>
          </Container>
        </section>
      </main>

      <Footer />
    </>
  );
}
