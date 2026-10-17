/*
 * Search copy for every static public page: the ONE place a title, meta description, share
 * description and share image are set. Pages pass their entry to pageMetadata() and to
 * webPageNode(), so <title>, meta description, Open Graph, Twitter and the WebPage JSON-LD
 * node can never disagree. Service pages keep theirs in lib/discovery/services.ts.
 * PURE: no framework imports (tests/seo-search-visibility.test.mjs imports it directly).
 *
 * Rules (tested):
 *   - titles unique and at most 65 characters (longer ones are cut off in results);
 *   - descriptions unique and 140 to 160 characters, written to be read in a search result,
 *     stating plainly who Drylake is, where it is and what it does;
 *   - no em dashes, no prices, no claims about clients, results or reviews;
 *   - every page has its own 1200 x 630 share image in /public/og (see docs/search/search-audit.md).
 */

export type PageSeo = {
  path: string;
  title: string;
  description: string;
  /* Shorter copy for link previews; defaults to the description. */
  shareDescription?: string;
  /* Path of the page's own 1200 x 630 PNG share card. */
  image: string;
  /* Alt text for the share card: what the card says, not "image of". */
  imageAlt: string;
};

export const PAGE_SEO = {
  home: {
    path: "/",
    /* Perth in the home title (audit 2026-10-10): Perth-qualified software queries carry measured
       AU volume (DataForSEO, Oct 2026: "custom software perth" 90/mo, "software company perth"
       110/mo). The hero headline is unchanged; this is the search result title only. */
    title: "Drylake | Websites, Software & Automation, Perth WA",
    description:
      "Drylake builds websites, business software and automations for Australian businesses, so your team spends less time on repetitive admin. Based in Perth, WA.",
    shareDescription:
      "Websites, business software, automations and AI tools that make running an Australian business easier.",
    image: "/og/home.png",
    imageAlt: "Drylake: websites, business software and automation for Australian businesses",
  },
  solutions: {
    path: "/solutions",
    /* Problem intent (final refinement PR, 2026-10-08): /services owns "what Drylake provides",
       so this page no longer competes with it for the same service queries. */
    title: "Business Problems We Solve: Software, Automation & AI | Drylake",
    description:
      "The operational problems Drylake solves for Australian businesses, from double entry and lost enquiries to email approvals, and the service that fixes each.",
    shareDescription:
      "Common operational problems, how software, automation and AI fit together to fix them, and which Drylake service fits each.",
    image: "/og/solutions.png",
    imageAlt: "Drylake: what we do, from small technical fixes to complete platforms",
  },
  services: {
    path: "/services",
    title: "Services: Websites, Software, Automation & AI | Drylake",
    description:
      "The five things Drylake builds for Australian businesses: websites, custom software and apps, business automation, connected systems and practical AI tools.",
    image: "/og/services.png",
    imageAlt: "Drylake services: custom software, automation, integration, AI and web",
  },
  perth: {
    path: "/perth",
    title: "Perth Website, Software & Automation Company | Drylake",
    description:
      "Drylake is a Perth company building websites, business software, automations and AI tools for businesses in Perth, across Western Australia and Australia.",
    image: "/og/perth.png",
    imageAlt: "Drylake: a Perth technology company building for Australian businesses",
  },
  about: {
    path: "/about",
    title: "About Drylake | Perth Technology Company",
    description:
      "Drylake (DRYLAKE PTY LTD) is a Perth technology company building websites, business software, automations and AI tools for Australian businesses.",
    shareDescription:
      "A Perth technology company building practical software, automation and technical systems for Australian businesses.",
    image: "/og/about.png",
    imageAlt: "About Drylake, a Perth technology company",
  },
  faq: {
    path: "/faq",
    title: "Website, Software and AI Questions Answered | Drylake Perth",
    description:
      "Plain answers on website and software costs, timing, AI and automation, security and working with Drylake, a Perth technology company in Western Australia.",
    shareDescription: "Plain answers on website and software costs, timing, AI and automation, and security at Drylake.",
    image: "/og/faq.png",
    imageAlt: "Drylake: your questions, answered plainly",
  },
  contact: {
    path: "/contact",
    title: "Contact Drylake | Software & Automation Enquiries",
    description:
      "Talk to Drylake about a website, business software, automation or AI. Call, email or tell us what you want built or what is taking your team too long.",
    shareDescription:
      "Talk to Drylake about a website, business software, automation or AI tools for your business.",
    image: "/og/contact.png",
    imageAlt: "Contact Drylake: tell us what is getting in the way",
  },
  consultation: {
    path: "/consultation",
    title: "Book a Free 30-Minute Consultation | Drylake, Perth",
    description:
      "Book a free 30-minute consultation with Drylake, a Perth technology company. Talk through your business, ideas and options. No obligation to proceed.",
    shareDescription: "Book a free 30-minute consultation with Drylake. No obligation to proceed.",
    image: "/og/consultation.png",
    imageAlt: "Book a free 30-minute consultation with Drylake",
  },
  collaborate: {
    path: "/collaborate",
    title: "Collaborate With Drylake | Partnerships & Pilots",
    description:
      "Propose a technology collaboration, pilot, integration or partnership with Drylake, a Perth technology company. BRONNIE is still in development.",
    shareDescription: "Propose a technology collaboration, pilot, integration or partnership with Drylake.",
    image: "/og/collaborate.png",
    imageAlt: "Collaborate with Drylake: proposals for pilots, integrations and partnerships",
  },
  bronnie: {
    path: "/bronnie",
    title: "BRONNIE | An AI-Powered Platform in Development by Drylake",
    description:
      "BRONNIE is an AI-powered platform being developed by Drylake, a Perth technology company. It is not yet available. Pilots are arranged by discussion.",
    shareDescription: "BRONNIE is an AI-powered platform being developed by Drylake. In development, not yet available.",
    image: "/og/bronnie.png",
    imageAlt: "BRONNIE, an AI-powered platform in development by Drylake",
  },
  privacy: {
    path: "/privacy",
    title: "Privacy Policy | Drylake",
    description:
      "How Drylake Pty Ltd collects, uses, stores and protects personal information provided through the Drylake website, enquiry forms and client services.",
    image: "/og/privacy.png",
    imageAlt: "Drylake privacy policy",
  },
  securityPrivacy: {
    path: "/security-privacy",
    title: "Security and Privacy | How Drylake Handles Your Information",
    description:
      "What Drylake collects through enquiries, bookings and the client Workspace, who can see it, which providers handle it, and how to ask for access or deletion.",
    shareDescription: "What Drylake collects, who can see it, which providers handle it and how to ask for access or deletion.",
    image: "/og/security-privacy.png",
    imageAlt: "Drylake security and privacy: what we collect and who can see it",
  },
  terms: {
    path: "/terms",
    title: "Terms of Use | Drylake",
    description:
      "The terms for using the Drylake website and Drylake Workspace: project work under signed agreements, Workspace access, invoices, payments and consumer rights.",
    image: "/og/terms.png",
    imageAlt: "Drylake terms of use",
  },
} as const satisfies Record<string, PageSeo>;

export type PageSeoKey = keyof typeof PAGE_SEO;

/* Share card for a service page: /og/services-<slug>.png (generated with the others). */
export function serviceShareImage(slug: string): string {
  return `/og/services-${slug}.png`;
}
