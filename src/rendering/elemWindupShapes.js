/* ═══ v2.3.3619: THE WIND-UPS' SHAPES, DRAWN IN CODE ═══
 *
 * One cell each (data/elemWindup.js WINDUP_SHAPES, WINDUP_FX.CELL px square),
 * drawn into one canvas by rendering/elemWindup.js -- one picture for every
 * piece, so a piece changing shape is never a draw-list rebuild (TRAPS §218).
 * No imports: the node suite calls each one on a stand-in canvas.
 *
 * Every shape has a dark edge.  The lands are what they stand on -- white
 * snow under the snowmen, sand under the mummies, green under the slimes --
 * and a white flake on snow, a tan streak on sand or a green bubble on grass
 * read as nothing without one (the status looks learned this, v2.3.2996).
 *
 * Each draws centred in a cell of side `c` at the context's origin. */

const blob = (g, x, y, r, fill, edge, ew) => {
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
  if (edge) { g.lineWidth = ew || 2; g.strokeStyle = edge; g.stroke(); }
  g.fillStyle = fill; g.fill();
};
const soft = (g, x, y, r, stops) => {
  const rg = g.createRadialGradient(x, y, 0, x, y, r);
  for (const [at, col] of stops) rg.addColorStop(at, col);
  g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
};
const star = (g, x, y, outer, inner, points, rot) => {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = (i & 1) ? inner : outer;
    const a = rot + (i * Math.PI) / points;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.closePath();
};

