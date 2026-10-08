/*
 * schema.org JSON-LD for the public site. PURE (tests import it directly).
 *
 * Design: every page emits one @graph. The Organization, WebSite and founder Person nodes
 * have stable @id values, so the homepage, About, Solutions, every service page and Contact
 * all describe the SAME organisation rather than several look-alikes. Pages reference the
 * organisation by @id instead of restating it.
 *
 * Logo: the square y mark as a 512 px PNG (Google asks for a raster at least 112 px square
 * that stays legible on a white background). The "Drylake" wordmark artwork replaced the old
 * "DRYLAKE TECHNOLOGIES" image, which was neither the brand nor the legal name.
 *
 * Privacy (reviewed 2026-10-06): only public business facts that help establish the entity.
 *   - No telephone: the number on the site is a founder's personal mobile (drylake-ops D9);
 *     the business email identifies the contact channel. Add a business number when one exists.
 *   - Founders: name, job title and employer only (already public on /about). No credentials,
 *     personal profiles, photos, emails or addresses.
 *
 * Deliberately absent:
 *   - LocalBusiness / street address: Drylake has no public premises; only the locality is
 *     published (pre-launch checklist #14 and #17).
 *   - SearchAction: the site has no search.
 *   - aggregateRating / review: no reviews exist; never invent them.
 */

import {
  ENTITY,
  FOUNDERS,
  ORGANIZATION_ID,
  PUBLIC_PAGES,
  SERVICES,
  type Service,
  SITE_URL,
  WEBSITE_ID,
  absoluteUrl,
} from "./entity.ts";

type Node = Record<string, unknown>;

/** Square brand mark served from /public; tests assert the file exists. */
export const LOGO_PATH = "/brand/drylake-mark-512.png";

const AUSTRALIA = { "@type": "Country", name: ENTITY.country };

const WESTERN_AUSTRALIA = {
  "@type": "State",
  name: ENTITY.region,
  containedInPlace: AUSTRALIA,
};

const PERTH = {
  "@type": "City",
  name: ENTITY.locality,
  containedInPlace: WESTERN_AUSTRALIA,
};

/*
 * Where Drylake works, broadest last: Perth -> Western Australia -> Australia (final refinement
 * PR, 2026-10-08). Based in Perth, not Perth-only; the State was missing between the two.
 */
const AREA_SERVED = [PERTH, WESTERN_AUSTRALIA, AUSTRALIA];

export function organizationNode(): Node {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: ENTITY.brand,
    legalName: ENTITY.legalName,
    alternateName: ["Drylake Pty Ltd", ENTITY.legalName],
    url: ENTITY.url,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl(LOGO_PATH),
      width: 512,
      height: 512,
    },
    description: ENTITY.summary,
    foundingDate: ENTITY.foundingDate,
    email: ENTITY.email,
    taxID: ENTITY.abn,
    identifier: [
      { "@type": "PropertyValue", propertyID: "ABN", value: ENTITY.abn },
      { "@type": "PropertyValue", propertyID: "ACN", value: ENTITY.acn },
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: ENTITY.locality,
      addressRegion: ENTITY.regionCode,
      addressCountry: ENTITY.countryCode,
    },
    location: PERTH,
    areaServed: AREA_SERVED,
    founder: FOUNDERS.map((founder) => ({ "@id": founder.id })),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: ENTITY.email,
      areaServed: ENTITY.countryCode,
      availableLanguage: "en-AU",
    },
    knowsAbout: [
      "Custom software development",
      "Client portals",
      "Business process automation",
      "Systems integration",
      "Applied artificial intelligence",
      // Buyer wording for the ai-automation service line (its page and FAQ back it).
      "AI integration",
      "Website and web application development",
    ],
    /*
     * Organization -> Service, by @id: the five service lines are what this organisation offers.
     * The full Service nodes are emitted on /services and each service page; each Offer also
     * names its Service inline (type, name, url) so the reference resolves on pages that do not
     * carry the full node. No prices or availability: there is nothing to quote, so none is
     * claimed.
     */
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `${ENTITY.brand} services`,
      itemListElement: SERVICES.map((service) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          "@id": nodeId(service.path, "service"),
          name: service.name,
          url: absoluteUrl(service.path),
        },
      })),
    },
    ...(ENTITY.sameAs.length > 0 ? { sameAs: [...ENTITY.sameAs] } : {}),
  };
}

export function founderNodes(): Node[] {
  return FOUNDERS.map((founder) => ({
    "@type": "Person",
    "@id": founder.id,
    name: founder.name,
    jobTitle: founder.jobTitle,
    worksFor: { "@id": ORGANIZATION_ID },
  }));
}

export function websiteNode(): Node {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: ENTITY.brand,
    alternateName: ENTITY.legalName,
    inLanguage: "en-AU",
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export type PageType = "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage";

export type Crumb = { name: string; path: string };

/**
 * The JSON-LD `@id` for a node that belongs to one page, e.g. `https://drylake.com.au/about#webpage`.
 *
 * The homepage uses the trailing-slash form (`https://drylake.com.au/#webpage`) so its page nodes
 * share one base with the site-wide `/#organization` and `/#website` ids. `absoluteUrl("/")`
 * deliberately has no slash (it is the canonical URL), which is why ids are not built from it.
 */
export function nodeId(path: string, fragment: string): string {
  return `${path === "/" ? `${SITE_URL}/` : absoluteUrl(path)}#${fragment}`;
}

export function webPageNode(input: {
  path: string;
  name: string;
  description: string;
  type?: PageType;
  breadcrumb?: readonly Crumb[];
}): Node {
  const url = absoluteUrl(input.path);
  /* Same date as the sitemap's lastmod, so the two freshness signals never disagree. */
  const modified = PUBLIC_PAGES.find((page) => page.path === input.path)?.lastModified;

  return {
    "@type": input.type ?? "WebPage",
    "@id": nodeId(input.path, "webpage"),
    url,
    name: input.name,
    description: input.description,
    ...(modified ? { dateModified: modified } : {}),
    inLanguage: "en-AU",
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
    ...(input.breadcrumb ? { breadcrumb: { "@id": nodeId(input.path, "breadcrumb") } } : {}),
  };
}

export function breadcrumbNode(path: string, crumbs: readonly Crumb[]): Node {
  return {
    "@type": "BreadcrumbList",
    "@id": nodeId(path, "breadcrumb"),
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function serviceNode(service: Service): Node {
  const url = absoluteUrl(service.path);

  return {
    "@type": "Service",
    "@id": nodeId(service.path, "service"),
    name: service.name,
    serviceType: service.serviceType,
    description: service.description,
    url,
    provider: { "@id": ORGANIZATION_ID },
    areaServed: AREA_SERVED,
    mainEntityOfPage: { "@id": nodeId(service.path, "webpage") },
  };
}

export function faqNode(path: string, faqs: readonly { question: string; answer: string }[]): Node {
  return {
    "@type": "FAQPage",
    "@id": nodeId(path, "faq"),
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/* The site-wide identity graph, emitted on every page by the root layout. */
export function siteGraph(): Node[] {
  return [organizationNode(), websiteNode(), ...founderNodes()];
}

export function jsonLd(nodes: Node[]): string {
  // Escape "<" so a value can never close the script element.
  return JSON.stringify({ "@context": "https://schema.org", "@graph": nodes }).replace(/</g, "\\u003c");
}
