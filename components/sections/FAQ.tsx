"use client";

import {
  AnimatePresence,
  motion,
} from "motion/react";
import {
  Minus,
  Plus,
} from "lucide-react";
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
      className="bg-white py-12 text-black sm:py-20 lg:py-24"
    >
      <Container>
        <div className="grid gap-6 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
          <div>
            <p className="section-label text-black/38">
              05 / FAQ
            </p>
          </div>

          <div>
            <h2 className="max-w-4xl text-[clamp(2.5rem,11vw,4rem)] font-semibold leading-[0.92] tracking-[-0.06em] sm:text-[clamp(3.8rem,5.5vw,5.5rem)]">
              A few things you
              <br />

              <span className="text-black/24">
                might be wondering.
              </span>
            </h2>

            <div className="mt-7 border-t border-black/10 sm:mt-10">
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
                      className="flex min-h-[60px] w-full items-center gap-3 py-3 text-left sm:min-h-[72px]"
                    >
                      <span
                        className={`w-7 shrink-0 font-mono text-[0.58rem] ${
                          isOpen
                            ? "text-[#f26a2e]"
                            : "text-black/22"
                        }`}
                      >
                        0{index + 1}
                      </span>

                      <h3 className="flex-1 text-sm font-semibold leading-5 tracking-[-0.02em] sm:text-lg">
                        {faq.question}
                      </h3>

                      <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-black/10">
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
                            duration: 0.2,
                          }}
                          className="overflow-hidden"
                        >
                          <p className="max-w-2xl pb-6 pl-10 pr-4 text-sm leading-6 text-black/48 sm:text-base sm:leading-7">
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