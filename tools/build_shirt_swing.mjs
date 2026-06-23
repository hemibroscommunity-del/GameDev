/* Build the layered SHIRT swing strip from the owner's hand-drawn grid sheet.

   Input grid: a 5x3 grid (1536x928) of 14 south-swing shirt frames on a light-grey
   background with thin cell dividers.  Each cell holds a small cyan shirt with a
   dark outline, drawn near the cell centre with the natural swing motion.

   Output: public/sprites/gear/shirt/tshirt/swing-south.png -- 14 frames of
   320x320 (matching public/sprites/player/sword-south-body.png), white-base
   grayscale (transparent bg, light fill ~245, dark outline) so the renderer can
   tint it to the player's shirt colour at runtime, aligned to the body torso.

   The cells are registered (shirt centred per cell), so a single global
   transform (uniform SCALE + translate TX/TY about the cell centre) maps every
   cell -> frame while preserving the artist's per-frame motion.  Tune SCALE/TX/TY
   from the preview board, then ship.

   Run:
     node tools/build_shirt_swing.mjs            # write the strip
     node tools/build_shirt_swing.mjs --preview  # also write a body-overlay board
*/
import { readFileSync, writeFileSync } from 'node:fs';
import { decode, encode } from './png.mjs';

const GRID = '/root/.claude/uploads/73c0f056-011c-5271-8583-5160727c3247/81665fb5-IMG_9801.png';
const BODY = 'public/sprites/player/sword-south-body.png';
const OUT  = 'public/sprites/gear/shirt/tshirt/swing-south.png';

const FW = 320, FH = 320, N = 14, COLS = 5, ROWS = 3;

/* ── tunable alignment (about the cell centre) ───────────────────────────── */
const SCALE = 1.82;   // uniform upscale of the drawn shirt
const TX = 152;       // frame-space x the cell-centre maps to (torso centre)
const TY = 162;       // frame-space y the cell-centre maps to
const REFX = 153.6;   // cell-local reference (cell centre x) = gridW/COLS/2
const REFY = 154.6;   // cell-local reference (cell centre y) = gridH/ROWS/2
/* white-base tone shaping */
const FILL_TARGET = 245;  // brightest shirt pixel -> this (matches stand/jog sheets)
const OUTLINE_GAMMA = 1.5; // >1 darkens shadows/outline

const g = decode(readFileSync(GRID));
const GW = g.width, GH = g.height;
const cpw = GW / COLS, cph = GH / ROWS;
const gpx = (x, y) => { const i = (y * GW + x) * 4; return [g.data[i], g.data[i + 1], g.data[i + 2], g.data[i + 3]]; };

/* Per-cell white-base buffer: grayscale value + alpha in cell-local space. */
function cellBuffer(idx) {
  const col = idx % COLS, row = Math.floor(idx / COLS);
  const ox = Math.round(col * cpw), oy = Math.round(row * cph);
  const W = Math.round(cpw), H = Math.round(cph);
  const val = new Float32Array(W * H);   // 0..255 white-base
  const alp = new Uint8Array(W * H);
  let maxV = 1;
  const MARGIN = 16;                      // skip the cell-divider lines
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (x < MARGIN || x >= W - MARGIN || y < MARGIN || y >= H - MARGIN) continue;
    const gx = ox + x, gy = oy + y;
    if (gx >= GW || gy >= GH) continue;
    const [r, gg, b] = gpx(gx, gy);
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
    const isShirt = (mx - mn) > 18 || mx < 120;   // saturated cyan OR dark outline
    if (!isShirt) continue;
    alp[y * W + x] = 255;
    val[y * W + x] = mx;                  // luminance proxy
    if (mx > maxV) maxV = mx;
  }
  // normalize fill to FILL_TARGET, gamma-darken the outline
  for (let i = 0; i < W * H; i++) {
    if (!alp[i]) continue;
    const t = Math.min(1, val[i] / maxV);
    val[i] = Math.round(FILL_TARGET * Math.pow(t, OUTLINE_GAMMA));
  }
  return { W, H, val, alp };
}

