import { ArrowUpRight, Plus } from "lucide-react";
import Link from "next/link";

import Container from "@/components/ui/Container";
import PrimaryCta from "@/components/ui/PrimaryCta";
import { TAGLINE } from "@/lib/brand-story";
import { faqs } from "@/lib/faqs";
import { HOME_CLOSE, HOME_QUESTIONS } from "@/lib/home/copy";
import { CONTACT_PATH, PRIMARY_CTA, PRIMARY_CTA_NOTE } from "@/lib/navigation/site-nav";

/*
 * Questions: the five homepage FAQs (HOMEPAGE_FAQ_IDS) as large questions with native
 * disclosure. Answers stay in the server HTML, so the homepage FAQPage schema (app/page.tsx)
 * still matches content on the page; they just are not shown until asked for.
 */
export function HomeQuestions() {
  return (
    <section id="faq" aria-labelledby="questions" className="eg-crust scroll-mt-24">
      <Container className="grid gap-10 py-20 sm:py-28 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <h2 id="questions" className="eg-h2">{HOME_QUESTIONS.eyebrow}</h2>
          <Link href="/faq" className="eg-link mt-8 inline-flex min-h-[44px] items-center gap-2">
            {HOME_QUESTIONS.more}
            <ArrowUpRight aria-hidden="true" size={16} />
          </Link>
        </div>
        <div className="eg-rule-strong lg:col-span-8">
          {faqs.map((item) => (
            <details key={item.question} className="eg-faq group">
              <summary className="eg-faq-q">
                <span className="eg-h3">{item.question}</span>
                <Plus aria-hidden="true" size={22} className="eg-faq-icon shrink-0" />
              </summary>
              <p className="eg-muted max-w-[60ch] pb-7 text-[1.0625rem] leading-7">{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* The close: the second line of the philosophy, the booking, and the message route. */
export function HomeClose() {
  return (
    <section aria-labelledby="close" className="eg-signal">
      <Container className="flex flex-col gap-10 py-24 sm:py-32 lg:py-36">
        <h2 id="close" className="eg-poster">
          {TAGLINE.split(". ").map((part, i, all) => (
            <span key={part} className="block">
              {i < all.length - 1 ? `${part}.` : part}{" "}
            </span>
          ))}
        </h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* The canonical white primary CTA (D28; tests/brand-system.test.mjs), on the signal band. */}
          <PrimaryCta href={PRIMARY_CTA.href} size="large" location="closing">
            {PRIMARY_CTA.label}
          </PrimaryCta>
          <Link href={CONTACT_PATH} className="eg-pill-outline-dark">
            {HOME_CLOSE.secondary}
          </Link>
        </div>
        <p className="max-w-[60ch] text-[0.95rem] leading-6">{PRIMARY_CTA_NOTE}</p>
      </Container>
    </section>
  );
}
