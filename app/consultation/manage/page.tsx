import type { Metadata } from "next";

import ManageConsultation from "@/components/consultations/ManageConsultation";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import Container from "@/components/ui/Container";

/*
 * A customer's own appointment, opened from the link in a Drylake email (/consultation/manage#t=...).
 * Private: never indexed, never in the sitemap, disallowed in robots.txt (PRIVATE_PREFIXES), and no
 * referrer leaves it. The page itself holds no data; ManageConsultation fetches the booking with
 * the token from the URL fragment.
 */
export const metadata: Metadata = {
  title: "Manage your consultation",
  description: "Reschedule or cancel your free Drylake consultation.",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
  alternates: { canonical: null },
};

export default function ManageConsultationPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="bg-white text-black outline-none">
        <section className="relative pb-16 pt-(--page-top) sm:pb-24 sm:pt-44 lg:pt-48">
          <Container className="max-w-3xl">
            <p className="section-label flex items-center gap-2.5 text-black/60">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
              Your consultation
            </p>
            <h1 className="type-section mt-6">Manage your appointment.</h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-black/65">
              Check your booking, choose a different time or cancel. Every change is confirmed by email.
            </p>
            <div className="mt-10">
              <ManageConsultation />
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
