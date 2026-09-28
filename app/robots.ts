import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/client/", "/admin/"],
    },
    sitemap: "https://drylake.com.au/sitemap.xml",
  };
}