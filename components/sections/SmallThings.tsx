"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import Container from "@/components/ui/Container";

const items = [
  {
    title: "Websites",
    teaser: "A clear, fast digital front door.",
    text: "Modern business websites designed around usability, performance and a clear next step for the people visiting them.",
    flow: ["VISITOR", "WEBSITE", "ACTION"],
  },
  {
    title: "SEO & Web Performance",
    teaser: "Help search engines find and understand your website.",
    text: "Technical SEO foundations including crawlability, indexing, site structure, metadata, performance and search configuration.",
    flow: ["WEBSITE", "INDEX", "SEARCH"],
  },
  {
    title: "Domains & Email",
    teaser: "The foundations behind your digital presence.",
    text: "Domain, DNS and professional business email configured correctly so your digital infrastructure works reliably.",
    flow: ["DOMAIN", "DNS", "EMAIL"],
  },
  {
    title: "Forms & Bookings",
    teaser: "Get information to the right place.",
    text: "Digital forms, appointment systems and customer workflows that route information where it actually needs to go.",
    flow: ["CUSTOMER", "FORM", "TEAM"],
  },
  {
    title: "Payments",
    teaser: "Reduce friction around getting paid.",
    text: "Online payment flows and integrations connected to the systems around them.",
    flow: ["CUSTOMER", "PAY", "SYSTEM"],
  },
  {
    title: "Platform Migration",
    teaser: "Move without losing the operation.",
    text: "Move accounts, data and workflows from platforms that no longer fit while protecting the processes the business depends on.",
    flow: ["CURRENT", "MIGRATE", "NEW"],
  },
];

export default function SmallThings() {
  const [active, setActive] = useState<number | null>(0);

  return (
    <section className="relative overflow-hidden bg-[#090909] py-16 text-white sm:py-20 lg:py-28">
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-30" />

      <div className="pointer-events-none absolute -left-40 top-1/3 h-80 w-80 rounded-full border border-white/[0.04]" />
      <div className="pointer-events-none absolute -left-20 top-1/3 h-40 w-40 rounded-full border border-white/[0.06]" />

      <Container className="relative z-10">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div>
            <p className="section-label text-white/45">
              03 / Practical Technology
            </p>

            <h2 className="mt-4 max-w-xl text-[clamp(2.8rem,6vw,6rem)] font-semibold leading-[0.9] tracking-[-0.065em] sm:mt-6">
              Not every problem needs
              <span className="text-white/35"> custom software.</span>
            </h2>

            <p className="mt-4 max-w-lg text-sm leading-6 text-white/55 sm:mt-6 sm:text-base sm:leading-7">
              Sometimes the right answer is simply getting the technology you
              already need configured properly.
            </p>

            <p className="mt-3 flex max-w-lg items-center gap-2 text-sm leading-6 text-white sm:mt-4 sm:text-base">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
              We handle that too.
            </p>
          </div>

          <div className="border-t border-white/15">
            {items.map((item, index) => {
              const isOpen = active === index;

              return (
                <div key={item.title} className="border-b border-white/15">
                  <button
                    type="button"
                    onClick={() => setActive(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    className="group grid w-full grid-cols-[30px_1fr_auto] gap-3 py-4 text-left sm:grid-cols-[46px_1fr_auto] sm:gap-5 sm:py-5"
                  >
                    <span
                      className={`font-mono text-xs transition-colors ${
                        isOpen ? "text-[#f26a2e]" : "text-white/35"
                      }`}
                    >
                      0{index + 1}
                    </span>

                    <div>
                      <span className="block text-lg font-medium tracking-[-0.035em] text-white sm:text-2xl">
                        {item.title}
                      </span>

                      {!isOpen && (
                        <span className="mt-1 block text-xs leading-5 text-white/40 sm:text-sm">
                          {item.teaser}
                        </span>
                      )}
                    </div>

                    <ChevronDown
                      size={18}
                      className={`mt-1 text-white/60 transition-transform duration-300 ${
                        isOpen ? "rotate-180 text-[#f26a2e]" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="pb-5 pl-[30px] sm:pb-7 sm:pl-[66px]">
                          <p className="max-w-xl text-sm leading-6 text-white/60 sm:text-base sm:leading-7">
                            {item.text}
                          </p>

                          <div className="mt-4 flex max-w-md items-center sm:mt-5">
                            {item.flow.map((step, stepIndex) => (
                              <div
                                key={step}
                                className="flex min-w-0 flex-1 items-center"
                              >
                                <div className="flex min-w-0 flex-1 flex-col">
                                  <div
                                    className={`h-2 w-2 rounded-full ${
                                      stepIndex === 1
                                        ? "signal-dot bg-[#f26a2e]"
                                        : "bg-white/50"
                                    }`}
                                  />

                                  <span className="tech-label mt-2 truncate text-[0.46rem] text-white/40 sm:text-[0.55rem]">
                                    {step}
                                  </span>
                                </div>

                                {stepIndex < item.flow.length - 1 && (
                                  <div className="mr-3 h-px flex-1 bg-white/15">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: "100%" }}
                                      transition={{
                                        duration: 0.5,
                                        delay: stepIndex * 0.12,
                                      }}
                                      className="h-px bg-[#f26a2e]/60"
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}