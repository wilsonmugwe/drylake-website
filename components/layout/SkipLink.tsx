/*
 * WCAG 2.4.1 Bypass Blocks. Must be the first focusable element on the page. Every public
 * page renders its primary content in <main id="main-content" tabIndex={-1}>, so the target
 * is the same everywhere.
 *
 * Parked above the viewport and slid in on focus. Not `sr-only focus:not-sr-only`: Tailwind's
 * not-sr-only resets position to static and padding to 0, which rendered the link as an
 * unpadded inline strip that pushed the page down instead of a visible overlay.
 */
export const MAIN_CONTENT_ID = "main-content";

export default function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="fixed left-4 top-4 z-[100] -translate-y-[200%] bg-white px-4 py-3 text-sm font-semibold text-black shadow-lg outline outline-2 outline-offset-2 outline-[#f26a2e] focus:translate-y-0"
    >
      Skip to content
    </a>
  );
}
