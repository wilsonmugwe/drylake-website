import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

import OrganizationSchema from "@/components/seo/OrganizationSchema";

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

  alternates: {
    canonical: "/",
  },

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

  openGraph: {
    type: "website",
    locale: "en_AU",
    url: "https://drylake.com.au",
    siteName: "Drylake",

    title: "Drylake | Operational Software & Automation Australia",

    description:
      "Operational software, automation and connected systems for Australian businesses that have outgrown manual processes and disconnected tools.",

    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Drylake — Operational Software & Automation",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title: "Drylake | Operational Software & Automation Australia",

    description:
      "Operational software, automation and connected systems for Australian businesses that have outgrown manual processes and disconnected tools.",

    images: ["/opengraph-image.png"],
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