/*
 * ALL Drylake FAQ content, in one place (brand story + FAQs workstream; rewritten 2026-10-16 around
 * the questions customers actually ask, see docs/seo/2026-10-16-faq-search-intent.md).
 *
 * Single source of truth: the /faq page, the homepage FAQ section, the FAQPage JSON-LD on both,
 * llms-full.txt and the tests all read FAQ_ITEMS. Visible text and structured data therefore
 * cannot drift apart (Google requires the markup to match what the page shows).
 *
 * Answer pattern: a direct one or two sentence answer, a short useful explanation, then (where
 * relevant) contextual internal links in `links`. The links render under the answer and are NOT
 * part of the FAQPage answer text. Commercial detail lives on the service pages
 * (lib/discovery/services.ts); these answers are short summaries that link to them, and a test
 * fails if an answer is a near-duplicate of a service-page or location-page FAQ answer.
 *
 * Every answer states only what the implemented system does. Sources:
 *   consultations: lib/consultations/rules.ts + copy.ts (30 min, Mon/Tue/Fri 9:00 to 17:00 Perth,
 *     change or cancel online until 2 hours before; QUOTE_FIRST is the approved pricing wording);
 *   process:       components/sections/Approach.tsx (proposal first, no fixed timelines, no
 *     automatic IP transfer, hosting/maintenance/support only where the agreement says);
 *   privacy:       app/privacy/page.tsx + app/security-privacy/page.tsx;
 *   service area:  app/perth/page.tsx (based in Perth, Perth and WA, remote Australia-wide);
 *   BRONNIE:       owner statement 2026-10-16 (lib/collaboration/copy.ts).
 * Rules (tested): no prices, no fixed timelines, no ranking or security promises, no promise of IP
 * ownership, no claim about customers, results, ratings or certifications, no em dashes.
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

export type FaqCategoryId = "websites" | "software" | "ai-automation" | "working-with-drylake" | "security-privacy";

export type FaqLink = { label: string; href: string };

export type FaqItem = {
  id: string;
  category: FaqCategoryId;
  question: string;
  answer: string;
  /* Contextual internal links, shown under the answer. Optional; not part of the JSON-LD answer. */
  links?: readonly FaqLink[];
};

export const FAQ_CATEGORIES: ReadonlyArray<{ id: FaqCategoryId; title: string; intro: string }> = [
  { id: "websites", title: "Websites", intro: "Cost, timing, redesigns, online stores and search." },
  { id: "software", title: "Custom software and systems", intro: "Custom builds, spreadsheets, connections and portals." },
  { id: "ai-automation", title: "AI and automation", intro: "What can be automated, and how AI is handled." },
  { id: "working-with-drylake", title: "Working with Drylake", intro: "Who we work with, consultations, quotes and collaboration." },
  { id: "security-privacy", title: "Security and privacy", intro: "How information is protected and handled." },
];

const changeHours = CUSTOMER_CHANGE_CUTOFF_MINUTES / 60;
const noticeHours = MIN_NOTICE_MINUTES / 60;

const SVC = {
  web: { label: "Websites and web development", href: "/services/web-development" },
  software: { label: "Custom software development", href: "/services/custom-software-development" },
  automation: { label: "Business automation", href: "/services/business-automation" },
  integration: { label: "Connecting your systems", href: "/services/systems-integration" },
  ai: { label: "AI for business", href: "/services/ai-automation" },
} as const;
const CONSULT: FaqLink = { label: "Book a free consultation", href: "/consultation" };
const PERTH: FaqLink = { label: "Drylake in Perth and Western Australia", href: "/perth" };
const SECURITY: FaqLink = { label: "Security and privacy", href: "/security-privacy" };

