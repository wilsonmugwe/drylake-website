import type { Metadata } from "next";
import { ArrowUpRight, Check } from "lucide-react";

import ConsultationBooking from "@/components/consultations/ConsultationBooking";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import SiteLink from "@/components/navigation/SiteLink";
import JsonLd from "@/components/seo/JsonLd";
import Container from "@/components/ui/Container";
import { breadcrumbNode, webPageNode } from "@/lib/discovery/structured-data";
import { CONSULTATION_INTRO, CONSULTATION_PROMISES } from "@/lib/consultations/copy";
import { CONTACT_PATH } from "@/lib/navigation/site-nav";
import { pageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";
import { RESPONSE_TIME } from "@/lib/site";

const SEO = PAGE_SEO.consultation;

export const metadata: Metadata = pageMetadata(SEO);

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Free consultation", path: "/consultation" },
];

/*
 * Free 30-minute consultation booking (brief, 2026-10-13). Server-rendered introduction (citable,
 * indexable) around the client booking flow. The contact form stays the other route in: this page
 * links to it, and /contact links back here, so neither replaces the other.
 */
export default function ConsultationPage() {
  return (
    <>
      <JsonLd
        nodes={[
          webPageNode({ path: SEO.path, name: SEO.title, description: SEO.description, breadcrumb: CRUMBS }),
          breadcrumbNode(SEO.path, CRUMBS),
        ]}
      />
      <Navbar />

      <main id="main-content" tabIndex={-1} className="bg-white text-black outline-none">
        <section className="relative overflow-hidden pb-14 pt-(--page-top) sm:pb-20 sm:pt-44 lg:pb-24 lg:pt-48">
          <div aria-hidden="true" className="micro-grid pointer-events-none absolute inset-0 opacity-25" />

          <Container className="relative z-10">
            <div className="grid grid-cols-[minmax(0,1fr)] gap-10 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:gap-20">
              <div className="xl:sticky xl:top-36 xl:self-start">
                <p className="section-label flex items-center gap-2.5 text-black/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
                  Free consultation
                </p>

                <h1 className="type-section mt-6 max-w-3xl">
                  Book a free{" "}
                  <span className="text-black/45">30-minute consultation.</span>
                </h1>

                <p className="mt-6 max-w-lg text-base leading-7 text-black/65">{CONSULTATION_INTRO}</p>

                <ul className="mt-7 space-y-3 border-t border-black/10 pt-6">
                  {CONSULTATION_PROMISES.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm leading-6 text-black/70">
                      <Check aria-hidden="true" size={15} className="mt-1 shrink-0 text-[#f26a2e]" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="mt-8 border-l-2 border-[#f26a2e] pl-4">
                  <p className="max-w-md text-sm leading-6 text-black/70">
                    Prefer to send us a message instead? Tell us a little about your project and we&apos;ll get back to you within{" "}
                    {RESPONSE_TIME}.
                  </p>
                  <SiteLink href={CONTACT_PATH} className="group mt-1 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold underline underline-offset-4">
                    Send us a message
                    <ArrowUpRight aria-hidden="true" size={14} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </SiteLink>
                </div>
              </div>

              <div>
                <ConsultationBooking />
              </div>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </>
  );
}
