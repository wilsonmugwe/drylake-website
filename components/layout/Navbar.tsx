"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useState } from "react";
import Container from "@/components/ui/Container";

const links = [
  { label: "Solutions", href: "/#solutions" },
  { label: "Approach", href: "/#approach" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="absolute inset-x-0 top-0 z-50 text-white">
        <Container>
          <nav className="flex h-20 items-center justify-between lg:h-24">
            <Link href="/" aria-label="Drylake home" className="relative z-50">
              <Image
                src="/brand/drylake-logo-white.png"
                alt="Drylake"
                width={180}
                height={60}
                priority
                className="h-auto w-[125px] object-contain sm:w-[145px]"
              />
            </Link>

            <div className="hidden items-center gap-8 lg:flex">
              {links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-white/65 transition-colors duration-300 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}

              <Link
                href="/contact"
                className="group flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition-transform duration-300 hover:scale-[1.03]"
              >
                Start a Project
                <ArrowUpRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </div>

            <button
              type="button"
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
              className="relative z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/[0.03] lg:hidden"
            >
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
          </nav>
        </Container>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-40 bg-[#080808] text-white lg:hidden"
          >
            <Container className="flex min-h-[100svh] flex-col justify-center">
              <div>
                {links.map((link, index) => (
                  <motion.div
                    key={link.label}
                    initial={{ opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + index * 0.06 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="block border-b border-white/10 py-4 text-[clamp(2.5rem,11vw,4rem)] font-medium tracking-[-0.06em]"
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </div>

              <Link
                href="/contact"
                onClick={() => setOpen(false)}
                className="mt-9 flex items-center justify-between rounded-full bg-white px-6 py-4 font-semibold text-black"
              >
                Start a Project
                <ArrowUpRight size={18} />
              </Link>

              <p className="absolute bottom-7 left-5 text-xs uppercase tracking-[0.18em] text-white/35">
                Innovation · Integrity · Impact
              </p>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}