"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
} from "lucide-react";
import Container from "@/components/ui/Container";
const inputs = [
  "Email",
  "Forms",
  "Spreadsheets",
  "Existing software",
];
const outputs = [
  "CRM",
  "Finance",
  "Reporting",
  "Automation",
];
export default function Hero() {
  const reduceMotion = useReducedMotion();
  return (
    <section className="hero-large-grid relative min-h-[100svh] overflow-hidden bg-black text-white">
      {/* Background depth */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_42%,rgba(242,106,46,0.08),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.012)_45%,transparent_65%)]" />
      {/* Architectural divider */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-[42%] top-0 hidden w-px bg-white/[0.06] xl:block"
      />
      <Container
        className="
          relative z-10
          flex min-h-[100svh] flex-col
          pb-10 pt-[122px]
          sm:pb-12 sm:pt-[140px]
          lg:justify-center lg:pb-16 lg:pt-[150px]
        "
      >
        <div className="grid flex-1 items-center gap-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.72fr)] lg:gap-14 xl:gap-20">
          {/* =====================================================
              LEFT
          ===================================================== */}
          <div className="relative z-10">
            <motion.div
              initial={
                reduceMotion
                  ? undefined
                  : {
                      opacity: 0,
                      y: 8,
                    }
              }
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.45,
              }}
              className="section-label mb-5 flex items-center gap-3 text-white/45 sm:mb-7"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
              <span>Perth, Western Australia</span>
              <span className="hidden text-white/20 sm:inline">
                /
              </span>
              <span className="hidden sm:inline">
                Software Engineering
              </span>
            </motion.div>
            {/* Main headline */}
            <motion.h1
              initial={
                reduceMotion
                  ? undefined
                  : {
                      opacity: 0,
                      y: 26,
                    }
              }
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
                max-w-[900px]
                text-[clamp(3.35rem,14vw,5.2rem)]
                font-semibold
                leading-[0.84]
                tracking-[-0.075em]
                text-white
                sm:text-[clamp(4.8rem,10vw,7.5rem)]
                lg:text-[clamp(5.3rem,7.6vw,8.2rem)]
              "
            >
              Your business
              <br />
              shouldn&apos;t run
              <br />
              <span className="text-white/38">
                on workarounds.
              </span>
            </motion.h1>
            {/* Supporting copy */}
            <motion.div
              initial={
                reduceMotion
                  ? undefined
                  : {
                      opacity: 0,
                      y: 14,
                    }
              }
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.6,
                delay: 0.24,
              }}
              className="mt-6 sm:mt-8"
            >
              <p className="max-w-[39rem] text-[0.98rem] leading-[1.65] text-white/65 sm:text-lg sm:leading-7">
                Drylake builds practical software and automation
                for Australian businesses that have outgrown
                manual processes, disconnected systems and
                everyday workarounds.
              </p>
              <p className="mt-3 max-w-[36rem] text-sm leading-6 text-white/35 sm:text-[0.95rem]">
                From repetitive admin and disconnected tools to
                software that fits the way your business actually
                works.
              </p>
              {/* CTAs */}
              <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:gap-3">
                <Link
                  href="/contact"
                  className="
                    button-light
                    group
                    flex
                    items-center
                    justify-center
                    gap-2
                    rounded-full
                    border
                    border-white
                    bg-white
                    px-6
                    py-3.5
                    text-sm
                    font-semibold
                    transition-transform
                    hover:-translate-y-0.5
                    sm:px-7
                    sm:py-4
                  "
                >
                  <span>Start a conversation</span>
                  <ArrowUpRight
                    size={16}
                    className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </Link>
                <Link
                  href="#approach"
                  className="
                    group
                    flex
                    items-center
                    justify-center
                    gap-2
                    rounded-full
                    border
                    border-white/25
                    bg-transparent
                    px-6
                    py-3.5
                    text-sm
                    font-semibold
                    text-white
                    transition-colors
                    hover:border-white/55
                    sm:px-7
                    sm:py-4
                  "
                >
                  <span>See how we work</span>
                  <ArrowDown
                    size={16}
                    className="transition-transform group-hover:translate-y-0.5"
                  />
                </Link>
              </div>
            </motion.div>
          </div>
          {/* =====================================================
              DESKTOP SYSTEM VISUAL
          ===================================================== */}
          <motion.div
            initial={
              reduceMotion
                ? undefined
                : {
                    opacity: 0,
                    x: 24,
                  }
            }
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              duration: 0.8,
              delay: 0.28,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative hidden lg:block"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="tech-label text-white/30">
                Illustrative system
              </span>
              <span className="flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.14em] text-white/30">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
                Connected
              </span>
            </div>
            <div className="relative border border-white/[0.12] bg-black/55 p-5 backdrop-blur-sm xl:p-6">
              {/* Corner markers */}
              <div className="absolute left-0 top-0 h-4 w-px bg-white/35" />
              <div className="absolute left-0 top-0 h-px w-4 bg-white/35" />
              <div className="absolute bottom-0 right-0 h-4 w-px bg-white/35" />
              <div className="absolute bottom-0 right-0 h-px w-4 bg-white/35" />
              {/* Current state */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="tech-label text-white/30">
                    Business today
                  </span>
                  <span className="tech-label text-[#f26a2e]/70">
                    Fragmented
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {inputs.map((item, index) => (
                    <motion.div
                      key={item}
                      initial={
                        reduceMotion
                          ? undefined
                          : {
                              opacity: 0,
                              y: 8,
                            }
                      }
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay: 0.42 + index * 0.06,
                      }}
                      className="border border-white/[0.1] bg-white/[0.025] px-3 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
                        <span className="text-xs text-white/55">
                          {item}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              {/* Direction */}
              <div className="relative flex h-16 items-center justify-center">
                <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/[0.13]" />
                <motion.div
                  animate={
                    reduceMotion
                      ? undefined
                      : {
                          y: [-5, 5, -5],
                        }
                  }
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black"
                >
                  <ArrowDown
                    size={12}
                    className="text-[#f26a2e]"
                  />
                </motion.div>
              </div>
              {/* Connected system */}
              <div className="border border-[#f26a2e]/45 bg-[#f26a2e]/[0.055]">
                <div className="flex items-center justify-between border-b border-[#f26a2e]/20 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="orange-glow h-2 w-2 rounded-full bg-[#f26a2e]" />
                    <span className="text-sm font-semibold text-white">
                      Operations System
                    </span>
                  </div>
                  <span className="tech-label text-white/25">
                    Drylake
                  </span>
                </div>
                <div className="grid grid-cols-2">
                  {outputs.map((item, index) => (
                    <div
                      key={item}
                      className={`
                        flex items-center gap-2.5 px-4 py-3
                        ${
                          index < 2
                            ? "border-b border-white/[0.07]"
                            : ""
                        }
                        ${
                          index % 2 === 0
                            ? "border-r border-white/[0.07]"
                            : ""
                        }
                      `}
                    >
                      <Check
                        size={12}
                        strokeWidth={2}
                        className="text-[#f26a2e]"
                      />
                      <span className="text-xs text-white/55">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Outcome */}
              <div className="mt-5 flex items-center justify-between border-t border-white/[0.08] pt-4">
                <span className="tech-label text-white/25">
                  One connected workflow
                </span>
                <ArrowRight
                  size={14}
                  className="text-white/30"
                />
              </div>
            </div>
            <p className="mt-3 max-w-sm text-[0.65rem] leading-5 text-white/25">
              Conceptual example only. Every system is designed
              around the business, workflow and existing
              technology.
            </p>
          </motion.div>
        </div>
        {/* =====================================================
            MOBILE SYSTEM VISUAL
        ===================================================== */}
        <motion.div
          initial={
            reduceMotion
              ? undefined
              : {
                  opacity: 0,
                  y: 12,
                }
          }
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.6,
            delay: 0.35,
          }}
          className="mt-10 border-y border-white/[0.09] py-5 lg:hidden"
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="tech-label text-white/30">
              From workaround
            </span>
            <ArrowRight
              size={13}
              className="text-[#f26a2e]"
            />
            <span className="tech-label text-white/50">
              To workflow
            </span>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="space-y-1.5">
              <div className="border border-white/[0.08] px-3 py-2 text-[0.68rem] text-white/40">
                Email
              </div>
              <div className="border border-white/[0.08] px-3 py-2 text-[0.68rem] text-white/40">
                Spreadsheets
              </div>
              <div className="border border-white/[0.08] px-3 py-2 text-[0.68rem] text-white/40">
                Forms
              </div>
            </div>
            <ArrowRight
              size={14}
              className="text-white/25"
            />
            <div className="border border-[#f26a2e]/40 bg-[#f26a2e]/[0.055] px-3 py-4">
              <span className="mb-1 block text-[0.65rem] uppercase tracking-[0.12em] text-[#f26a2e]">
                Connected
              </span>
              <span className="text-sm font-semibold text-white">
                Operations system
              </span>
            </div>
          </div>
        </motion.div>
        {/* =====================================================
            TRUST STRIP
        ===================================================== */}
        <motion.div
          initial={
            reduceMotion
              ? undefined
              : {
                  opacity: 0,
                }
          }
          animate={{
            opacity: 1,
          }}
          transition={{
            duration: 0.6,
            delay: 0.55,
          }}
          className="
            mt-8
            flex
            flex-wrap
            items-center
            gap-x-4
            gap-y-2
            border-t
            border-white/[0.08]
            pt-5
            text-[0.62rem]
            uppercase
            tracking-[0.14em]
            text-white/30
            sm:gap-x-5
            lg:mt-12
          "
        >
          <span>Australian company</span>
          <span className="text-white/12">/</span>
          <span>Founder-led</span>
          <span className="text-white/12">/</span>
          <span>Perth, WA</span>
          <span className="text-white/12">/</span>
          <span>ABN 70 702 662 557</span>
        </motion.div>
      </Container>
    </section>
  );
}