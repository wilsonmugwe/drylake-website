"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import Container from "@/components/ui/Container";

const items = [
  {
    title: "Websites",
    teaser: "A professional digital front door for the business.",
    text: "Fast, clear business websites designed around what customers need to understand and what you want them to do next.",
    flow: ["VISITOR", "WEBSITE", "ACTION"],
  },
  {
    title: "Forms & Bookings",
    teaser: "Move information without chasing it manually.",
    text: "Digital forms, booking systems and simple workflows that get information from the customer to the right place in the business.",
    flow: ["CUSTOMER", "FORM", "TEAM"],
  },
  {
    title: "Payments",
    teaser: "Make getting paid part of the workflow.",
    text: "Online payment flows and integrations that connect transactions with the systems and processes around them.",
    flow: ["CUSTOMER", "PAYMENT", "SYSTEM"],
  },
  {
    title: "Domains & Business Email",
    teaser: "Get the foundations configured properly.",
    text: "Domains, DNS and professional business email configured so the basics work reliably and the business presents professionally.",
    flow: ["DOMAIN", "DNS", "EMAIL"],
  },
  {
    title: "Platform Migration",
    teaser: "Move away from software you've outgrown.",
    text: "Move accounts, data and workflows from platforms that no longer fit while protecting the processes the business depends on.",
    flow: ["CURRENT", "MIGRATE", "NEW"],
  },
  {
    title: "Web Performance & Search",
    teaser: "Make the website easier to find and use.",
    text: "Technical foundations covering performance, crawlability, indexing, site structure and search configuration.",
    flow: ["WEBSITE", "INDEX", "SEARCH"],
  },
];

export default function SmallThings() {
  const [active, setActive] = useState<number | null>(0);

  return (
    <section className="relative overflow-hidden bg-[#090909] py-16 text-white sm:py-20 lg:py-28">
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-25" />

      <Container className="relative z-10">
        <div className="grid gap-9 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div>
            <p className="section-label text-white/40">
              04 / Practical Technology
            </p>

            <h2 className="mt-5 max-w-xl text-[clamp(2.8rem,6vw,6rem)] font-semibold leading-[0.9] tracking-[-0.065em]">
              Not every problem needs
              <span className="text-white/35"> custom software.</span>
            </h2>

            <p className="mt-5 max-w-lg text-sm leading-6 text-white/55 sm:mt-6 sm:text-base sm:leading-7">
              Sometimes the right answer is a better website, a connected form,
              a payment flow or simply getting the technology you already use
              configured properly.
            </p>

            <div className="mt-6 border-l-2 border-[#f26a2e] pl-4">
              <p className="max-w-md text-sm font-medium leading-6 text-white/80 sm:text-base">
                We&apos;d rather solve the problem simply than sell you
                technology you don&apos;t need.
              </p>
            </div>
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
                        isOpen ? "text-[#f26a2e]" : "text-white/30"
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
                      className={`mt-1 text-white/50 transition-transform duration-300 ${
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
                        <div className="pb-6 pl-[30px] sm:pb-7 sm:pl-[66px]">
                          <p className="max-w-xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
                            {item.text}
                          </p>

                          <div className="mt-5 flex max-w-md items-center">
                            {item.flow.map((step, stepIndex) => (
                              <div
                                key={step}
                                className="flex min-w-0 flex-1 items-center"
                              >
                                <div className="flex min-w-0 flex-col">
                                  <div
                                    className={`h-2 w-2 rounded-full ${
                                      stepIndex === 1
                                        ? "bg-[#f26a2e]"
                                        : "bg-white/40"
                                    }`}
                                  />

                                  <span className="tech-label mt-2 truncate text-[0.46rem] text-white/35 sm:text-[0.55rem]">
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