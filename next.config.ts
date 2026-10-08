import type { NextConfig } from "next";

import { LEGACY_SERVICE_REDIRECTS, PRIVATE_PREFIXES } from "./lib/discovery/entity";

const NOINDEX_HEADER = { key: "X-Robots-Tag", value: "noindex, nofollow" };

/*
 * RFC 8288 Link header on the homepage, for agents that discover a site from its root: the
 * llms.txt summary, the RFC 9727 API catalogue, and the Markdown version of the page (served to
 * "Accept: text/markdown" by proxy.ts).
 */
const HOMEPAGE_LINK_HEADER = {
  key: "Link",
  value: [
    '</llms.txt>; rel="describedby"; type="text/plain"',
    '</.well-known/api-catalog>; rel="api-catalog"',
    '</>; rel="alternate"; type="text/markdown"',
  ].join(", "),
};

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
      { source: "/", headers: [HOMEPAGE_LINK_HEADER] },
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