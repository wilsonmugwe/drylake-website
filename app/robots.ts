import type { MetadataRoute } from "next";

import { blockedTokens } from "@/lib/discovery/crawlers";
import { PRIVATE_PREFIXES, SITE_URL } from "@/lib/discovery/entity";

/*
 * Policy and sources: lib/discovery/crawlers.ts. Search engines, AI search crawlers and
 * user fetchers use the "*" group (whole public site); model-training tokens are opted out.
 *
 * No trailing slashes on the private prefixes: "Disallow: /client/" does not match "/client"
 * itself. Robots rules are prefix matches, so "/client" covers both. Private pages also send
 * noindex (meta + X-Robots-Tag header); robots.txt only saves crawl budget, it is not access
 * control.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: blockedTokens(), disallow: "/" },
      { userAgent: "*", allow: "/", disallow: [...PRIVATE_PREFIXES] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
