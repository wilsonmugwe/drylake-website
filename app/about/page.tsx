import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ContactCTA from "@/components/sections/ContactCTA";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Drylake and our approach to building intelligent technology.",
};

export default function AboutPage() {
  return (
    <main>
      <div className="bg-[#080808] text-white">
        <Navbar />

        <Container className="pb-20 pt-36 sm:pb-24 sm:pt-44 lg:pb-28">
          <p className="section-label text-white/35">About Drylake</p>

          <h1 className="mt-6 max-w-5xl text-[clamp(3.4rem,8vw,7.5rem)] font-semibold leading-[0.88] tracking-[-0.07em]">
            Build what matters.
          </h1>

          <p className="mt-7 max-w-2xl text-base leading-7 text-white/50 sm:text-lg">
            Drylake is a technology company focused on solving real business
            problems through intelligent software, AI and automation.
          </p>
        </Container>
      </div>

      <section className="mineral-texture relative bg-[#f1efe8] py-20 lg:py-28">
        <Container className="relative z-10">
          <div className="grid gap-12 lg:grid-cols-2">
            <h2 className="text-4xl font-semibold tracking-[-0.055em] sm:text-5xl lg:text-6xl">
              Tomorrow Starts Here.
            </h2>

            <div className="space-y-6 text-base leading-7 text-black/55">
              <p>
                We believe technology should make organisations more capable,
                not more complicated.
              </p>

              <p>
                Our approach starts with understanding the problem and the
                people experiencing it. From there, we design and build the
                technology that best supports the desired outcome.
              </p>
            </div>
          </div>

          <div className="mt-16 grid border-t border-black/10 md:grid-cols-3">
            {[
              ["Innovation", "Find better ways to solve difficult problems."],
              [
                "Integrity",
                "Build responsibly, communicate clearly and do what we say.",
              ],
              [
                "Impact",
                "Create technology that produces meaningful value.",
              ],
            ].map(([title, text]) => (
              <div
                key={title}
                className="border-b border-black/10 py-8 md:border-b-0 md:p-8 md:first:pl-0 md:not-last:border-r"
              >
                <h3 className="text-3xl font-semibold tracking-[-0.05em]">
                  {title}
                </h3>

                <p className="mt-3 max-w-sm text-sm leading-6 text-black/50">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <ContactCTA />
      <Footer />
    </main>
  );
}