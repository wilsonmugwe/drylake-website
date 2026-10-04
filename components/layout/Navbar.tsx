"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  LayoutDashboard,
  LogIn,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { Show, UserButton } from "@clerk/nextjs";

import Container from "@/components/ui/Container";

const links = [
  {
    number: "01",
    label: "What We Do",
    href: "/#solutions",
  },
  {
    number: "02",
    label: "How We Work",
    href: "/#approach",
  },
  {
    number: "03",
    label: "About",
    href: "/#about",
  },
  {
    number: "04",
    label: "Contact",
    href: "/contact",
  },
];

function DrylakeMenuIcon({
  open,
}: {
  open: boolean;
}) {
  return (
    <div className="relative h-5 w-6">
      <span
        className={`
          absolute left-0 top-[3px] h-px bg-current
          transition-all duration-300
          ${
            open
              ? "top-[9px] w-6 rotate-45"
              : "w-[18px]"
          }
        `}
      />

      <span
        className={`
          absolute right-0 top-[9px] h-px bg-current
          transition-all duration-300
          ${
            open
              ? "w-0 opacity-0"
              : "w-6 opacity-100"
          }
        `}
      />

      <span
        className={`
          absolute bottom-[3px] left-0 h-px bg-current
          transition-all duration-300
          ${
            open
              ? "bottom-[10px] w-6 -rotate-45"
              : "w-[14px]"
          }
        `}
      />

      {!open && (
        <>
          <span className="absolute right-[4px] top-[1px] h-1 w-1 rounded-full bg-[#f26a2e]" />
          <span className="absolute bottom-[1px] left-[12px] h-1 w-1 rounded-full bg-white/45" />
        </>
      )}
    </div>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  return (
    <header
      className="
        absolute
        inset-x-0
        top-0
        z-50
        border-b
        border-white/[0.08]
        bg-black/95
        text-white
        backdrop-blur-md
      "
    >
      <Container>
        <nav
          className="
            relative
            flex
            h-[82px]
            items-center
            justify-between
            sm:h-[92px]
            lg:h-[104px]
          "
          aria-label="Primary navigation"
        >
          <Link
            href="/"
            aria-label="Drylake home"
            onClick={closeMenu}
            className="flex shrink-0 items-center"
          >
            <Image
              src="/brand/drylake-logo-black.png"
              alt="Drylake Technologies"
              width={1536}
              height={1024}
              priority
              className="
                h-[70px]
                w-[108px]
                object-contain
                sm:h-[78px]
                sm:w-[122px]
                lg:h-[90px]
                lg:w-[140px]
              "
            />
          </Link>

          {/* Desktop */}
          <div className="hidden items-center gap-6 lg:flex">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="
                  text-sm
                  font-medium
                  text-white/55
                  transition-colors
                  hover:text-white
                "
              >
                {link.label}
              </Link>
            ))}

            <Show when="signed-out">
              <Link
                href="/sign-in"
                className="text-sm font-medium text-white/55 transition-colors hover:text-white"
              >
                Sign In
              </Link>
            </Show>

            <Show when="signed-in">
              <Link
                href="/portal"
                className="flex items-center gap-2 text-sm font-medium text-white/60 transition-colors hover:text-white"
              >
                <LayoutDashboard size={14} />
                Portal
              </Link>

              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-9 w-9",
                  },
                }}
              />
            </Show>

            <Link
              href="/contact"
              className="
                group
                ml-1
                flex
                items-center
                gap-3
                border
                border-white
                bg-white
                px-5
                py-3
                text-sm
                font-semibold
                !text-black
                transition-transform
                hover:-translate-y-0.5
              "
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

              <span>Start a Conversation</span>

              <ArrowUpRight
                size={15}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          </div>

          {/* Mobile */}
          <button
            type="button"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen((value) => !value)}
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              border
              border-white/15
              text-white
              transition-colors
              hover:border-white/35
              lg:hidden
            "
          >
            <DrylakeMenuIcon open={open} />
          </button>
        </nav>

        {/* Floating mobile panel */}
        <AnimatePresence>
          {open && (
            <motion.div
              id="mobile-navigation"
              initial={{
                opacity: 0,
                y: -10,
                scale: 0.985,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: -8,
                scale: 0.985,
              }}
              transition={{
                duration: 0.22,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="
                absolute
                left-4
                right-4
                top-[74px]
                z-50
                border
                border-white/15
                bg-[#0b0b0b]
                shadow-2xl
                sm:left-8
                sm:right-8
                sm:top-[84px]
                lg:hidden
              "
            >
              <div className="px-4 pt-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="tech-label text-white/25">
                    Navigation
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

                    <span className="tech-label text-white/25">
                      Perth / WA
                    </span>
                  </div>
                </div>

                <nav aria-label="Mobile navigation">
                  {links.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      onClick={closeMenu}
                      className="
                        group
                        flex
                        min-h-[52px]
                        items-center
                        border-b
                        border-white/[0.08]
                        py-2
                      "
                    >
                      <span className="w-10 font-mono text-[0.58rem] text-white/20">
                        {link.number}
                      </span>

                      <span className="flex-1 text-[1.05rem] font-medium tracking-[-0.025em] text-white/80">
                        {link.label}
                      </span>

                      <ArrowUpRight
                        size={14}
                        className="text-white/20 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#f26a2e]"
                      />
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="grid grid-cols-2 gap-2 p-4">
                <Show when="signed-out">
                  <Link
                    href="/sign-in"
                    onClick={closeMenu}
                    className="
                      flex
                      min-h-[46px]
                      items-center
                      justify-center
                      gap-2
                      border
                      border-white/15
                      text-sm
                      font-medium
                      text-white/70
                    "
                  >
                    <LogIn size={14} />
                    Sign In
                  </Link>

                  <Link
                    href="/sign-up"
                    onClick={closeMenu}
                    className="
                      flex
                      min-h-[46px]
                      items-center
                      justify-center
                      gap-2
                      border
                      border-white/15
                      text-sm
                      font-medium
                      text-white/70
                    "
                  >
                    <UserPlus size={14} />
                    Create Account
                  </Link>
                </Show>

                <Show when="signed-in">
                  <Link
                    href="/portal"
                    onClick={closeMenu}
                    className="
                      col-span-1
                      flex
                      min-h-[46px]
                      items-center
                      justify-center
                      gap-2
                      border
                      border-white/15
                      text-sm
                      font-medium
                      text-white/70
                    "
                  >
                    <LayoutDashboard size={14} />
                    Portal
                  </Link>

                  <div className="flex min-h-[46px] items-center justify-center border border-white/15">
                    <UserButton
                      appearance={{
                        elements: {
                          avatarBox: "h-8 w-8",
                        },
                      }}
                    />
                  </div>
                </Show>

                <Link
                  href="/contact"
                  onClick={closeMenu}
                  className="
                    group
                    col-span-2
                    flex
                    min-h-[50px]
                    items-center
                    justify-between
                    bg-white
                    px-4
                    text-sm
                    font-semibold
                    !text-black
                  "
                >
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
                    Start a Conversation
                  </span>

                  <ArrowUpRight size={16} />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Container>
    </header>
  );
}