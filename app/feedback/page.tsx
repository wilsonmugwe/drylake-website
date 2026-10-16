import type { Metadata } from "next";

import FeedbackForm from "@/components/reviews/FeedbackForm";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import Container from "@/components/ui/Container";
import { reviewPlatformUrl } from "@/lib/reviews/testimonials";

export const metadata: Metadata = {
  title: "Share your feedback | Drylake",
  description: "Tell Drylake how the work went.",
  robots: { index: false, follow: false },
};

/*
 * Private feedback page, reached only from the link in a review request email. Never indexed
 * (meta here, X-Robots-Tag and robots.txt via PRIVATE_PREFIXES). The link's token is in the URL
 * fragment and is read by the client component; this server shell holds none of it.
 */
export default function FeedbackPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="bg-white text-black outline-none">
        <section className="pb-16 pt-(--page-top) sm:pb-24 sm:pt-44 lg:pt-48">
          <Container>
            <div className="mx-auto max-w-2xl">
              <p className="section-label flex items-center gap-2.5 text-black/60">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
                Your feedback
              </p>
              <h1 className="type-section mt-6">
                How did we <span className="text-black/45">do?</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-black/65">
                Honest feedback helps us improve, whether it is good or bad. It takes a couple of minutes.
              </p>
              <div className="mt-10">
                <FeedbackForm platform={reviewPlatformUrl(process.env.REVIEW_PLATFORM_URL)} />
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
