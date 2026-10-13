/*
 * Homepage FAQ content. Shared by the visible FAQ section and the FAQPage JSON-LD, so the
 * structured data can never describe answers the page does not show.
 */
import { BUSINESS_PHONE } from "./site.ts";

export const faqs: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: "What does Drylake actually do?",
    answer:
      "We build websites, business software, automations and AI tools for Australian businesses. In practice that means things like a new website with a working enquiry form, a booking or job system to replace spreadsheets, automatic reminders for customers, or connecting your website to your accounting software. You do not need to be a technology company to work with us.",
  },
  {
    question: "Do we need to know exactly what we want built?",
    answer:
      "No. Tell us what is taking too long, being repeated or creating unnecessary work. We will explain the options in plain English, including when a simpler fix or an existing product is the better choice.",
  },
  {
    question: "Can you work with software we already use?",
    answer:
      "Yes. Where practical, we prefer to keep useful systems in place. We can connect, extend or build around existing software where the platform supports the required integration.",
  },
  {
    question: "Do you build websites on their own?",
    answer:
      "Yes. We build standalone business websites and redesign existing ones. Where it helps, we also connect the website to the rest of your business, such as sending enquiries straight to the right person or system.",
  },
  {
    question: "How do we get started?",
    answer:
      `Tell us about your project. Call ${BUSINESS_PHONE.display}, email hello@drylake.com.au or use our contact form.`,
  },
];
