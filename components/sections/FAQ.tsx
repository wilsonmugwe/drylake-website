"use client";

import { useState } from "react";

import { faqs } from "@/lib/faqs";

/*
 * The homepage questions, folded into the closing conversation (experience polish, 2026-10-07,
 * brief section 9): the same five questions and answers, under the call to action they support
 * instead of a whole chapter before it. Rendered inside ContactCTA (dark surface).
 *
 * Final refinement 2026-10-08: open answers were tight under their questions on desktop; rows
 * get more height, the columns a wider gutter, answers a larger size, longer leading and a
 * clearer gap from the next question. Same component, same five questions.
 *
 * Desktop (mobile refinement 2026-10-07): an editorial split across the full content width, the
 * heading and a short note in the first third (sticky while answers open), the accordion in the
 * remaining two thirds, so questions get room to breathe instead of a narrow column. The
 * Container's max width bounds it on very large screens. Phones stack: heading, note, accordion.
 *
 * Accessible accordion (button inside the heading). Answers stay in the DOM when collapsed, so
 * search engines and the FAQPage schema (app/page.tsx, lib/faqs.ts) see exactly the text a
 * visitor can open; the open/close is a CSS grid-row transition, no animation library.
 */
export default function FAQ() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div id="faq" className="grid gap-7 sm:gap-9 lg:grid-cols-12 lg:gap-x-12 xl:gap-x-16">
      <div className="lg:col-span-4">
        <div className="lg:sticky lg:top-[calc(var(--nav-h)+2rem)]">
          <p className="section-label flex items-center gap-2.5 text-white/60">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-signal" />
            Questions
          </p>
          <h2 className="mt-5 text-[clamp(2rem,7.5vw,2.9rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-white lg:text-[clamp(2.2rem,2.9vw,3.1rem)]">
            Before you ask.
          </h2>
          <p className="mt-4 max-w-[22rem] text-sm leading-6 text-white/62 sm:text-[0.95rem] sm:leading-7">
            What owners usually want to know first, answered plainly. Anything else, call or email us
            directly.
          </p>
        </div>
      </div>

      <div className="border-t border-white/14 lg:col-span-8">
        {faqs.map((faq, index) => {
          const isOpen = active === index;

          return (
            <div key={faq.question} className="border-b border-white/14">
              <h3 className="text-[0.98rem] font-medium leading-snug tracking-[-0.015em] text-white/90 sm:text-[1.05rem] lg:text-[1.22rem] lg:tracking-[-0.02em]">
                <button
                  type="button"
                  id={`faq-question-${index}`}
                  onClick={() => setActive(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                  className="group flex min-h-[52px] w-full items-center gap-6 py-3 text-left lg:min-h-[84px] lg:py-6"
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
                  <p className="max-w-[62ch] pb-6 pr-6 text-sm leading-6 text-white/72 lg:-mt-1 lg:pb-9 lg:text-[1.04rem] lg:leading-[1.8]">{faq.answer}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
