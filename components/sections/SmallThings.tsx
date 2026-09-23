"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import Container from "@/components/ui/Container";

const items = [
  {
    title: "Domain & Email",
    teaser: "Domain, DNS and business email.",
    text: "Get your domain, DNS and business email configured properly so messages send, arrive and represent the business professionally.",
    flow: ["DOMAIN", "DNS", "EMAIL"],
  },
  {
    title: "Websites",
    teaser: "A clear, fast digital front door.",
    text: "A fast, responsive website that clearly explains what you do and gives customers a useful next step.",
    flow: ["VISITOR", "SITE", "ACTION"],
  },
  {
    title: "Forms & Bookings",
    teaser: "Get information to the right place.",
    text: "Enquiries, bookings and forms configured so information reaches the right place instead of disappearing into a broken workflow.",
    flow: ["FORM", "ROUTE", "TEAM"],
  },
  {
    title: "Payments",
    teaser: "Reduce friction around getting paid.",
    text: "Connect the payment flow to the systems around it and remove unnecessary friction for customers and staff.",
    flow: ["CUSTOMER", "PAY", "SYSTEM"],
  },
  {
    title: "Platform Migration",
    teaser: "Move without losing the operation.",
    text: "Move data, accounts and workflows from systems that no longer fit the way your business operates.",
    flow: ["OLD", "MOVE", "NEW"],
  },
];

export default function SmallThings() {
  const [active, setActive] = useState<number | null>(0);

  return (
    <section className="relative overflow-hidden bg-[#090909] py-20 text-white sm:py-24 lg:py-28">
      {/* subtle technical background */}
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-30" />

      <div className="pointer-events-none absolute -left-40 top-1/3 h-80 w-80 rounded-full border border-white/[0.04]" />
      <div className="pointer-events-none absolute -left-20 top-1/3 h-40 w-40 rounded-full border border-white/[0.06]" />

      <Container className="relative z-10">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div>
            <p className="section-label text-white/45">
              02 / The Small Things
            </p>

            <h2 className="mt-6 max-w-xl text-[clamp(3rem,6vw,6rem)] font-semibold leading-[0.9] tracking-[-0.065em]">
              An hour you will
              <span className="text-white/35"> never get back.</span>
            </h2>

            <p className="mt-6 max-w-lg text-base leading-7 text-white/60">
              A domain that will not connect. Email that will not send. A form
              that quietly stops delivering enquiries. Small technical problems
              have a habit of consuming an entire afternoon.
            </p>

            <p className="mt-4 flex max-w-lg items-center gap-2 text-base leading-7 text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
              That is where we come in.
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
                    className="group grid w-full grid-cols-[34px_1fr_auto] gap-3 py-6 text-left sm:grid-cols-[50px_1fr_auto] sm:gap-5"
                  >
                    <span
                      className={`font-mono text-xs transition-colors ${
                        isOpen ? "text-[#f26a2e]" : "text-white/35"
                      }`}
                    >
                      0{index + 1}
                    </span>

                    <div>
                      <span className="block text-xl font-medium tracking-[-0.035em] text-white sm:text-2xl">
                        {item.title}
                      </span>

                      {!isOpen && (
                        <span className="mt-1.5 block text-sm leading-5 text-white/45">
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
                        <div className="pb-7 pl-[34px] sm:pl-[70px]">
                          <p className="max-w-xl text-sm leading-6 text-white/60 sm:text-base sm:leading-7">
                            {item.text}
                          </p>

                          {/* mini flow */}
                          <div className="mt-5 flex max-w-md items-center">
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

                                  <span className="tech-label mt-2 truncate text-[0.48rem] text-white/40 sm:text-[0.55rem]">
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