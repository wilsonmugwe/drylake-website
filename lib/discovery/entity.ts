/*
 * The Drylake entity: the ONE description of who Drylake is, read by structured data,
 * llms.txt, page copy that states company facts, and the discoverability tests.
 * PURE: no framework imports (tests/discoverability.test.mjs imports it directly).
 *
 * Every machine-readable surface must describe the same organisation in the same words:
 * brand Drylake, legal entity DRYLAKE PTY LTD, ABN 70 702 662 557, drylake.com.au, Perth WA.
 * Change a fact here and every surface follows; a test fails if a surface drifts.
 *
 * sameAs lists ONLY profiles that exist and that Drylake controls. Never add a profile that
 * has not been created yet, a directory listing nobody verified, or someone else's page.
 */

import { DRYLAKE_BUSINESS } from "../business.ts";

export const SITE_URL = "https://drylake.com.au";

export const ENTITY = {
  brand: "Drylake",
  legalName: DRYLAKE_BUSINESS.legalName,
  abn: DRYLAKE_BUSINESS.abn,
  acn: DRYLAKE_BUSINESS.acn,
  url: SITE_URL,
  email: "hello@drylake.com.au",
  telephone: "+61 420 565 457",
  locality: "Perth",
  region: "Western Australia",
  regionCode: "WA",
  country: "Australia",
  countryCode: "AU",
  category: "Australian technology and software company",
  /* One sentence that answers "What is Drylake?" everywhere it is asked. */
  summary:
    "Drylake is a Perth, Western Australia technology company that builds custom software, client and staff portals, business automation, systems integrations and applied AI for Australian businesses.",
  /* "What is Drylake Pty Ltd?" */
  legalSummary:
    "DRYLAKE PTY LTD (ABN 70 702 662 557) is the Australian proprietary company that trades as Drylake.",
  /* Verified, Drylake-controlled public profiles only. Empty until each one exists. */
  sameAs: [] as string[],
} as const;

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export type Founder = {
  id: string;
  name: string;
  jobTitle: string;
  credential: string;
};

/* Matches components/sections/Founders.tsx (credentials as Ben approved, no university). */
export const FOUNDERS: readonly Founder[] = [
  {
    id: `${SITE_URL}/about#benedict-wambugu`,
    name: "Benedict Wambugu",
    jobTitle: "Co-founder and CEO",
    credential: "Master of Project Management",
  },
  {
    id: `${SITE_URL}/about#wilson-mugwe`,
    name: "Wilson Mugwe",
    jobTitle: "Co-founder and Head of Technology",
    credential: "Bachelor of Computer Science, majoring in Software Engineering",
  },
];

export type ServiceFaq = { question: string; answer: string };

export type Service = {
  slug: string;
  path: string;
  /* Short name used in navigation and Service.name. */
  name: string;
  /* schema.org serviceType. */
  serviceType: string;
  title: string;
  description: string;
  headline: string;
  intro: string;
  builds: readonly string[];
  faqs: readonly ServiceFaq[];
};

/*
 * The three service lines the site already offers (components/sections/Solutions.tsx).
 * Copy states only what Drylake does; no client names, outcomes, statistics or awards.
 */
