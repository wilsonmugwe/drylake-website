/*
 * Abstract illustrations for the four existing problem statements. Each shows the "before"
 * and, as it scrolls into view (InView + .dl-*-view classes), the Drylake Line resolving it.
 * Decorative only (aria-hidden); no labels, no claims, no client software.
 */

const INK = "rgba(11,11,10,0.55)";
const INK_SOFT = "rgba(11,11,10,0.16)";
const ORANGE = "#f26a2e";

const d = (seconds: number) => ({ ["--d" as string]: `${seconds}s` });

/* 01: the spreadsheet has become the system -> structured records. */
export function SpreadsheetVisual() {
  const cols = 5;
  const rows = 6;
  const shaded = new Set(["1-1", "3-2", "2-4", "4-5", "0-3"]);

  return (
    <svg viewBox="0 0 440 250" aria-hidden="true" className="h-auto w-full">
      <g>
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((__, c) => (
            <rect
              key={`${r}-${c}`}
              x={8 + c * 34}
              y={22 + r * 34}
              width="34"
              height="34"
              fill={shaded.has(`${c}-${r}`) ? "#f2f0e9" : "#fff"}
              stroke={INK_SOFT}
            />
          ))
        )}
        <rect x={8 + 2 * 34} y={22 + 3 * 34} width="34" height="34" fill="none" stroke={ORANGE} strokeWidth="1.5" />
      </g>

      <path
        d="M 186 141 H 232 Q 240 141 240 133 V 70 Q 240 62 248 62 H 258"
        pathLength={1}
        className="dl-path dl-draw-view"
        stroke={INK}
        strokeWidth="1.25"
        style={d(0.1)}
      />
      <path d="M 240 141 V 188 Q 240 196 248 196 H 258" pathLength={1} className="dl-path dl-draw-view" stroke={INK} strokeWidth="1.25" style={d(0.35)} />
      <path d="M 240 129 H 258" pathLength={1} className="dl-path dl-draw-view" stroke={INK} strokeWidth="1.25" style={d(0.25)} />

      {[40, 107, 174].map((y, i) => (
        <g key={y} className="dl-fade-view" style={d(0.6 + i * 0.15)}>
          <rect x="258" y={y} width="174" height="46" rx="4" fill="#fff" stroke={INK_SOFT} />
          <rect x="258" y={y} width="174" height="12" rx="4" fill="#f2f0e9" />
          <circle cx="270" cy={y + 29} r="3" fill={i === 1 ? ORANGE : "rgba(11,11,10,0.35)"} />
          <rect x="282" y={y + 25} width={70 + i * 14} height="7" rx="2" fill="rgba(11,11,10,0.14)" />
          <rect x="398" y={y + 24} width="24" height="9" rx="4.5" fill="none" stroke={INK_SOFT} />
        </g>
      ))}
    </svg>
  );
}

/* 02: the same information entered more than once -> one synchronised record. */
export function DoubleHandlingVisual() {
  const panel = (x: number) => (
    <g>
      <rect x={x} y="24" width="150" height="196" rx="4" fill="#fff" stroke={INK_SOFT} />
      <rect x={x} y="24" width="150" height="20" rx="4" fill="#f2f0e9" />
      {[0, 1, 2, 3, 4].map((row) => (
        <rect
          key={row}
          x={x + 14}
          y={62 + row * 30}
          width={row === 1 ? 104 : 86 + ((row * 17) % 30)}
          height="8"
          rx="2"
          fill={row === 1 ? "rgba(242,106,46,0.35)" : "rgba(11,11,10,0.13)"}
        />
      ))}
    </g>
  );

  return (
    <svg viewBox="0 0 440 240" aria-hidden="true" className="h-auto w-full">
      {panel(12)}
      {panel(278)}

      {/* The double handling: copying across, both ways, by hand. */}
      <g className="dl-fade-out-view" style={d(0.9)}>
        <path d="M 162 86 C 200 60 240 60 278 86" fill="none" stroke={INK} strokeWidth="1" strokeDasharray="3 5" />
        <path d="M 278 106 C 240 132 200 132 162 106" fill="none" stroke={INK} strokeWidth="1" strokeDasharray="3 5" />
      </g>

      {/* One connection that keeps both in step. */}
      <path d="M 162 96 H 278" pathLength={1} className="dl-path dl-draw-view" stroke={ORANGE} strokeWidth="1.5" style={d(1.1)} />
      <g className="dl-fade-view" style={d(1.7)}>
        <circle cx="220" cy="96" r="4" fill={ORANGE} />
        <circle cx="220" cy="96" r="9" fill="none" stroke="rgba(242,106,46,0.35)" />
      </g>
    </svg>
  );
}

