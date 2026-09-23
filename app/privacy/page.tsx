import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Privacy",
};

export default function PrivacyPage() {
  return (
    <main className="bg-white text-black">
      <Navbar />

      <Container className="pb-20 pt-36 sm:pt-44">
        <p className="section-label text-black/35">Legal</p>

        <h1 className="mt-6 text-5xl font-semibold tracking-[-0.06em] sm:text-7xl">
          Privacy
        </h1>
      </Container>

      <section className="bg-[#f2f0e9] py-16 sm:py-20">
        <Container>
          <div className="max-w-3xl space-y-7 text-base leading-7 text-black/60">
            <p>
              Drylake respects the privacy of people who interact with our
              website and services.
            </p>

            <p>
              This page is currently a placeholder while Drylake&apos;s formal
              privacy policy is prepared before production launch.
            </p>

            <p>
              The final policy will describe what information is collected, why
              it is collected, how it is handled and how privacy enquiries can
              be made.
            </p>
          </div>
        </Container>
      </section>

      <Footer />
    </main>
  );
}