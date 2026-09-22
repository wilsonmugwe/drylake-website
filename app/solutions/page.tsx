import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ContactCTA from "@/components/sections/ContactCTA";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Solutions",
  description:
    "Explore Drylake's AI, automation, custom software and systems integration capabilities.",
};

const solutions = [
  {
    title: "AI & Intelligent Systems",
    description:
      "AI assistants, intelligent workflows and purpose-built AI systems designed around real operational requirements.",
  },
  {
    title: "Business Automation",
    description:
      "Automated workflows that reduce repetitive administration, improve response times and connect business processes.",
  },
  {
    title: "Custom Software",
    description:
      "Applications and digital platforms built specifically around your organisation, users and workflows.",
  },
  {
    title: "Systems Integration",
    description:
      "Connect existing software, platforms and data so information can move reliably across the organisation.",
  },
];

export default function SolutionsPage() {
  return (
    <main>
      <div className="relative bg-[#080808] text-white">
        <Navbar />

        <Container className="pb-20 pt-36 sm:pb-24 sm:pt-44 lg:pb-28">
          <p className="section-label text-white/35">Drylake / Solutions</p>

          <h1 className="mt-6 max-w-5xl text-[clamp(3.5rem,9vw,8rem)] font-semibold leading-[0.87] tracking-[-0.07em]">
            Technology for
            <br />
            real problems.
          </h1>

          <p className="mt-7 max-w-xl text-base leading-7 text-white/50 sm:text-lg">
            We choose technology based on the problem, not the other way
            around.
          </p>
        </Container>
      </div>

      <section className="mineral-texture relative bg-[#f1efe8] py-16 sm:py-20 lg:py-24">
        <Container className="relative z-10">
          {solutions.map((solution, index) => (
            <div
              key={solution.title}
              className="grid gap-5 border-b border-black/10 py-8 lg:grid-cols-[120px_1fr_1fr] lg:items-start lg:py-10"
            >
              <span className="font-mono text-xs text-black/30">
                0{index + 1}
              </span>

              <h2 className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                {solution.title}
              </h2>

              <p className="max-w-lg text-base leading-7 text-black/50">
                {solution.description}
              </p>
            </div>
          ))}
        </Container>
      </section>

      <ContactCTA />
      <Footer />
    </main>
  );
}