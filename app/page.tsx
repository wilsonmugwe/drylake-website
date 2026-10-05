import type { Metadata } from "next";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

import Hero from "@/components/sections/Hero";
import Problems from "@/components/sections/Problems";
import Solutions from "@/components/sections/Solutions";
import Integrations from "@/components/sections/Integrations";
import Founders from "@/components/sections/Founders";
import Approach from "@/components/sections/Approach";
import FAQ from "@/components/sections/FAQ";
import ContactCTA from "@/components/sections/ContactCTA";
import FaqSchema from "@/components/seo/FaqSchema";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Drylake | Operational Software & Automation Australia",
  description:
    "Drylake builds operational software, automation and connected systems for Australian businesses held back by manual processes and disconnected tools.",
  path: "/",
  shareDescription:
    "Operational software, automation and connected systems for Australian businesses that have outgrown manual processes and disconnected tools.",
});

export default function Home() {
  return (
    <>
      <FaqSchema />
      <Navbar />

      <main id="main-content" tabIndex={-1} className="overflow-hidden outline-none">
        <Hero />
        <Problems />
        <Solutions />
        <Integrations />
        <Founders />
        <Approach />
        <FAQ />
        <ContactCTA />
      </main>

      <Footer />
    </>
  );
}