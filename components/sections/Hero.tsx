"use client";

import Link from "next/link";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import type { MouseEvent } from "react";
import Container from "@/components/ui/Container";

export default function Hero() {
  const reduceMotion = useReducedMotion();

  /* =========================================================
     DESKTOP CURSOR RESPONSE
     ========================================================= */

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const x = useSpring(mouseX, {
    stiffness: 45,
    damping: 20,
  });

  const y = useSpring(mouseY, {
    stiffness: 45,
    damping: 20,
  });

  function handleMouseMove(event: MouseEvent<HTMLElement>) {
    if (reduceMotion) return;

    const rect = event.currentTarget.getBoundingClientRect();

    mouseX.set(
      (event.clientX - rect.left - rect.width / 2) * 0.025
    );

    mouseY.set(
      (event.clientY - rect.top - rect.height / 2) * 0.025
    );
  }

  return (
    <section
      onMouseMove={handleMouseMove}
      className="hero-large-grid relative overflow-hidden bg-[#000000] text-white"
    >
      {/* =====================================================
          BACKGROUND DEPTH
          ===================================================== */}

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_42%,rgba(255,255,255,0.055),transparent_30%)]" />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.015)_45%,transparent_60%)]" />

      {/* Vertical architectural divider */}
      <div className="pointer-events-none absolute bottom-0 right-[30%] top-0 hidden w-px bg-white/[0.045] xl:block" />

      {/* =====================================================
          DESKTOP BULLSEYE / SYSTEM
          ===================================================== */}

      <motion.div
        style={{ x, y }}
        aria-hidden="true"
        className="pointer-events-none absolute right-[-13rem] top-[13%] hidden h-[48rem] w-[48rem] lg:block"
      >
        {/* labels */}

        <span className="tech-label absolute left-[8%] top-[14%] text-white/25">
          SYS / 001
        </span>

        <span className="tech-label absolute bottom-[13%] left-[20%] text-white/20">
          PERTH / WA
        </span>

        <span className="tech-label absolute right-[18%] top-[25%] text-white/20">
          ACTIVE / SYSTEM
        </span>

        {/* Crosshair */}

        <div className="absolute left-1/2 top-0 h-full w-px bg-white/[0.07]" />

        <div className="absolute left-0 top-1/2 h-px w-full bg-white/[0.07]" />

        {/* Crosshair marks */}

        <div className="absolute left-1/2 top-[7%] h-3 w-px -translate-x-1/2 bg-white/30" />

        <div className="absolute bottom-[7%] left-1/2 h-3 w-px -translate-x-1/2 bg-white/30" />

        <div className="absolute left-[7%] top-1/2 h-px w-3 -translate-y-1/2 bg-white/30" />

        <div className="absolute right-[7%] top-1/2 h-px w-3 -translate-y-1/2 bg-white/30" />

        {/* =====================================================
            WHITE BULLSEYE
            ===================================================== */}

        <div className="absolute inset-[2%] rounded-full border border-white/[0.12]" />

        <div className="absolute inset-[13%] rounded-full border border-white/[0.14]" />

        <div className="absolute inset-[27%] rounded-full border border-white/[0.16]" />

        <div className="absolute inset-[39%] rounded-full border border-white/[0.2]" />

        {/* Outer moving orbit */}

        <motion.div
          animate={
            reduceMotion
              ? undefined
              : {
                  rotate: 360,
                }
          }
          transition={{
            duration: 55,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute inset-[7%] rounded-full border border-dashed border-white/20"
        >
          <div className="signal-dot absolute left-1/2 top-[-5px] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#f26a2e]" />

          <div className="absolute bottom-[13%] right-[13%] h-1.5 w-1.5 rounded-full bg-white/50" />
        </motion.div>

        {/* Inner reverse orbit */}

        <motion.div
          animate={
            reduceMotion
              ? undefined
              : {
                  rotate: -360,
                }
          }
          transition={{
            duration: 38,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute inset-[21%] rounded-full border border-dashed border-white/15"
        >
          <div className="absolute right-[10%] top-[18%] h-2 w-2 rounded-full bg-white/60" />
        </motion.div>

        {/* Horizontal connections */}

        <div className="absolute left-[22%] top-[48%] h-px w-[20%] bg-white/20" />

        <div className="absolute right-[22%] top-[48%] h-px w-[20%] bg-white/20" />

        <div className="absolute left-[19%] top-[calc(48%-4px)] h-2 w-2 rounded-full border border-white/40 bg-[#090909]" />

        <div className="absolute right-[19%] top-[calc(48%-4px)] h-2 w-2 rounded-full border border-white/40 bg-[#090909]" />

        {/* Vertical connections */}

        <div className="absolute left-1/2 top-[27%] h-[14%] w-px -translate-x-1/2 bg-white/15" />

        <div className="absolute bottom-[27%] left-1/2 h-[14%] w-px -translate-x-1/2 bg-white/15" />

        {/* =====================================================
            CORE
            ===================================================== */}

        <div className="orange-glow absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-[#090909]">
          <motion.div
            animate={
              reduceMotion
                ? undefined
                : {
                    scale: [1, 1.25, 1],
                  }
            }
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="h-2.5 w-2.5 rounded-full bg-[#f26a2e]"
          />
        </div>

        <span className="tech-label absolute left-[55%] top-[54%] text-white/35">
          DRYLAKE / CORE
        </span>

        {/* Nodes */}

        <div className="absolute left-[29%] top-[27%] flex items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-white/50" />

          <span className="tech-label text-[0.5rem] text-white/25">
            NODE 01
          </span>
        </div>

        <div className="absolute bottom-[25%] right-[27%] flex items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-[#f26a2e]" />

          <span className="tech-label text-[0.5rem] text-white/25">
            SIGNAL
          </span>
        </div>
      </motion.div>

      {/* =====================================================
          MOBILE BULLSEYE
          ===================================================== */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-14 -right-20 h-[250px] w-[250px] sm:h-[300px] sm:w-[300px] lg:hidden"
      >
        <div className="absolute inset-0 rounded-full border border-white/[0.1]" />

        <div className="absolute inset-9 rounded-full border border-white/[0.13]" />

        <div className="absolute inset-[72px] rounded-full border border-white/[0.18]" />

        <div className="absolute left-1/2 top-0 h-full w-px bg-white/[0.06]" />

        <div className="absolute left-0 top-1/2 h-px w-full bg-white/[0.06]" />

        <div className="signal-dot absolute left-1/2 top-9 h-2 w-2 -translate-x-1/2 rounded-full bg-[#f26a2e]" />

        <div className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-[#090909]">
          <div className="h-2 w-2 rounded-full bg-[#f26a2e]" />
        </div>

        <span className="tech-label absolute bottom-6 left-7 text-[0.45rem] text-white/20">
          SYS / 001
        </span>
      </div>

      {/* =====================================================
          HERO CONTENT
          ===================================================== */}

      <Container className="relative z-10 flex min-h-[760px] flex-col justify-center pb-20 pt-32 sm:min-h-[820px] sm:pb-24 sm:pt-36 lg:min-h-[100svh] lg:pb-16 lg:pt-32">
        <div className="max-w-5xl">
          {/* Tagline */}

          <motion.p
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.5,
            }}
            className="section-label mb-4 flex items-center gap-2.5 text-white/45 sm:mb-6 sm:gap-3"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

            Tomorrow Starts Here.
          </motion.p>

          {/* Headline */}

          <motion.h1
            initial={{
              opacity: 0,
              y: 28,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.8,
              delay: 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="max-w-5xl text-[clamp(3.25rem,14vw,5rem)] font-semibold leading-[0.86] tracking-[-0.07em] text-white sm:text-[clamp(4rem,10vw,7rem)] lg:text-[clamp(5rem,9vw,9rem)]"
          >
            The boring part
            <br />
            <span className="text-white/38">
              is the hard part.
            </span>
          </motion.h1>

          {/* Description */}

          <motion.div
            initial={{
              opacity: 0,
              y: 16,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.65,
              delay: 0.27,
            }}
            className="mt-5 sm:mt-7"
          >
            <p className="max-w-xl text-[0.95rem] leading-6 text-white/60 sm:text-lg sm:leading-7">
              Drylake builds software and handles the technical work that gets
              in the way of the work you actually do.
            </p>

            {/* =================================================
                BUTTONS
                ================================================= */}

            <div className="mt-5 flex max-w-md flex-col gap-2.5 sm:mt-7 sm:flex-row sm:gap-3">
              <Link
                href="/contact"
                className="button-light group flex items-center justify-center gap-2 rounded-full border border-white bg-white px-5 py-3.5 text-sm font-semibold sm:px-6 sm:py-4"
              >
                <span>Start a Project</span>

                <ArrowUpRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>

              <Link
                href="#solutions"
                className="group flex items-center justify-center gap-2 rounded-full border border-white/40 bg-transparent px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:border-white sm:px-6 sm:py-4"
              >
                <span className="text-white">
                  See what we do
                </span>

                <ArrowDown
                  size={16}
                  className="text-white transition-transform group-hover:translate-y-0.5"
                />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* =====================================================
            DESKTOP BOTTOM DETAILS
            ===================================================== */}

        <div className="absolute bottom-8 hidden items-center gap-3 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

          <p className="text-xs uppercase tracking-[0.17em] text-white/35">
            Innovation · Integrity · Impact
          </p>
        </div>

        <div className="absolute bottom-8 right-5 hidden items-center gap-3 xl:flex sm:right-8 lg:right-12 xl:right-16">
          <span className="tech-label text-white/25">
            SYSTEM
          </span>

          <div className="h-px w-12 bg-white/15" />

          <span className="tech-label flex items-center gap-2 text-white/35">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

            ACTIVE
          </span>
        </div>
      </Container>
    </section>
  );
}