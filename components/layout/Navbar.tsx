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
import { useEffect, useRef, useState } from "react";
import { Show, UserButton } from "@clerk/nextjs";

import SkipLink from "@/components/layout/SkipLink";
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
  const toggleRef = useRef<HTMLButtonElement>(null);

  const closeMenu = () => setOpen(false);

  /*
   * Keyboard support for the mobile menu (WCAG 2.1.1 / 2.4.3): opening moves focus to the
   * first menu link, Escape closes it and returns focus to the toggle. Subscribes to the
   * keyboard (an external system), so it belongs in an effect.
   */
  useEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>("#mobile-navigation a, #mobile-navigation button")
        ?.focus();
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
    <SkipLink />

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
          {/* =====================================================
              LOGO
          ===================================================== */}

          <Link
            href="/"
            aria-label="Drylake home"
            onClick={closeMenu}
            className="flex shrink-0 items-center"
          >
            {/* Vector wordmark: served as-is (unoptimized), crisp at every size. */}
            <Image
              src="/brand/drylake-wordmark-dark-bg.svg"
              alt="Drylake"
              width={1657}
              height={516}
              priority
              unoptimized
              className="
                h-[30px]
                w-auto
                sm:h-[34px]
                lg:h-[40px]
              "
            />
          </Link>

          {/* =====================================================
              DESKTOP NAVIGATION
          ===================================================== */}

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

            {/* Signed out */}
            <Show when="signed-out">
              <Link
                href="/sign-in"
                className="
                  text-sm
                  font-medium
                  text-white/55
                  transition-colors
                  hover:text-white
                "
              >
                Sign In
              </Link>
            </Show>

            {/* Signed in */}
            <Show when="signed-in">
              <Link
                href="/portal"
                className="
                  flex
                  items-center
                  gap-2
                  text-sm
                  font-medium
                  text-white/60
                  transition-colors
                  hover:text-white
                "
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

            {/* Desktop CTA */}
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
                className="
                  transition-transform
                  group-hover:translate-x-0.5
                  group-hover:-translate-y-0.5
                "
              />
            </Link>
          </div>

          {/* =====================================================
              MOBILE MENU BUTTON
          ===================================================== */}

          <button
            ref={toggleRef}
            type="button"
            aria-label={
              open
                ? "Close navigation"
                : "Open navigation"
            }
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() =>
              setOpen((value) => !value)
            }
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

        {/* =====================================================
            FLOATING MOBILE NAVIGATION
        ===================================================== */}

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
                overflow-hidden
                border
                border-white/[0.16]
                bg-[#0a0a0a]
                shadow-[0_30px_80px_rgba(0,0,0,0.7)]
                sm:left-8
                sm:right-8
                sm:top-[84px]
                lg:hidden
              "
            >
              {/* =================================================
                  PANEL HEADER
              ================================================= */}

              <div className="px-4 pt-4 sm:px-5">
                <div
                  className="
                    flex
                    items-center
                    justify-between
                    border-b
                    border-white/10
                    pb-4
                  "
                >
                  <span className="tech-label text-white/55">
                    Navigation
                  </span>

                  <div className="flex items-center gap-2">
                    <span
                      className="
                        h-1.5
                        w-1.5
                        rounded-full
                        bg-[#f26a2e]
                      "
                    />

                    <span className="tech-label text-white/55">
                      Perth / WA
                    </span>
                  </div>
                </div>

                {/* ===============================================
                    NAVIGATION LINKS
                =============================================== */}

                <nav aria-label="Mobile navigation">
                  {links.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      onClick={closeMenu}
                      className="
                        group
                        flex
                        min-h-[54px]
                        items-center
                        border-b
                        border-white/[0.08]
                        py-2
                      "
                    >
                      <span
                        className="
                          w-10
                          font-mono
                          text-[0.58rem]
                          text-white/55
                        "
                      >
                        {link.number}
                      </span>

                      <span
                        className="
                          flex-1
                          text-[1.05rem]
                          font-medium
                          tracking-[-0.025em]
                          text-white/80
                          transition-colors
                          group-hover:text-white
                        "
                      >
                        {link.label}
                      </span>

                      <ArrowUpRight
                        size={14}
                        className="
                          text-white/20
                          transition-all
                          group-hover:-translate-y-0.5
                          group-hover:translate-x-0.5
                          group-hover:text-[#f26a2e]
                        "
                      />
                    </Link>
                  ))}
                </nav>
              </div>

              {/* =================================================
                  AUTH + CTA
              ================================================= */}

              <div className="px-4 pt-4 sm:px-5">
                {/* Signed out */}
                <Show when="signed-out">
                  <div className="grid grid-cols-2 gap-2">
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
                        text-white/65
                        transition-colors
                        hover:border-white/30
                        hover:text-white
                      "
                    >
                      <LogIn size={14} />

                      <span>Sign In</span>
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
                        text-white/65
                        transition-colors
                        hover:border-white/30
                        hover:text-white
                      "
                    >
                      <UserPlus size={14} />

                      <span>Create Account</span>
                    </Link>
                  </div>
                </Show>

                {/* Signed in */}
                <Show when="signed-in">
                  <div className="grid grid-cols-[1fr_54px] gap-2">
                    <Link
                      href="/portal"
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
                        text-white/65
                        transition-colors
                        hover:border-white/30
                        hover:text-white
                      "
                    >
                      <LayoutDashboard size={14} />

                      <span>Portal</span>
                    </Link>

                    <div
                      className="
                        flex
                        min-h-[46px]
                        items-center
                        justify-center
                        border
                        border-white/15
                      "
                    >
                      <UserButton
                        appearance={{
                          elements: {
                            avatarBox: "h-8 w-8",
                          },
                        }}
                      />
                    </div>
                  </div>
                </Show>

                {/* Primary CTA */}
                <Link
                  href="/contact"
                  onClick={closeMenu}
                  className="
                    group
                    mt-2
                    flex
                    min-h-[52px]
                    items-center
                    justify-between
                    bg-white
                    px-4
                    text-sm
                    font-semibold
                    !text-black
                    transition-colors
                    hover:bg-white/90
                  "
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="
                        h-1.5
                        w-1.5
                        shrink-0
                        rounded-full
                        bg-[#f26a2e]
                      "
                    />

                    <span>
                      Start a Conversation
                    </span>
                  </span>

                  <ArrowUpRight
                    size={16}
                    className="
                      transition-transform
                      group-hover:-translate-y-0.5
                      group-hover:translate-x-0.5
                    "
                  />
                </Link>
              </div>

              {/* =================================================
                  PANEL FOOTER

                  Gives the menu a deliberate ending and prevents
                  the CTA below the menu from visually appearing
                  to be part of the navigation.
              ================================================= */}

              <div className="px-4 pb-5 pt-5 sm:px-5 sm:pb-6">
                <div
                  className="
                    flex
                    min-h-[58px]
                    items-end
                    justify-between
                    gap-4
                    border-t
                    border-white/[0.08]
                    pt-4
                  "
                >
                  <div>
                    <span className="tech-label block text-white/55">
                      Drylake Pty Ltd
                    </span>

                    <span
                      className="
                        mt-1
                        block
                        text-[0.58rem]
                        leading-4
                        text-white/55
                      "
                    >
                      Software · Automation · AI
                    </span>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span
                        className="
                          relative
                          flex
                          h-2
                          w-2
                          items-center
                          justify-center
                        "
                      >
                        <span
                          className="
                            absolute
                            h-2
                            w-2
                            rounded-full
                            bg-[#f26a2e]/20
                          "
                        />

                        <span
                          className="
                            relative
                            h-1
                            w-1
                            rounded-full
                            bg-[#f26a2e]
                          "
                        />
                      </span>

                      <span className="tech-label text-white/55">
                        Perth / WA
                      </span>
                    </div>

                    <span
                      className="
                        mt-1
                        block
                        text-[0.55rem]
                        uppercase
                        tracking-[0.12em]
                        text-white/55
                      "
                    >
                      Australia
                    </span>
                  </div>
                </div>
              </div>

              {/* Orange termination line */}
              <div className="relative h-px bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "72px" }}
                  transition={{
                    duration: 0.55,
                    delay: 0.18,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="
                    absolute
                    bottom-0
                    left-0
                    h-px
                    bg-[#f26a2e]
                  "
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Container>
    </header>
    </>
  );
}
