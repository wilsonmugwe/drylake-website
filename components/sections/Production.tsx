import { TilePlates } from "@/components/brand/DrylakeMark";
import InView from "@/components/motion/InView";
import Container from "@/components/ui/Container";

const productionDetails = [
  "Authentication",
  "Permissions",
  "Integrations",
  "Data validation",
  "Monitoring",
  "Backups & recovery",
];

type DiagramNode = { label: string; x: number; y: number; w: number; delay: number };

const W = 196;
const NODES: DiagramNode[] = [
  { label: "Authentication", x: 36, y: 196, w: W, delay: 0.2 },
  { label: "Permissions", x: 276, y: 196, w: W, delay: 0.35 },
  { label: "Data validation", x: 516, y: 196, w: W, delay: 0.5 },
  { label: "Integrations", x: 516, y: 52, w: W, delay: 0.75 },
  { label: "Monitoring", x: 156, y: 52, w: W, delay: 0.9 },
  { label: "Backups & recovery", x: 516, y: 340, w: W, delay: 1.05 },
];

const PATHS = [
  { d: "M 0 222 H 36", delay: 0.1 },
  { d: "M 232 222 H 276", delay: 0.3 },
  { d: "M 472 222 H 516", delay: 0.45 },
  { d: "M 712 222 H 770", delay: 0.6 },
  { d: "M 712 78 H 822 Q 832 78 832 88 V 168", delay: 0.85 },
  { d: "M 832 276 V 356 Q 832 366 822 366 H 712", delay: 1.15 },
];

/* Monitoring watches the request path (dashed: observation, not a step). */
const WATCH = ["M 214 104 V 148 H 134 V 196", "M 294 104 V 148 H 374 V 196"];

/*
 * Production engineering, the darkest and most technical section. The six existing items
 * are drawn as an engineered system: a request passes Authentication, Permissions and Data
 * validation into the system; Integrations feed it, Monitoring watches the path, Backups &
 * recovery sit behind it. Status indicators are the only orange. The diagram is decorative;
 * the same six items are a real list for screen readers and the phone layout.
 */
export default function Production() {
  return (
    <section className="surface-ink-2 relative overflow-hidden">
      <div aria-hidden="true" className="grid-ink pointer-events-none absolute inset-0" />

      <Container className="relative py-20 sm:py-28 lg:py-36">
        <div className="grid gap-8 lg:grid-cols-12">
          <p className="section-label flex items-center gap-2.5 self-start text-white/60 lg:col-span-3 lg:pt-4">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
            Production Matters
          </p>

          <div className="lg:col-span-9">
            <h2 className="type-statement">
              The boring part
              <br />
              <span className="text-white/40">is the hard part.</span>
            </h2>

            <p className="type-lede mt-7 max-w-xl text-white/62">
              We engineer the less visible parts that make software dependable
              when the business starts relying on it.
            </p>
          </div>
        </div>

        <InView className="mt-16 lg:mt-24" threshold={0.25}>
          {/* Wide: the system diagram. */}
          <svg aria-hidden="true" viewBox="0 0 900 420" className="hidden h-auto w-full lg:block">
            {PATHS.map((path) => (
              <path
                key={path.d}
                d={path.d}
                pathLength={1}
                className="dl-path dl-draw-view"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="1.25"
                style={{ ["--d" as string]: `${path.delay}s` }}
              />
            ))}

            {WATCH.map((d) => (
              <path
                key={d}
                d={d}
                className="dl-path dl-fade-view"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1"
                strokeDasharray="3 5"
                style={{ ["--d" as string]: "1.1s" }}
              />
            ))}

            {NODES.map((node) => (
              <g key={node.label} className="dl-fade-view" style={{ ["--d" as string]: `${node.delay}s` }}>
                <rect x={node.x} y={node.y} width={node.w} height="52" rx="4" fill="#0b0b0a" stroke="rgba(255,255,255,0.18)" />
                <circle cx={node.x + 18} cy={node.y + 26} r="3.5" fill="#f26a2e" />
                <circle cx={node.x + 18} cy={node.y + 26} r="8" fill="none" stroke="rgba(242,106,46,0.3)" />
                <text x={node.x + 36} y={node.y + 31} fill="rgba(255,255,255,0.86)" fontSize="15" fontWeight="500" letterSpacing="-0.01em">
                  {node.label}
                </text>
              </g>
            ))}

            {/* The system being protected: the Drylake tile at the end of the line. */}
            <g className="dl-fade-view" style={{ ["--d" as string]: "0.7s" }}>
              <rect x="770" y="168" width="124" height="108" rx="8" fill="#0b0b0a" stroke="rgba(242,106,46,0.55)" />
              <g transform="translate(806.04 196.04) scale(0.5217)">
                <rect x="4" y="4" width="92" height="92" rx="18" fill="#0f1013" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
                <TilePlates surface="#0f1013" />
              </g>
            </g>

            <circle cx="0" cy="222" r="4" fill="#f26a2e" />
          </svg>

          {/* The same six, as a real list: the phone layout, and the diagram's text for screen readers. */}
          <ul className="relative grid gap-px overflow-hidden rounded-[6px] bg-white/10 sm:grid-cols-2 lg:sr-only">
            {productionDetails.map((item, index) => (
              <li
                key={item}
                className="dl-fade-view flex min-h-[64px] items-center gap-4 bg-[#0b0b0a] px-5"
                style={{ ["--d" as string]: `${0.1 + index * 0.08}s` }}
              >
                <span aria-hidden="true" className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                  <span className="absolute h-4 w-4 rounded-full shadow-[0_0_0_1px_rgba(242,106,46,0.35)]" />
                  <span className="h-[7px] w-[7px] rounded-full bg-[#f26a2e]" />
                </span>
                <span className="text-base font-medium tracking-[-0.01em] text-white/86">{item}</span>
              </li>
            ))}
          </ul>
        </InView>
      </Container>
    </section>
  );
}
