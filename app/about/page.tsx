import type { Metadata } from "next";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Founders from "@/components/sections/Founders";
import ContactCTA from "@/components/sections/ContactCTA";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "About Drylake",
  description:
    "Drylake is a Perth-based technology company building practical software, automation and technical systems for Australian businesses.",

  alternates: {
    canonical: "/about",
  },

  openGraph: {
    title: "About Drylake",
    description:
      "A Perth technology company building practical software, automation and technical systems for Australian businesses.",
    url: "https://drylake.com.au/about",
    type: "website",
  },
};

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

export default function AboutPage() {
  return (
    <main className="bg-white text-black">
      <Navbar />

      <Container className="pb-20 pt-36 sm:pb-24 sm:pt-44 lg:pb-28">
        <p className="section-label text-black/35">About Drylake</p>

        <h1 className="mt-6 max-w-5xl text-[clamp(3.4rem,8vw,7.5rem)] font-semibold leading-[0.88] tracking-[-0.07em]">
          Built close to
          <br />
          <span className="text-black/25">the problem.</span>
        </h1>
      </Container>

      <section className="mineral-texture bg-[#f2f0e9] py-20 lg:py-28">
        <Container>
          <div className="grid gap-12 lg:grid-cols-2">
            <h2 className="text-4xl font-semibold tracking-[-0.055em] sm:text-5xl lg:text-6xl">
              Tomorrow Starts Here.
            </h2>

            <div className="space-y-6 text-base leading-7 text-black/55">
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

          <div className="mt-16 grid border-t border-black/10 md:grid-cols-3">
            {values.map((value) => (
              <div
                key={value.title}
                className="border-b border-black/10 py-8 md:border-b-0 md:p-8 md:first:pl-0 md:not-last:border-r"
              >
                <h3 className="text-3xl font-semibold tracking-[-0.05em]">
                  {value.title}
                </h3>

                <p className="mt-3 max-w-sm text-sm leading-6 text-black/50">
                  {value.text}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <Founders />
      <ContactCTA />
      <Footer />
    </main>
  );
}