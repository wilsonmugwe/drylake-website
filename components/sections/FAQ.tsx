"use client";

import { useState } from "react";

import Container from "@/components/ui/Container";
import { faqs } from "@/lib/faqs";

/*
 * The breathing room before the close: no visuals, quiet typography, generous spacing.
 * Accessible accordion (button inside the heading). Answers stay in the DOM when collapsed,
 * so search engines and the FAQPage schema see the same text a visitor can open; the
 * open/close is a CSS grid-row transition, no animation library.
 */
export default function FAQ() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <section id="faq" className="surface-paper">
      <Container className="py-(--section-y)">
        <div className="grid gap-8 lg:grid-cols-12">
          <p className="section-label text-black/62 lg:col-span-3 lg:pt-3">05 / FAQ</p>

          <div className="lg:col-span-8">
            <h2 className="text-[clamp(2.2rem,8vw,4.4rem)] font-semibold leading-[0.95] tracking-[-0.055em]">
              A few things you
              <br />
              <span className="text-black/50">might be wondering.</span>
            </h2>

            <div className="mt-8 border-t border-black/12 sm:mt-16">
              {faqs.map((faq, index) => {
                const isOpen = active === index;

                return (
                  <div key={faq.question} className="border-b border-black/12">
                    <h3 className="text-[1.05rem] font-medium leading-snug tracking-[-0.02em] sm:text-[1.3rem]">
                      <button
                        type="button"
                        id={`faq-question-${index}`}
                        onClick={() => setActive(isOpen ? null : index)}
                        aria-expanded={isOpen}
                        aria-controls={`faq-answer-${index}`}
                        className="group flex min-h-[64px] w-full items-center gap-5 py-4 text-left sm:min-h-[72px] sm:py-5"
                      >
                        <span className="flex-1">{faq.question}</span>

                        <span
                          aria-hidden="true"
                          className="relative h-4 w-4 shrink-0 text-black/62 transition-colors group-hover:text-black"
                        >
                          <span className="absolute left-0 top-1/2 h-px w-4 bg-current" />
                          <span
                            className={`absolute left-1/2 top-0 h-4 w-px bg-current transition-transform duration-300 ${
                              isOpen ? "scale-y-0" : "scale-y-100"
                            }`}
                          />
                        </span>
                      </button>
                    </h3>

                    <div
                      id={`faq-answer-${index}`}
                      role="region"
                      aria-labelledby={`faq-question-${index}`}
                      aria-hidden={!isOpen}
                      className="faq-panel"
                      data-open={isOpen ? "true" : "false"}
                    >
                      <div>
                        <p className="type-body max-w-2xl pb-7 pr-8 text-black/62">{faq.answer}</p>
                      </div>
                    </div>
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
