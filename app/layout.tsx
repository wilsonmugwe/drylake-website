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
    "Drylake builds intelligent software, AI systems and business automation around real business problems.",

  keywords: [
    "Drylake",
    "AI automation",
    "business automation",
    "custom software",
    "AI systems",
    "systems integration",
    "technology company",
    "Australia",
  ],
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