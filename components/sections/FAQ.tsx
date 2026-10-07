"use client";

import { useState } from "react";

import { faqs } from "@/lib/faqs";

/*
 * The homepage questions, folded into the closing conversation (experience polish, 2026-10-07,
 * brief section 9): the same five questions and answers, now beside the call to action they
 * support instead of a whole chapter before it. Rendered inside ContactCTA (dark surface).
 *
 * Accessible accordion (button inside the heading). Answers stay in the DOM when collapsed, so
 * search engines and the FAQPage schema (app/page.tsx, lib/faqs.ts) see exactly the text a
 * visitor can open; the open/close is a CSS grid-row transition, no animation library.
 */
export default function FAQ() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div id="faq">
      <h2 className="tech-label text-white/60">Before you ask</h2>

      <div className="mt-3 border-t border-white/14">
        {faqs.map((faq, index) => {
          const isOpen = active === index;

          return (
            <div key={faq.question} className="border-b border-white/14">
              <h3 className="text-[0.98rem] font-medium leading-snug tracking-[-0.015em] text-white/90 sm:text-[1.05rem]">
                <button
                  type="button"
                  id={`faq-question-${index}`}
                  onClick={() => setActive(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                  className="group flex min-h-[52px] w-full items-center gap-4 py-3 text-left"
                >
                  <span className="flex-1">{faq.question}</span>

                  <span aria-hidden="true" className="relative h-3.5 w-3.5 shrink-0 text-white/60 transition-colors group-hover:text-white">
                    <span className="absolute left-0 top-1/2 h-px w-3.5 bg-current" />
                    <span
                      className={`absolute left-1/2 top-0 h-3.5 w-px bg-current transition-transform duration-300 ${
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
                  <p className="pb-5 pr-6 text-sm leading-6 text-white/68">{faq.answer}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
