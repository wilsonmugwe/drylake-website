import type { MetadataRoute } from "next";

import { robotsGroups } from "@/lib/discovery/crawlers";
import { PRIVATE_PREFIXES, SITE_URL } from "@/lib/discovery/entity";

/*
 * Renders robotsGroups() (lib/discovery/crawlers.ts), the same data the tests evaluate with
 * an RFC 9309 matcher. Search engines, AI search crawlers, user fetchers and Google-Extended
 * use the "*" group (whole public site, private surfaces disallowed); model-training tokens
 * are opted out with "Disallow: /".
 *
 * No trailing slashes on the private prefixes: "Disallow: /client/" does not match "/client"
 * itself. Robots rules are prefix matches, so "/client" covers both. Private pages also send
 * noindex (meta + X-Robots-Tag header); robots.txt only saves crawl budget, it is not access
 * control.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: robotsGroups(PRIVATE_PREFIXES).map((group) => ({
      userAgent: group.userAgent,
      allow: group.allow,
      disallow: group.disallow,
    })),
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
