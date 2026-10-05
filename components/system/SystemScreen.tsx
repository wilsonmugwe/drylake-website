import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

import Navbar from "@/components/layout/Navbar";
import Container from "@/components/ui/Container";

const onwardLinks = [
  { label: "What We Do", href: "/solutions" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

interface SystemScreenProps {
  code: string;
  title: string;
  description: string;
  /** Optional extra block under the description (e.g. a retry button, a reference ID). */
  children?: ReactNode;
}

/*
 * Shared shell for system states (404, unexpected error). Reuses the homepage hero
 * treatment (black ground, signal grid, contour rings, white CTA) so an error reads as
 * part of Drylake, not a framework default. Shows no technical detail by design.
 */
export default function SystemScreen({
  code,
  title,
  description,
  children,
}: SystemScreenProps) {
  return (
    <>
    <Navbar />

    <main id="main-content" tabIndex={-1} className="relative flex min-h-[100svh] flex-col overflow-hidden bg-black text-white outline-none">

      <div
        aria-hidden="true"
        className="signal-grid-dark pointer-events-none absolute inset-0 opacity-35"
      />
      <div
        aria-hidden="true"
        className="drylake-contours pointer-events-none absolute inset-0 opacity-70"
      />

      <Container className="relative z-10 flex flex-1 flex-col justify-center pb-16 pt-[128px] sm:pt-[150px]">
        <div className="flex items-center gap-2">
          <span className="signal-dot h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
          <span className="font-mono text-xs tracking-[0.18em] text-white/55">
            {code}
          </span>
        </div>

        <h1 className="mt-5 max-w-[14ch] text-[clamp(3rem,12vw,4.5rem)] font-semibold leading-[0.9] tracking-[-0.07em] sm:text-[clamp(4.5rem,8vw,7rem)]">
          {title}
        </h1>

        <p className="mt-6 max-w-[34rem] text-[0.95rem] leading-6 text-white/58 sm:text-lg sm:leading-7">
          {description}
        </p>

        {children}

        <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
          <Link
            href="/"
            className="button-light group flex min-h-[50px] items-center justify-between gap-4 bg-white px-5 text-sm font-semibold text-black sm:w-fit sm:min-w-[220px] sm:px-6"
          >
            <span>Back to Drylake</span>
            <ArrowUpRight
              size={16}
              className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        <nav
          aria-label="Helpful links"
          className="mt-12 border-t border-white/10 pt-6 sm:mt-16"
        >
          <ul className="flex flex-wrap gap-x-8 gap-y-3">
            {onwardLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-[44px] items-center text-sm font-medium text-white/55 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </main>
    </>
  );
}
