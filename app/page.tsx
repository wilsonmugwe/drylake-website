import type { Metadata } from "next";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

import HomeHero from "@/components/home/HomeHero";
import HomeSystem from "@/components/home/HomeSystem";
import HomeServices from "@/components/home/HomeServices";
import { HomeApproach, HomeCracks } from "@/components/home/HomeCracks";
import { HomeFounders, HomeWorkspace } from "@/components/home/HomeProof";
import { HomeClose, HomeQuestions } from "@/components/home/HomeClose";
import JsonLd from "@/components/seo/JsonLd";
import { faqNode, webPageNode } from "@/lib/discovery/structured-data";
import { faqs } from "@/lib/faqs";
import { pageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

const SEO = PAGE_SEO.home;

export const metadata: Metadata = pageMetadata(SEO);

/*
 * Homepage, Exposed Ground (D54, stage 2). Fewer words, more picture: the services are the
 * headline, the One System tile gets its own stage, the problem is four short cracks, the
 * approach is the three-step philosophy, the product is a real Workspace screen, the founders are
 * type, and the close is the tagline with the booking. Detail lives one click down (service pages,
 * /about, /faq). Copy: lib/home/copy.ts. Every section is a server component; the only client
 * islands are the tile's plate buttons and the phone InView, both unchanged.
 */
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

      <main id="main-content" tabIndex={-1} className="overflow-clip bg-[#0b0b0a] outline-none">
        <HomeHero />
        <HomeSystem />
        <HomeServices />
        <HomeCracks />
        <HomeApproach />
        <HomeWorkspace />
        <HomeFounders />
        <HomeQuestions />
        <HomeClose />
      </main>

      <Footer />
    </>
  );
}
