/*
 * schema.org nodes for the /locations/[slug] pages. PURE (tests import it directly).
 *
 * One Service per page, provided by the existing Organization (by @id) with areaServed naming
 * the suburb. Deliberately NOT LocalBusiness or ProfessionalService: both are LocalBusiness
 * family types that imply a place of business, and Drylake has no premises in any suburb it
 * serves. No address, geo, opening hours, reviews or ratings are emitted, ever.
 */

import { ENTITY, ORGANIZATION_ID, absoluteUrl } from "./entity.ts";
import { locationPageSeo } from "../service-area-pages.ts";
import { findArea, locationPath } from "../service-areas.ts";
import { nodeId } from "./structured-data.ts";

type Node = Record<string, unknown>;

const WESTERN_AUSTRALIA = {
  "@type": "State",
  name: ENTITY.region,
  containedInPlace: { "@type": "Country", name: ENTITY.country },
};

export function locationServiceNode(slug: string): Node {
  const area = findArea(slug);

  if (!area) throw new Error(`locationServiceNode: unknown area ${slug}`);

  const path = locationPath(slug);
  const seo = locationPageSeo(slug);

  return {
    "@type": "Service",
    "@id": nodeId(path, "service"),
    name: `Websites, software and automation for businesses in ${area.name}`,
    serviceType: "Website, business software and automation development",
    description: seo.description,
    url: absoluteUrl(path),
    provider: { "@id": ORGANIZATION_ID },
    areaServed: {
      "@type": "Place",
      name: `${area.name}, ${ENTITY.region}`,
      containedInPlace: WESTERN_AUSTRALIA,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": nodeId(path, "webpage"), url: absoluteUrl(path) },
  };
}
