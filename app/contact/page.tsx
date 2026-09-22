import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Contact",
  description: "Start a conversation with Drylake.",
};

export default function ContactPage() {
  return (
    <main className="bg-[#080808] text-white">
      <Navbar />

      <Container className="min-h-[90svh] pb-20 pt-36 sm:pt-44">
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <p className="section-label text-white/35">Start a Project</p>

            <h1 className="mt-6 text-[clamp(3.5rem,7vw,7rem)] font-semibold leading-[0.88] tracking-[-0.07em]">
              Let&apos;s solve
              <br />
              something.
            </h1>

            <p className="mt-7 max-w-md text-base leading-7 text-white/45">
              Tell us about the problem, opportunity or idea. We&apos;ll start
              there.
            </p>
          </div>

          <form className="space-y-8">
            <div>
              <label htmlFor="name" className="section-label text-white/35">
                Name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Your name"
                className="mt-2 w-full border-b border-white/15 bg-transparent py-4 text-lg outline-none transition-colors placeholder:text-white/20 focus:border-white"
              />
            </div>

            <div>
              <label htmlFor="email" className="section-label text-white/35">
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@company.com"
                className="mt-2 w-full border-b border-white/15 bg-transparent py-4 text-lg outline-none transition-colors placeholder:text-white/20 focus:border-white"
              />
            </div>

            <div>
              <label htmlFor="company" className="section-label text-white/35">
                Company
              </label>

              <input
                id="company"
                name="company"
                type="text"
                placeholder="Company name"
                className="mt-2 w-full border-b border-white/15 bg-transparent py-4 text-lg outline-none transition-colors placeholder:text-white/20 focus:border-white"
              />
            </div>

            <div>
              <label htmlFor="message" className="section-label text-white/35">
                What can we help with?
              </label>

              <textarea
                id="message"
                name="message"
                required
                rows={4}
                placeholder="Tell us about the problem..."
                className="mt-2 w-full resize-none border-b border-white/15 bg-transparent py-4 text-lg outline-none transition-colors placeholder:text-white/20 focus:border-white"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-white px-6 py-4 font-semibold text-black transition-transform hover:scale-[1.01] sm:w-auto sm:min-w-[200px]"
            >
              Send Enquiry
            </button>

            <p className="text-xs leading-5 text-white/30">
              Form delivery will be connected before production launch.
            </p>
          </form>
        </div>
      </Container>

      <Footer />
    </main>
  );
}