/*
 * Cracked-lakebed texture as inline SVG: a jittered grid of dark plates separated by ink-coloured
 * cracks, fading out towards the copy. One plate is lit ochre and one crack path is traced in the
 * signal colour, echoing the site hero (cracks that light up as connections). Seeded, so the same
 * flyer always renders the same ground. Original artwork, no third-party imagery.
 */

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function lakebed({ width, height, seed, litRow = 1, litCols = [5, 6] }) {
  const rand = rng(seed);
  const cell = width / 7;
  const cols = 8;
  const rows = Math.ceil(height / cell) + 1;
  const pts = [];
  for (let j = 0; j <= rows; j++) {
    pts.push([]);
    for (let i = 0; i <= cols; i++) {
      const edgeX = i === 0 || i === cols;
      const jx = edgeX ? 0 : (rand() - 0.5) * cell * 0.62;
      const jy = j === 0 ? 0 : (rand() - 0.5) * cell * 0.62;
      pts[j].push([(i * width) / cols + jx, j * cell + jy]);
    }
  }
  const shades = ["#151513", "#181816", "#1c1b18", "#131311", "#1f1e1a"];
  /* The lit plate sits top right, clear of the wordmark and the copy column. */
  const lit = [litCols[Math.floor(rand() * litCols.length)], litRow];
  const polys = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const [a, b, c, d] = [pts[j][i], pts[j][i + 1], pts[j + 1][i + 1], pts[j + 1][i]];
      const fill = i === lit[0] && j === lit[1] ? "#c2703d" : shades[Math.floor(rand() * shades.length)];
      const quads = rand() < 0.3 ? [[a, b, c], [a, c, d]] : [[a, b, c, d]];
      for (const q of quads) {
        const p = q.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
        polys.push(`<polygon points="${p}" fill="${fill}"/>`);
      }
    }
  }
  /* A traced crack: along row lit[1]+1, from the lit plate to the right edge. */
  const trace = pts[lit[1] + 1].slice(lit[0]).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const id = `fade${seed}`;
  return `<svg class="texture" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">
<defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/>
<stop offset=".55" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="${id}"><rect width="${width}" height="${height}" fill="url(#${id}g)"/></mask></defs>
<g mask="url(#${id})" stroke="#0b0b0a" stroke-width="${(cell * 0.06).toFixed(1)}" stroke-linejoin="round">${polys.join("")}</g>
<polyline points="${trace}" fill="none" stroke="#f26a2e" stroke-width="2" stroke-opacity=".7" mask="url(#${id})"/>
</svg>`;
}
