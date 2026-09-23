import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Drylake | Tomorrow Starts Here",
    template: "%s | Drylake",
  },

  description:
    "Drylake builds practical software and technical systems for Australian businesses.",

  keywords: [
    "Drylake",
    "custom software",
    "business automation",
    "systems integration",
    "technical setup",
    "technology company",
    "Perth technology company",
    "Australian technology company",
    "Perth",
    "Western Australia",
    "Australia",
  ],

  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}