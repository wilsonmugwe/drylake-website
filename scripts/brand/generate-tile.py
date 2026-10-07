"""
Generates the Drylake cracked-lake-bed tile (logo option 4, chosen by Wilson, adopted by
Ben 2026-10-07, drylake-ops D27) from ONE set of plate paths. Writes the SVG assets; the
raster set (512 PNG, apple icon, favicon.ico, lockups) is rendered from these SVGs.

Geometry is copied verbatim from drylake-ops/brand/logo-final/option4.html: five plates on a
100x100 grid, the fourth plate ochre, gaps drawn as a stroke in the background colour so the
cracks survive at 16 px (wider gap below 40 px).

Run: python3 scripts/brand/generate-tile.py
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

PLATES = [
    "M8 8 H44 L40 38 L8 46 Z",
    "M50 8 H92 V30 L60 40 L46 36 Z",
    "M8 52 L42 44 L52 62 L40 92 H8 Z",
    "M48 42 L62 46 L92 36 V62 L70 70 L56 62 Z",
    "M58 68 L92 68 V92 H46 Z",
]
OCHRE = "#C2703D"
OCHRE_PLATE = 3
TONES = {
    # name: (background, plate ink)
    "dark": ("#0f1013", "#ECEAE4"),
    "light": ("#f6f4ef", "#17191E"),
}


def tile_svg(tone: str, small: bool = False, title: bool = True) -> str:
    bg, ink = TONES[tone]
    gap = 8 if small else 4.5
    plates = "".join(
        f'<path d="{d}" fill="{OCHRE if i == OCHRE_PLATE else ink}" stroke="{bg}" '
        f'stroke-width="{gap}" stroke-linejoin="round"/>'
        for i, d in enumerate(PLATES)
    )
    head = '<title>Drylake</title>' if title else ""
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 4 92 92" width="512" height="512" '
        f'role="img" aria-label="Drylake">{head}'
        f'<clipPath id="t"><rect x="4" y="4" width="92" height="92" rx="18"/></clipPath>'
        f'<g clip-path="url(#t)"><rect x="0" y="0" width="100" height="100" fill="{bg}"/>{plates}</g></svg>\n'
    )


def main() -> None:
    (ROOT / "public/brand/drylake-mark-tile.svg").write_text(tile_svg("dark"))
    (ROOT / "public/brand/drylake-mark-tile-light.svg").write_text(tile_svg("light"))
    (ROOT / "app/icon.svg").write_text(tile_svg("dark", small=True))
    print("wrote tile SVGs")


if __name__ == "__main__":
    main()
