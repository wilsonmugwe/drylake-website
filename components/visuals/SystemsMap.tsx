import { TilePlates } from "@/components/brand/DrylakeMark";

/*
 * Hero visual: "disconnected business systems becoming one working system".
 * Seven systems start scattered, joined only by faint dashed workarounds. The workarounds
 * fade, routed Drylake Lines draw from every system into the Drylake layer, each system's
 * status turns orange as its line lands, and three signals travel in once.
 *
 * Pure SVG + CSS keyframes (app/public-site.css), server-rendered, plays once on load,
 * nothing loops. Under reduced motion it renders the finished, connected state.
 * Purely decorative: aria-hidden, the meaning is carried by the hero copy.
 */

type Node = { id: string; label: string; x: number; y: number; w: number; path: string };

const CHAR = 7.4;
const width = (label: string) => Math.round(label.length * CHAR + 40);

/* Desktop: viewBox 640 x 520. Hub ports at y 252 / 270 / 288 on each side. */
const DESKTOP: Node[] = [
  { id: "web", label: "Website", x: 104, y: 96, w: 0, path: "" },
  { id: "email", label: "Email", x: 92, y: 270, w: 0, path: "" },
  { id: "pay", label: "Payments", x: 112, y: 444, w: 0, path: "" },
  { id: "crm", label: "CRM", x: 548, y: 96, w: 0, path: "" },
  { id: "ops", label: "Operations", x: 528, y: 270, w: 0, path: "" },
  { id: "data", label: "Data", x: 544, y: 444, w: 0, path: "" },
  { id: "ai", label: "AI", x: 320, y: 58, w: 0, path: "" },
].map((node) => {
  const w = width(node.label);
  const left = node.x - w / 2;
  const right = node.x + w / 2;
  const paths: Record<string, string> = {
    web: `M ${right} 96 H 190 Q 200 96 200 106 V 242 Q 200 252 210 252 H 250`,
    email: `M ${right} 270 H 250`,
    pay: `M ${right} 444 H 190 Q 200 444 200 434 V 298 Q 200 288 210 288 H 250`,
    crm: `M ${left} 96 H 450 Q 440 96 440 106 V 242 Q 440 252 430 252 H 390`,
    ops: `M ${left} 270 H 390`,
    data: `M ${left} 444 H 450 Q 440 444 440 434 V 298 Q 440 288 430 288 H 390`,
    ai: "M 320 75 V 236",
  };
  return { ...node, w, path: paths[node.id] };
});

/* The "before": dashed workarounds between systems, crossing and redundant. */
const WORKAROUNDS = [
  "M 104 113 C 70 170 60 210 92 253",
  "M 92 287 C 130 340 150 390 112 427",
  "M 150 96 C 250 150 400 40 500 96",
  "M 140 444 C 260 380 380 330 470 287",
  "M 548 113 C 600 200 600 360 544 427",
];

const SIGNALS = ["web", "ops", "pay"];

/* Mobile: viewBox 320 x 300. Systems in two columns, lanes run down into the hub. */
const MOBILE_LEFT = ["Website", "Email", "Payments", "AI"];
const MOBILE_RIGHT = ["CRM", "Operations", "Data"];
const M_CHAR = 7;
const mWidth = (label: string) => Math.round(label.length * M_CHAR + 24);

function NodeBox({
  x,
  y,
  w,
  label,
  delay,
  dotDelay,
  fontSize = 11,
}: {
  x: number;
  y: number;
  w: number;
  label: string;
  delay: number;
  dotDelay: number;
  fontSize?: number;
}) {
  const h = fontSize + 21;

  return (
    <g className="dl-fade-load" style={{ ["--d" as string]: `${delay}s` }}>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx="3" fill="#121210" stroke="rgba(255,255,255,0.16)" />
      <circle cx={x - w / 2 + 11} cy={y} r="2.6" className="dl-dot" style={{ ["--d" as string]: `${dotDelay}s` }} />
      <text
        x={x - w / 2 + 20}
        y={y + fontSize * 0.36}
        fill="rgba(255,255,255,0.78)"
        fontSize={fontSize}
        letterSpacing="0.08em"
        style={{ fontFamily: "var(--font-geist-mono), monospace", textTransform: "uppercase" }}
      >
        {label}
      </text>
    </g>
  );
}

function Hub({ x, y, w, h, delay }: { x: number; y: number; w: number; h: number; delay: number }) {
  return (
    <g className="dl-fade-load" style={{ ["--d" as string]: `${delay}s` }}>
      <rect x={x} y={y} width={w} height={h} rx="6" fill="#0b0b0a" stroke="rgba(242,106,46,0.55)" />
      <g transform={`translate(${x + 12 - 1.3} ${y + h / 2 - 15 - 1.3}) scale(0.326)`}>
        <rect x="4" y="4" width="92" height="92" rx="18" fill="#0f1013" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
        <TilePlates surface="#0f1013" small />
      </g>
      <text x={x + 52} y={y + h / 2 + 5} fill="#fff" fontSize="15" fontWeight="600" letterSpacing="-0.03em">
        Drylake
      </text>
    </g>
  );
}

