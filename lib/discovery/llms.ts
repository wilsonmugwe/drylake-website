/*
 * /llms.txt (llmstxt.org format): a plain-text map of Drylake for AI retrieval systems.
 * Generated from lib/discovery/entity.ts so it can never drift from the pages and the
 * structured data. PURE (tests import it directly).
 */

import { ENTITY, FOUNDERS, PERTH_PATH, PUBLIC_PAGES, SERVICES, SERVICES_PATH, absoluteUrl, findService } from "./entity.ts";
import { FAQ_CATEGORIES, FAQ_ITEMS } from "../faqs.ts";
import { BUSINESS_PROBLEMS, problemPath } from "./problems.ts";
import { AREA_REGIONS, AREA_TYPES, SERVICE_AREAS, STANDALONE_AREA_SLUGS, findArea, locationPath, type AreaRegion } from "../service-areas.ts";

/*
 * How Drylake approaches work, stated once for machines. Each line restates what the service
 * pages and FAQs already say (map the workflow first, keep and connect what works, a person
 * checks AI results, no technical brief needed), so it adds no new claim.
 */
export const APPROACH_FACTS: readonly string[] = [
  "Drylake starts with the business problem and maps the workflow before deciding what to build.",
  "Where existing software still does its job, Drylake connects to it or builds around it rather than replacing it.",
  "Custom software is delivered in stages, most useful part first.",
  "Where an AI result affects a customer, money or a decision, a person reviews it.",
  "A technical specification is not needed to start a conversation.",
];

function problemLines(): string[] {
  return BUSINESS_PROBLEMS.map((item) => {
    const services = item.services
      .map((slug) => findService(slug))
      .filter((service) => service !== null)
      .map((service) => `[${service.name}](${absoluteUrl(service.path)})`)
      .join(", ");
    return `- [${item.problem}](${absoluteUrl(problemPath(item))}) ${item.outcome} Services: ${services}.`;
  });
}

/* Newest page date, from the same source as the sitemap's lastmod, so the two never disagree. */
export function lastUpdated(): string {
  return PUBLIC_PAGES.map((page) => page.lastModified).sort().at(-1) ?? "";
}

/*
 * Service-area coverage, stated once for machines (PR 5, 2026-10-16). Drylake is based in Perth
 * with no office in any listed area; it works with businesses there remotely and on site by
 * arrangement. Generated from the same registry as the /perth directory.
 */
export function serviceAreaLines(): string[] {
  const regions = Object.keys(AREA_REGIONS) as AreaRegion[];

  return [
    `Drylake is based in ${ENTITY.locality} and has no office or premises in any suburb below. It works with businesses across the Perth metropolitan area remotely, and on site by arrangement.`,
    "",
    ...STANDALONE_AREA_SLUGS.map((slug) => `- [${findArea(slug)?.name}](${absoluteUrl(locationPath(slug))}): websites, software and automation for businesses in ${findArea(slug)?.name}`),
    "",
    `Full directory: [${ENTITY.locality} service areas](${absoluteUrl(PERTH_PATH)}).`,
    "",
    ...regions.map((region) => {
      const names = SERVICE_AREAS.filter((area) => area.region === region).map((area) => area.name).join(", ");
      return `- ${AREA_REGIONS[region].label}: ${names}`;
    }),
    "",
    `Area types: ${Object.values(AREA_TYPES).map((type) => type.label).join("; ")}.`,
  ];
}