export const FAQ_ITEMS: readonly FaqItem[] = [
  /* ---- Websites ---- */
  {
    id: "web-cost",
    category: "websites",
    question: "How much does a business website cost in Perth?",
    answer: `It depends on what the site has to do, so Drylake does not publish a price list. ${QUOTE_FIRST} The biggest things that change the cost are the number of pages, whether the site takes bookings, payments or enquiries into other systems, and who writes the content.`,
    links: [SVC.web, CONSULT],
  },
  {
    id: "web-time",
    category: "websites",
    question: "How long does it take to build a professional website?",
    answer:
      "It depends on the scope, so we do not quote a standard timeline. Every proposal states the expected timeline for your project before you agree to anything. Timing is driven by how many pages and features are needed, how quickly content and decisions come back, and what the site has to connect to.",
    links: [SVC.web],
  },
  {
    id: "web-redesign",
    category: "websites",
    question: "Can you redesign our website without losing our content or Google visibility?",
    answer:
      "Yes, protecting both is part of planning a redesign. We list the pages you have and the ones that bring in enquiries, carry over the content that still works, and keep or redirect old page addresses. Nobody can promise a search ranking, but a careful move avoids the losses that are avoidable.",
    links: [SVC.web],
  },
  {
    id: "web-wordpress",
    category: "websites",
    question: "Can you move our website away from WordPress?",
    answer:
      "Yes, if there is a good reason to. If your WordPress site works well we will say so and leave it alone. If it is slow, hard to maintain or limiting what you can do, we can rebuild it and bring across the content that matters. What happens to your content, domain and old addresses is agreed before work starts.",
    links: [SVC.web],
  },
  {
    id: "web-store",
    category: "websites",
    question: "Can you build an online store with payments and inventory?",
    answer:
      "Yes, where it suits the business. A store takes payments through a payment provider and can be connected to stock or accounting software that supports it. For a small catalogue an existing store platform may fit better than a custom build, and we will tell you which.",
    links: [SVC.web, SVC.integration],
  },
  {
    id: "web-mobile",
    category: "websites",
    question: "Will the website work properly on phones?",
    answer:
      "Yes. Drylake builds sites to work on phones, tablets and computers, and checks key pages at small screen sizes before launch.",
    links: [SVC.web],
  },
  {
    id: "web-google",
    category: "websites",
    question: "Will our website appear in Google Search?",
    answer:
      "We build sites so search engines can find and read them, but nobody can promise a ranking or position. That means crawlable pages, page titles and descriptions, a sitemap, Google Search Console set up and, for local businesses, pages that say where you work. Results then depend on competition, content and time.",
    links: [SVC.web, PERTH],
  },
  {
    id: "web-after",
    category: "websites",
    question: "What happens after the website launches?",
    answer:
      "Launch is a handover, not the end. Who owns the finished work, and any hosting, maintenance or ongoing support, is set out in your proposal and agreement before work begins. We do not assume ownership transfers automatically, so ask about it early and we will explain what the agreement says in plain English.",
    links: [CONSULT],
  },

  /* ---- Custom software and systems ---- */
  {
    id: "sw-cost",
    category: "software",
    question: "How much does custom software cost in Australia?",
    answer: `It depends on what the software must do, who uses it and what it connects to, so each project is quoted after we have talked it through. ${QUOTE_FIRST} Building in stages, most useful part first, lets you see value early and decide what comes next.`,
    links: [SVC.software, CONSULT],
  },
  {
    id: "sw-spreadsheets",
    category: "software",
    question: "Should we build custom software or keep using spreadsheets?",
    answer:
      "Spreadsheets are fine while the work is simple. Custom software starts to make sense when several people edit the same data, details are typed in twice, mistakes cost money, or you need reminders, permissions or reporting. If a spreadsheet or an existing product is the better answer, we will say so.",
    links: [SVC.software],
  },
  {
    id: "sw-connect",
    category: "software",
    question: "Can you connect the software and databases we already use?",
    answer:
      "Usually, if the platform offers a way in such as an integration, export or connector. If one does not, we find that out early and tell you before anything is built.",
    links: [SVC.integration],
  },
  {
    id: "sw-admin",
    category: "software",
    question: "Can you replace manual admin with automated workflows?",
    answer:
      "Yes. The usual candidates are jobs done over and over or typed into more than one place, such as reminders, approvals, enquiry routing and passing details between systems. We map where the time goes first, then automate only the steps worth automating.",
    links: [SVC.automation],
  },
  {
    id: "sw-portals",
    category: "software",
    question: "Can you build customer portals, booking systems or internal dashboards?",
    answer:
      "Yes, these are typical custom builds: a private area where customers see their jobs, documents or invoices, an online booking system, or a dashboard that brings your key numbers into one place. The right design depends on who uses it and what it has to connect to.",
    links: [SVC.software],
  },
  {
    id: "sw-improve",
    category: "software",
    question: "Can you improve our current system without replacing everything?",
    answer:
      "Often, yes. We look at what the system does well and fix the weakest part, such as a missing connection, a slow manual step or an outdated screen. Replacement is only recommended when the system itself is the cause of the problem.",
    links: [SVC.software, SVC.integration],
  },

  /* ---- AI and automation ---- */
  {
    id: "ai-help",
    category: "ai-automation",
    question: "How can AI and automation help a small business?",
    answer:
      "They take over repetitive work so your people can spend time on what only they can do, such as sorting enquiries, drafting replies for a person to review, pulling details out of documents and keeping systems in step. Small businesses can benefit as much as large ones, and we suggest AI only where it improves a real task.",
    links: [SVC.ai, SVC.automation],
  },
  {
    id: "ai-which",
    category: "ai-automation",
    question: "Which business processes can be automated?",
    answer:
      "Work that follows clear rules and repeats: reminders, confirmations, approvals, data entry between systems, report preparation and first-pass sorting of enquiries. Where a result affects a customer, money or a decision, a person reviews it before it goes out.",
    links: [SVC.automation],
  },
  {
    id: "ai-add",
    category: "ai-automation",
    question: "Can you add AI to our existing website or system?",
    answer:
      "Where the website or system allows it, yes. An AI feature such as enquiry handling, document processing or search is added to the existing workflow rather than replacing software that still works. Before building, we check what information the feature would see.",
    links: [SVC.ai],
  },
  {
    id: "ai-privacy",
    category: "ai-automation",
    question: "How is customer information protected when AI is used?",
    answer:
      "This website currently sends no personal information to AI services. For AI in client projects, the approach is designed per project: share only the data the task needs, keep a person reviewing important results, and use Australian-hosted options where they are available. What applies to your project is set out in your proposal.",
    links: [SECURITY, SVC.ai],
  },
  {
    id: "collab-bronnie",
    category: "ai-automation",
    question: "What is BRONNIE and how is Drylake developing it?",
    answer:
      "BRONNIE is an AI-powered platform being developed by Drylake. Today, no BRONNIE feature is generally available. In development is a multi-tenant platform whose initial focus is customer operations: intelligent enquiry handling, routing and appointment coordination. Pilots and early access are planned and arranged by discussion; if your business might be a fit, use the collaboration form at drylake.com.au/collaborate.",
    links: [{ label: "Collaborate with Drylake", href: "/collaborate" }],
  },

  /* ---- Working with Drylake ---- */
  {
    id: "svc-what",
    category: "working-with-drylake",
    question: "What does Drylake actually do?",
    answer:
      "We build websites, business software, automations and AI tools for Australian businesses. That includes standalone business websites, a booking or job system to replace spreadsheets, automatic customer reminders, and connecting your website to your accounting software. You do not need to be a technology company to work with us.",
    links: [{ label: "Our services", href: "/services" }],
  },
  {
    id: "wk-who",
    category: "working-with-drylake",
    question: "Do you work with small businesses and startups, and only in Perth?",
    answer:
      "Yes to small businesses and startups. Drylake is based in Perth, works with businesses across Perth and Western Australia, and works remotely with businesses elsewhere in Australia. You do not need a technical brief to begin, only the problem you want solved.",
    links: [PERTH],
  },
  {
    id: "price-consultation",
    category: "working-with-drylake",
    question: "What happens in the free consultation?",
    answer: `You tell us what is slowing the business down, we ask questions and say plainly what we would suggest, including when the answer is a small change or an existing product. It is free, no obligation and lasts ${CONSULTATION_MINUTES} minutes, held by Microsoft Teams or phone. You can book Monday, Tuesday or Friday between 9:00 am and 5:00 pm Perth time, from ${noticeHours} hours ahead up to ${HORIZON_DAYS} days ahead. No account is needed, and you can change or cancel online until ${changeHours} hours before the start.`,
    links: [CONSULT],
  },
  {
    id: "wk-decide",
    category: "working-with-drylake",
    question: "How does Drylake decide what technology a business needs?",
    answer:
      "We start with the problem, not the technology. We look at how the work really happens, name what is slowing it down, then recommend the simplest fix, which might be a small change, an existing product, a connection between systems or something built. Your proposal explains the recommendation and the reasons for it.",
    links: [{ label: "Common business problems and which service solves them", href: "/solutions" }],
  },
  {
    id: "price-quote",
    category: "working-with-drylake",
    question: "What happens after the consultation, and how are projects quoted?",
    answer:
      "If there is a fit, you receive a proposal explaining what we will build, what it will cost, the expected timeline and what is included. Once the agreements are signed and the required initial payment is arranged, we set up your project and your Drylake Workspace, a private online area showing progress, milestones, updates, shared documents and invoices.",
  },
  {
    id: "start",
    category: "working-with-drylake",
    question: "How do we get started?",
    /* Booking route + the approved quote-first wording (brief, Task 8: no public price schedule). */
    answer: `Book a free 30-minute consultation online, or tell us about your project: call ${BUSINESS_PHONE.display}, email hello@drylake.com.au or use our contact form. ${QUOTE_FIRST}`,
    links: [CONSULT, { label: "Contact Drylake", href: "/contact" }],
  },
  {
    id: "collab-work",
    category: "working-with-drylake",
    question: "Can we collaborate with Drylake on a new technology project?",
    answer:
      "Yes, we are open to ideas, pilots, integrations and partnerships. Use the collaboration form at drylake.com.au/collaborate to tell us who you are, what you would like to do together and why it could work. A proposal is an enquiry, not a formal partnership, and it does not give access to any Drylake system. Nothing is agreed until it is written down.",
    links: [{ label: "Collaborate with Drylake", href: "/collaborate" }],
  },

  /* ---- Security and privacy ---- */
  {
    id: "sec-protect",
    category: "security-privacy",
    question: "How is my information protected, and who can see it?",
    answer:
      "Connections to our website are encrypted in transit (HTTPS with TLS). Only authorised Drylake administrators can use the administration area, checked on the server for every request, and a client organisation sees only its own information in the Workspace. We use service providers to run our systems, and they are listed on our security and privacy page. No method of storing or sending information is completely secure, and we do not sell personal information.",
    links: [SECURITY],
  },
  {
    id: "sec-data",
    category: "security-privacy",
    question: "What happens to what I send through your forms, and can I ask you to delete it?",
    answer:
      "Your enquiry or booking details are used to reply to you, arrange your consultation and send the related emails, never for advertising. You can ask for deletion by emailing hello@drylake.com.au with Privacy in the subject line, and we will delete it unless the law requires us to keep it. For example, invoices and payment records are kept for as long as Australian tax and company record-keeping laws require.",
    links: [SECURITY, { label: "Privacy policy", href: "/privacy" }],
  },
];

/* The five questions kept on the homepage, in display order. */
export const HOMEPAGE_FAQ_IDS = ["svc-what", "web-cost", "sw-connect", "price-consultation", "start"] as const;

export const faqs: ReadonlyArray<{ question: string; answer: string }> = HOMEPAGE_FAQ_IDS.map((id) => {
  const item = FAQ_ITEMS.find((entry) => entry.id === id);
  if (!item) throw new Error(`HOMEPAGE_FAQ_IDS: unknown FAQ id ${id}`);
  return { question: item.question, answer: item.answer };
});

/* IDs the programme requires; tests/brand-story-faqs.test.mjs asserts each exists. */
export const REQUIRED_FAQ_IDS: readonly string[] = [
  "svc-what", "start", "price-consultation", "price-quote", "collab-bronnie", "collab-work",
  "web-cost", "web-time", "web-redesign", "web-wordpress", "web-store", "web-mobile", "web-google", "web-after",
  "sw-cost", "sw-spreadsheets", "sw-connect", "sw-admin", "sw-portals", "sw-improve",
  "ai-help", "ai-which", "ai-add", "ai-privacy", "wk-who", "wk-decide", "sec-protect", "sec-data",
];
