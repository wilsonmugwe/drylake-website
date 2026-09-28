import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import OrganizationSchema from "@/components/seo/OrganizationSchema";
import { Analytics } from "@vercel/analytics/next";

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
    default: "Drylake | Tomorrow Starts Here",
    template: "%s | Drylake",
  },

  description:
    "Drylake builds practical software, automation and technical systems for businesses in Perth and across Australia.",

  applicationName: "Drylake",

  keywords: [
    "Drylake",
    "Drylake Pty Ltd",
    "custom software Perth",
    "software development Perth",
    "business automation Perth",
    "systems integration Perth",
    "technical solutions Perth",
    "custom software Australia",
    "business automation Australia",
  ],

  authors: [{ name: "Drylake Pty Ltd" }],
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
    title: "Drylake | Tomorrow Starts Here",
    description:
      "Practical software, automation and technical systems for Australian businesses.",
  },

  twitter: {
    card: "summary_large_image",
    title: "Drylake | Tomorrow Starts Here",
    description:
      "Practical software, automation and technical systems for Australian businesses.",
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
        <OrganizationSchema />
        {children}
        <Analytics />
      </body>
    </html>
  );
}