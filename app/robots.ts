import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

/*
 * No trailing slashes on the private prefixes: "Disallow: /client/" does not match "/client"
 * itself, which is the URL people actually land on. Robots rules are prefix matches, so
 * "/client" covers both. Private pages also send noindex; this just saves crawl budget.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api",
        "/admin",
        "/client",
        "/portal",
        "/sign-in",
        "/sign-up",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
