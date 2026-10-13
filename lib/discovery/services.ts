/*
 * Drylake's service lines: the ONE source for /services/*, the Service structured data,
 * the sitemap (via PUBLIC_PAGES in entity.ts), llms.txt and the internal links.
 * PURE: no framework imports (tests import it directly).
 *
 * Content rules (PR "SEO, Search Visibility & Local Discovery", 2026-10-07):
 *   - Written from Drylake's existing positioning (homepage Solutions, SmallThings,
 *     Capabilities, Integrations and FAQ copy). No client names, results, statistics,
 *     testimonials, awards, prices or credentials. Nothing here claims work Drylake has done
 *     for a named business.
 *   - Every page must be useful to a real buyer: the problem, what can be built, when it is
 *     and is not a fit, how the work is approached and what makes it dependable.
 *   - No em dashes (portfolio rule for client-facing copy). "Perth" only where it is the point.
 *   - Plain English first (2026-10-13): the headline and intro say what the service IS in words a
 *     non-technical owner uses; technical detail stays further down for those who want it.
 */

import type { ValueExampleKey } from "../value-examples.ts";

export type ServiceFaq = { question: string; answer: string };
export type ServicePoint = { title: string; text: string };

export type ServiceSlug =
  | "custom-software-development"
  | "business-automation"
  | "systems-integration"
  | "ai-automation"
  | "web-development";

export type Service = {
  slug: ServiceSlug;
  path: string;
  /* Short name used in navigation, links and Service.name. */
  name: string;
  /* schema.org serviceType. */
  serviceType: string;
  /* <title>, used verbatim. */
  title: string;
  /* Meta description, 140 to 160 characters (tested). */
  description: string;
  /* One line for service lists and link cards. */
  summary: string;
  headline: string;
  /* First visible paragraph: what the service is, in plain English (2026-10-13 messaging rule). */
  intro: string;
  /* Illustrative time example shown under the intro (lib/value-examples.ts; never a result). */
  valueExample: ValueExampleKey;
  problemHeading: string;
  problem: readonly string[];
  builds: readonly string[];
  useCases: readonly ServicePoint[];
  approach: readonly ServicePoint[];
  productionHeading: string;
  production: readonly string[];
  faqs: readonly ServiceFaq[];
  related: readonly ServiceSlug[];
};

export const SERVICES_PATH = "/services";

const path = (slug: ServiceSlug) => `${SERVICES_PATH}/${slug}`;

