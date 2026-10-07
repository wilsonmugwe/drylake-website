import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";
import "./public-site.css";

import OrganizationSchema from "@/components/seo/OrganizationSchema";
import { ENTITY } from "@/lib/discovery/entity";
import { SHARE_IMAGE, SITE_NAME } from "@/lib/seo";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/*
 * Mobile viewport (PR 3). viewport-fit=cover lets the fixed header, the mobile menu and the body
 * read env(safe-area-inset-*) (app/public-site.css), so nothing sits under a notch or the home
 * indicator. themeColor tints the mobile browser chrome to the site's ink.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0b0a",
};

export const metadata: Metadata = {
  metadataBase: new URL(ENTITY.url),

  title: {
    default: "Drylake | Operational Software & Automation Australia",
    template: "%s | Drylake",
  },

  description:
    "Drylake builds operational software, automation and connected systems for Australian businesses held back by manual processes and disconnected tools.",

  applicationName: "Drylake",

  keywords: [
    "operational software Australia",
    "custom software Australia",
    "business automation Australia",
    "systems integration Australia",
    "custom software Perth",
    "business automation Perth",
    "software development Perth",
    "Drylake",
    "Drylake Pty Ltd",
  ],

  authors: [
    {
      name: ENTITY.legalName,
      url: ENTITY.url,
    },
  ],

  creator: ENTITY.legalName,
  publisher: ENTITY.legalName,

  // No site-wide canonical: every public page declares its own via pageMetadata(), and a
  // root canonical of "/" made pages without one (the 404, auth screens) claim the homepage.

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  // Defaults only (no url/title): a page that does not set its own share tags must not
  // claim to be the homepage. Public pages set the full set via pageMetadata().
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: SITE_NAME,
    images: [SHARE_IMAGE],
  },

  twitter: {
    card: "summary_large_image",
    images: [SHARE_IMAGE.url],
  },

  category: "technology",

  /*
   * Search Console / Bing Webmaster Tools ownership tokens. Rendered only when set in the
   * Vercel environment (they are public by design, but are per-account, so not hard-coded).
   * DNS TXT verification works too and needs no deploy.
   */
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : {}),
    ...(process.env.BING_SITE_VERIFICATION
      ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } }
      : {}),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /*
     * data-scroll-behavior="smooth": globals.css sets html { scroll-behavior: smooth } for
     * in-page anchors. Since Next 16 the router only switches smooth scrolling off while it
     * positions a NEW page when this attribute is present. Without it the route-change
     * scrollIntoView() chain ran smoothly and pages opened at the bottom (Start a
     * Conversation -> /contact, Back to Drylake -> /, sign-out -> /). Do not remove.
     */
    <html lang="en-AU" data-scroll-behavior="smooth">
      <body className={`${geist.variable} ${geistMono.variable}`}>
        {/* No ClerkProvider here: see components/auth/ClerkScope.tsx. */}
        <OrganizationSchema />

        {children}

        <Analytics />
      </body>
    </html>
  );
}