import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import JsonLd from "@/components/seo/JsonLd";
import ContactCTA from "@/components/sections/ContactCTA";
import Container from "@/components/ui/Container";
import { breadcrumbNode, faqNode, webPageNode } from "@/lib/discovery/structured-data";
import { FAQ_CATEGORIES, FAQ_ITEMS } from "@/lib/faqs";
import { pageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

const SEO = PAGE_SEO.faq;

export const metadata: Metadata = pageMetadata(SEO);

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Questions", path: "/faq" },
];

/*
 * /faq: every question Drylake answers, grouped by category (brand story + FAQs, 2026-10-16).
 * Server component, native <details>/<summary>: answers are in the HTML whether or not a visitor
 * opens them (citable, no client JS). The FAQPage JSON-LD is built from the SAME FAQ_ITEMS array
 * that renders here, so markup and visible text cannot disagree. FAQPage markup lives on this
 * page and the homepage only.
 */
export default function FaqPage() {
  return (
    <>
      <JsonLd
        nodes={[
          webPageNode({ path: SEO.path, name: SEO.title, description: SEO.description, breadcrumb: CRUMBS }),
          breadcrumbNode(SEO.path, CRUMBS),
          faqNode(SEO.path, FAQ_ITEMS),
        ]}
      />
      <Navbar />

      <main id="main-content" tabIndex={-1} className="bg-white text-black outline-none">
        <section className="surface-paper pb-(--section-y-compact) pt-(--page-top) lg:pt-[calc(var(--nav-h)+3.5rem)]">
          <Container>
            <div className="grid gap-5 lg:grid-cols-12 lg:gap-8">
              <p className="section-label text-black/62 lg:col-span-3 lg:pt-4">Questions</p>
              <div className="lg:col-span-9">
                <h1 className="type-section">
                  Questions, <br className="hidden sm:block" />
                  <span className="text-black/50">answered plainly.</span>
                </h1>
                <p className="type-lede mt-5 max-w-xl text-black/62 sm:mt-7">
                  What owners usually ask before they build a website, replace a spreadsheet or add automation. If yours is not here, call or email us and we will answer it directly.
                </p>
              </div>
            </div>

            <nav aria-label="Question categories" className="mt-8 flex flex-wrap gap-x-6 gap-y-1 border-t border-black/12 pt-4 text-sm">
              {FAQ_CATEGORIES.map((category) => (
                <a key={category.id} href={`#${category.id}`} className="inline-flex min-h-[44px] items-center text-black/70 underline decoration-black/25 underline-offset-4 hover:text-black">
                  {category.title}
                </a>
              ))}
            </nav>
          </Container>
        </section>

        {FAQ_CATEGORIES.map((category, index) => (
          <section
            key={category.id}
            id={category.id}
            aria-labelledby={`${category.id}-heading`}
            className={`${index % 2 === 0 ? "bg-[#f2f0e9]" : "bg-white"} scroll-mt-[calc(var(--nav-h)+1rem)] py-(--section-y-compact)`}
          >
            <Container>
              <div className="grid gap-5 lg:grid-cols-12 lg:gap-8">
                <div className="lg:col-span-4">
                  <h2 id={`${category.id}-heading`} className="text-[clamp(1.8rem,6vw,2.6rem)] font-semibold leading-[0.98] tracking-[-0.045em]">
                    {category.title}
                  </h2>
                  <p className="mt-3 max-w-xs text-sm leading-6 text-black/62">{category.intro}</p>
                </div>

                <div className="border-t border-black/14 lg:col-span-8">
                  {FAQ_ITEMS.filter((item) => item.category === category.id).map((item) => (
                    <details key={item.id} id={item.id} className="group border-b border-black/14">
                      <summary className="flex min-h-[56px] cursor-pointer list-none items-center gap-6 py-4 text-[1.02rem] font-medium leading-snug tracking-[-0.015em] marker:content-none [&::-webkit-details-marker]:hidden lg:text-[1.15rem]">
                        <span className="flex-1">{item.question}</span>
                        <span aria-hidden="true" className="relative h-3.5 w-3.5 shrink-0 text-black/60">
                          <span className="absolute left-0 top-1/2 h-px w-3.5 bg-current" />
                          <span className="absolute left-1/2 top-0 h-3.5 w-px bg-current group-open:hidden" />
                        </span>
                      </summary>
                      <div className="pb-6 pr-6">
                        <p className="max-w-[62ch] text-[0.98rem] leading-7 text-black/70">{item.answer}</p>
                        {item.links?.length ? (
                          <ul aria-label="Related pages" className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                            {item.links.map((link) => (
                              <li key={link.href}>
                                <Link href={link.href} prefetch={false} className="inline-flex min-h-[44px] items-center text-black underline decoration-black/30 underline-offset-4 hover:decoration-black">
                                  {link.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </Container>
          </section>
        ))}

        <ContactCTA />
      </main>

      <Footer />
    </>
  );
}