export const SHAPE_DRAW = Object.freeze({
  /* a six-armed snowflake, each arm with a pair of twigs */
  flake(g, c) {
    const m = c / 2, L = c * 0.42;
    const arms = () => {
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 - Math.PI / 2;
        const ex = m + Math.cos(a) * L, ey = m + Math.sin(a) * L;
        g.moveTo(m, m); g.lineTo(ex, ey);
        const bx = m + Math.cos(a) * L * 0.58, by = m + Math.sin(a) * L * 0.58;
        for (const s of [-1, 1]) {
          const b = a + s * 0.75;
          g.moveTo(bx, by); g.lineTo(bx + Math.cos(b) * L * 0.32, by + Math.sin(b) * L * 0.32);
        }
      }
    };
    g.lineCap = 'round';
    arms(); g.lineWidth = c * 0.13; g.strokeStyle = '#2D6FB5'; g.stroke();
    arms(); g.lineWidth = c * 0.06; g.strokeStyle = '#FFFFFF'; g.stroke();
    blob(g, m, m, c * 0.07, '#E8F6FF');
  },
  /* a four-point twinkle */
  sparkle(g, c) {
    const m = c / 2;
    star(g, m, m, c * 0.42, c * 0.1, 4, -Math.PI / 2);
    g.lineWidth = c * 0.07; g.strokeStyle = '#3A7CC0'; g.stroke();
    g.fillStyle = '#F4FCFF'; g.fill();
    blob(g, m, m, c * 0.08, '#FFFFFF');
  },
  /* a drop of water, its point up (rotated to the way it goes) */
  drop(g, c) {
    const m = c / 2, r = c * 0.24;
    const path = () => {
      g.beginPath();
      g.moveTo(m, m - c * 0.42);
      g.bezierCurveTo(m + r * 0.5, m - c * 0.18, m + r, m - r * 0.2, m + r, m + r * 0.55);
      g.arc(m, m + r * 0.55, r, 0, Math.PI);
      g.bezierCurveTo(m - r, m - r * 0.2, m - r * 0.5, m - c * 0.18, m, m - c * 0.42);
      g.closePath();
    };
    path(); g.lineWidth = c * 0.08; g.strokeStyle = '#174E8C'; g.stroke();
    path();
    const lg = g.createLinearGradient(m, m - c * 0.42, m, m + r * 1.6);
    lg.addColorStop(0, '#BDE6FF'); lg.addColorStop(1, '#2F86DA');
    g.fillStyle = lg; g.fill();
    blob(g, m - r * 0.38, m + r * 0.2, r * 0.26, 'rgba(255,255,255,0.9)');
  },
  /* spray: a fleck of foam */
  spray(g, c) {
    const m = c / 2;
    soft(g, m, m, c * 0.46, [[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(214,240,255,0.95)'], [0.7, 'rgba(120,190,245,0.45)'], [1, 'rgba(120,190,245,0)']]);
  },
  /* an ember: white-hot heart, orange round it, going to nothing */
  ember(g, c) {
    const m = c / 2;
    soft(g, m, m, c * 0.48, [[0, 'rgba(255,214,110,0.9)'], [0.45, 'rgba(255,110,24,0.55)'], [1, 'rgba(214,60,10,0)']]);
    /* a solid spark in the glow, edged dark: a glow alone was lost on sand */
    blob(g, m, m, c * 0.17, '#FFD65A', '#8A2A06', c * 0.06);
    blob(g, m - c * 0.04, m - c * 0.04, c * 0.07, '#FFF8DC');
  },
  /* a tongue of flame, its point up */
  flame(g, c) {
    const m = c / 2;
    const tongue = (w, h, y0) => {
      g.beginPath();
      g.moveTo(m - w, y0);
      g.quadraticCurveTo(m - w * 1.05, y0 - h * 0.55, m, y0 - h);
      g.quadraticCurveTo(m + w * 1.05, y0 - h * 0.55, m + w, y0);
      g.quadraticCurveTo(m, y0 + w * 0.9, m - w, y0);
      g.closePath();
    };
    const base = m + c * 0.3;
    tongue(c * 0.24, c * 0.74, base); g.lineWidth = c * 0.07; g.strokeStyle = '#7A1E06'; g.stroke();
    tongue(c * 0.24, c * 0.74, base); g.fillStyle = '#FF5A12'; g.fill();
    tongue(c * 0.15, c * 0.5, base); g.fillStyle = '#FFB232'; g.fill();
    tongue(c * 0.07, c * 0.26, base); g.fillStyle = '#FFF2B8'; g.fill();
  },
  /* a crooked bolt of lightning */
  bolt(g, c) {
    const pts = [[0.58, 0.06], [0.34, 0.46], [0.54, 0.48], [0.3, 0.94], [0.72, 0.38], [0.5, 0.36], [0.7, 0.06]];
    const path = () => {
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c)));
      g.closePath();
    };
    g.lineJoin = 'round';
    path(); g.lineWidth = c * 0.12; g.strokeStyle = 'rgba(40,90,170,0.95)'; g.stroke();
    path(); g.fillStyle = '#C8F6FF'; g.fill();
    path(); g.lineWidth = c * 0.03; g.strokeStyle = '#FFFFFF'; g.stroke();
  },
  /* a spark: four sharp rays */
  spark(g, c) {
    const m = c / 2;
    soft(g, m, m, c * 0.46, [[0, 'rgba(255,255,220,0.95)'], [0.35, 'rgba(255,240,120,0.5)'], [1, 'rgba(255,240,120,0)']]);
    star(g, m, m, c * 0.4, c * 0.07, 4, 0.4);
    g.lineWidth = c * 0.05; g.strokeStyle = 'rgba(70,90,40,0.9)'; g.stroke();
    g.fillStyle = '#FFF59A'; g.fill();
    blob(g, m, m, c * 0.07, '#FFFFFF');
  },
  /* a streak of wind: a curved stroke, thick in its middle, lying along x */
  streak(g, c) {
    const m = c / 2;
    const path = (th) => {
      g.beginPath();
      g.moveTo(c * 0.04, m + c * 0.04);
      g.quadraticCurveTo(m, m - c * 0.16 - th, c * 0.96, m + c * 0.04);
      g.quadraticCurveTo(m, m - c * 0.16 + th, c * 0.04, m + c * 0.04);
      g.closePath();
    };
    path(c * 0.11); g.lineWidth = c * 0.05; g.strokeStyle = 'rgba(122,92,48,0.85)'; g.stroke();
    path(c * 0.11); g.fillStyle = '#F7EED8'; g.fill();
    path(c * 0.04); g.fillStyle = '#FFFFFF'; g.fill();
  },
  /* a grain of blown sand */
  sand(g, c) {
    blob(g, c / 2, c / 2, c * 0.16, '#EBCB8E', '#7C5A2C', c * 0.07);
    blob(g, c / 2 - c * 0.05, c / 2 - c * 0.05, c * 0.05, '#FFF4D6');
  },
  /* a pebble: a rough stone, lit from above */
  pebble(g, c) {
    const pts = [[0.2, 0.42], [0.36, 0.2], [0.66, 0.18], [0.84, 0.4], [0.78, 0.74], [0.5, 0.84], [0.22, 0.7]];
    const path = () => {
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c)));
      g.closePath();
    };
    path(); g.lineWidth = c * 0.08; g.strokeStyle = '#3B3024'; g.stroke();
    path(); g.fillStyle = '#8A775F'; g.fill();
    g.beginPath(); g.moveTo(0.26 * c, 0.42 * c); g.lineTo(0.38 * c, 0.26 * c); g.lineTo(0.64 * c, 0.24 * c); g.lineTo(0.74 * c, 0.4 * c); g.lineTo(0.5 * c, 0.48 * c); g.closePath();
    g.fillStyle = '#B9A688'; g.fill();
  },
  /* a puff of dust */
  dust(g, c) {
    const m = c / 2;
    soft(g, m, m, c * 0.48, [[0, 'rgba(120,100,78,0.9)'], [0.5, 'rgba(110,92,70,0.6)'], [1, 'rgba(110,92,70,0)']]);
  },
  /* a bubble of goo, a shine on it */
  bubble(g, c) {
    const m = c / 2;
    blob(g, m, m, c * 0.36, 'rgba(126,222,92,0.55)', '#2A6E1E', c * 0.08);
    g.beginPath(); g.arc(m, m, c * 0.24, Math.PI * 1.1, Math.PI * 1.55);
    g.lineWidth = c * 0.07; g.strokeStyle = 'rgba(240,255,232,0.95)'; g.lineCap = 'round'; g.stroke();
  },
  /* a fleck of goo */
  goo(g, c) {
    const m = c / 2;
    blob(g, m, m + c * 0.04, c * 0.24, '#5CC044', '#245E18', c * 0.08);
    blob(g, m - c * 0.08, m - c * 0.04, c * 0.07, '#DAFFCC');
  },
  /* a puff of poison */
  fume(g, c) {
    const m = c / 2;
    soft(g, m, m, c * 0.48, [[0, 'rgba(196,120,240,0.95)'], [0.45, 'rgba(140,64,200,0.8)'], [0.78, 'rgba(90,30,140,0.35)'], [1, 'rgba(90,30,140,0)']]);
    blob(g, m - c * 0.08, m - c * 0.08, c * 0.08, 'rgba(240,210,255,0.7)');
  },
  /* a mote of venom, glowing */
  mote(g, c) {
    const m = c / 2;
    soft(g, m, m, c * 0.44, [[0, 'rgba(250,230,255,1)'], [0.3, 'rgba(206,140,245,0.95)'], [0.65, 'rgba(150,70,210,0.4)'], [1, 'rgba(150,70,210,0)']]);
  },
});
