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
     CURSOR RESPONSE
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
      className="light-grid relative flex min-h-[100svh] overflow-hidden bg-white text-black"
    >
      {/* =====================================================
          BACKGROUND DEPTH
          ===================================================== */}

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_38%,rgba(0,0,0,0.055),transparent_28%)]" />

      <div className="pointer-events-none absolute bottom-0 right-[28%] top-0 hidden w-px bg-black/[0.035] xl:block" />

      {/* =====================================================
          DESKTOP SYSTEM VISUAL
          ===================================================== */}

      <motion.div
        style={{ x, y }}
        aria-hidden="true"
        className="pointer-events-none absolute right-[-12rem] top-[13%] hidden h-[48rem] w-[48rem] lg:block"
      >
        {/* Labels */}

        <span className="tech-label absolute left-[8%] top-[14%] text-black/25">
          SYS / 001
        </span>

        <span className="tech-label absolute bottom-[13%] left-[20%] text-black/20">
          PERTH / WA
        </span>

        <span className="tech-label absolute right-[18%] top-[25%] text-black/20">
          ACTIVE / SYSTEM
        </span>

        {/* Crosshair */}

        <div className="absolute left-1/2 top-0 h-full w-px bg-black/[0.045]" />

        <div className="absolute left-0 top-1/2 h-px w-full bg-black/[0.045]" />

        <div className="absolute left-1/2 top-[7%] h-3 w-px -translate-x-1/2 bg-black/20" />

        <div className="absolute bottom-[7%] left-1/2 h-3 w-px -translate-x-1/2 bg-black/20" />

        <div className="absolute left-[7%] top-1/2 h-px w-3 -translate-y-1/2 bg-black/20" />

        <div className="absolute right-[7%] top-1/2 h-px w-3 -translate-y-1/2 bg-black/20" />

        {/* =====================================================
            CONCENTRIC RINGS
            ===================================================== */}

        <div className="absolute inset-[2%] rounded-full border border-black/[0.07]" />

        <div className="absolute inset-[13%] rounded-full border border-black/[0.08]" />

        <div className="absolute inset-[27%] rounded-full border border-black/[0.08]" />

        <div className="absolute inset-[39%] rounded-full border border-black/[0.12]" />

        {/* =====================================================
            ROTATING OUTER SIGNAL
            ===================================================== */}

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
          className="absolute inset-[7%] rounded-full border border-dashed border-black/15"
        >
          <div className="signal-dot absolute left-1/2 top-[-5px] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#f26a2e]" />

          <div className="absolute bottom-[13%] right-[13%] h-1.5 w-1.5 rounded-full bg-black/30" />
        </motion.div>

        {/* =====================================================
            REVERSE INNER SIGNAL
            ===================================================== */}

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
          className="absolute inset-[21%] rounded-full border border-dashed border-black/10"
        >
          <div className="absolute right-[10%] top-[18%] h-2 w-2 rounded-full bg-black/40" />
        </motion.div>

        {/* =====================================================
            CONNECTION LINES
            ===================================================== */}

        <div className="absolute left-[22%] top-[48%] h-px w-[20%] bg-black/15" />

        <div className="absolute right-[22%] top-[48%] h-px w-[20%] bg-black/15" />

        <div className="absolute left-[19%] top-[calc(48%-4px)] h-2 w-2 rounded-full border border-black/30 bg-white" />

        <div className="absolute right-[19%] top-[calc(48%-4px)] h-2 w-2 rounded-full border border-black/30 bg-white" />

        <div className="absolute left-1/2 top-[27%] h-[14%] w-px -translate-x-1/2 bg-black/10" />

        <div className="absolute bottom-[27%] left-1/2 h-[14%] w-px -translate-x-1/2 bg-black/10" />

        {/* =====================================================
            CORE
            ===================================================== */}

        <div className="orange-glow absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#f26a2e]/40 bg-white">
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

        <span className="tech-label absolute left-[55%] top-[54%] text-black/35">
          DRYLAKE / CORE
        </span>

        {/* =====================================================
            DATA MARKERS
            ===================================================== */}

        <div className="absolute left-[29%] top-[27%] flex items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-black/30" />

          <span className="tech-label text-[0.5rem] text-black/20">
            NODE 01
          </span>
        </div>

        <div className="absolute bottom-[25%] right-[27%] flex items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-[#f26a2e]" />

          <span className="tech-label text-[0.5rem] text-black/20">
            SIGNAL
          </span>
        </div>
      </motion.div>

      {/* =====================================================
          MOBILE SYSTEM VISUAL
          ===================================================== */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-16 h-72 w-72 lg:hidden"
      >
        <div className="absolute inset-0 rounded-full border border-black/[0.07]" />

        <div className="absolute inset-10 rounded-full border border-black/[0.08]" />

        <div className="absolute inset-20 rounded-full border border-black/[0.12]" />

        <div className="absolute left-1/2 top-0 h-full w-px bg-black/[0.04]" />

        <div className="absolute left-0 top-1/2 h-px w-full bg-black/[0.04]" />

        <div className="signal-dot absolute left-1/2 top-10 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#f26a2e]" />

        <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f26a2e]/50 bg-white">
          <div className="absolute inset-[5px] rounded-full bg-[#f26a2e]" />
        </div>

        <span className="tech-label absolute bottom-8 left-8 text-[0.48rem] text-black/20">
          SYS / 001
        </span>
      </div>

      {/* =====================================================
          CONTENT
          ===================================================== */}

      <Container className="relative z-10 flex min-h-[100svh] flex-col justify-center pb-12 pt-32 lg:pt-28">
        <div className="max-w-5xl">
          {/* Tagline */}

          <motion.p
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.55,
            }}
            className="section-label mb-6 flex items-center gap-3 text-black/50"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

            Tomorrow Starts Here.
          </motion.p>

          {/* Main headline */}

          <motion.h1
            initial={{
              opacity: 0,
              y: 35,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.85,
              delay: 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="max-w-5xl text-[clamp(3.6rem,10vw,9rem)] font-semibold leading-[0.84] tracking-[-0.075em] text-black"
          >
            The boring part
            <br />
            is the hard part.
          </motion.h1>

          {/* Supporting content */}

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.7,
              delay: 0.3,
            }}
            className="mt-8"
          >
            <p className="max-w-xl text-base leading-7 text-black/65 sm:text-lg">
              Drylake builds software and handles the technical work that gets
              in the way of the work you actually do.
            </p>

            {/* =================================================
                HERO BUTTONS
                ================================================= */}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {/* Black button */}

              <Link
                href="#solutions"
                className="button-dark group flex items-center justify-center gap-2 rounded-full border border-black bg-black px-6 py-4 text-sm font-semibold transition-transform hover:-translate-y-0.5"
              >
                <span className="text-white">
                  See what we do
                </span>

                <ArrowDown
                  size={16}
                  className="text-white transition-transform group-hover:translate-y-0.5"
                />
              </Link>

              {/* White button */}

              <Link
                href="/contact"
                className="button-light group flex items-center justify-center gap-2 rounded-full border border-black bg-white px-6 py-4 text-sm font-semibold transition-transform hover:-translate-y-0.5"
              >
                <span className="text-black">
                  Start a Project
                </span>

                <ArrowUpRight
                  size={16}
                  className="text-black transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* =====================================================
            BOTTOM LEFT
            ===================================================== */}

        <div className="absolute bottom-8 hidden items-center gap-3 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

          <p className="text-xs uppercase tracking-[0.17em] text-black/40">
            Innovation · Integrity · Impact
          </p>
        </div>

        {/* =====================================================
            BOTTOM RIGHT
            ===================================================== */}

        <div className="absolute bottom-8 right-5 hidden items-center gap-3 xl:flex sm:right-8 lg:right-12 xl:right-16">
          <span className="tech-label text-black/25">
            SYSTEM
          </span>

          <div className="h-px w-12 bg-black/15" />

          <span className="tech-label flex items-center gap-2 text-black/35">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

            ACTIVE
          </span>
        </div>
      </Container>
    </section>
  );
}