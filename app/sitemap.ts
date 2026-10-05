import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

/*
 * lastModified is the date the page content last changed, not the request time. Stamping
 * "now" on every request tells crawlers every page changes constantly, which they learn to
 * ignore. Bump the date when a page's content materially changes.
 */
const pages: Array<{
  path: string;
  lastModified: string;
  changeFrequency: "weekly" | "monthly" | "yearly";
  priority: number;
}> = [
  { path: "", lastModified: "2026-10-05", changeFrequency: "weekly", priority: 1 },
  { path: "/solutions", lastModified: "2026-10-05", changeFrequency: "monthly", priority: 0.9 },
  { path: "/about", lastModified: "2026-10-05", changeFrequency: "monthly", priority: 0.8 },
  { path: "/contact", lastModified: "2026-10-05", changeFrequency: "monthly", priority: 0.7 },
  { path: "/privacy", lastModified: "2026-09-28", changeFrequency: "yearly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map((page) => ({
    url: `${SITE_URL}${page.path}`,
    lastModified: new Date(page.lastModified),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
