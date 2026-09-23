"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useState } from "react";
import Container from "@/components/ui/Container";

const links = [
  { label: "What We Do", href: "/#solutions" },
  { label: "How We Work", href: "/#approach" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* =====================================================
          DESKTOP / MOBILE HEADER
          ===================================================== */}

      <header className="absolute inset-x-0 top-0 z-50 border-b border-black/[0.07] bg-white/90 text-black backdrop-blur-xl">
        <Container>
          <nav className="flex h-20 items-center justify-between lg:h-24">
            {/* Logo */}
            <Link
              href="/"
              aria-label="Drylake home"
              className="relative z-50"
            >
              <Image
                src="/brand/drylake-logo-white.png"
                alt="Drylake"
                width={180}
                height={60}
                priority
                className="h-auto w-[125px] object-contain sm:w-[145px]"
              />
            </Link>

            {/* =================================================
                DESKTOP NAVIGATION
                ================================================= */}

            <div className="hidden items-center gap-8 lg:flex">
              {links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="relative text-sm text-black/60 transition-colors after:absolute after:-bottom-2 after:left-0 after:h-px after:w-0 after:bg-[#f26a2e] after:transition-all hover:text-black hover:after:w-full"
                >
                  {link.label}
                </Link>
              ))}

              {/* Primary CTA */}
              <Link
                href="/contact"
                className="button-dark group flex items-center gap-2 rounded-full border border-black bg-black px-5 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

                <span className="text-white">
                  Start a Project
                </span>

                <ArrowUpRight
                  size={16}
                  className="text-white transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </div>

            {/* =================================================
                MOBILE MENU BUTTON
                ================================================= */}

            <button
              type="button"
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
              className="relative z-50 flex h-11 w-11 items-center justify-center rounded-full border border-black bg-white text-black lg:hidden"
            >
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
          </nav>
        </Container>
      </header>

      {/* =====================================================
          MOBILE NAVIGATION
          ===================================================== */}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{
              duration: 0.45,
              ease: [0.76, 0, 0.24, 1],
            }}
            className="fixed inset-0 z-40 bg-white text-black lg:hidden"
          >
            <Container className="flex min-h-[100svh] flex-col justify-center pt-20">
              <div>
                {links.map((link, index) => (
                  <motion.div
                    key={link.label}
                    initial={{
                      opacity: 0,
                      y: 25,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      delay: 0.1 + index * 0.06,
                    }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between border-b border-black/10 py-4 text-[clamp(2.5rem,11vw,4rem)] font-medium tracking-[-0.06em] text-black"
                    >
                      <span>{link.label}</span>

                      <span className="h-1.5 w-1.5 rounded-full bg-black/20" />
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Mobile CTA */}
              <Link
                href="/contact"
                onClick={() => setOpen(false)}
                className="button-dark mt-9 flex items-center justify-between rounded-full border border-black bg-black px-6 py-4 font-semibold"
              >
                <span className="flex items-center gap-2 text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

                  Start a Project
                </span>

                <ArrowUpRight
                  size={18}
                  className="text-white"
                />
              </Link>

              {/* Bottom tagline */}
              <p className="absolute bottom-7 left-5 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-black/40">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

                Tomorrow Starts Here.
              </p>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}