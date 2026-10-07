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
 */

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
  intro: string;
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
    name: "Custom software development",
    serviceType: "Custom software development",
    title: "Custom Software Development for Australian Businesses | Drylake",
    description:
      "Drylake designs and builds custom software for Australian businesses: internal platforms, client and staff portals, workflow systems and web applications.",
    summary:
      "Internal platforms, client and staff portals, workflow systems and web applications built around how the business works.",
    headline: "Software that fits the business.",
    intro:
      "Drylake designs and builds internal platforms, client and staff portals, workflow systems and web applications for Australian businesses. We start with the workflow the business depends on, then design the software around it.",
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
      "Monitoring, backups and recovery planned from the first release",
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
      "Drylake automates routine business work for Australian businesses: approvals, notifications, follow-ups, forms and the hand-offs between people and systems.",
    summary:
      "Approvals, notifications, follow-ups and routine hand-offs automated, so less depends on someone remembering.",
    headline: "Less manual follow-up. More workflow.",
    intro:
      "Drylake automates routine, repeated steps for Australian businesses: approvals, notifications, follow-ups, forms and the hand-offs between people and systems. The aim is less manual handling, not more software to manage.",
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
    name: "Systems integration",
    serviceType: "Systems integration",
    title: "Systems Integration: Connect Your Existing Software | Drylake",
    description:
      "Drylake connects the systems Australian businesses already use, such as accounting, CRM, payments and Microsoft 365, so information stops being copied by hand.",
    summary:
      "The software you already use, connected, so information moves between systems without being copied or re-entered.",
    headline: "Make the systems talk.",
    intro:
      "Drylake connects the software Australian businesses already use so information moves between systems without being copied or re-entered. Where practical we keep the systems you rely on and build the connections around them.",
    problemHeading: "Our systems don't talk to each other.",
    problem: [
      "Information spread across platforms creates gaps, delays and manual work. The team copies details from one system to another, records drift out of step, and nobody is sure which version is right.",
      "An integration is often a better answer than replacing software. If each system does its own job well, connecting them can remove the double handling without the cost and disruption of moving the business onto something new.",
    ],
    builds: [
      "Integrations between accounting, CRM, payment and operational systems",
      "Data synchronisation so every system holds the same record",
      "Custom APIs and connectors where no ready-made integration exists",
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
    name: "AI automation",
    serviceType: "Artificial intelligence solutions for business",
    title: "AI Automation for Real Business Workflows | Drylake",
    description:
      "Drylake builds practical AI into Australian business workflows: document processing, drafting, summarising and internal tools, with people checking the results.",
    summary:
      "Practical AI inside real workflows: reading documents, drafting, summarising and answering questions from your own records.",
    headline: "AI where it earns its place.",
    intro:
      "Drylake builds AI into business workflows where it reduces work or adds genuinely useful functionality. We use AI as one part of a working system, not as a product on its own.",
    problemHeading: "Useful AI is part of a workflow.",
    problem: [
      "AI is good at work that used to need a person to read: incoming documents, long emails, notes and records. It can draft, summarise, classify and answer questions from information the business already holds.",
      "It is a poor fit where an answer must always be exact and a simple rule would do. Many problems are better solved with conventional software, automation or an integration, and we will say so when that is the case.",
    ],
    builds: [
      "Document processing that reads and routes incoming paperwork",
      "AI-assisted workflows that draft, summarise or classify",
      "Internal tools that answer questions from the business's own records",
      "Decision support that surfaces what needs attention",
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
    name: "Web development",
    serviceType: "Website and web application development",
    title: "Web Development and Business Websites | Drylake",
    description:
      "Drylake builds fast, clear business websites and web applications for Australian businesses, with forms, bookings and payments connected to your systems.",
    summary:
      "Fast, clear business websites and web applications, connected to the forms, bookings and systems behind them.",
    headline: "A professional digital front door for the business.",
    intro:
      "Drylake builds fast, clear business websites and web applications for Australian businesses, designed around what customers need to understand and what you want them to do next. Where it helps, the website connects to the systems behind it.",
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
      "Technical foundations: performance, crawlability, indexing and search configuration",
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
