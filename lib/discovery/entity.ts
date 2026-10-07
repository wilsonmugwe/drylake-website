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
import { SERVICES, SERVICES_PATH } from "./services.ts";

export const SITE_URL = "https://drylake.com.au";

export const ENTITY = {
  brand: "Drylake",
  legalName: DRYLAKE_BUSINESS.legalName,
  abn: DRYLAKE_BUSINESS.abn,
  acn: DRYLAKE_BUSINESS.acn,
  url: SITE_URL,
  email: "hello@drylake.com.au",
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
  /*
   * Verified, Drylake-controlled public profiles only. Add one only after checking it is
   * the official page, links back to drylake.com.au and uses its canonical URL.
   * LinkedIn: checked 2026-10-06 (name Drylake Pty Ltd, website drylake.com.au, Perth WA).
   */
  sameAs: ["https://www.linkedin.com/company/drylake"] as string[],
} as const;

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export type Founder = {
  id: string;
  name: string;
  jobTitle: string;
};

/*
 * Public on /about (components/sections/Founders.tsx). Machine surfaces carry name and role
 * only: credentials stay on the page, not in structured data (privacy review 2026-10-06).
 */
export const FOUNDERS: readonly Founder[] = [
  {
    id: `${SITE_URL}/about#benedict-wambugu`,
    name: "Benedict Wambugu",
    jobTitle: "Co-founder and CEO",
  },
  {
    id: `${SITE_URL}/about#wilson-mugwe`,
    name: "Wilson Mugwe",
    jobTitle: "Co-founder and Head of Technology",
  },
];

/* Service lines live in services.ts (content-heavy); re-exported so callers keep one import. */
export {
  LEGACY_SERVICE_REDIRECTS,
  SERVICES,
  SERVICES_PATH,
  findService,
  relatedServices,
  type Service,
  type ServiceFaq,
  type ServicePoint,
  type ServiceSlug,
} from "./services.ts";

/* The Perth / Western Australia page: one local page, no suburb or city variants. */
export const PERTH_PATH = "/perth";

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
  { path: "/", lastModified: "2026-10-07", changeFrequency: "weekly", priority: 1 },
  { path: "/solutions", lastModified: "2026-10-07", changeFrequency: "monthly", priority: 0.9 },
  { path: SERVICES_PATH, lastModified: "2026-10-07", changeFrequency: "monthly", priority: 0.9 },
  ...SERVICES.map((service) => ({
    path: service.path,
    lastModified: "2026-10-07",
    changeFrequency: "monthly" as const,
    priority: 0.8,
  })),
  { path: "/perth", lastModified: "2026-10-07", changeFrequency: "monthly", priority: 0.7 },
  { path: "/about", lastModified: "2026-10-07", changeFrequency: "monthly", priority: 0.8 },
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
