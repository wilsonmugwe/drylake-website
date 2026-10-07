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

const TITLE = "Services: Software, Automation, Integration, AI and Web | Drylake";
const DESCRIPTION =
  "The five things Drylake builds for Australian businesses: custom software, business automation, systems integration, AI automation and web development.";

export const metadata: Metadata = pageMetadata({
  title: "Services: Software, Automation, Integration, AI and Web | Drylake",
  description:
    "The five things Drylake builds for Australian businesses: custom software, business automation, systems integration, AI automation and web development.",
  path: "/services",
});

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
        <Container className="pb-10 pt-32 sm:pt-40">
          <Breadcrumbs crumbs={CRUMBS} />

          <h1 className="mt-10 max-w-5xl text-[clamp(2.8rem,7vw,6rem)] font-semibold leading-[0.92] tracking-[-0.065em]">
            Services
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-black/65 sm:text-lg sm:leading-8">
            Drylake builds and connects technology that helps growing Australian businesses operate
            more effectively. Most work combines more than one of these. Start with the problem and
            we will work out which fits.
          </p>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-black/60">
            For how the pieces fit together, see{" "}
            <Link href="/solutions" className="underline underline-offset-4">
              what we do
            </Link>
            . Based in Perth?{" "}
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