/* 03: systems that don't talk to each other -> the gaps closed. */
export function DisconnectedVisual() {
  return (
    <>
      {/* Phones: three systems at a readable scale, not five shrunk to fit. */}
      <DisconnectedRow xs={[40, 220, 400]} width={440} className="h-auto w-full md:hidden" />
      <DisconnectedRow xs={[40, 220, 400, 580, 760]} width={800} className="hidden h-auto w-full md:block" />
    </>
  );
}

function DisconnectedRow({ xs, width, className }: { xs: number[]; width: number; className: string }) {
  return (
    <svg viewBox={`0 0 ${width} 150`} aria-hidden="true" className={className}>
      {xs.map((x, i) => (
        <g key={x}>
          <rect x={x - 30} y="51" width="60" height="48" rx="4" fill="#fff" stroke={i === 2 ? "rgba(11,11,10,0.4)" : INK_SOFT} />
          <rect x={x - 18} y="70" width="36" height="9" rx="2" fill="rgba(11,11,10,0.12)" />
        </g>
      ))}

      {xs.slice(0, -1).map((x, i) => {
        const start = x + 30;
        const end = xs[i + 1] - 30;
        const mid = (start + end) / 2;
        return (
          <g key={x}>
            {/* Broken stubs: each system reaches out and stops short. */}
            <path d={`M ${start} 75 H ${mid - 22}`} stroke={INK} strokeWidth="1.25" className="dl-path" />
            <path d={`M ${mid + 22} 75 H ${end}`} stroke={INK} strokeWidth="1.25" className="dl-path" />
            <path
              d={`M ${mid - 22} 75 H ${mid + 22}`}
              pathLength={1}
              stroke={ORANGE}
              strokeWidth="1.75"
              className="dl-path dl-draw-view"
              style={d(0.35 + i * 0.22)}
            />
          </g>
        );
      })}
    </svg>
  );
}

/* 04: manual follow-up -> a workflow that carries itself. */
export function FollowUpVisual() {
  const steps = [36, 172, 308, 444];

  return (
    <svg viewBox="0 0 480 190" aria-hidden="true" className="h-auto w-full">
      {steps.map((x, i) => (
        <g key={x}>
          <rect x={x - 26} y="72" width="52" height="46" rx="4" fill="#fff" stroke={i === 3 ? "rgba(11,11,10,0.4)" : INK_SOFT} />
          <text
            x={x}
            y="100"
            textAnchor="middle"
            fontSize="11"
            fill="rgba(11,11,10,0.5)"
            style={{ fontFamily: "var(--font-geist-mono), monospace" }}
          >
            0{i + 1}
          </text>
        </g>
      ))}

      {/* Before: each hand-off waits on someone (an email, a reminder). */}
      <g className="dl-fade-out-view" style={d(1)}>
        {steps.slice(0, -1).map((x) => (
          <g key={x}>
            <path d={`M ${x + 26} 95 H ${x + 110}`} stroke={INK} strokeWidth="1" strokeDasharray="3 5" fill="none" />
            <rect x={x + 56} y="34" width="24" height="17" rx="2" fill="#fff" stroke={INK} />
            <path d={`M ${x + 56} 35 L ${x + 68} 44 L ${x + 80} 35`} fill="none" stroke={INK} />
          </g>
        ))}
      </g>

      {/* After: one continuous line, every step triggered by the one before. */}
      <path
        d={`M ${steps[0] + 26} 95 H ${steps[3] - 26}`}
        pathLength={1}
        className="dl-path dl-draw-view"
        stroke={ORANGE}
        strokeWidth="1.5"
        style={d(1.2)}
      />
      {steps.slice(1).map((x, i) => (
        <circle key={x} cx={x - 26} cy="95" r="3.5" fill={ORANGE} className="dl-fade-view" style={d(1.5 + i * 0.15)} />
      ))}
    </svg>
  );
}
