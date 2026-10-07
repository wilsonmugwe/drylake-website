/*
 * The approved Drylake mark (logo option 2, drylake-ops D22): the ochre y on the dark tile,
 * identical geometry to public/brand/drylake-mark-tile.svg. Inlined so the header paints it
 * with no extra request. Decorative here: the accessible name comes from the link around it.
 */
export const MARK_Y_PATH =
  "M141.63,-46.04 L158.84,-1.42 M176.05,-46.04 L156.71,4.10 C153.61,12.13 146.51,20.49 138.00,20.49 C132.29,20.49 126.54,7.44 122.97,6.27";

export default function DrylakeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className={className}>
      <rect x="0" y="0" width="100" height="100" rx="22" fill="#17191E" />
      <rect x="0.75" y="0.75" width="98.5" height="98.5" rx="21.5" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />
      <g transform="translate(-68.56 60.13) scale(0.7930)">
        <path
          d={MARK_Y_PATH}
          fill="none"
          stroke="#C2703D"
          strokeWidth="14.18"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
