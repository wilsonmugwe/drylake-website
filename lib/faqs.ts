/*
 * ALL Drylake FAQ content, in one place (brand story + FAQs workstream, 2026-10-16).
 *
 * Single source of truth: the /faq page, the homepage FAQ section, the FAQPage JSON-LD on both,
 * llms-full.txt and the tests all read FAQ_ITEMS. Visible text and structured data therefore
 * cannot drift apart (Google requires the markup to match what the page shows).
 *
 * Every answer states only what the implemented system does. Sources:
 *   consultations: lib/consultations/rules.ts + copy.ts (30 min, Mon/Tue/Fri 9:00 to 17:00 Perth,
 *     change or cancel online until 2 hours before);
 *   process:       components/sections/Approach.tsx (proposal first, no fixed timelines, no
 *     automatic IP transfer, hosting/maintenance/support only where the agreement says);
 *   privacy:       app/privacy/page.tsx (encrypted connections, role-based access, deletion on
 *     request unless the law requires keeping a record).
 * Rules (tested): no prices, no fixed timelines, no "guarantee", no promise of IP ownership, no
 * claim about clients, results, ratings or certifications, no em dashes.
 *
 * Bundle note: this module is large, so client components must NOT import it. The homepage FAQ
 * accordion (a client component) receives its five items as props from app/page.tsx instead.
 *
 * Google limits FAQ rich results to well-known government and health sites, so the markup is for
 * machine readers (search and AI answer engines), not a promise of a rich result.
 */
import { CONSULTATION_MINUTES, CUSTOMER_CHANGE_CUTOFF_MINUTES, HORIZON_DAYS, MIN_NOTICE_MINUTES } from "./consultations/rules.ts";
import { QUOTE_FIRST } from "./consultations/copy.ts";
import { BUSINESS_PHONE } from "./site.ts";

export type FaqCategoryId = "services" | "pricing-delivery" | "security-privacy" | "collaboration";

export type FaqItem = {
  id: string;
  category: FaqCategoryId;
  question: string;
  answer: string;
};

export const FAQ_CATEGORIES: ReadonlyArray<{ id: FaqCategoryId; title: string; intro: string }> = [
  { id: "services", title: "Services", intro: "What Drylake builds, and for whom." },
  { id: "pricing-delivery", title: "Pricing and delivery", intro: "Consultations, quotes, timing and what you own." },
  { id: "security-privacy", title: "Security and privacy", intro: "How information is protected and handled." },
  { id: "collaboration", title: "Collaboration", intro: "Working with Drylake on something new." },
];

const changeHours = CUSTOMER_CHANGE_CUTOFF_MINUTES / 60;
const noticeHours = MIN_NOTICE_MINUTES / 60;