export const SERVICES: readonly Service[] = [
  {
    slug: "custom-software-development",
    path: path("custom-software-development"),
    name: "Custom software & apps",
    serviceType: "Custom software development",
    title: "Custom Software Development for Australian Businesses | Drylake",
    description:
      "Drylake builds custom software for Australian businesses: customer portals, booking systems, staff dashboards and job tracking that replace spreadsheets.",
    summary:
      "Customer portals, booking systems, staff dashboards and job tracking, built for the way your business works.",
    headline: "Software built for the way your business works.",
    intro:
      "Still running the business through spreadsheets, emails and paperwork? We build software made for your business, such as customer portals, booking systems, staff dashboards and job tracking, so your information sits in one organised place and everyday work is easier.",
    valueExample: "searching",
    problemHeading: "When the spreadsheet has become the system.",
    problem: [
      "Most businesses run on a mix of packaged software, spreadsheets and email. That works until an important process lives in a file only a few people understand, information is copied between tools, and every change makes it harder to manage, share or scale.",
      "Custom software makes sense when the way you work is part of what makes the business work, and packaged products force the team to work around them. It does not make sense when a good product already does the job. Part of our work is telling you which situation you are in.",
    ],
    builds: [
      "Internal platforms that replace spreadsheets and manual tracking",
      "Client portals where customers see their projects, documents and invoices",
      "Staff portals and workflow systems for approvals, tasks and records",
      "Web and mobile applications built for a specific operation",
      "Admin tools for the records and decisions the business runs on",
    ],
    useCases: [
      {
        title: "Replacing a critical spreadsheet",
        text: "A process that has outgrown a shared file and needs proper records, permissions and history that a spreadsheet cannot hold safely.",
      },
      {
        title: "A portal for your customers",
        text: "One place for customers to see their projects, documents, updates and invoices, instead of asking for them by email.",
      },
      {
        title: "A system for your team",
        text: "Approvals, tasks and records handled in one place, built around the steps your team already follows.",
      },
      {
        title: "Software for a specific operation",
        text: "A web or mobile tool for work that general-purpose software does not cover well.",
      },
    ],
    approach: [
      {
        title: "Map the workflow first",
        text: "We learn who uses the process, what information moves through it and where it breaks before deciding what to build.",
      },
      {
        title: "Build in stages",
        text: "We deliver the most useful part first, in manageable stages, so the business can use it and shape what comes next.",
      },
      {
        title: "Keep what still works",
        text: "Where existing software still does its job, we connect to it or build around it rather than replace it.",
      },
    ],
    productionHeading: "Built to be relied on.",
    production: [
      "Sign-in and permissions, so each person sees and changes only what they should",
      "Validation that stops bad data at the point it is entered",
      "A history of changes for the records that matter",
      "Monitoring, backups and recovery arrangements tailored to your project and agreed scope",
      "Hosting and data location chosen deliberately, including Australian regions where it matters",
    ],
    faqs: [
      {
        question: "Does Drylake build custom client portals?",
        answer:
          "Yes. Drylake builds secure client portals that give customers one place to see their projects, documents, updates and invoices, connected to the systems the business already runs.",
      },
      {
        question: "Do we need a technical specification before we start?",
        answer:
          "No. Start with the business problem. Drylake works through the workflow with you and recommends whether custom software, an existing product or an integration is the better fit.",
      },
      {
        question: "Does Drylake build custom software in Perth?",
        answer:
          "Yes. Drylake is based in Perth and designs and builds custom software, portals and web applications for businesses in Perth, across Western Australia and Australia-wide.",
      },
      {
        question: "Can custom software work alongside the software we already use?",
        answer:
          "Usually, yes. Where the existing platforms support integration, new software can read from and write to them, so the business does not have to replace systems that still do their job.",
      },
    ],
    related: ["systems-integration", "business-automation", "web-development"],
  },
  {
    slug: "business-automation",
    path: path("business-automation"),
    name: "Business automation",
    serviceType: "Business process automation",
    title: "Business Automation and Workflow Automation | Drylake",
    description:
      "Drylake sets up business automation for Australian businesses: appointment reminders, enquiry follow-ups, recurring reports and routine paperwork, done for you.",
    summary:
      "Reminders, follow-ups, recurring reports and routine paperwork handled by software, so less depends on someone remembering.",
    headline: "Spend less time on repetitive tasks.",
    intro:
      "Automation means setting up software to do routine tasks for you, such as sending appointment reminders, following up enquiries, moving information between systems, preparing recurring reports and processing routine documents. Your team spends less time on repeated work, and fewer things depend on someone remembering.",
    valueExample: "reminders",
    problemHeading: "Too much depends on manual follow-up.",
    problem: [
      "Routine work often still relies on emails, reminders and somebody remembering what happens next. When that person is busy or away, work stalls, and nobody can easily see where things are up to.",
      "Automation is worth doing where a step is repeated often, follows clear rules and costs time every time it is done by hand. Steps that need judgement usually stay with people, with the system doing the chasing and the record keeping.",
    ],
    builds: [
      "Workflow automation for routine, repeated steps",
      "Approval flows with a clear record of who approved what and when",
      "Notifications and reminders triggered by real events, not memory",
      "Forms and bookings that put information straight into the right system",
      "Scheduled tasks and reports that run without someone starting them",
    ],
    useCases: [
      {
        title: "Enquiry to job",
        text: "An enquiry, booking or order that creates the right records and tells the right people, without being retyped.",
      },
      {
        title: "Approvals",
        text: "Requests that route to the right person, record the decision and move on, instead of waiting in an inbox.",
      },
      {
        title: "Documents",
        text: "Paperwork that is collected, named, filed and linked to the right record automatically.",
      },
      {
        title: "Follow-ups",
        text: "Reminders and next steps that happen on time because the system knows what is due.",
      },
    ],
    approach: [
      {
        title: "Find where time is lost",
        text: "We map the steps that are repeated most often or re-keyed between systems before recommending what to automate.",
      },
      {
        title: "Automate the clear rules",
        text: "We automate the predictable parts and leave decisions that need judgement with people, supported by better information.",
      },
      {
        title: "Make it visible",
        text: "Every automation leaves a record, so the team can see what ran, what is waiting and what needs attention.",
      },
    ],
    productionHeading: "Automation that fails safely.",
    production: [
      "When a step fails, someone is told, rather than the work silently stopping",
      "Logs that show what ran, when and with what result",
      "Permissions on who can start, change or switch off an automation",
      "A manual fallback for every step the business cannot do without",
    ],
    faqs: [
      {
        question: "Does Drylake provide business automation in Perth?",
        answer:
          "Yes. Drylake is based in Perth and automates routine business processes, approvals and notifications for businesses in Perth and across Australia.",
      },
      {
        question: "What should we automate first?",
        answer:
          "Usually the step that is repeated most often or re-keyed between systems. Drylake starts by mapping where time is lost before recommending what to automate.",
      },
      {
        question: "Do we have to change our software to automate?",
        answer:
          "Usually not. Where the platforms you use support it, automation can work with them as they are. If a system cannot be automated reliably, we will say so early.",
      },
    ],
    related: ["systems-integration", "ai-automation", "custom-software-development"],
  },
  {
    slug: "systems-integration",
    path: path("systems-integration"),
    name: "Connecting your systems",
    serviceType: "Systems integration",
    title: "Systems Integration: Connect Your Business Tools | Drylake",
    description:
      "Drylake connects the business tools you already use, such as your website, bookings, CRM and accounting software, so you stop entering the same details twice.",
    summary:
      "The tools you already use, connected, so the same information does not have to be typed in twice.",
    headline: "Get your business tools working together.",
    intro:
      "Using several tools that don't talk to each other? We connect them: your website to your customer list, your booking system to your calendar, your business software to your accounting. Information is entered once and appears where it is needed, and you keep the software that already works. This is sometimes called systems integration.",
    valueExample: "copying",
    problemHeading: "Our systems don't talk to each other.",
    problem: [
      "Information spread across platforms creates gaps, delays and manual work. The team copies details from one system to another, records drift out of step, and nobody is sure which version is right.",
      "An integration is often a better answer than replacing software. If each system does its own job well, connecting them can remove the double handling without the cost and disruption of moving the business onto something new.",
    ],
    builds: [
      "Integrations between accounting, CRM, payment and operational systems",
      "Customer and job details kept the same in every system",
      "Custom connections (APIs) where no ready-made link exists",
      "Migration from platforms the business has outgrown",
      "Reporting that brings information from several systems together",
    ],
    useCases: [
      {
        title: "Accounting and operations in step",
        text: "Jobs, invoices and payments that flow into accounting software such as Xero or MYOB without being entered twice.",
      },
      {
        title: "One customer record",
        text: "Customer details kept consistent across the CRM, the website and the systems the team works in.",
      },
      {
        title: "Payments that update the workflow",
        text: "A payment that marks the invoice paid, updates the job and lets the right person know.",
      },
      {
        title: "Moving off an old platform",
        text: "Accounts, data and workflows moved from software that no longer fits, while protecting the processes that depend on them.",
      },
    ],
    approach: [
      {
        title: "Decide which system owns each record",
        text: "Before connecting anything, we agree where each piece of information is created and which system is the source of truth.",
      },
      {
        title: "Use supported interfaces",
        text: "We build on the platforms' published APIs and supported integrations, so connections are less likely to break when the software updates.",
      },
      {
        title: "Plan for failure",
        text: "Connected systems go down and change. Integrations retry, alert and recover rather than losing information quietly.",
      },
    ],
    productionHeading: "Connections you can trust.",
    production: [
      "Retries and alerts when a connected system is unavailable",
      "Credentials stored securely and limited to what each integration needs",
      "Validation where information crosses from one system to another",
      "Logs that show what moved between systems and when",
    ],
    faqs: [
      {
        question: "Can Drylake connect software we already use?",
        answer:
          "Yes, where the platform supports the required integration. Drylake prefers to keep useful systems in place and connect, extend or build around them.",
      },
      {
        question: "What if one of our systems has no integration?",
        answer:
          "If a platform offers no API, export or supported connector, the options are limited and sometimes the right answer is to replace it. Drylake checks this early and tells you before any build starts.",
      },
      {
        question: "Is connecting systems better than replacing them?",
        answer:
          "Often, but not always. If each system does its job well, connecting them is usually faster and less disruptive. If a system is the cause of the problem, replacing it may be the better investment.",
      },
    ],
    related: ["business-automation", "custom-software-development", "ai-automation"],
  },
  {
    slug: "ai-automation",
    path: path("ai-automation"),
    name: "AI for business",
    // Structured data only (not visible copy): the phrase buyers search, backed by this page's FAQ.
    serviceType: "AI integration and automation",
    title: "AI Automation for Everyday Business Admin | Drylake",
    description:
      "Drylake builds practical AI tools for Australian businesses: answering common questions, searching documents and drafting replies, with people in control.",
    summary:
      "AI tools that answer common questions, search your documents, draft replies and sort enquiries, with a person checking what matters.",
    headline: "Use AI to help with the repetitive work.",
    intro:
      "We build practical AI tools that help with everyday work: answering common customer questions, finding information in your documents, preparing draft emails and replies, and sorting enquiries so the urgent ones are seen first. AI does the first pass; people stay in control of anything that affects a customer, money or a decision.",
    valueExample: "sorting",
    problemHeading: "Useful AI is part of a workflow.",
    problem: [
      "AI is good at work that used to need a person to read: incoming documents, long emails, notes and records. It can draft, summarise, classify and answer questions from information the business already holds.",
      "It is a poor fit where an answer must always be exact and a simple rule would do. Many problems are better solved with conventional software, automation or an integration, and we will say so when that is the case.",
    ],
    builds: [
      "Document processing that reads and routes incoming paperwork",
      "Drafting, summarising and sorting routine messages for a person to check",
      "Internal tools that answer questions from the business's own records",
      "Highlighting what needs attention first",
      "Review steps, so a person checks results before they matter",
    ],
    useCases: [
      {
        title: "Incoming documents",
        text: "Forms, invoices and attachments read, checked and sent to the right place, with anything unclear passed to a person.",
      },
      {
        title: "Drafting and summarising",
        text: "First drafts of routine replies, reports and notes, prepared for a person to review and send.",
      },
      {
        title: "Questions about your own records",
        text: "An internal tool that finds answers in the business's policies, procedures and documents.",
      },
      {
        title: "Triage",
        text: "Requests sorted by type and urgency, so the team sees what needs attention first.",
      },
    ],
    approach: [
      {
        title: "Start with the workflow, not the model",
        text: "We work out where reading, writing or sorting is costing time, then decide whether AI is the right tool for that step.",
      },
      {
        title: "Test on real examples",
        text: "We check results against the kind of material the business actually handles before anything is relied on.",
      },
      {
        title: "Keep a person in the loop",
        text: "Where a result affects a customer, money or a decision, a person reviews it. The system makes that review quick.",
      },
    ],
    productionHeading: "AI with guard rails.",
    production: [
      "Clear limits on what information the AI can see and act on",
      "The AI provider and where data is processed considered up front",
      "A record of inputs and outputs, so results can be checked later",
      "A sensible fallback when the AI is unsure or unavailable",
    ],
    faqs: [
      {
        question: "Does Drylake build AI solutions for Perth businesses?",
        answer:
          "Yes. Drylake is a Perth technology company that builds applied AI into business workflows, such as document processing, AI-assisted workflows and internal tools.",
      },
      {
        question: "Does every project need AI?",
        answer:
          "No. Drylake recommends AI only where it improves a real workflow. Many problems are better solved with conventional software, automation or an integration.",
      },
      {
        question: "Can AI features work with the systems we already use?",
        answer:
          "Where the systems support integration, yes. Drylake builds AI into the existing workflow rather than replacing software that still does its job.",
      },
    ],
    related: ["business-automation", "custom-software-development", "systems-integration"],
  },
  {
    slug: "web-development",
    path: path("web-development"),
    name: "Websites & web development",
    serviceType: "Website and web application development",
    title: "Website Development for Australian Businesses | Drylake",
    description:
      "Drylake builds professional business websites in Perth and across Australia: new sites, redesigns, enquiry and booking forms, connected to how you work.",
    summary:
      "Professional business websites, redesigns and online enquiry and booking forms that make it easy for customers to get in touch.",
    headline: "Websites that help customers find you and get in touch.",
    intro:
      "We build professional websites for Australian businesses: new sites, redesigns of existing ones, online enquiry and booking forms, and customer-facing features such as secure log-ins. Customers understand what you offer and find it easy to contact you, and where it helps, enquiries go straight to the right person or system.",
    valueExample: "enquiries",
    problemHeading: "The website is where the work starts.",
    problem: [
      "For many customers the website is the first place they check. If it is slow, hard to use or unclear about what the business does, they leave before they ever make contact.",
      "A website is also where enquiries, bookings and payments begin. When those land in an inbox and are then retyped into other systems, the website is creating work instead of removing it.",
    ],
    builds: [
      "Business websites designed around what customers need to understand",
      "Forms and bookings that send information to the right place in the business",
      "Online payment flows connected to the processes around them",
      "Client portals and secure sign-in areas",
      "Fast pages, set up properly so search engines can find and list them",
      "Domains, DNS and business email configured properly",
    ],
    useCases: [
      {
        title: "A new or rebuilt website",
        text: "A clear, fast site that explains what the business does and makes the next step obvious.",
      },
      {
        title: "Enquiries that reach the right place",
        text: "Forms that create a record in the right system and tell the right person, instead of sitting in a shared inbox.",
      },
      {
        title: "Taking payments online",
        text: "Payment flows that connect each transaction with the invoice, job or booking it belongs to.",
      },
      {
        title: "Getting the foundations right",
        text: "Domain, email and search configuration set up so the basics work reliably and the business presents professionally.",
      },
    ],
    approach: [
      {
        title: "Start with the visitor",
        text: "We work out what customers need to understand and what you want them to do next, then design the site around that.",
      },
      {
        title: "Connect what matters",
        text: "Where enquiries, bookings or payments should reach other systems, we build those connections as part of the site.",
      },
      {
        title: "Get the foundations right",
        text: "Performance, accessibility and search configuration are part of the build, not an afterthought.",
      },
    ],
    productionHeading: "Fast, findable and secure.",
    production: [
      "Pages that load quickly on mobile connections",
      "Accessible markup, readable contrast and usable controls",
      "Clean structure, metadata and sitemaps so search engines can index the site",
      "Spam protection on forms and sensible security headers",
    ],
    faqs: [
      {
        question: "Does Drylake only build websites as part of larger projects?",
        answer:
          "No. Drylake builds standalone business websites as well as websites that form part of a broader customer journey, business system or operational workflow.",
      },
      {
        question: "Does Drylake build websites and web applications in Perth?",
        answer:
          "Yes. Drylake is a Perth company that builds business websites and web applications for businesses in Perth and across Australia.",
      },
      {
        question: "Can the website connect to our other systems?",
        answer:
          "Yes, where those systems support integration. Enquiries, bookings and payments can create records in the systems the business already uses.",
      },
      {
        question: "Can you help with domains and business email?",
        answer:
          "Yes. Drylake can configure domains, DNS and professional business email so the basics work reliably alongside the website.",
      },
    ],
    related: ["systems-integration", "business-automation", "custom-software-development"],
  },
];

/*
 * The three service pages that lived under /solutions/* before 2026-10-07. Each redirects
 * permanently (308) to its closest successor so links and any indexed URLs keep working.
 */
export const LEGACY_SERVICE_REDIRECTS: readonly { source: string; destination: string }[] = [
  { source: "/solutions/custom-software", destination: path("custom-software-development") },
  { source: "/solutions/automation-integration", destination: path("business-automation") },
  { source: "/solutions/applied-ai", destination: path("ai-automation") },
];

export function findService(slug: string): Service | null {
  return SERVICES.find((service) => service.slug === slug) ?? null;
}

export function relatedServices(service: Service): Service[] {
  return service.related
    .map((slug) => findService(slug))
    .filter((related): related is Service => related !== null);
}
