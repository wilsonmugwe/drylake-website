import type { MetadataRoute } from "next";

import { PUBLIC_PAGES, absoluteUrl } from "@/lib/discovery/entity";

/*
 * Generated from PUBLIC_PAGES (lib/discovery/entity.ts), the same list the discoverability
 * tests and the production crawler check read. lastModified is the date the content last
 * changed, not the request time: stamping "now" teaches crawlers to ignore the field.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((page) => ({
    url: absoluteUrl(page.path),
    lastModified: new Date(page.lastModified),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
