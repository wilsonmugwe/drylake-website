import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Solutions from "@/components/sections/Solutions";
import SmallThings from "@/components/sections/SmallThings";
import Approach from "@/components/sections/Approach";
import ContactCTA from "@/components/sections/ContactCTA";

export const metadata: Metadata = pageMetadata({
  title: "Software, Automation & AI Solutions | Drylake",
  description:
    "Drylake builds custom software, automation, AI and connected systems for Australian businesses, from small technical fixes to complete platforms.",
  path: "/solutions",
  shareDescription:
    "Custom software, automation, AI and connected systems built around real business problems.",
});

export default function SolutionsPage() {
  return (
    <main>
      <Navbar />

      <section className="light-grid relative overflow-hidden bg-white pb-20 pt-36 text-black sm:pb-24 sm:pt-40 lg:pb-28 lg:pt-48">
        <div className="pointer-events-none absolute -right-36 top-24 h-96 w-96 rounded-full border border-black/[0.05]">
          <div className="absolute inset-16 rounded-full border border-black/[0.06]" />
          <div className="absolute inset-32 rounded-full border border-black/[0.08]" />
          <div className="absolute left-1/2 top-16 h-2 w-2 -translate-x-1/2 rounded-full bg-[#f26a2e]" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12 xl:px-16">
          <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="section-label text-black/45">
                What We Do
              </p>

              <div className="mt-5 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

                <span className="tech-label text-black/30">
                  SYSTEMS / SOFTWARE / OPERATIONS
                </span>
              </div>
            </div>

            <div>
              <h1 className="max-w-5xl text-[clamp(3.6rem,8vw,8rem)] font-semibold leading-[0.86] tracking-[-0.07em]">
                Technology should solve the problem.
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-7 text-black/65 sm:text-lg">
                From small technical problems to custom software and connected
                systems, Drylake starts with what needs to work and builds from
                there.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Solutions />
      <SmallThings />
      <Approach />
      <ContactCTA />
      <Footer />
    </main>
  );
}