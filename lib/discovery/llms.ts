/*
 * /llms.txt (llmstxt.org format): a plain-text map of Drylake for AI retrieval systems.
 * Generated from lib/discovery/entity.ts so it can never drift from the pages and the
 * structured data. PURE (tests import it directly).
 */

import { ENTITY, FOUNDERS, PERTH_PATH, PUBLIC_PAGES, SERVICES, SERVICES_PATH, absoluteUrl, findService } from "./entity.ts";
import { BUSINESS_PROBLEMS, problemPath } from "./problems.ts";

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
    `- Contact: ${ENTITY.email}`,
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
    "## Pages",
    "",
    `- [Home](${absoluteUrl("/")}): what Drylake does and who it works with`,
    `- [Solutions](${absoluteUrl("/solutions")}): common business problems, how the capabilities fit together and which service solves each`,
    `- [Services](${absoluteUrl(SERVICES_PATH)}): the five service lines`,
    `- [Perth](${absoluteUrl(PERTH_PATH)}): Drylake as a Perth, Western Australia technology company`,
    `- [About](${absoluteUrl("/about")}): the company, its founders and company details`,
    `- [Contact](${absoluteUrl("/contact")}): how to start a conversation`,
    `- [Privacy](${absoluteUrl("/privacy")}): how personal information is handled`,
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
    `${ENTITY.legalSummary} Based in ${ENTITY.locality}, ${ENTITY.region}. Works with businesses in ${ENTITY.locality} and across ${ENTITY.country}. Contact: ${ENTITY.email}. Website: ${ENTITY.url}.`,
    "",
    "## Problems we solve",
    "",
    ...problemLines(),
    "",
    "## Approach",
    "",
    ...APPROACH_FACTS.map((fact) => `- ${fact}`),
    "",
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