export default function SystemsMap() {
  return (
    <div aria-hidden="true" className="relative">
      {/* Desktop and tablet */}
      <svg viewBox="0 0 640 520" className="hidden h-auto w-full overflow-visible md:block">
        {WORKAROUNDS.map((d, index) => (
          <path
            key={d}
            d={d}
            className="dl-path dl-workaround"
            stroke="rgba(255,255,255,0.32)"
            strokeWidth="1"
            strokeDasharray="3 5"
            style={{ ["--d" as string]: `${0.15 + index * 0.08}s` }}
          />
        ))}

        {DESKTOP.map((node, index) => (
          <path
            key={node.id}
            id={`sm-${node.id}`}
            d={node.path}
            pathLength={1}
            className="dl-path dl-draw-load"
            stroke="rgba(255,255,255,0.42)"
            strokeWidth="1.25"
            style={{ ["--d" as string]: `${1.25 + index * 0.12}s` }}
          />
        ))}

        <Hub x={250} y={236} w={140} h={68} delay={0.95} />

        {DESKTOP.map((node, index) => (
          <NodeBox
            key={node.id}
            x={node.x}
            y={node.y}
            w={node.w}
            label={node.label}
            delay={0.1 + index * 0.07}
            dotDelay={2.2 + index * 0.12}
          />
        ))}

        {SIGNALS.map((id, index) => (
          <circle key={id} r="3.2" fill="#f26a2e" opacity="0" className="dl-signal">
            <animateMotion dur="1.5s" begin={`${2.9 + index * 0.35}s`} fill="freeze" rotate="auto">
              <mpath href={`#sm-${id}`} />
            </animateMotion>
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;0.12;0.82;1"
              dur="1.5s"
              begin={`${2.9 + index * 0.35}s`}
              fill="freeze"
            />
          </circle>
        ))}
      </svg>

      {/* Phones: two columns of systems, one lane each, into the Drylake layer */}
      <svg viewBox="0 0 320 300" className="block h-auto w-full overflow-visible md:hidden">
        {MOBILE_LEFT.map((label, index) => {
          const y = 22 + index * 46;
          const w = mWidth(label);
          const lane = 112 + index * 10;
          return (
            <path
              key={label}
              id={`smm-l${index}`}
              d={`M ${16 + w} ${y} H ${lane - 8} Q ${lane} ${y} ${lane} ${y + 8} V 236`}
              pathLength={1}
              className="dl-path dl-draw-load"
              stroke="rgba(255,255,255,0.42)"
              strokeWidth="1.25"
              style={{ ["--d" as string]: `${0.9 + index * 0.12}s` }}
            />
          );
        })}

        {MOBILE_RIGHT.map((label, index) => {
          const y = 22 + index * 46;
          const w = mWidth(label);
          const lane = 178 + (MOBILE_RIGHT.length - 1 - index) * 10;
          return (
            <path
              key={label}
              id={`smm-r${index}`}
              d={`M ${304 - w} ${y} H ${lane + 8} Q ${lane} ${y} ${lane} ${y + 8} V 236`}
              pathLength={1}
              className="dl-path dl-draw-load"
              stroke="rgba(255,255,255,0.42)"
              strokeWidth="1.25"
              style={{ ["--d" as string]: `${1 + index * 0.12}s` }}
            />
          );
        })}

        <Hub x={84} y={236} w={152} h={56} delay={0.7} />

        {MOBILE_LEFT.map((label, index) => {
          const w = mWidth(label);
          return (
            <NodeBox
              key={label}
              x={16 + w / 2}
              y={22 + index * 46}
              w={w}
              label={label}
              fontSize={10.5}
              delay={0.1 + index * 0.06}
              dotDelay={1.9 + index * 0.12}
            />
          );
        })}

        {MOBILE_RIGHT.map((label, index) => {
          const w = mWidth(label);
          return (
            <NodeBox
              key={label}
              x={304 - w / 2}
              y={22 + index * 46}
              w={w}
              label={label}
              fontSize={10.5}
              delay={0.15 + index * 0.06}
              dotDelay={2 + index * 0.12}
            />
          );
        })}

        {["smm-l0", "smm-r1"].map((id, index) => (
          <circle key={id} r="3" fill="#f26a2e" opacity="0" className="dl-signal">
            <animateMotion dur="1.3s" begin={`${2.4 + index * 0.4}s`} fill="freeze">
              <mpath href={`#${id}`} />
            </animateMotion>
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;0.12;0.82;1"
              dur="1.3s"
              begin={`${2.4 + index * 0.4}s`}
              fill="freeze"
            />
          </circle>
        ))}
      </svg>
    </div>
  );
}
