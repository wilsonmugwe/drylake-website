"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import Container from "@/components/ui/Container";

export default function ContactCTA() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="hero-large-grid relative overflow-hidden bg-[#090909] py-14 text-white sm:py-20 lg:py-28">
      {/* Background glow */}

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_50%,rgba(255,255,255,0.045),transparent_28%)]" />

      {/* =====================================================
          DESKTOP SYSTEM
          ===================================================== */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-52 top-1/2 hidden h-[40rem] w-[40rem] -translate-y-1/2 lg:block"
      >
        <div className="absolute inset-0 rounded-full border border-white/[0.08]" />

        <div className="absolute inset-[16%] rounded-full border border-white/[0.1]" />

        <div className="absolute inset-[32%] rounded-full border border-white/[0.12]" />

        <div className="absolute left-1/2 top-0 h-full w-px bg-white/[0.04]" />

        <div className="absolute left-0 top-1/2 h-px w-full bg-white/[0.04]" />

        <motion.div
          animate={
            reduceMotion
              ? undefined
              : {
                  rotate: 360,
                }
          }
          transition={{
            duration: 45,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute inset-[8%] rounded-full border border-dashed border-white/15"
        >
          <span className="signal-dot absolute left-1/2 top-[-4px] h-2 w-2 -translate-x-1/2 rounded-full bg-[#f26a2e]" />
        </motion.div>

        <div className="orange-glow absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f26a2e]" />

        <span className="tech-label absolute left-[55%] top-[54%] text-white/25">
          START / 001
        </span>
      </div>

      {/* =====================================================
          MOBILE SYSTEM
          ===================================================== */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-24 h-52 w-52 lg:hidden"
      >
        <div className="absolute inset-0 rounded-full border border-white/[0.08]" />

        <div className="absolute inset-9 rounded-full border border-white/[0.1]" />

        <div className="absolute inset-[72px] rounded-full border border-white/[0.14]" />

        <div className="absolute left-1/2 top-9 h-2 w-2 -translate-x-1/2 rounded-full bg-[#f26a2e]" />
      </div>

      <Container className="relative z-10">
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

          <p className="section-label text-white/45">
            Start a Project
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-7 sm:mt-6 sm:gap-9 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="max-w-5xl text-[clamp(2.8rem,12vw,4.5rem)] font-semibold leading-[0.88] tracking-[-0.065em] text-white sm:text-[clamp(3.5rem,8vw,8rem)]">
              Tell us what is
              <br />

              <span className="text-white/35">
                slowing you down.
              </span>
            </h2>

            <p className="mt-4 max-w-lg text-sm leading-6 text-white/60 sm:mt-6 sm:text-base sm:leading-7">
              Describe the problem in your own words. We&apos;ll start there.
            </p>
          </div>

          <Link
            href="/contact"
            className="button-light group flex w-full items-center justify-between rounded-full border border-white bg-white px-5 py-3.5 text-sm font-semibold transition-transform hover:-translate-y-1 sm:w-fit sm:min-w-[230px] sm:px-6 sm:py-4"
          >
            <span>Start a Project</span>

            <ArrowUpRight
              size={18}
              className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </Link>
        </div>

        {/* Signal line */}

        <div className="mt-8 flex max-w-xl items-center gap-3 border-t border-white/10 pt-4 sm:mt-14 sm:gap-4 sm:pt-5">
          <span className="tech-label text-white/25">
            INPUT
          </span>

          <div className="relative h-px flex-1 bg-white/10">
            <motion.div
              animate={
                reduceMotion
                  ? undefined
                  : {
                      left: ["0%", "100%"],
                    }
              }
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute -top-[3px] h-1.5 w-1.5 rounded-full bg-[#f26a2e]"
            />
          </div>

          <span className="tech-label text-white/25">
            START
          </span>
        </div>
      </Container>
    </section>
  );
}