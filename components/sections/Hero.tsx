"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";

import Container from "@/components/ui/Container";

const nodes = [
  { label: "CRM", position: "left-[2%] top-[18%]" },
  { label: "FINANCE", position: "right-[1%] top-[16%]" },
  { label: "FORMS", position: "left-[4%] bottom-[18%]" },
  { label: "REPORTING", position: "right-[0%] bottom-[18%]" },
];

export default function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      className="
        relative
        overflow-hidden
        bg-black
        text-white
        lg:min-h-[100svh]
      "
    >
      {/* Subtle grid */}
      <div
        aria-hidden="true"
        className="signal-grid-dark pointer-events-none absolute inset-0 opacity-35"
      />

      {/* Drylake contour */}
      <div
        aria-hidden="true"
        className="drylake-contours pointer-events-none absolute inset-0 opacity-70"
      />

      <Container
        className="
          relative
          z-10
          flex
          flex-col
          pb-8
          pt-[112px]
          sm:pb-12
          sm:pt-[138px]
          lg:min-h-[100svh]
          lg:justify-center
          lg:pb-14
          lg:pt-[140px]
        "
      >
        <div className="grid items-center gap-9 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          {/* Copy */}
          <div>
            <motion.div
              initial={
                reduceMotion
                  ? undefined
                  : { opacity: 0, y: 8 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="section-label flex items-center gap-3 text-white/40"
            >
              <span className="signal-dot h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

              <span>Perth / Western Australia</span>

              <span className="hidden text-white/15 sm:inline">
                /
              </span>

              <span className="hidden sm:inline">
                Software Engineering
              </span>
            </motion.div>

            <motion.h1
              initial={
                reduceMotion
                  ? undefined
                  : { opacity: 0, y: 24 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="
                mt-5
                max-w-[920px]
                text-[clamp(3.15rem,14vw,4.5rem)]
                font-semibold
                leading-[0.87]
                tracking-[-0.072em]
                sm:mt-7
                sm:text-[clamp(5rem,10vw,8rem)]
                lg:text-[clamp(5.5rem,7.4vw,8.3rem)]
              "
            >
              Your business
              <br />
              shouldn&apos;t run
              <br />

              <span className="text-white/32">
                on workarounds.
              </span>
            </motion.h1>

            <motion.div
              initial={
                reduceMotion
                  ? undefined
                  : { opacity: 0, y: 12 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.55,
                delay: 0.22,
              }}
              className="mt-5 sm:mt-8"
            >
              <p className="max-w-[38rem] text-[0.92rem] leading-6 text-white/58 sm:text-lg sm:leading-7">
                Drylake builds practical software, automation and connected
                systems for Australian businesses that have outgrown manual
                processes.
              </p>

              <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row">
                <Link
                  href="/contact"
                  className="
                    button-light
                    group
                    flex
                    min-h-[50px]
                    items-center
                    justify-between
                    gap-4
                    bg-white
                    px-5
                    text-sm
                    font-semibold
                    sm:w-fit
                    sm:min-w-[220px]
                    sm:px-6
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
                    min-h-[50px]
                    items-center
                    justify-between
                    gap-4
                    border
                    border-white/18
                    px-5
                    text-sm
                    font-semibold
                    text-white/70
                    transition-colors
                    hover:border-white/35
                    hover:text-white
                    sm:w-fit
                    sm:min-w-[190px]
                  "
                >
                  <span>How we work</span>

                  <ArrowDown
                    size={15}
                    className="transition-transform group-hover:translate-y-0.5"
                  />
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Desktop system/orbit visual */}
          <motion.div
            initial={
              reduceMotion
                ? undefined
                : { opacity: 0, scale: 0.96 }
            }
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.8,
              delay: 0.25,
            }}
            className="relative hidden aspect-square max-h-[520px] lg:block"
          >
            <div className="absolute inset-[7%] rounded-[50%] border border-white/[0.08] [transform:rotate(-12deg)_scaleY(.62)]" />

            <div className="absolute inset-[18%] rounded-[50%] border border-white/[0.07] [transform:rotate(17deg)_scaleY(.68)]" />

            <div className="absolute inset-[29%] rounded-[50%] border border-white/[0.06] [transform:rotate(-24deg)_scaleY(.72)]" />

            {/* Routing lines */}
            <div className="absolute left-[12%] right-[50%] top-1/2 h-px bg-white/10" />
            <div className="absolute left-1/2 right-[12%] top-1/2 h-px bg-white/10" />
            <div className="absolute bottom-[12%] left-1/2 top-1/2 w-px bg-white/10" />
            <div className="absolute bottom-1/2 left-1/2 top-[12%] w-px bg-white/10" />

            {/* Core */}
            <div
              className="
                absolute
                left-1/2
                top-1/2
                flex
                h-[150px]
                w-[150px]
                -translate-x-1/2
                -translate-y-1/2
                flex-col
                items-center
                justify-center
                border
                border-[#f26a2e]/35
                bg-black/80
                backdrop-blur
              "
            >
              <motion.span
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        boxShadow: [
                          "0 0 0 0 rgba(242,106,46,0.15)",
                          "0 0 0 10px rgba(242,106,46,0)",
                          "0 0 0 0 rgba(242,106,46,0)",
                        ],
                      }
                }
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
                className="h-2 w-2 rounded-full bg-[#f26a2e]"
              />

              <span className="mt-4 text-sm font-semibold tracking-[-0.02em]">
                DRYLAKE
              </span>

              <span className="tech-label mt-1 text-white/25">
                Connected system
              </span>
            </div>

            {nodes.map((node, index) => (
              <motion.div
                key={node.label}
                initial={
                  reduceMotion
                    ? undefined
                    : { opacity: 0 }
                }
                animate={{ opacity: 1 }}
                transition={{
                  delay: 0.5 + index * 0.08,
                }}
                className={`absolute ${node.position}`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/30" />

                  <span className="tech-label text-white/32">
                    {node.label}
                  </span>
                </div>
              </motion.div>
            ))}

            {/* Orbiting signal */}
            <motion.div
              animate={
                reduceMotion
                  ? undefined
                  : {
                      rotate: 360,
                    }
              }
              transition={{
                duration: 18,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute inset-[7%]"
            >
              <span className="absolute left-1/2 top-0 h-2 w-2 rounded-full bg-[#f26a2e]" />
            </motion.div>

            <div className="absolute bottom-0 left-0 flex items-center gap-2">
              <span className="tech-label text-white/20">
                SYSTEM STATUS
              </span>

              <ArrowRight size={11} className="text-white/15" />

              <span className="tech-label text-[#f26a2e]/70">
                CONNECTED
              </span>
            </div>
          </motion.div>
        </div>

        {/* Mobile connected-system visual */}
        <motion.div
          initial={
            reduceMotion
              ? undefined
              : { opacity: 0, y: 10 }
          }
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.55,
            delay: 0.32,
          }}
          className="mt-7 border-y border-white/[0.09] py-4 lg:hidden"
        >
          <div className="flex items-center">
            <div className="flex-1">
              <span className="tech-label text-white/25">
                INPUT
              </span>

              <p className="mt-1 text-xs text-white/45">
                Email · Forms · Sheets
              </p>
            </div>

            <div className="mx-3 flex items-center">
              <span className="h-px w-4 bg-white/15" />

              <span className="signal-dot h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

              <span className="h-px w-4 bg-[#f26a2e]/35" />
            </div>

            <div className="flex-1 text-right">
              <span className="tech-label text-[#f26a2e]/75">
                CONNECTED
              </span>

              <p className="mt-1 text-xs font-medium text-white/65">
                One workflow
              </p>
            </div>
          </div>
        </motion.div>

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.56rem] uppercase tracking-[0.13em] text-white/25 sm:mt-8">
          <span>Australian company</span>
          <span>/</span>
          <span>Founder-led</span>
          <span>/</span>
          <span>Perth, WA</span>
        </div>
      </Container>
    </section>
  );
}