import type { Metadata } from "next";

import UnsubscribeClient from "@/components/reviews/UnsubscribeClient";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Unsubscribe | Drylake",
  description: "Stop feedback requests from Drylake.",
  robots: { index: false, follow: false },
};

export default function UnsubscribePage() {
  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="bg-white text-black outline-none">
        <section className="pb-16 pt-(--page-top) sm:pb-24 sm:pt-44 lg:pt-48">
          <Container>
            <div className="mx-auto max-w-2xl">
              <h1 className="type-section">Unsubscribe</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-black/65">
                Stop feedback requests from Drylake Pty Ltd.
              </p>
              <div className="mt-10">
                <UnsubscribeClient />
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