export function llmsText(): string {
  const lines = [
    `# ${ENTITY.brand}`,
    "",
    `> ${ENTITY.summary}`,
    "",
    `Last updated: ${lastUpdated()}`,
    "",
    "## Company facts",
    "",
    `- Brand: ${ENTITY.brand}`,
    `- Legal entity: ${ENTITY.legalName}`,
    `- ABN: ${ENTITY.abn}`,
    `- ACN: ${ENTITY.acn}`,
    `- Official website: ${ENTITY.url}`,
    `- Location: ${ENTITY.locality}, ${ENTITY.region}, ${ENTITY.country}`,
    `- Category: ${ENTITY.category}`,
    `- Serves: businesses in ${ENTITY.locality} and across ${ENTITY.country}`,
    `- Contact: ${ENTITY.email}, ${ENTITY.telephone}`,
    `- ${ENTITY.legalSummary}`,
    "",
    "## Founders",
    "",
    ...FOUNDERS.map((founder) => `- ${founder.name}, ${founder.jobTitle}`),
    "",
    "## Services",
    "",
    ...SERVICES.map((service) => `- [${service.name}](${absoluteUrl(service.path)}): ${service.description}`),
    "",
    "## Problems we solve",
    "",
    ...problemLines(),
    "",
    "## Approach",
    "",
    ...APPROACH_FACTS.map((fact) => `- ${fact}`),
    "",
    "## Service areas",
    "",
    ...serviceAreaLines(),
    "",
    "## Pages",
    "",
    `- [Home](${absoluteUrl("/")}): what Drylake does and who it works with`,
    `- [Solutions](${absoluteUrl("/solutions")}): common business problems, how the capabilities fit together and which service solves each`,
    `- [Services](${absoluteUrl(SERVICES_PATH)}): the five service lines`,
    `- [Perth](${absoluteUrl(PERTH_PATH)}): Drylake as a Perth, Western Australia technology company, and the directory of Perth metro service areas`,
    `- [About](${absoluteUrl("/about")}): the company, its founders and company details`,
    `- [Questions](${absoluteUrl("/faq")}): answers on website and software costs and timing, connecting systems, AI and automation, working with Drylake, security and privacy, and BRONNIE`,
    `- [Contact](${absoluteUrl("/contact")}): how to start a conversation`,
    `- [Free consultation](${absoluteUrl("/consultation")}): book a free 30-minute consultation (Monday, Tuesday and Friday, Perth time)`,
    `- [Collaborate](${absoluteUrl("/collaborate")}): propose a technology collaboration, pilot, integration or partnership`,
    `- [Privacy](${absoluteUrl("/privacy")}): how personal information is handled`,
    `- [Security and privacy](${absoluteUrl("/security-privacy")}): what Drylake collects, who can access it, which providers handle it, cookies and analytics, and how to ask for access or deletion`,
    `- [Terms](${absoluteUrl("/terms")}): the terms of use for this website`,
    "",
    "## Optional",
    "",
    `- [Full service detail](${absoluteUrl(LLMS_FULL_PATH)}): every service page as plain text`,
    "",
  ];

  return lines.join("\n");
}

export const LLMS_FULL_PATH = "/llms-full.txt";

/*
 * /llms-full.txt: the company facts plus the full text of every service page, in the order the
 * pages render it. Same source as the pages (services.ts), so it cannot say anything the
 * pages do not. llms.txt is a community proposal with little evidence of use by the major
 * answer engines (docs/search/search-audit.md section 7); it is kept because it is generated,
 * accurate and free to maintain, not because it is expected to move rankings.
 */
export function llmsFullText(): string {
  const lines = [
    `# ${ENTITY.brand}: services in full`,
    "",
    `> ${ENTITY.summary}`,
    "",
    `${ENTITY.legalSummary} Based in ${ENTITY.locality}, ${ENTITY.region}. Works with businesses in ${ENTITY.locality} and across ${ENTITY.country}. Contact: ${ENTITY.email} or ${ENTITY.telephone}. Website: ${ENTITY.url}.`,
    "",
    "## Problems we solve",
    "",
    ...problemLines(),
    "",
    "## Approach",
    "",
    ...APPROACH_FACTS.map((fact) => `- ${fact}`),
    "",
    "## Service areas",
    "",
    ...serviceAreaLines(),
    "",
    "## Frequently asked questions",
    "",
    ...FAQ_CATEGORIES.flatMap((category) => [
      `### ${category.title}`,
      "",
      ...FAQ_ITEMS.filter((item) => item.category === category.id).flatMap((item) => [
        `Q: ${item.question}`,
        `A: ${item.answer}`,
        ...(item.links?.length ? [`Related: ${item.links.map((link) => `[${link.label}](${absoluteUrl(link.href)})`).join(", ")}`] : []),
        "",
      ]),
    ]),
  ];

  for (const service of SERVICES) {
    lines.push(
      `## ${service.name}`,
      "",
      `URL: ${absoluteUrl(service.path)}`,
      "",
      service.intro,
      "",
      `### ${service.problemHeading}`,
      "",
      ...service.problem.flatMap((paragraph) => [paragraph, ""]),
      "### What Drylake can build",
      "",
      ...service.builds.map((item) => `- ${item}`),
      "",
      "### Where it fits",
      "",
      ...service.useCases.map((point) => `- ${point.title}: ${point.text}`),
      "",
      "### How we approach it",
      "",
      ...service.approach.map((point) => `- ${point.title}: ${point.text}`),
      "",
      `### ${service.productionHeading}`,
      "",
      ...service.production.map((item) => `- ${item}`),
      "",
      "### Questions",
      "",
      ...service.faqs.flatMap((faq) => [`Q: ${faq.question}`, `A: ${faq.answer}`, ""]),
    );
  }

  return lines.join("\n");
}
