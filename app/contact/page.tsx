import type { Metadata } from "next";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  Mail,
  Phone,
} from "lucide-react";

import { pageMetadata } from "@/lib/seo";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProjectForm from "@/components/forms/ProjectForm";
import Container from "@/components/ui/Container";
import { RESPONSE_TIME } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Contact Drylake | Software & Automation Enquiries",
  description:
    "Talk to Drylake about software, automation, integrations or operational technology. Call, email or tell us what is slowing your business down.",
  path: "/contact",
  shareDescription:
    "Talk to Drylake about software, automation, integrations or operational technology for your business.",
});

const nextSteps = [
  {
    number: "01",
    title: "We read it",
    text: `A founder reviews your enquiry and replies within ${RESPONSE_TIME}.`,
  },
  {
    number: "02",
    title: "We talk",
    text: "We learn how the process works today, where the friction is and what you want to improve.",
  },
  {
    number: "03",
    title: "We work out the next step",
    text: "That might be software, automation, an integration, a smaller technical fix or an existing product that already solves the problem.",
  },
];

export default function ContactPage() {
  return (
    <>
      <Navbar />

      <main id="main-content" tabIndex={-1} className="bg-white text-black outline-none">
        <section className="relative overflow-hidden pb-12 pt-36 sm:pb-18 sm:pt-44 lg:pb-20 lg:pt-48">
          <div
            aria-hidden="true"
            className="micro-grid pointer-events-none absolute inset-0 opacity-25"
          />

          <Container className="relative z-10">
            <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
              {/* Introduction */}
              <div className="lg:sticky lg:top-36 lg:self-start">
                <p className="section-label flex items-center gap-2.5 text-black/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
                  Let&apos;s Talk
                </p>

                <h1 className="mt-6 max-w-3xl text-[clamp(3.5rem,7vw,7rem)] font-semibold leading-[0.88] tracking-[-0.07em]">
                  Tell us what&apos;s
                  <br />

                  <span className="text-black/45">
                    getting in the way.
                  </span>
                </h1>

                <p className="mt-6 max-w-lg text-base leading-7 text-black/60">
                  You don&apos;t need a technical brief or project plan. Tell us
                  how the business works today, what&apos;s causing friction and
                  what you&apos;d like to improve.
                </p>

                <div className="mt-7 border-l-2 border-[#f26a2e] pl-4">
                  <p className="max-w-md text-sm font-medium leading-6 text-black/70">
                    Start with the business problem. We&apos;ll work through the
                    technology with you.
                  </p>
                </div>

                {/* Direct contact */}
                <div className="mt-8 border-t border-black/10 pt-5">
                  <p className="tech-label text-black/60">
                    TALK TO A PERSON, NOT A SALES QUEUE.
                  </p>

                  <a
                    href="tel:+61420565457"
                    className="group mt-4 flex max-w-md items-center justify-between border-b border-black/10 pb-3"
                  >
                    <div className="flex items-center gap-3">
                      <Phone
                        size={15}
                        className="text-[#f26a2e]"
                      />

                      <div>
                        <p className="text-[0.6rem] uppercase tracking-[0.12em] text-black/60">
                          Call
                        </p>

                        <p className="mt-0.5 text-sm font-medium text-black/65">
                          +61 420 565 457
                        </p>
                      </div>
                    </div>

                    <ArrowUpRight
                      size={14}
                      className="text-black/20 transition-colors group-hover:text-black"
                    />
                  </a>

                  <a
                    href="mailto:hello@drylake.com.au"
                    className="group flex max-w-md items-center justify-between border-b border-black/10 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Mail
                        size={15}
                        className="text-[#f26a2e]"
                      />

                      <div>
                        <p className="text-[0.6rem] uppercase tracking-[0.12em] text-black/60">
                          Email
                        </p>

                        <p className="mt-0.5 text-sm font-medium text-black/65">
                          hello@drylake.com.au
                        </p>
                      </div>
                    </div>

                    <ArrowUpRight
                      size={14}
                      className="text-black/20 transition-colors group-hover:text-black"
                    />
                  </a>
                </div>

                {/* Company identity */}
                <div className="mt-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">
                      Drylake Pty Ltd
                    </p>

                    <p className="mt-1 text-xs leading-5 text-black/60">
                      Perth, Western Australia
                      <br />
                      ABN 70 702 662 557
                    </p>
                  </div>

                  <ArrowDown
                    size={17}
                    className="text-black/25 lg:hidden"
                  />
                </div>
              </div>

              {/* Form */}
              <div>
                <div className="mb-7 border-b border-black/10 pb-5">
                  <p className="section-label text-black/60">
                    Tell us about the business
                  </p>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-black/60">
                    A few details are enough to get the conversation started.
                  </p>
                </div>

                <ProjectForm />
              </div>
            </div>
          </Container>
        </section>

        {/* What happens next */}
        <section className="mineral-texture relative overflow-hidden bg-[#f2f0e9] py-12 sm:py-20 lg:py-24">
          <Container>
            <div className="grid gap-6 border-b border-black/10 pb-7 lg:grid-cols-[0.65fr_1.35fr] lg:gap-12">
              <div>
                <p className="section-label text-black/60">
                  What Happens Next
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

                  <span className="tech-label text-black/60">
                    SIMPLE / DIRECT
                  </span>
                </div>
              </div>

              <div>
                <h2 className="max-w-3xl text-[clamp(2.6rem,5vw,5rem)] font-semibold leading-[0.92] tracking-[-0.06em]">
                  No technical pitch
                  <span className="text-black/45">
                    {" "}required.
                  </span>
                </h2>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-black/60 sm:text-base sm:leading-7">
                  The first conversation is about understanding whether there is
                  a problem worth solving and what the sensible next step might
                  be.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3">
              {nextSteps.map((step) => (
                <article
                  key={step.number}
                  className="
                    border-b border-black/10 py-6
                    md:min-h-[280px] md:border-b-0 md:border-r md:p-8
                    md:first:pl-0 md:last:border-r-0 md:last:pr-0
                  "
                >
                  <div className="flex h-full flex-col justify-between gap-8 md:gap-14">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-black/60">
                        {step.number}
                      </span>

                      <Check
                        size={14}
                        className="text-[#f26a2e]"
                      />
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold tracking-[-0.045em] sm:text-2xl">
                        {step.title}
                      </h3>

                      <p className="mt-2 max-w-sm text-sm leading-6 text-black/60 sm:mt-3">
                        {step.text}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </>
  );
}