import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Founders from "@/components/sections/Founders";
import ContactCTA from "@/components/sections/ContactCTA";
import ServiceIndex from "@/components/sections/ServiceIndex";
import Container from "@/components/ui/Container";
import CompanyDetails from "@/components/seo/CompanyDetails";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbNode, webPageNode } from "@/lib/discovery/structured-data";

const SEO = PAGE_SEO.about;

export const metadata: Metadata = pageMetadata(SEO);

const values = [
  {
    title: "Innovation",
    text: "Find better ways to solve difficult problems.",
  },
  {
    title: "Integrity",
    text: "Build responsibly, communicate clearly and do what we say.",
  },
  {
    title: "Impact",
    text: "Create technology that produces meaningful value.",
  },
];

const ABOUT_CRUMBS = [
  { name: "Home", path: "/" },
  { name: "About", path: "/about" },
];

export default function AboutPage() {
  return (
    <>
      <JsonLd
        nodes={[
          webPageNode({
            path: SEO.path,
            name: SEO.title,
            description: SEO.description,
            type: "AboutPage",
            breadcrumb: ABOUT_CRUMBS,
          }),
          breadcrumbNode("/about", ABOUT_CRUMBS),
        ]}
      />
      <Navbar />

      {/* Experience polish (2026-10-07, brief sections 11-12): the founders open the page. The h1 is
          "Small team. Direct access." (Founders variant="page"), Benedict and Wilson start inside the
          first desktop viewport, and the company story follows. No drama-only spacing. */}
      <main id="main-content" tabIndex={-1} className="bg-white text-black outline-none">
        <Founders variant="page" />

        <section className="mineral-texture bg-[#f2f0e9] py-(--section-y)">
          <Container>
            <div className="grid gap-8 sm:gap-12 lg:grid-cols-2">
              <div>
                <p className="section-label text-black/60">About Drylake</p>
                <h2 className="type-section mt-5">
                  Built close to{" "}
                  <br />
                  <span className="text-black/45">the problem.</span>
                </h2>
              </div>

              <div className="space-y-6 text-base leading-7 text-black/60">
                <p className="text-2xl font-semibold leading-tight tracking-[-0.04em] text-black sm:text-3xl">
                  Tomorrow Starts Here.
                </p>

                <p>
                  Drylake is a Perth-based technology company building practical
                  software and technical systems for Australian businesses.
                </p>

                <p>
                  We believe technology should make an organisation more capable,
                  not more complicated.
                </p>

                <p>
                  Our work starts with understanding the problem, the people
                  experiencing it and the operation around it. We choose the
                  technology after that.
                </p>
              </div>
            </div>

            <div className="mt-10 grid border-t border-black/10 sm:mt-14 md:grid-cols-3">
              {values.map((value) => (
                <div
                  key={value.title}
                  className="border-b border-black/10 py-8 md:border-b-0 md:p-8 md:first:pl-0 md:not-last:border-r"
                >
                  <h3 className="text-3xl font-semibold tracking-[-0.05em]">
                    {value.title}
                  </h3>

                  <p className="mt-3 max-w-sm text-sm leading-6 text-black/60">
                    {value.text}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        <ServiceIndex
          id="about-services"
          label="What we build"
          heading="What Drylake builds"
          showAllLink
          secondaryLink={{ href: "/solutions", label: "How it fits together" }}
        />
        <CompanyDetails />
        <ContactCTA />
      </main>

      <Footer />
    </>
  );
}