/* bilinear sample of (val, alp) at fractional cell-local (lx, ly). */
function sample(buf, lx, ly) {
  const { W, H, val, alp } = buf;
  const x0 = Math.floor(lx), y0 = Math.floor(ly);
  const fx = lx - x0, fy = ly - y0;
  let v = 0, a = 0, wsum = 0;
  for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) {
    const xx = x0 + dx, yy = y0 + dy;
    if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
    const w = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy);
    const i = yy * W + xx;
    a += w * alp[i];
    if (alp[i]) { v += w * val[i]; wsum += w; }
  }
  return [wsum > 0 ? v / wsum : 0, a];
}

/* Render one 320x320 frame (RGBA white-base) from a cell buffer. */
function renderFrame(buf) {
  const out = Buffer.alloc(FW * FH * 4);
  for (let fy = 0; fy < FH; fy++) for (let fx = 0; fx < FW; fx++) {
    const lx = (fx - TX) / SCALE + REFX;
    const ly = (fy - TY) / SCALE + REFY;
    const [v, a] = sample(buf, lx, ly);
    const o = (fy * FW + fx) * 4;
    const val = Math.round(v);
    out[o] = val; out[o + 1] = val; out[o + 2] = val; out[o + 3] = Math.round(a);
  }
  return out;
}

const frames = [];
for (let i = 0; i < N; i++) frames.push(renderFrame(cellBuffer(i)));

// assemble horizontal strip
const strip = Buffer.alloc(N * FW * FH * 4);
const SW = N * FW;
for (let i = 0; i < N; i++) {
  const f = frames[i];
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const s = (y * FW + x) * 4, d = (y * SW + (i * FW + x)) * 4;
    strip[d] = f[s]; strip[d + 1] = f[s + 1]; strip[d + 2] = f[s + 2]; strip[d + 3] = f[s + 3];
  }
}
writeFileSync(OUT, encode({ width: SW, height: FH, data: strip }));
console.log('wrote', OUT, SW + 'x' + FH, '(' + N + ' frames)  SCALE=' + SCALE + ' TX=' + TX + ' TY=' + TY);

if (process.argv.includes('--preview')) {
  const body = decode(readFileSync(BODY));
  const show = [0, 2, 4, 6, 8, 10, 13];
  const cols = show.length;
  const board = Buffer.alloc(cols * FW * FH * 4);
  const BW = cols * FW;
  show.forEach((fi, k) => {
    const dx = k * FW;
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      const bsrc = (y * body.width + (fi * FW + x)) * 4;
      let r = 40, gg = 44, b = 52, a = 255;          // dark backdrop
      const ba = body.data[bsrc + 3];
      if (ba > 20) {                                  // body in faint grey
        const bl = Math.round(0.3 * body.data[bsrc] + 0.59 * body.data[bsrc + 1] + 0.11 * body.data[bsrc + 2]);
        r = gg = b = Math.round(70 + bl * 0.4);
      }
      const f = frames[fi]; const fs = (y * FW + x) * 4;
      if (f[fs + 3] > 20) {                            // shirt in blue over body
        const t = f[fs] / 255, al = f[fs + 3] / 255;
        r = Math.round(r * (1 - al) + (60 * t + 20) * al);
        gg = Math.round(gg * (1 - al) + (110 * t + 20) * al);
        b = Math.round(b * (1 - al) + (220 * t + 35) * al);
      }
      const d = (y * BW + (dx + x)) * 4;
      board[d] = r; board[d + 1] = gg; board[d + 2] = b; board[d + 3] = 255;
    }
  });
  const PV = 'tools/_shirt_swing_preview.png';
  writeFileSync(PV, encode({ width: BW, height: FH, data: board }));
  console.log('preview ->', PV, 'frames', show.join(','));
}
