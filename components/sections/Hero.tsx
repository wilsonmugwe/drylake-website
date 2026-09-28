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
      className="hero-large-grid relative overflow-hidden bg-black text-white"
    >
      {/* Background depth */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_42%,rgba(255,255,255,0.055),transparent_30%)]" />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.015)_45%,transparent_60%)]" />

      <div className="pointer-events-none absolute bottom-0 right-[30%] top-0 hidden w-px bg-white/[0.045] xl:block" />

      {/* Technical coordinate */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-5 top-[118px] hidden items-center gap-3 sm:right-8 sm:flex lg:right-12 lg:top-[138px] xl:right-16"
      >
        <span className="tech-label text-white/20">
          31.95° S / 115.86° E
        </span>

        <span className="h-1 w-1 rounded-full bg-[#f26a2e]" />
      </div>

      {/* Desktop system visual */}
      <motion.div
        style={{ x, y }}
        aria-hidden="true"
        className="pointer-events-none absolute right-[-13rem] top-[13%] hidden h-[48rem] w-[48rem] lg:block"
      >
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

        <div className="absolute left-1/2 top-[7%] h-3 w-px -translate-x-1/2 bg-white/30" />
        <div className="absolute bottom-[7%] left-1/2 h-3 w-px -translate-x-1/2 bg-white/30" />
        <div className="absolute left-[7%] top-1/2 h-px w-3 -translate-y-1/2 bg-white/30" />
        <div className="absolute right-[7%] top-1/2 h-px w-3 -translate-y-1/2 bg-white/30" />

        {/* Rings */}
        <div className="absolute inset-[2%] rounded-full border border-white/[0.12]" />
        <div className="absolute inset-[13%] rounded-full border border-white/[0.14]" />
        <div className="absolute inset-[27%] rounded-full border border-white/[0.16]" />
        <div className="absolute inset-[39%] rounded-full border border-white/[0.2]" />

        {/* Outer orbit */}
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

        {/* Inner orbit */}
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

        {/* Connections */}
        <div className="absolute left-[22%] top-[48%] h-px w-[20%] bg-white/20" />
        <div className="absolute right-[22%] top-[48%] h-px w-[20%] bg-white/20" />

        <div className="absolute left-[19%] top-[calc(48%-4px)] h-2 w-2 rounded-full border border-white/40 bg-black" />
        <div className="absolute right-[19%] top-[calc(48%-4px)] h-2 w-2 rounded-full border border-white/40 bg-black" />

        <div className="absolute left-1/2 top-[27%] h-[14%] w-px -translate-x-1/2 bg-white/15" />
        <div className="absolute bottom-[27%] left-1/2 h-[14%] w-px -translate-x-1/2 bg-white/15" />

        {/* Core */}
        <div className="orange-glow absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black">
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

      {/* Mobile system visual */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -right-20 h-[220px] w-[220px] sm:-bottom-20 sm:-right-20 sm:h-[290px] sm:w-[290px] lg:hidden"
      >
        <div className="absolute inset-0 rounded-full border border-white/[0.08]" />
        <div className="absolute inset-[32px] rounded-full border border-white/[0.11] sm:inset-10" />
        <div className="absolute inset-[64px] rounded-full border border-white/[0.16] sm:inset-[78px]" />

        <div className="absolute left-1/2 top-0 h-full w-px bg-white/[0.05]" />
        <div className="absolute left-0 top-1/2 h-px w-full bg-white/[0.05]" />

        <motion.div
          animate={
            reduceMotion
              ? undefined
              : {
                  rotate: 360,
                }
          }
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute inset-5 rounded-full border border-dashed border-white/[0.12]"
        >
          <div className="signal-dot absolute left-1/2 top-[-4px] h-2 w-2 -translate-x-1/2 rounded-full bg-[#f26a2e]" />
        </motion.div>

        <div className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black">
          <div className="h-2 w-2 rounded-full bg-[#f26a2e]" />
        </div>

        <span className="tech-label absolute bottom-5 left-6 text-[0.42rem] text-white/20">
          SYS / 001
        </span>
      </div>

      {/* Hero content */}
      <Container
        className="
          relative z-10 flex flex-col justify-center
          pb-16 pt-[124px]
          sm:min-h-[720px] sm:pb-20 sm:pt-[145px]
          lg:min-h-[100svh] lg:pb-20 lg:pt-36
        "
      >
        <div className="max-w-5xl">
          <motion.p
            initial={{
              opacity: 0,
              y: 8,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.45,
            }}
            className="section-label mb-3 flex items-center gap-2.5 text-white/45 sm:mb-5 sm:gap-3"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

            Tomorrow Starts Here.
          </motion.p>

          {/* Primary page heading */}
          <motion.h1
            initial={{
              opacity: 0,
              y: 24,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.75,
              delay: 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="
              max-w-5xl
              text-[clamp(3rem,13.5vw,4.8rem)]
              font-semibold
              leading-[0.87]
              tracking-[-0.07em]
              text-white
              sm:text-[clamp(4rem,10vw,7rem)]
              lg:text-[clamp(5rem,9vw,9rem)]
            "
          >
            The boring part
            <br />

            <span className="text-white/38">
              is the hard part.
            </span>
          </motion.h1>

          <motion.div
            initial={{
              opacity: 0,
              y: 14,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.6,
              delay: 0.25,
            }}
            className="mt-4 sm:mt-6 lg:mt-7"
          >
            <p className="max-w-[34rem] text-[0.9rem] leading-[1.55] text-white/60 sm:text-lg sm:leading-7">
              Drylake builds software and handles the technical work that gets
              in the way of the work you actually do.
            </p>

            <div className="mt-4 flex max-w-md flex-col gap-2 sm:mt-6 sm:flex-row sm:gap-3 lg:mt-7">
              <Link
                href="/contact"
                className="button-light group flex items-center justify-center gap-2 rounded-full border border-white bg-white px-5 py-3 text-sm font-semibold sm:px-6 sm:py-4"
              >
                <span>Start a Project</span>

                <ArrowUpRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>

              <Link
                href="#solutions"
                className="group flex items-center justify-center gap-2 rounded-full border border-white/35 bg-transparent px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-white sm:px-6 sm:py-4"
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

        {/* Bottom details */}
        <div className="absolute bottom-7 hidden items-center gap-3 sm:flex lg:bottom-8">
          <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

          <p className="text-xs uppercase tracking-[0.17em] text-white/35">
            Innovation · Integrity · Impact
          </p>
        </div>

        <div className="absolute bottom-8 right-5 hidden items-center gap-3 sm:right-8 lg:right-12 xl:right-16 xl:flex">
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