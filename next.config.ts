import type { NextConfig } from "next";

import { LEGACY_SERVICE_REDIRECTS, PRIVATE_PREFIXES } from "./lib/discovery/entity";

const NOINDEX_HEADER = { key: "X-Robots-Tag", value: "noindex, nofollow" };

const securityHeaders = [
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,

  // The original service pages moved from /solutions/* to /services/* (2026-10-07). 308s keep
  // existing links and any indexed URLs working and pass their signals to the new pages.
  async redirects() {
    return LEGACY_SERVICE_REDIRECTS.map((redirect) => ({ ...redirect, permanent: true }));
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // Private application surfaces are never indexed, even if a crawler ignores robots.txt
      // or follows a leaked link. Must match PRIVATE_PREFIXES in lib/discovery/entity.ts
      // (tests/discoverability.test.mjs checks they agree).
      ...PRIVATE_PREFIXES.flatMap((prefix) => [
        { source: prefix, headers: [NOINDEX_HEADER] },
        { source: `${prefix}/:path*`, headers: [NOINDEX_HEADER] },
      ]),
    ];
  },
};

export default nextConfig;