"use client";

import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import Container from "@/components/ui/Container";

const faqs = [
  {
    question: "What kind of businesses does Drylake work with?",
    answer:
      "We work with Australian businesses that are being held back by manual processes, disconnected systems or software that no longer fits the way they operate. You do not need to be a technology company to work with us.",
  },
  {
    question: "Do we need to know exactly what we want built?",
    answer:
      "No. Start with the business problem. Tell us what is taking too long, being repeated, breaking down or creating unnecessary work. We can work through whether software, automation, integration or another approach makes sense.",
  },
  {
    question: "Can you work with software we already use?",
    answer:
      "Yes. Where practical, we prefer to keep useful systems in place. We can connect, extend or build around existing software where the platform supports the required integration.",
  },
  {
    question: "Do you build websites too?",
    answer:
      "Yes. Drylake can build modern websites and digital experiences, particularly where they form part of a broader customer journey, business system or operational workflow.",
  },
  {
    question: "How do we get started?",
    answer:
      "Start with a conversation. Call +61 420 565 457, email hello@drylake.com.au or use our contact form. You do not need to prepare a technical brief first.",
  },
];

export default function FAQ() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <section
      id="faq"
      className="relative overflow-hidden bg-white py-10 text-black sm:py-20 lg:py-24"
    >
      <Container>
        <div className="grid gap-5 lg:grid-cols-[0.65fr_1.35fr] lg:gap-12">
          <div>
            <p className="section-label text-black/40">
              05 / FAQ
            </p>

            <div className="mt-2.5 flex items-center gap-2 sm:mt-4">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

              <span className="tech-label text-black/30">
                BEFORE WE TALK
              </span>
            </div>
          </div>

          <div>
            <h2 className="max-w-3xl text-[2.35rem] font-semibold leading-[0.93] tracking-[-0.055em] sm:text-[clamp(3rem,5.5vw,5.5rem)] sm:leading-[0.9]">
              A few things you
              <span className="text-black/25">
                {" "}might be wondering.
              </span>
            </h2>

            <div className="mt-5 border-t border-black/10 sm:mt-8">
              {faqs.map((faq, index) => {
                const isOpen = active === index;

                return (
                  <div
                    key={faq.question}
                    className="border-b border-black/10"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setActive(isOpen ? null : index)
                      }
                      aria-expanded={isOpen}
                      className="flex w-full items-start justify-between gap-4 py-3.5 text-left sm:py-5"
                    >
                      <div className="flex gap-3 sm:gap-4">
                        <span
                          className={`mt-1 font-mono text-[0.6rem] ${
                            isOpen
                              ? "text-[#f26a2e]"
                              : "text-black/25"
                          }`}
                        >
                          0{index + 1}
                        </span>

                        <h3 className="max-w-2xl text-sm font-semibold leading-5 tracking-[-0.02em] sm:text-lg sm:leading-6">
                          {faq.question}
                        </h3>
                      </div>

                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/10">
                        {isOpen ? (
                          <Minus size={13} />
                        ) : (
                          <Plus size={13} />
                        )}
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{
                            height: 0,
                            opacity: 0,
                          }}
                          animate={{
                            height: "auto",
                            opacity: 1,
                          }}
                          exit={{
                            height: 0,
                            opacity: 0,
                          }}
                          transition={{
                            duration: 0.22,
                          }}
                          className="overflow-hidden"
                        >
                          <p className="max-w-2xl pb-5 pl-8 pr-8 text-sm leading-6 text-black/50 sm:pl-9 sm:text-base sm:leading-7">
                            {faq.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}