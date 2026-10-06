import type { Metadata } from "next";

import { ENTITY, SITE_URL } from "@/lib/discovery/entity";

export { SITE_URL };
export const SITE_NAME = ENTITY.brand;

export const SHARE_IMAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: "Drylake: operational software and automation for Australian businesses",
} as const;

interface PageMetadataInput {
  /** Full <title>, used verbatim (no template suffix), so brand never doubles up. */
  title: string;
  description: string;
  /** Route path, e.g. "/about". Becomes the self-referencing canonical. */
  path: string;
  /** Optional shorter share copy; defaults to the description. */
  shareDescription?: string;
}

/*
 * One builder for every public page's metadata.
 * Why: Next.js replaces (not merges) nested openGraph/twitter objects per page, so a page that
 * set only openGraph silently inherited the homepage twitter:title. Building all four surfaces
 * (title, canonical, Open Graph, Twitter) together keeps them in agreement.
 */
export function pageMetadata({
  title,
  description,
  path,
  shareDescription = description,
}: PageMetadataInput): Metadata {
  const url = path === "/" ? SITE_URL : `${SITE_URL}${path}`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "en_AU",
      siteName: SITE_NAME,
      url,
      title,
      description: shareDescription,
      images: [SHARE_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: shareDescription,
      images: [SHARE_IMAGE.url],
    },
  };
}

/** Metadata for authenticated or system pages that must never be indexed. */
export const PRIVATE_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};