export const FAQ_ITEMS: readonly FaqItem[] = [
  /* ---- Services ---- */
  {
    id: "svc-what",
    category: "services",
    question: "What does Drylake actually do?",
    answer:
      "We build websites, business software, automations and AI tools for Australian businesses. In practice that means things like a new website with a working enquiry form, a booking or job system to replace spreadsheets, automatic reminders for customers, or connecting your website to your accounting software. You do not need to be a technology company to work with us.",
  },
  {
    id: "svc-who",
    category: "services",
    question: "What kinds of businesses do you work with?",
    answer:
      "Australian businesses of any size or industry, from owner-run businesses to growing teams. We are based in Perth, Western Australia, and work with businesses across Perth and Australia, remotely and on site by arrangement.",
  },
  {
    id: "svc-unsure",
    category: "services",
    question: "Do we need to know exactly what we want built?",
    answer:
      "No. Tell us what is taking too long, being repeated or creating unnecessary work. We will explain the options in plain English, including when a simpler fix or an existing product is the better choice.",
  },
  {
    id: "svc-website",
    category: "services",
    question: "Do you build websites on their own?",
    answer:
      "Yes. We build standalone business websites and redesign existing ones. Where it helps, we also connect the website to the rest of your business, such as sending enquiries straight to the right person or system.",
  },
  {
    id: "svc-improve-site",
    category: "services",
    question: "Can you improve our existing website?",
    answer:
      "Yes. We can redesign an existing website, or improve the parts that are not working, such as how enquiries reach you. We start by looking at what the site needs to do for your business, then recommend whether a change or a rebuild makes more sense.",
  },
  {
    id: "svc-custom",
    category: "services",
    question: "Do you build custom software?",
    answer:
      "Yes. We build custom business software and apps, for example a booking or job system to replace spreadsheets. We deliver it in stages, most useful part first, and we will say so if an existing product would do the job better.",
  },
  {
    id: "svc-existing-systems",
    category: "services",
    question: "Can you work with software we already use?",
    answer:
      "Yes. Where practical, we prefer to keep useful systems in place. We can connect, extend or build around existing software where the platform supports the required integration.",
  },
  {
    id: "svc-automation",
    category: "services",
    question: "What kinds of automation can you build?",
    answer:
      "Typical examples are automatic reminders to customers, enquiries sent straight to the right person, information passed between systems so nobody types it twice, and approvals handled by email. Where an AI result affects a customer, money or a decision, a person reviews it.",
  },

  /* ---- Pricing and delivery ---- */
  {
    id: "price-website",
    category: "pricing-delivery",
    question: "How much does a website cost?",
    answer: `We do not publish a price list, because the right website depends on what your business needs. ${QUOTE_FIRST}`,
  },
  {
    id: "price-consultation",
    category: "pricing-delivery",
    question: "How do free consultations work?",
    answer: `A consultation is free, no obligation and lasts ${CONSULTATION_MINUTES} minutes, held by Microsoft Teams or phone. You can book Monday, Tuesday or Friday between 9:00 am and 5:00 pm Perth time, from ${noticeHours} hours ahead up to ${HORIZON_DAYS} days ahead. No account is needed. You can change or cancel online from your confirmation email until ${changeHours} hours before the start.`,
  },
  {
    id: "price-quote",
    category: "pricing-delivery",
    question: "How are projects quoted?",
    answer:
      "After we understand your business and recommend an approach, you receive a proposal that explains what we will build, what it will cost, the expected timeline and what is included. The agreed work is documented before we begin.",
  },
  {
    id: "price-after",
    category: "pricing-delivery",
    question: "What happens after the consultation?",
    answer:
      "If there is a fit, we work out what is needed and send you a proposal. Once the agreements are signed and the required initial payment is arranged, we set up your project and give you access to your Drylake Workspace. We then build the agreed solution with progress updates, test it, and launch and hand it over.",
  },
  {
    id: "price-length",
    category: "pricing-delivery",
    question: "How long does a project take?",
    answer:
      "It depends on the scope, so we do not quote a standard timeline. Every proposal states the expected timeline for your project before you agree to anything.",
  },
  {
    id: "price-ownership",
    category: "pricing-delivery",
    question: "Who owns the finished work?",
    answer:
      "Ownership, and any licence that applies, is set out in your proposal and agreement before work begins. We do not assume that ownership transfers automatically, so ask us about it early and we will explain what the agreement says in plain English.",
  },
  {
    id: "price-support",
    category: "pricing-delivery",
    question: "Do you provide ongoing support?",
    answer:
      "Only what your agreement includes. Any hosting, maintenance or ongoing support, and the support that comes with launch and handover, is set out in your proposal and agreement before work begins.",
  },
  {
    id: "start",
    category: "pricing-delivery",
    question: "How do we get started?",
    /* Booking route + the approved quote-first wording (brief, Task 8: no public price schedule). */
    answer: `Book a free 30-minute consultation online, or tell us about your project: call ${BUSINESS_PHONE.display}, email hello@drylake.com.au or use our contact form. ${QUOTE_FIRST}`,
  },

  /* ---- Security and privacy ---- */
  {
    id: "sec-protect",
    category: "security-privacy",
    question: "How is my information protected?",
    answer:
      "Connections to our website are encrypted in transit (HTTPS with TLS). Sign-in to Drylake Workspace is handled by a dedicated sign-in provider, access is role-based so each person sees only their own organisation, and administrative changes are recorded. No method of storing or sending information is completely secure, and our privacy policy explains what we do if a breach is likely to cause serious harm.",
  },
  {
    id: "sec-access",
    category: "security-privacy",
    question: "Who can access my information?",
    answer:
      "Only authorised Drylake administrators can use the administration area, and that is checked on the server for every request. A client organisation sees only its own information in the Workspace. We also use service providers to run our website and systems, and our privacy policy lists them. We do not sell personal information.",
  },
  {
    id: "sec-forms",
    category: "security-privacy",
    question: "What happens to what I send through your forms?",
    answer:
      "Your enquiry or booking details are used to reply to you, arrange your consultation and send the related emails. We do not sell personal information or use it for advertising. The forms use a check that confirms a submission comes from a person rather than an automated program.",
  },
  {
    id: "sec-delete",
    category: "security-privacy",
    question: "Can I ask you to delete my information?",
    answer:
      "Yes. Email hello@drylake.com.au with Privacy in the subject line and we will delete it unless the law requires us to keep it. For example, invoices and payment records are kept for as long as Australian tax and company record-keeping laws require. Our privacy policy has the details.",
  },
  {
    id: "sec-workspace",
    category: "security-privacy",
    question: "What is the Drylake Workspace?",
    answer:
      "It is a private online project area for clients, where you can see your project's progress, milestones, latest updates, shared documents and invoices, and pay invoices by card. You join by invitation and sign in securely.",
  },
  {
    id: "sec-bookings",
    category: "security-privacy",
    question: "How are consultation bookings managed?",
    answer: `You book online without an account and receive a confirmation email with a private link to change or cancel until ${changeHours} hours before the start. We send reminder emails about your booking. Booking details are used only to run the consultation and are handled under our privacy policy.`,
  },

  /* ---- Collaboration ---- */
  {
    id: "collab-work",
    category: "collaboration",
    question: "Can I collaborate with Drylake?",
    answer:
      "Yes, we are open to it. If you have an idea, a product or a business problem where working together makes sense, tell us about it and we will talk through whether there is a fit. Nothing is agreed until it is written down.",
  },
  {
    id: "collab-bronnie",
    category: "collaboration",
    question: "What is BRONNIE, and can I join a pilot?",
    answer:
      "BRONNIE is an AI-powered, multi-tenant business operations and automation platform that is in development. The initial focus is customer operations, such as enquiry handling, routing and appointment coordination. It is not production-ready and we do not claim otherwise. Pilots and early access are arranged by discussion: if your business might be a fit, use the collaboration form at drylake.com.au/collaborate.",
  },
  {
    id: "collab-integration",
    category: "collaboration",
    question: "Can I propose an integration or partnership?",
    answer:
      "Yes. If you run a product or service that could work with what Drylake builds, send us a short description of what you have in mind and what each side would do. We will reply to say whether it is something we can explore.",
  },
  {
    id: "collab-submit",
    category: "collaboration",
    question: "How do I submit a collaboration proposal?",
    answer:
      "Use the collaboration form at drylake.com.au/collaborate. Tell us who you are, what you would like to do together and why it could work, and we will reply. Sending a proposal is an enquiry, not a formal partnership, and it does not give access to any Drylake system.",
  },
];

/* The five questions kept on the homepage, in display order. */
export const HOMEPAGE_FAQ_IDS = ["svc-what", "svc-unsure", "svc-existing-systems", "svc-website", "start"] as const;

export const faqs: ReadonlyArray<{ question: string; answer: string }> = HOMEPAGE_FAQ_IDS.map((id) => {
  const item = FAQ_ITEMS.find((entry) => entry.id === id);
  if (!item) throw new Error(`HOMEPAGE_FAQ_IDS: unknown FAQ id ${id}`);
  return { question: item.question, answer: item.answer };
});

/* IDs the programme requires; tests/brand-story-faqs.test.mjs asserts each exists. */
export const REQUIRED_FAQ_IDS: readonly string[] = [
  "svc-what", "svc-who", "svc-improve-site", "svc-custom", "svc-existing-systems", "svc-automation",
  "price-website", "price-consultation", "price-quote", "price-after", "price-length", "price-ownership", "price-support",
  "sec-protect", "sec-access", "sec-forms", "sec-delete", "sec-workspace", "sec-bookings",
  "collab-work", "collab-bronnie", "collab-integration", "collab-submit",
];
