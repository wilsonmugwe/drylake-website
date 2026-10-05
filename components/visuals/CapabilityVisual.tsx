"use client";

import { motion, useReducedMotion } from "motion/react";

interface CapabilityVisualProps {
  type: "software" | "automation" | "integration" | "setup";
}

export default function CapabilityVisual({
  type,
}: CapabilityVisualProps) {
  const reduceMotion = useReducedMotion();

  if (type === "software") {
    return <SoftwareVisual reduceMotion={!!reduceMotion} />;
  }

  if (type === "automation") {
    return <AutomationVisual reduceMotion={!!reduceMotion} />;
  }

  if (type === "integration") {
    return <IntegrationVisual reduceMotion={!!reduceMotion} />;
  }

  return <SetupVisual reduceMotion={!!reduceMotion} />;
}

function Frame({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="tech-panel tech-corner micro-grid relative h-[190px] w-full p-5 sm:h-[210px]">
      <div className="relative z-10 flex items-center justify-between">
        <span className="tech-label text-black/60">{label}</span>

        <div className="flex gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-black/15" />
          <span className="h-1.5 w-1.5 rounded-full bg-black/15" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
        </div>
      </div>

      <div className="relative z-10 h-[calc(100%-24px)]">{children}</div>
    </div>
  );
}

function SoftwareVisual({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <Frame label="APPLICATION / 01">
      <div className="absolute inset-x-0 bottom-0 top-5 border border-black/10 bg-white/85">
        <div className="flex h-7 items-center border-b border-black/10 px-2">
          <div className="h-1.5 w-12 bg-black/15" />
        </div>

        <div className="grid h-[calc(100%-28px)] grid-cols-[46px_1fr]">
          <div className="border-r border-black/10 p-2">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className={`mb-2 h-5 border ${
                  item === 0
                    ? "border-[#f26a2e]/30 bg-[#f26a2e]/10"
                    : "border-black/5 bg-black/[0.025]"
                }`}
              />
            ))}
          </div>

          <div className="p-3">
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((item) => (
                <motion.div
                  key={item}
                  animate={
                    reduceMotion
                      ? undefined
                      : {
                          y: item === 1 ? [0, -3, 0] : [0, 2, 0],
                        }
                  }
                  transition={{
                    duration: 3 + item,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="h-10 border border-black/10 bg-black/[0.025]"
                />
              ))}
            </div>

            <div className="mt-3 space-y-2">
              <div className="h-2 w-[82%] bg-black/10" />
              <div className="h-2 w-[64%] bg-black/[0.07]" />
              <div className="h-2 w-[72%] bg-black/[0.07]" />
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function AutomationVisual({ reduceMotion }: { reduceMotion: boolean }) {
  const labels = ["ENQUIRY", "VALIDATE", "ROUTE", "ACTION"];

  return (
    <Frame label="WORKFLOW / 02">
      <div className="absolute inset-x-1 bottom-4 top-8 flex items-center">
        <div className="absolute left-[7%] right-[7%] top-1/2 h-px bg-black/15" />

        {!reduceMotion && (
          <motion.div
            animate={{ left: ["7%", "90%"] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "linear",
            }}
            className="signal-dot absolute top-[calc(50%-4px)] z-20 h-2 w-2 rounded-full bg-[#f26a2e]"
          />
        )}

        <div className="relative z-10 flex w-full justify-between">
          {labels.map((label, index) => (
            <div key={label} className="flex flex-col items-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border bg-white ${
                  index === 0
                    ? "border-[#f26a2e]/40"
                    : "border-black/15"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    index === 0 ? "bg-[#f26a2e]" : "bg-black/30"
                  }`}
                />
              </div>

              <span className="tech-label mt-3 text-[0.48rem] text-black/60 sm:text-[0.55rem]">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function IntegrationVisual({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <Frame label="INTEGRATION / 03">
      <div className="absolute inset-0">
        {/* connection lines */}
        <div className="absolute left-[21%] top-[38%] h-px w-[29%] origin-left rotate-[18deg] bg-black/15" />
        <div className="absolute left-[21%] bottom-[31%] h-px w-[29%] origin-left -rotate-[18deg] bg-black/15" />
        <div className="absolute right-[21%] top-[38%] h-px w-[29%] origin-right -rotate-[18deg] bg-black/15" />
        <div className="absolute right-[21%] bottom-[31%] h-px w-[29%] origin-right rotate-[18deg] bg-black/15" />

        <Node className="left-[4%] top-[20%]" label="CRM" />
        <Node className="left-[4%] bottom-[12%]" label="DATA" />
        <Node className="right-[4%] top-[20%]" label="APP" />
        <Node className="right-[4%] bottom-[12%]" label="API" />

        <div className="orange-glow absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#f26a2e]/35 bg-white">
          <span className="tech-label text-[0.48rem] text-black/65">
            CORE
          </span>
        </div>

        {!reduceMotion && (
          <motion.div
            animate={{
              x: [-65, 0, 65, 0, -65],
              y: [-28, 0, 28, 0, -28],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="signal-dot absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f26a2e]"
          />
        )}
      </div>
    </Frame>
  );
}

function Node({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <div
      className={`absolute flex h-10 w-14 items-center justify-center border border-black/15 bg-white ${className}`}
    >
      <span className="tech-label text-[0.48rem] text-black/60">
        {label}
      </span>
    </div>
  );
}

function SetupVisual({ reduceMotion }: { reduceMotion: boolean }) {
  const nodes = ["DOMAIN", "DNS", "EMAIL", "SITE"];

  return (
    <Frame label="INFRASTRUCTURE / 04">
      <div className="absolute inset-x-2 bottom-5 top-9">
        <div className="absolute left-[11%] right-[11%] top-[31px] h-px bg-black/15" />

        <div className="relative flex justify-between">
          {nodes.map((node, index) => (
            <div key={node} className="flex flex-col items-center">
              <motion.div
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        borderColor:
                          index === 1
                            ? [
                                "rgba(0,0,0,.15)",
                                "rgba(242,106,46,.7)",
                                "rgba(0,0,0,.15)",
                              ]
                            : undefined,
                      }
                }
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
                className="flex h-16 w-12 items-center justify-center border border-black/15 bg-white sm:w-14"
              >
                <div
                  className={`h-2 w-2 rounded-full ${
                    index === 1 ? "bg-[#f26a2e]" : "bg-black/25"
                  }`}
                />
              </motion.div>

              <span className="tech-label mt-3 text-[0.48rem] text-black/60 sm:text-[0.55rem]">
                {node}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-black/10 pt-2">
          <span className="tech-label text-[0.46rem] text-black/60">
            STATUS
          </span>

          <span className="flex items-center gap-1.5 tech-label text-[0.46rem] text-black/60">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
            CONNECTED
          </span>
        </div>
      </div>
    </Frame>
  );
}