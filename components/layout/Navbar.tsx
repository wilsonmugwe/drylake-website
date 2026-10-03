"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  LayoutDashboard,
  LogIn,
  Menu,
  UserPlus,
  X,
} from "lucide-react";
import { useState } from "react";
import { Show, UserButton } from "@clerk/nextjs";

import Container from "@/components/ui/Container";

const links = [
  {
    label: "What We Do",
    href: "/#solutions",
  },
  {
    label: "How We Work",
    href: "/#approach",
  },
  {
    label: "About",
    href: "/#about",
  },
  {
    label: "Contact",
    href: "/contact",
  },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  return (
    <>
      {/* =====================================================
          DESKTOP / MAIN NAVBAR
      ===================================================== */}

      <header className="absolute inset-x-0 top-0 z-50 border-b border-white/[0.07] bg-black text-white">
        <Container>
          <nav
            className="flex h-[92px] items-center justify-between sm:h-[100px] lg:h-[112px]"
            aria-label="Primary navigation"
          >
            {/* =================================================
                LOGO
            ================================================= */}

            <Link
              href="/"
              aria-label="Drylake home"
              className="relative z-50 flex shrink-0 items-center"
            >
              <Image
                src="/brand/drylake-logo-black.png"
                alt="Drylake"
                width={1536}
                height={1024}
                priority
                className="
                  h-[82px]
                  w-[125px]
                  object-contain
                  object-center
                  sm:h-[90px]
                  sm:w-[140px]
                  lg:h-[102px]
                  lg:w-[155px]
                  xl:h-[106px]
                  xl:w-[165px]
                "
              />
            </Link>

            {/* =================================================
                DESKTOP NAVIGATION
            ================================================= */}

            <div className="hidden items-center gap-5 lg:flex xl:gap-7">
              {links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="
                    relative
                    text-sm
                    font-medium
                    text-white/70
                    transition-colors
                    after:absolute
                    after:-bottom-2
                    after:left-0
                    after:h-px
                    after:w-0
                    after:bg-[#f26a2e]
                    after:transition-all
                    hover:text-white
                    hover:after:w-full
                  "
                >
                  {link.label}
                </Link>
              ))}

              {/* ===============================================
                  SIGNED OUT
              =============================================== */}

              <Show when="signed-out">
                <div className="ml-1 flex items-center gap-2">
                  <Link
                    href="/sign-in"
                    className="
                      rounded-full
                      px-3
                      py-2
                      text-sm
                      font-medium
                      text-white/70
                      transition-colors
                      hover:text-white
                    "
                  >
                    Sign In
                  </Link>

                  <Link
                    href="/sign-up"
                    className="
                      rounded-full
                      border
                      border-white/20
                      px-4
                      py-2.5
                      text-sm
                      font-medium
                      text-white
                      transition-colors
                      hover:border-white/40
                      hover:bg-white/[0.06]
                    "
                  >
                    Create Account
                  </Link>
                </div>
              </Show>

              {/* ===============================================
                  SIGNED IN

                  /portal performs the server-side role check:
                  Platform admin -> /admin
                  Client user    -> /client
              =============================================== */}

              <Show when="signed-in">
                <div className="ml-1 flex items-center gap-3">
                  <Link
                    href="/portal"
                    className="
                      flex
                      items-center
                      gap-2
                      rounded-full
                      border
                      border-white/20
                      px-4
                      py-2.5
                      text-sm
                      font-medium
                      text-white
                      transition-colors
                      hover:border-white/40
                      hover:bg-white/[0.06]
                    "
                  >
                    <LayoutDashboard size={15} />

                    Portal
                  </Link>

                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: "h-9 w-9",
                      },
                    }}
                  />
                </div>
              </Show>

              {/* ===============================================
                  PRIMARY CTA
              =============================================== */}

              <Link
                href="/contact"
                className="
                  button-light
                  group
                  flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-white
                  bg-white
                  px-5
                  py-3
                  text-sm
                  font-semibold
                  transition-transform
                  hover:-translate-y-0.5
                "
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

                <span>Start a Conversation</span>

                <ArrowUpRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </div>

            {/* =================================================
                MOBILE MENU BUTTON
            ================================================= */}

            <button
              type="button"
              aria-label={
                open ? "Close navigation" : "Open navigation"
              }
              aria-expanded={open}
              aria-controls="mobile-navigation"
              onClick={() => setOpen((value) => !value)}
              className="
                relative
                z-50
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                border
                border-white/30
                bg-black
                text-white
                lg:hidden
              "
            >
              {open ? <X size={18} /> : <Menu size={18} />}
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
            id="mobile-navigation"
            initial={{
              y: "-100%",
            }}
            animate={{
              y: 0,
            }}
            exit={{
              y: "-100%",
            }}
            transition={{
              duration: 0.4,
              ease: [0.76, 0, 0.24, 1],
            }}
            className="
              mobile-dark-grid
              fixed
              inset-0
              z-40
              overflow-y-auto
              bg-black
              text-white
              lg:hidden
            "
          >
            <Container className="flex min-h-[100svh] flex-col justify-center pb-8 pt-[92px]">
              {/* ===============================================
                  PUBLIC LINKS
              =============================================== */}

              <div className="border-t border-white/10">
                {links.map((link, index) => (
                  <motion.div
                    key={link.label}
                    initial={{
                      opacity: 0,
                      y: 10,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      delay: 0.08 + index * 0.045,
                    }}
                  >
                    <Link
                      href={link.href}
                      onClick={closeMenu}
                      className="
                        flex
                        items-center
                        justify-between
                        border-b
                        border-white/10
                        py-3
                        text-[1.45rem]
                        font-medium
                        tracking-[-0.035em]
                        text-white
                        sm:py-3.5
                        sm:text-[1.7rem]
                      "
                    >
                      <span>{link.label}</span>

                      <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* ===============================================
                  AUTHENTICATION
              =============================================== */}

              <div className="mt-5">
                {/* ---------------------------------------------
                    SIGNED OUT
                --------------------------------------------- */}

                <Show when="signed-out">
                  <div className="grid grid-cols-2 gap-2.5">
                    <Link
                      href="/sign-in"
                      onClick={closeMenu}
                      className="
                        flex
                        items-center
                        justify-center
                        gap-2
                        rounded-full
                        border
                        border-white/20
                        px-4
                        py-3
                        text-sm
                        font-semibold
                        text-white
                        transition-colors
                        hover:border-white/40
                        hover:bg-white/[0.05]
                      "
                    >
                      <LogIn size={16} />

                      Sign In
                    </Link>

                    <Link
                      href="/sign-up"
                      onClick={closeMenu}
                      className="
                        flex
                        items-center
                        justify-center
                        gap-2
                        rounded-full
                        border
                        border-white
                        bg-white
                        px-4
                        py-3
                        text-sm
                        font-semibold
                        text-black
                        transition-transform
                        hover:-translate-y-0.5
                      "
                    >
                      <UserPlus size={16} />

                      Create Account
                    </Link>
                  </div>
                </Show>

                {/* ---------------------------------------------
                    SIGNED IN

                    Both desktop and mobile now use /portal.
                --------------------------------------------- */}

                <Show when="signed-in">
                  <div className="flex items-center gap-3">
                    <Link
                      href="/portal"
                      onClick={closeMenu}
                      className="
                        flex
                        flex-1
                        items-center
                        justify-center
                        gap-2
                        rounded-full
                        border
                        border-white/20
                        px-5
                        py-3
                        text-sm
                        font-semibold
                        text-white
                        transition-colors
                        hover:border-white/40
                        hover:bg-white/[0.05]
                      "
                    >
                      <LayoutDashboard size={16} />

                      Portal
                    </Link>

                    <div className="flex h-11 w-11 items-center justify-center">
                      <UserButton
                        appearance={{
                          elements: {
                            avatarBox: "h-10 w-10",
                          },
                        }}
                      />
                    </div>
                  </div>
                </Show>
              </div>

              {/* ===============================================
                  MAIN CTA
              =============================================== */}

              <Link
                href="/contact"
                onClick={closeMenu}
                className="
                  button-light
                  mt-3
                  flex
                  items-center
                  justify-between
                  rounded-full
                  border
                  border-white
                  bg-white
                  px-5
                  py-3
                  text-sm
                  font-semibold
                "
              >
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

                  Start a Conversation
                </span>

                <ArrowUpRight size={17} />
              </Link>

              {/* ===============================================
                  LOCAL IDENTITY
              =============================================== */}

              <div className="mt-5 flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

                <p className="text-[0.62rem] uppercase tracking-[0.16em] text-white/35">
                  Perth, Western Australia
                </p>
              </div>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}