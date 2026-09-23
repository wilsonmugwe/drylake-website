import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ContactCTA from "@/components/sections/ContactCTA";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "What We Do",
  description:
    "Custom software, automation, systems integration and practical technical setup from Drylake.",
};

const solutions = [
  {
    title: "Custom Software",
    description:
      "Applications and digital platforms designed around the way your organisation actually operates.",
    detail:
      "Useful when existing software forces your process into the wrong shape, creates unnecessary manual work or simply cannot do what the operation requires.",
  },
  {
    title: "Business Automation",
    description:
      "Reliable workflows that reduce repetitive administration and connect the steps between people and systems.",
    detail:
      "The goal is not automation for its own sake. It is removing work that should not require somebody's attention every time.",
  },
  {
    title: "Systems Integration",
    description:
      "Connect the software, services and data your organisation already uses.",
    detail:
      "When information has to be copied manually between systems, we look for a more reliable way for it to move.",
  },
  {
    title: "Technical Setup",
    description:
      "Domains, business email, websites, forms, bookings, migrations and the technical details around them.",
    detail:
      "Not every technology problem needs a new platform. Sometimes the useful answer is simply getting the existing pieces configured properly.",
  },
];

export default function SolutionsPage() {
  return (
    <main className="bg-white text-black">
      <Navbar />

      <Container className="pb-20 pt-36 sm:pb-24 sm:pt-44 lg:pb-28">
        <p className="section-label text-black/35">Drylake / What We Do</p>

        <h1 className="mt-6 max-w-5xl text-[clamp(3.5rem,9vw,8rem)] font-semibold leading-[0.87] tracking-[-0.07em]">
          Technology for
          <br />
          <span className="text-black/25">real problems.</span>
        </h1>

        <p className="mt-7 max-w-xl text-base leading-7 text-black/50 sm:text-lg">
          We choose technology based on the problem, not the other way around.
        </p>
      </Container>

      <section className="mineral-texture bg-[#f2f0e9] py-16 sm:py-20 lg:py-24">
        <Container>
          {solutions.map((solution, index) => (
            <article
              key={solution.title}
              className="grid gap-5 border-b border-black/10 py-9 lg:grid-cols-[100px_0.8fr_1.2fr] lg:gap-12 lg:py-12"
            >
              <span className="font-mono text-xs text-black/30">
                0{index + 1}
              </span>

              <h2 className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                {solution.title}
              </h2>

              <div>
                <p className="max-w-lg text-base leading-7 text-black/65">
                  {solution.description}
                </p>

                <p className="mt-4 max-w-lg text-sm leading-6 text-black/40">
                  {solution.detail}
                </p>
              </div>
            </article>
          ))}
        </Container>
      </section>

      <ContactCTA />
      <Footer />
    </main>
  );
}