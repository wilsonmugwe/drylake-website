import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import ContactCTA from "@/components/sections/ContactCTA";
import ServiceIndex from "@/components/sections/ServiceIndex";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import Container from "@/components/ui/Container";
import { SERVICES, SERVICES_PATH } from "@/lib/discovery/entity";
import { breadcrumbNode, serviceNode, webPageNode } from "@/lib/discovery/structured-data";
import { pageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

const SEO = PAGE_SEO.services;
const TITLE = SEO.title;
const DESCRIPTION = SEO.description;

export const metadata: Metadata = pageMetadata(SEO);

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Services", path: SERVICES_PATH },
];

export default function ServicesPage() {
  return (
    <>
      <JsonLd
        nodes={[
          webPageNode({
            path: SERVICES_PATH,
            name: TITLE,
            description: DESCRIPTION,
            type: "CollectionPage",
            breadcrumb: CRUMBS,
          }),
          breadcrumbNode(SERVICES_PATH, CRUMBS),
          ...SERVICES.map(serviceNode),
        ]}
      />

      <Navbar />

      <main id="main-content" tabIndex={-1} className="bg-white text-black outline-none">
        <Container className="pb-10 pt-(--page-top)">
          <Breadcrumbs crumbs={CRUMBS} />

          <h1 className="type-section mt-6 max-w-5xl sm:mt-10">
            Services
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-black/65 sm:text-lg sm:leading-8">
            Drylake builds five kinds of things for Australian businesses: websites, custom
            software and apps, business automation, connections between the tools you already use,
            and practical AI tools. Most projects use more than one. Start with the problem and we
            will work out which fits.
          </p>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-black/60">
            Starting from a problem rather than a service? See{" "}
            <Link href="/solutions" className="underline underline-offset-4">
              the business problems we solve
            </Link>{" "}
            and which service fits each. Based in Perth?{" "}
            <Link href="/perth" className="underline underline-offset-4">
              Drylake in Perth
            </Link>
            .
          </p>
        </Container>

        <ServiceIndex
          id="service-lines"
          label="Five service lines"
          heading="What Drylake builds"
        />

        <ContactCTA />
      </main>

      <Footer />
    </>
  );
}
