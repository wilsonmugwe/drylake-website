/*
 * Decorative dry-lakebed texture: a network of ground cracks drawn as thin strokes. Authored
 * for the brand story (2026-10-16); no photograph, no raster, no animation (so nothing to
 * pause under prefers-reduced-motion and nothing that can move the layout or the LCP).
 *
 * Inline SVG, well under 3 KB, aria-hidden, pointer-events none. It takes its colour from
 * currentColor, so the parent sets the tone and a low opacity. Server component.
 */
const CRACKS = [
  "M0 70L58 92L104 78L171 118L214 104L290 148L338 136L412 182L470 170L560 214L640 200",
  "M171 118L160 176L98 214L110 280L60 320",
  "M290 148L276 210L318 256L296 320",
  "M412 182L430 244L388 292L402 320",
  "M470 170L520 126L580 134L640 98",
  "M560 214L580 280L632 306",
  "M104 78L92 20L130 0",
  "M338 136L360 70L330 0",
  "M214 104L236 44L210 0",
  "M520 126L540 60L520 0",
  "M0 190L46 176L98 214",
  "M276 210L220 236L196 300L210 320",
  "M318 256L372 262L388 292",
  "M580 134L600 74L640 60",
  "M430 244L488 262L540 250L580 280",
];

export default function DryLakebedTexture({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 640 320"
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
        {CRACKS.map((d) => (
          <path key={d} d={d} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
    </svg>
  );
}
