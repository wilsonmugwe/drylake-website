import type { Metadata } from "next";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

import Hero from "@/components/sections/Hero";
import Problems from "@/components/sections/Problems";
import Solutions from "@/components/sections/Solutions";
import Integrations from "@/components/sections/Integrations";
import Founders from "@/components/sections/Founders";
import Approach from "@/components/sections/Approach";
import Production from "@/components/sections/Production";
import FAQ from "@/components/sections/FAQ";
import ContactCTA from "@/components/sections/ContactCTA";
import JsonLd from "@/components/seo/JsonLd";
import { faqNode, webPageNode } from "@/lib/discovery/structured-data";
import { faqs } from "@/lib/faqs";
import { pageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

const SEO = PAGE_SEO.home;

export const metadata: Metadata = pageMetadata(SEO);

export default function Home() {
  return (
    <>
      <JsonLd
        nodes={[
          webPageNode({ path: SEO.path, name: SEO.title, description: SEO.description }),
          faqNode("/", faqs),
        ]}
      />
      <Navbar />

      <main id="main-content" tabIndex={-1} className="overflow-hidden outline-none">
        <Hero />
        <Problems />
        <Solutions />
        <Integrations />
        <Founders />
        <Approach />
        <Production />
        <FAQ />
        <ContactCTA />
      </main>

      <Footer />
    </>
  );
}