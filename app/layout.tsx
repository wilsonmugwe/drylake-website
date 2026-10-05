import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

import OrganizationSchema from "@/components/seo/OrganizationSchema";
import { SHARE_IMAGE, SITE_NAME } from "@/lib/seo";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://drylake.com.au"),

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
      name: "Drylake Pty Ltd",
      url: "https://drylake.com.au",
    },
  ],

  creator: "Drylake Pty Ltd",
  publisher: "Drylake Pty Ltd",

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU">
      <body className={`${geist.variable} ${geistMono.variable}`}>
        <ClerkProvider>
          <OrganizationSchema />

          {children}

          <Analytics />
        </ClerkProvider>
      </body>
    </html>
  );
}