export const SERVICES: readonly Service[] = [
  {
    slug: "custom-software",
    path: "/solutions/custom-software",
    name: "Custom software and client portals",
    serviceType: "Custom software development",
    title: "Custom Software and Client Portals in Perth | Drylake",
    description:
      "Drylake designs and builds custom software for Perth and Australian businesses: internal platforms, client and staff portals, workflow systems and web applications.",
    headline: "Custom software and client portals, built around how the business works.",
    intro:
      "Drylake is a Perth software company that builds internal systems, client portals, staff portals and web applications for Australian businesses. We start with the workflow the business depends on, then design the software around it.",
    builds: [
      "Internal platforms that replace spreadsheets and manual tracking",
      "Client portals where customers see their projects, documents and invoices",
      "Staff portals and workflow systems for approvals, tasks and records",
      "Web and mobile applications built for a specific operation",
    ],
    faqs: [
      {
        question: "Does Drylake build custom client portals?",
        answer:
          "Yes. Drylake builds secure client portals that give customers one place to see their projects, documents, updates and invoices, connected to the systems the business already runs.",
      },
      {
        question: "Where is Drylake based?",
        answer:
          "Drylake is based in Perth, Western Australia, and works with businesses across Australia.",
      },
      {
        question: "Do we need a technical specification before we start?",
        answer:
          "No. Start with the business problem. Drylake works through the workflow with you and recommends whether custom software, an existing product or an integration is the better fit.",
      },
    ],
  },
  {
    slug: "automation-integration",
    path: "/solutions/automation-integration",
    name: "Business automation and systems integration",
    serviceType: "Business process automation and systems integration",
    title: "Business Automation and Systems Integration in Perth | Drylake",
    description:
      "Drylake automates routine business processes and connects the systems Australian businesses already use: workflow automation, integrations, approvals, notifications and data sync.",
    headline: "Automation and integration that make the systems talk.",
    intro:
      "Drylake is a Perth technology company that automates repetitive work and connects business systems so information moves without being re-entered. Where practical we keep the software you already use and build the connections around it.",
    builds: [
      "Workflow automation for routine, repeated steps",
      "Integrations between the systems a business already uses",
      "Approval flows and notifications",
      "Data synchronisation so every system holds the same record",
    ],
    faqs: [
      {
        question: "Does Drylake provide business automation in Perth?",
        answer:
          "Yes. Drylake is based in Perth and automates routine business processes, approvals and notifications for businesses in Perth and across Australia.",
      },
      {
        question: "Can Drylake connect software we already use?",
        answer:
          "Yes, where the platform supports the required integration. Drylake prefers to keep useful systems in place and connect, extend or build around them.",
      },
      {
        question: "What should we automate first?",
        answer:
          "Usually the step that is repeated most often or re-keyed between systems. Drylake starts by mapping where time is lost before recommending what to automate.",
      },
    ],
  },
  {
    slug: "applied-ai",
    path: "/solutions/applied-ai",
    name: "Applied AI for business workflows",
    serviceType: "Artificial intelligence solutions for business",
    title: "Applied AI Solutions for Perth Businesses | Drylake",
    description:
      "Drylake builds practical AI into business workflows for Perth and Australian businesses: document processing, AI-assisted workflows, internal tools and decision support.",
    headline: "AI where it earns its place in a real workflow.",
    intro:
      "Drylake is a Perth technology company that builds AI into business workflows where it reduces work or adds genuinely useful functionality. We use AI as one part of a working system, not as a product on its own.",
    builds: [
      "Document processing that reads and routes incoming paperwork",
      "AI-assisted workflows that draft, summarise or classify",
      "Internal tools that answer questions from the business's own records",
      "Decision support that surfaces what needs attention",
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
        question: "How does Drylake handle business data in AI features?",
        answer:
          "Data handling is designed for each project and explained before work begins, including which AI provider is used and what data it receives.",
      },
    ],
  },
];

/*
 * Every indexable public page. The sitemap, the discoverability tests and the production
 * crawler check all read this list, so a new public page that is not listed here fails CI.
 * lastModified is the date the content last changed, never the request time.
 */
export type PublicPage = {
  path: string;
  lastModified: string;
  changeFrequency: "weekly" | "monthly" | "yearly";
  priority: number;
};

export const PUBLIC_PAGES: readonly PublicPage[] = [
  { path: "/", lastModified: "2026-10-06", changeFrequency: "weekly", priority: 1 },
  { path: "/solutions", lastModified: "2026-10-06", changeFrequency: "monthly", priority: 0.9 },
  ...SERVICES.map((service) => ({
    path: service.path,
    lastModified: "2026-10-06",
    changeFrequency: "monthly" as const,
    priority: 0.8,
  })),
  { path: "/about", lastModified: "2026-10-06", changeFrequency: "monthly", priority: 0.8 },
  { path: "/contact", lastModified: "2026-10-05", changeFrequency: "monthly", priority: 0.7 },
  { path: "/privacy", lastModified: "2026-09-28", changeFrequency: "yearly", priority: 0.3 },
];

/* Path prefixes that are never public: robots Disallow + X-Robots-Tag noindex. */
export const PRIVATE_PREFIXES = [
  "/api",
  "/admin",
  "/client",
  "/portal",
  "/sign-in",
  "/sign-up",
] as const;

export function absoluteUrl(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}
