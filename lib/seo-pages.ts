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
    title: "Drylake | Operational Software & Automation Australia",
    description:
      "Drylake builds operational software, automation and connected systems for Australian businesses held back by manual processes and disconnected tools.",
    shareDescription:
      "Operational software, automation and connected systems for Australian businesses that have outgrown manual processes and disconnected tools.",
    image: "/og/home.png",
    imageAlt: "Drylake: operational software and automation for Australian businesses",
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
    title: "Services: Software, Automation, Integration, AI and Web | Drylake",
    description:
      "The five things Drylake builds for Australian businesses: custom software, business automation, systems integration, AI automation and web development.",
    image: "/og/services.png",
    imageAlt: "Drylake services: custom software, automation, integration, AI and web",
  },
  perth: {
    path: "/perth",
    title: "Perth Software, Automation and AI Company | Drylake",
    description:
      "Drylake is a Perth technology company building custom software, automation, systems integration, AI and websites for businesses in Perth, WA and Australia.",
    image: "/og/perth.png",
    imageAlt: "Drylake: a Perth technology company building for Australian businesses",
  },
  about: {
    path: "/about",
    title: "About Drylake | Perth Technology Company",
    description:
      "Drylake (DRYLAKE PTY LTD) is a Perth technology company building practical software, automation and connected systems for Australian businesses.",
    shareDescription:
      "A Perth technology company building practical software, automation and technical systems for Australian businesses.",
    image: "/og/about.png",
    imageAlt: "About Drylake, a Perth technology company",
  },
  contact: {
    path: "/contact",
    title: "Contact Drylake | Software & Automation Enquiries",
    description:
      "Talk to Drylake about software, automation, integrations or operational technology. Call, email or tell us what is slowing your business down.",
    shareDescription:
      "Talk to Drylake about software, automation, integrations or operational technology for your business.",
    image: "/og/contact.png",
    imageAlt: "Contact Drylake: tell us what is getting in the way",
  },
  privacy: {
    path: "/privacy",
    title: "Privacy Policy | Drylake",
    description:
      "How Drylake Pty Ltd collects, uses, stores and protects personal information provided through the Drylake website, enquiry forms and client services.",
    image: "/og/privacy.png",
    imageAlt: "Drylake privacy policy",
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
