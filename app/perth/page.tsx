import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import ContactCTA from "@/components/sections/ContactCTA";
import ServiceIndex from "@/components/sections/ServiceIndex";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import Container from "@/components/ui/Container";
import PrimaryCta from "@/components/ui/PrimaryCta";
import { ENTITY, PERTH_PATH } from "@/lib/discovery/entity";
import { breadcrumbNode, faqNode, webPageNode } from "@/lib/discovery/structured-data";
import { pageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

/*
 * The one local page (no suburb or city variants). States only what is true and public:
 * Drylake is based in Perth, works with Perth and WA businesses and across Australia, and
 * publishes no street address (no public premises). No local clients, reviews or statistics.
 * Structured data stays Organization + WebPage: no LocalBusiness without a real address.
 */

const SEO = PAGE_SEO.perth;
const TITLE = SEO.title;
const DESCRIPTION = SEO.description;

export const metadata: Metadata = pageMetadata(SEO);

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Perth", path: PERTH_PATH },
];

const REASONS = [
  {
    title: "Direct access to the people doing the work",
    text: "You talk with the people who design and build the system, not an account layer in between. Questions get answered by someone who knows the detail.",
  },
  {
    title: "The same time zone",
    text: "Working hours, deadlines and support line up with how Western Australian businesses actually run.",
  },
  {
    title: "Face to face when it helps",
    text: "Some problems are easier to understand by seeing the work being done. Being in Perth makes that practical. Most other work happens online.",
  },
];

const CONTEXT = [
  "Accounting and business systems Australian businesses commonly use, such as Xero, MYOB and Microsoft 365",
  "Australian privacy obligations when systems hold personal information",
  "Invoicing and payment workflows that handle GST correctly",
  "Hosting in Australian regions where data needs to stay onshore",
];

const FAQS = [
  {
    question: "Is Drylake based in Perth?",
    answer:
      "Yes. Drylake Pty Ltd is a technology company based in Perth, Western Australia.",
  },
  {
    question: "Does Drylake only work with Perth businesses?",
    answer:
      "No. Drylake works with businesses in Perth and across Western Australia, and much of the work can be done remotely, so it also works with businesses elsewhere in Australia.",
  },
  {
    question: "Can we meet in person?",
    answer:
      "Yes, where that helps. Drylake does not publish a street address because it has no public office, so meetings are arranged at a place that suits or held online.",
  },
];

export default function PerthPage() {
  return (
    <>
      <JsonLd
        nodes={[
          webPageNode({ path: PERTH_PATH, name: TITLE, description: DESCRIPTION, breadcrumb: CRUMBS }),
          breadcrumbNode(PERTH_PATH, CRUMBS),
          faqNode(PERTH_PATH, FAQS),
        ]}
      />

      <Navbar />

      <main id="main-content" tabIndex={-1} className="bg-white text-black outline-none">
        <Container className="pb-(--section-y-compact) pt-(--page-top) sm:pb-20">
          <Breadcrumbs crumbs={CRUMBS} />

          <p className="section-label mt-6 text-black/60 sm:mt-10">Perth / Western Australia</p>

          <h1 className="type-section text-balance mt-5 max-w-5xl">
            Websites, software and automation.{" "}
            <br />
            <span className="text-black/45">Built in Perth for Australian businesses.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-black/65 sm:text-lg sm:leading-8">
            {ENTITY.brand} is a technology company based in {ENTITY.locality}, {ENTITY.region}. We
            build websites, business software, automations and AI tools, and connect the systems
            businesses already use, for businesses in Perth, across WA and around Australia.
          </p>

          <PrimaryCta href="/contact" surface="light" className="mt-8">
            Discuss your project
          </PrimaryCta>
        </Container>

        <section aria-labelledby="local-heading" className="mineral-texture bg-[#f2f0e9] py-(--section-y-compact)">
          <Container>
            <h2 id="local-heading" className="max-w-3xl text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
              Working with a team in Perth
            </h2>

            <ul className="mt-10 grid gap-8 md:grid-cols-3">
              {REASONS.map((reason) => (
                <li key={reason.title} className="border-t border-black/15 pt-6">
                  <h3 className="text-xl font-semibold tracking-[-0.03em]">{reason.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-black/65">{reason.text}</p>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        <ServiceIndex
          id="perth-services"
          label="What we build"
          heading="Technology for Perth and WA businesses"
          intro="The same five service lines, whether the business is in Perth, regional WA or elsewhere in Australia."
        />

        <section aria-labelledby="context-heading" className="bg-black py-(--section-y-compact) text-white">
          <Container>
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div>
                <p className="section-label text-white/55">Australian context</p>
                <h2 id="context-heading" className="mt-4 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                  Built for how Australian businesses operate.
                </h2>
              </div>

              <ul className="divide-y divide-white/10 border-y border-white/10">
                {CONTEXT.map((item) => (
                  <li key={item} className="flex gap-3 py-4 text-base leading-7 text-white/75">
                    <span aria-hidden="true" className="mt-[0.7rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#f26a2e]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </section>

        <section aria-labelledby="perth-faq-heading" className="py-(--section-y-compact)">
          <Container>
            <h2 id="perth-faq-heading" className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
              Questions
            </h2>

            <div className="mt-8 divide-y divide-black/10 border-y border-black/10">
              {FAQS.map((faq) => (
                <details key={faq.question} className="py-3">
                  <summary className="flex min-h-[44px] cursor-pointer list-none items-center text-lg font-medium tracking-[-0.02em]">
                    {faq.question}
                  </summary>
                  <p className="mt-3 max-w-3xl text-base leading-7 text-black/65">{faq.answer}</p>
                </details>
              ))}
            </div>

            <p className="mt-10 max-w-3xl text-sm leading-6 text-black/60">
              {ENTITY.brand} is the trading name of {ENTITY.legalName} (ABN {ENTITY.abn}).{" "}
              <Link href="/about" className="underline underline-offset-4">
                About Drylake and its founders
              </Link>
              .
            </p>
          </Container>
        </section>

        <ContactCTA />
      </main>

      <Footer />
    </>
  );
}
