/*
 * /llms.txt (llmstxt.org format): a plain-text map of Drylake for AI retrieval systems.
 * Generated from lib/discovery/entity.ts so it can never drift from the pages and the
 * structured data. PURE (tests import it directly).
 */

import { ENTITY, FOUNDERS, PERTH_PATH, SERVICES, SERVICES_PATH, absoluteUrl } from "./entity.ts";

export function llmsText(): string {
  const lines = [
    `# ${ENTITY.brand}`,
    "",
    `> ${ENTITY.summary}`,
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
    "## Pages",
    "",
    `- [Home](${absoluteUrl("/")}): what Drylake does and who it works with`,
    `- [What we do](${absoluteUrl("/solutions")}): how the service lines fit together`,
    `- [Services](${absoluteUrl(SERVICES_PATH)}): the five service lines`,
    `- [Perth](${absoluteUrl(PERTH_PATH)}): Drylake as a Perth, Western Australia technology company`,
    `- [About](${absoluteUrl("/about")}): the company, its founders and company details`,
    `- [Contact](${absoluteUrl("/contact")}): how to start a conversation`,
    `- [Privacy](${absoluteUrl("/privacy")}): how personal information is handled`,
    "",
  ];

  return lines.join("\n");
}
