/*
 * Homepage FAQ content. Shared by the visible FAQ section and the FAQPage JSON-LD, so the
 * structured data can never describe answers the page does not show.
 */
import { BUSINESS_PHONE } from "./site.ts";

export const faqs: ReadonlyArray<{ question: string; answer: string }> = [
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
      `Start with a conversation. Call ${BUSINESS_PHONE.display}, email hello@drylake.com.au or use our contact form.`,
  },
];
