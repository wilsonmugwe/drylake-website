import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProjectForm from "@/components/forms/ProjectForm";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Start a Project",
  description:
    "Tell Drylake about the technical problem, project or opportunity you need help with.",
};

export default function ContactPage() {
  return (
    <main className="bg-white text-black">
      <Navbar />

      <Container className="pb-20 pt-36 sm:pt-44 lg:pb-28">
        <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-36 lg:self-start">
            <p className="section-label text-black/35">Start a Project</p>

            <h1 className="mt-6 text-[clamp(3.5rem,7vw,7rem)] font-semibold leading-[0.88] tracking-[-0.07em]">
              Bring us
              <br />
              <span className="text-black/25">a problem.</span>
            </h1>

            <p className="mt-7 max-w-md text-base leading-7 text-black/50">
              You do not need a technical specification. Tell us what is
              happening, what you want to happen and what is getting in the way.
            </p>

            <div className="mt-10 border-t border-black/10 pt-6">
              <p className="text-sm font-semibold">Drylake</p>
              <p className="mt-1 text-sm text-black/40">
                Perth, Western Australia
              </p>
              <p className="mt-1 text-sm text-black/40">
                Tomorrow Starts Here.
              </p>
            </div>
          </div>

          <ProjectForm />
        </div>
      </Container>

      <Footer />
    </main>
  );
}