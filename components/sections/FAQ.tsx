"use client";

import { motion } from "motion/react";
import {
  Minus,
  Plus,
} from "lucide-react";
import { useState } from "react";

import Container from "@/components/ui/Container";
import { faqs } from "@/lib/faqs";


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
                    {/* Button sits inside the heading (valid accordion pattern; a heading inside a
                        button is invalid HTML). Answers stay in the DOM when collapsed so search
                        engines and the FAQPage schema see the same content a visitor can open. */}
                    <h3 className="text-sm font-semibold leading-5 tracking-[-0.02em] sm:text-lg">
                      <button
                        type="button"
                        id={`faq-question-${index}`}
                        onClick={() =>
                          setActive(isOpen ? null : index)
                        }
                        aria-expanded={isOpen}
                        aria-controls={`faq-answer-${index}`}
                        className="flex min-h-[60px] w-full items-center gap-3 py-3 text-left sm:min-h-[72px]"
                      >
                        <span
                          className={`w-7 shrink-0 font-mono text-[0.58rem] font-normal ${
                            isOpen
                              ? "text-[#f26a2e]"
                              : "text-black/22"
                          }`}
                        >
                          0{index + 1}
                        </span>

                        <span className="flex-1">
                          {faq.question}
                        </span>

                        <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-black/10">
                          {isOpen ? (
                            <Minus size={13} />
                          ) : (
                            <Plus size={13} />
                          )}
                        </span>
                      </button>
                    </h3>

                    <motion.div
                      id={`faq-answer-${index}`}
                      role="region"
                      aria-labelledby={`faq-question-${index}`}
                      aria-hidden={!isOpen}
                      initial={false}
                      animate={
                        isOpen
                          ? { height: "auto", opacity: 1 }
                          : { height: 0, opacity: 0 }
                      }
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-2xl pb-6 pl-10 pr-4 text-sm leading-6 text-black/48 sm:text-base sm:leading-7">
                        {faq.answer}
                      </p>
                    </motion.div>
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