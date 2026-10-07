import { Check } from "lucide-react";

/*
 * Conceptual pictures for the three What We Do capabilities. Built in HTML/CSS (not a
 * scaled SVG) so they reflow: horizontal on wide screens, vertical on phones, labels never
 * shrink below a readable size. Abstract by design: placeholder bars, no product names, no
 * client data, nothing that reads as a screenshot of real software. The few labels restate
 * the capability's own examples. Connectors use the Drylake Line and grow in on view
 * (.dl-grow-x / .dl-grow-y inside an InView wrapper).
 */

function Bar({ w, tone = "ink" }: { w: string; tone?: "ink" | "soft" | "signal" }) {
  const colour =
    tone === "signal" ? "bg-[#f26a2e]/45" : tone === "soft" ? "bg-black/[0.07]" : "bg-black/[0.14]";
  return <span className={`block h-[7px] rounded-[2px] ${colour}`} style={{ width: w }} />;
}

function Chip({ children, active = false }: { children: string; active?: boolean }) {
  return (
    <span
      className={`inline-flex min-h-[34px] items-center gap-2 rounded-[3px] bg-white px-3 font-mono text-[0.68rem] uppercase tracking-[0.12em] ${
        active ? "text-black shadow-[0_0_0_1px_rgba(242,106,46,0.6)]" : "text-black/60 shadow-[0_0_0_1px_rgba(11,11,10,0.12)]"
      }`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#f26a2e]" : "bg-black/25"}`} />
      {children}
    </span>
  );
}

/* Connector between steps: horizontal on lg, vertical below. */
function Link({ delay }: { delay: number }) {
  const style = { ["--d" as string]: `${delay}s` };
  return (
    <span aria-hidden="true" className="relative flex shrink-0 items-center justify-center self-center lg:self-auto">
      <span className="dl-grow-y block h-6 w-px bg-black/35 lg:hidden" style={style} />
      <span className="dl-grow-x hidden h-px w-8 bg-black/35 lg:block xl:w-10" style={style} />
    </span>
  );
}

/* 01 Operational software: an abstract workspace (internal platform + client portal). */
export function SoftwareDiagram() {
  const rows = [
    { w: "62%", pill: "soft" as const },
    { w: "48%", pill: "signal" as const },
    { w: "70%", pill: "soft" as const },
    { w: "40%", pill: "ink" as const },
    { w: "56%", pill: "soft" as const },
  ];

  return (
    <div aria-hidden="true" className="relative pb-10 pr-4 sm:pr-10">
      <div className="overflow-hidden rounded-[6px] bg-white shadow-[0_0_0_1px_rgba(11,11,10,0.1),0_30px_60px_-30px_rgba(11,11,10,0.35)]">
        <div className="flex items-center gap-1.5 border-b border-black/[0.07] px-4 py-3">
          <span className="h-2 w-2 rounded-full bg-black/15" />
          <span className="h-2 w-2 rounded-full bg-black/15" />
          <span className="h-2 w-2 rounded-full bg-black/15" />
          <span className="ml-4 h-[7px] w-24 rounded-[2px] bg-black/[0.08]" />
        </div>

        <div className="grid grid-cols-[88px_1fr] sm:grid-cols-[120px_1fr]">
          <div className="space-y-3 border-r border-black/[0.07] p-4">
            {[70, 55, 80, 45, 60].map((w, i) => (
              <span key={w} className="flex items-center gap-2">
                <span className={`h-full w-[2px] self-stretch ${i === 1 ? "bg-[#f26a2e]" : "bg-transparent"}`} />
                <Bar w={`${w}%`} tone={i === 1 ? "ink" : "soft"} />
              </span>
            ))}
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <Bar w="38%" />
              <span className="h-6 w-16 rounded-[3px] bg-[#0b0b0a]" />
            </div>

            <div className="mt-5 divide-y divide-black/[0.06] border-y border-black/[0.06]">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5">
                  <span className="h-3 w-3 shrink-0 rounded-[2px] shadow-[0_0_0_1px_rgba(11,11,10,0.18)]" />
                  <span className="flex-1">
                    <Bar w={row.w} tone="soft" />
                  </span>
                  <span
                    className={`h-[14px] w-12 shrink-0 rounded-full ${
                      row.pill === "signal" ? "bg-[#f26a2e]/25 shadow-[0_0_0_1px_rgba(242,106,46,0.5)]" : row.pill === "ink" ? "bg-black/15" : "bg-black/[0.06]"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* A client-portal card in front: the same data, the customer's view. */}
      <div className="absolute bottom-0 right-0 w-[46%] min-w-[150px] rounded-[6px] bg-[#0b0b0a] p-4 shadow-[0_24px_50px_-20px_rgba(11,11,10,0.6)]">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
          <span className="h-[6px] w-16 rounded-[2px] bg-white/30" />
        </span>
        <span className="mt-4 block h-[6px] w-[80%] rounded-[2px] bg-white/15" />
        <span className="mt-2 block h-[6px] w-[60%] rounded-[2px] bg-white/15" />
        <span className="mt-4 block h-1 w-full overflow-hidden rounded-full bg-white/10">
          <span className="dl-grow-x block h-full w-[64%] bg-[#f26a2e]" style={{ ["--d" as string]: "0.4s" }} />
        </span>
      </div>
    </div>
  );
}

/* 02 Automation + integration: one workflow, connected into the systems already in use. */
export function WorkflowDiagram() {
  const steps = ["Form", "Approval", "Notify", "Sync"];

  return (
    <div aria-hidden="true" className="rounded-[6px] bg-white/60 p-5 shadow-[0_0_0_1px_rgba(11,11,10,0.08)] sm:p-7">
      <div className="flex flex-col items-center lg:flex-row lg:items-center lg:justify-between">
        {steps.map((step, i) => (
          <div key={step} className="flex flex-col items-center lg:flex-row">
            <Chip active={i === steps.length - 1}>{step}</Chip>
            {i < steps.length - 1 ? <Link delay={0.15 + i * 0.2} /> : null}
          </div>
        ))}
      </div>

      <div className="mt-2 flex justify-center lg:justify-end lg:pr-8">
        <span aria-hidden="true" className="dl-grow-y block h-8 w-px bg-[#f26a2e]" style={{ ["--d" as string]: "0.85s" }} />
      </div>

      <div className="grid grid-cols-3 gap-2.5 border-t border-dashed border-black/15 pt-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="dl-fade-view rounded-[4px] bg-white p-3 shadow-[0_0_0_1px_rgba(11,11,10,0.1)]" style={{ ["--d" as string]: `${1 + i * 0.12}s` }}>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
              <Bar w="70%" tone="soft" />
            </span>
            <span className="mt-3 block">
              <Bar w="90%" tone="soft" />
            </span>
            <span className="mt-1.5 block">
              <Bar w="60%" tone="soft" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 03 Applied AI: a document read, its fields extracted, a person checks, a record lands. */
export function AiDiagram() {
  return (
    <div aria-hidden="true" className="rounded-[6px] bg-[#0b0b0a] p-5 text-white sm:p-7">
      <div className="flex flex-col items-stretch gap-0 lg:flex-row lg:items-center">
        {/* Document */}
        <div className="rounded-[4px] bg-white/[0.06] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.1)] lg:w-[34%]">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-white/55">Document</span>
          <span className="mt-3 block space-y-2">
            {["85%", "70%", "92%", "54%"].map((w, i) => (
              <span key={w} className={`block h-[6px] rounded-[2px] ${i === 1 || i === 3 ? "bg-[#f26a2e]/70" : "bg-white/15"}`} style={{ width: w }} />
            ))}
          </span>
        </div>

        <span aria-hidden="true" className="flex justify-center lg:block">
          <span className="dl-grow-y block h-6 w-px bg-white/30 lg:hidden" style={{ ["--d" as string]: "0.2s" }} />
          <span className="dl-grow-x hidden h-px w-8 bg-white/30 lg:block" style={{ ["--d" as string]: "0.2s" }} />
        </span>

        {/* Extracted fields */}
        <div className="flex-1 space-y-2 rounded-[4px] p-1">
          {["62%", "48%"].map((w, i) => (
            <span key={w} className="dl-fade-view flex items-center gap-2 rounded-[3px] bg-white/[0.04] px-3 py-2.5 shadow-[0_0_0_1px_rgba(242,106,46,0.35)]" style={{ ["--d" as string]: `${0.45 + i * 0.15}s` }}>
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-white/58">0{i + 1}</span>
              <span className="block h-[6px] rounded-[2px] bg-[#f26a2e]/70" style={{ width: w }} />
            </span>
          ))}
        </div>

        <span aria-hidden="true" className="flex justify-center lg:block">
          <span className="dl-grow-y block h-6 w-px bg-white/30 lg:hidden" style={{ ["--d" as string]: "0.8s" }} />
          <span className="dl-grow-x hidden h-px w-8 bg-white/30 lg:block" style={{ ["--d" as string]: "0.8s" }} />
        </span>

        {/* Human review before anything is relied on */}
        <div className="dl-fade-view flex items-center gap-3 rounded-[4px] bg-white/[0.06] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.1)] lg:w-[26%]" style={{ ["--d" as string]: "1s" }}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f26a2e] text-[#0b0b0a]">
            <Check size={15} strokeWidth={2.5} />
          </span>
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-white/70">Review</span>
        </div>
      </div>
    </div>
  );
}
