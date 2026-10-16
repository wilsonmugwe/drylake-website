import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";

import CollaborationForm from "@/components/collaboration/CollaborationForm";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import JsonLd from "@/components/seo/JsonLd";
import Container from "@/components/ui/Container";
import {
  BRONNIE,
  COLLABORATE_AUDIENCES,
  COLLABORATE_INTRO,
  COLLABORATE_NOT_THIS,
} from "@/lib/collaboration/copy";
import { ABBICARE_NOTE, abbicareEnabled, projectOptions } from "@/lib/collaboration/projects";
import { breadcrumbNode, webPageNode } from "@/lib/discovery/structured-data";
import { CONSULTATION_PATH, CONTACT_PATH } from "@/lib/navigation/site-nav";
import { pageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

const SEO = PAGE_SEO.collaborate;

export const metadata: Metadata = pageMetadata(SEO);

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Collaborate", path: "/collaborate" },
];

/*
 * Collaborate With Drylake. Server-rendered and indexable, and deliberately separate from the
 * customer enquiry form (/contact) and the free consultation (/consultation).
 *
 * Statements here must stay true: BRONNIE is being developed, no feature is generally available, and no
 * partners, customers or deployments are claimed. The owner-gated project (see
 * lib/collaboration/projects.ts) is rendered only when its flag is on, so while it is off the page
 * HTML, RSC payload and client JavaScript contain no reference to it.
 */
export default function CollaboratePage() {
  const projects = projectOptions(process.env);
  const showGated = abbicareEnabled(process.env);

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
        <section className="relative overflow-hidden pb-12 pt-(--page-top) sm:pb-18 sm:pt-44 lg:pb-20 lg:pt-48">
          <div aria-hidden="true" className="micro-grid pointer-events-none absolute inset-0 opacity-25" />

          <Container className="relative z-10">
            <div className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
              <div>
                <p className="section-label flex items-center gap-2.5 text-black/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
                  Collaborate with Drylake
                </p>

                <h1 className="type-section mt-6 max-w-3xl">
                  Work with us on{" "}
                  <span className="text-black/45">something worth building.</span>
                </h1>

                <p className="mt-6 max-w-lg text-base leading-7 text-black/65">{COLLABORATE_INTRO}</p>

                <section aria-labelledby="who-for" className="mt-10 border-t border-black/10 pt-6">
                  <h2 id="who-for" className="text-xl font-semibold tracking-[-0.04em]">Who this is for</h2>
                  <ul className="mt-4 grid gap-2.5">
                    {COLLABORATE_AUDIENCES.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm leading-6 text-black/70">
                        <Check aria-hidden="true" size={15} className="mt-1 shrink-0 text-[#f26a2e]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>

                <section aria-labelledby="bronnie" className="mt-10 border-t border-black/10 pt-6">
                  <h2 id="bronnie" className="text-xl font-semibold tracking-[-0.04em]">{BRONNIE.name}</h2>
                  <p className="mt-3 text-sm leading-6 text-black/70">{BRONNIE.description}</p>
                  <dl className="mt-4 grid gap-3">
                    {BRONNIE.stages.map((stage) => (
                      <div key={stage.heading} className="border-t border-black/10 pt-3">
                        <dt className="text-sm font-medium text-black/80">{stage.heading}</dt>
                        <dd className="mt-1 text-sm leading-6 text-black/70">{stage.text}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 border-l-2 border-[#f26a2e] pl-4 text-sm font-medium leading-6 text-black/75">
                    {BRONNIE.status}
                  </p>
                  <p className="mt-4 text-sm font-medium text-black/70">We are interested in talking about:</p>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {BRONNIE.interestedIn.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm leading-6 text-black/70">
                        <Check aria-hidden="true" size={15} className="mt-1 shrink-0 text-[#f26a2e]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>

                {showGated ? (
                  <section aria-labelledby="gated-project" className="mt-10 border-t border-black/10 pt-6">
                    <h2 id="gated-project" className="text-xl font-semibold tracking-[-0.04em]">{ABBICARE_NOTE.heading}</h2>
                    <p className="mt-3 text-sm leading-6 text-black/70">{ABBICARE_NOTE.lead}</p>
                    <ul className="mt-3 grid gap-2">
                      {ABBICARE_NOTE.topics.map((topic) => (
                        <li key={topic} className="flex items-start gap-3 text-sm leading-6 text-black/70">
                          <Check aria-hidden="true" size={15} className="mt-1 shrink-0 text-[#f26a2e]" />
                          {topic}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs leading-5 text-black/60">{ABBICARE_NOTE.disclaimer}</p>
                  </section>
                ) : null}

                <section aria-labelledby="something-else" className="mt-10 border-t border-black/10 pt-6">
                  <h2 id="something-else" className="text-xl font-semibold tracking-[-0.04em]">{COLLABORATE_NOT_THIS.heading}</h2>
                  <p className="mt-3 text-sm leading-6 text-black/70">
                    {COLLABORATE_NOT_THIS.customer}{" "}
                    <Link href={CONTACT_PATH} className="font-medium underline underline-offset-2 hover:text-black">
                      Contact Drylake
                    </Link>
                    .
                  </p>
                  <p className="mt-2 text-sm leading-6 text-black/70">
                    {COLLABORATE_NOT_THIS.consultation}{" "}
                    <Link href={CONSULTATION_PATH} className="font-medium underline underline-offset-2 hover:text-black">
                      Book a free consultation
                    </Link>
                    .
                  </p>
                </section>
              </div>

              <div>
                <div className="mb-7 border-b border-black/10 pb-5">
                  <h2 id="send-a-proposal" className="scroll-mt-28 text-xl font-semibold tracking-[-0.04em] sm:text-2xl">
                    Send a proposal
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-black/65">
                    Tell us who you are and what you have in mind. Sending a proposal is an enquiry, not a formal partnership.
                  </p>
                </div>

                <CollaborationForm projects={projects} />
              </div>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </>
  );
}
