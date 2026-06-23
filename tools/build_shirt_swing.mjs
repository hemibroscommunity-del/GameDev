/* Build the layered SHIRT swing strip from the owner's hand-drawn grid sheet.

   Input grid: a 5x3 grid (1536x928) of 14 south-swing shirt frames on a light-grey
   background with thin cell dividers.  Each cell holds a small cyan shirt with a
   dark outline, drawn near the cell centre with the natural swing motion.

   Output: public/sprites/gear/shirt/tshirt/swing-south.png -- 14 frames of
   320x320 (matching public/sprites/player/sword-south-body.png), white-base
   grayscale (transparent bg, light fill ~245, dark outline) so the renderer can
   tint it to the player's shirt colour at runtime, aligned to the body torso.

   PER-FRAME alignment: the body lunges/shifts inside its swing frames (the torso
   centre sweeps ~36px across the swing), and the chest/legs gear sheets were
   authored to track it frame-by-frame.  A single global transform leaves the
   shirt behind on the lunge frames ("flies off the body").  So each shirt frame
   is re-centred onto the body torso for THAT frame, using the already-aligned
   chest plate (steelplate/swing-south.png) as the per-frame torso anchor; SCALE
   and the small DY nudge are the only free knobs.  Tune from the preview, ship.

   Run:
     node tools/build_shirt_swing.mjs            # write the strip
     node tools/build_shirt_swing.mjs --preview  # also write a body-overlay board
*/
import { readFileSync, writeFileSync } from 'node:fs';
import { decode, encode } from './png.mjs';

const GRID  = '/root/.claude/uploads/73c0f056-011c-5271-8583-5160727c3247/81665fb5-IMG_9801.png';
const BODY  = 'public/sprites/player/sword-south-body.png';
const PLATE = 'public/sprites/gear/chest/steelplate/swing-south.png';
const OUT   = 'public/sprites/gear/shirt/tshirt/swing-south.png';

const FW = 320, FH = 320, N = 14, COLS = 5, ROWS = 3;

/* ── tunable alignment ───────────────────────────────────────────────────── */
/* Hybrid: a FIXED source reference (the cell centre, which preserves each
   frame's drawn pose) is retargeted to the PER-FRAME body-torso centre (the
   chest plate, which tracks the lunge).  A rigid global transform drifts ~30px
   off the torso by the late frames; per-frame bbox-centring is too noisy
   because the shirt's shape changes.  This tracks the body and keeps the pose. */
const SCALE = 1.82;   // uniform upscale of the drawn shirt
const DX = 0;         // shirt centre nudge vs the torso centre, frame-x
const DY = -2;        // shirt centre nudge vs the torso centre, frame-y
const REFX = 153.6, REFY = 154.6;  // cell centre (gridW/COLS/2, gridH/ROWS/2)
/* white-base tone shaping */
const FILL_TARGET = 245;   // brightest shirt pixel -> this (matches stand/jog sheets)
const OUTLINE_GAMMA = 1.5; // >1 darkens shadows/outline

const g = decode(readFileSync(GRID));
const GW = g.width, GH = g.height;
const cpw = GW / COLS, cph = GH / ROWS;
const gpx = (x, y) => { const i = (y * GW + x) * 4; return [g.data[i], g.data[i + 1], g.data[i + 2], g.data[i + 3]]; };

/* Per-frame torso anchor: centre of the chest-plate opaque region for each
   frame (the plate is already aligned to the lunging body, so it tracks the
   torso through the swing). */
const plate = decode(readFileSync(PLATE));
function plateCenter(fi) {
  let minx = 999, maxx = -1, miny = 999, maxy = -1;
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const a = plate.data[(y * plate.width + (fi * FW + x)) * 4 + 3];
    if (a > 40) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  }
  return { cx: (minx + maxx) / 2, cy: (miny + maxy) / 2 };
}
const plateCenters = []; for (let i = 0; i < N; i++) plateCenters.push(plateCenter(i));

/* Per-cell white-base buffer (+ shirt bbox centre in cell-local space). */
function cellBuffer(idx) {
  const col = idx % COLS, row = Math.floor(idx / COLS);
  const ox = Math.round(col * cpw), oy = Math.round(row * cph);
  const W = Math.round(cpw), H = Math.round(cph);
  const val = new Float32Array(W * H);
  const alp = new Uint8Array(W * H);
  let maxV = 1, minx = W, maxx = -1, miny = H, maxy = -1;
  const MARGIN = 16;                       // skip the cell-divider lines
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (x < MARGIN || x >= W - MARGIN || y < MARGIN || y >= H - MARGIN) continue;
    const gx = ox + x, gy = oy + y;
    if (gx >= GW || gy >= GH) continue;
    const [r, gg, b] = gpx(gx, gy);
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
    const isShirt = (mx - mn) > 18 || mx < 120;   // saturated cyan OR dark outline
    if (!isShirt) continue;
    alp[y * W + x] = 255;
    val[y * W + x] = mx;
    if (mx > maxV) maxV = mx;
    if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
  }
  for (let i = 0; i < W * H; i++) {
    if (!alp[i]) continue;
    const t = Math.min(1, val[i] / maxV);
    val[i] = Math.round(FILL_TARGET * Math.pow(t, OUTLINE_GAMMA));
  }
  return { W, H, val, alp, sx: (minx + maxx) / 2, sy: (miny + maxy) / 2 };
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

/* Render one 320x320 frame: shirt centre (buf.sx, buf.sy) maps to the plate
   (torso) centre for frame fi, uniformly scaled. */
function renderFrame(buf, fi) {
  const tx = plateCenters[fi].cx + DX;
  const ty = plateCenters[fi].cy + DY;
  const out = Buffer.alloc(FW * FH * 4);
  for (let fy = 0; fy < FH; fy++) for (let fx = 0; fx < FW; fx++) {
    const lx = (fx - tx) / SCALE + REFX;
    const ly = (fy - ty) / SCALE + REFY;
    const [v, a] = sample(buf, lx, ly);
    const o = (fy * FW + fx) * 4;
    const val = Math.round(v);
    out[o] = val; out[o + 1] = val; out[o + 2] = val; out[o + 3] = Math.round(a);
  }
  return out;
}

const frames = [];
for (let i = 0; i < N; i++) frames.push(renderFrame(cellBuffer(i), i));

// assemble horizontal strip
const SW = N * FW;
const strip = Buffer.alloc(SW * FH * 4);
for (let i = 0; i < N; i++) {
  const f = frames[i];
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const s = (y * FW + x) * 4, d = (y * SW + (i * FW + x)) * 4;
    strip[d] = f[s]; strip[d + 1] = f[s + 1]; strip[d + 2] = f[s + 2]; strip[d + 3] = f[s + 3];
  }
}
writeFileSync(OUT, encode({ width: SW, height: FH, data: strip }));
console.log('wrote', OUT, SW + 'x' + FH, '(' + N + ' frames)  SCALE=' + SCALE + ' DY=' + DY);

if (process.argv.includes('--preview')) {
  const body = decode(readFileSync(BODY));
  const show = Array.from({ length: N }, (_, i) => i);   // all 14 frames
  const BW = N * FW;
  const board = Buffer.alloc(BW * FH * 4);
  show.forEach((fi) => {
    const dx = fi * FW;
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      const bsrc = (y * body.width + (fi * FW + x)) * 4;
      let r = 40, gg = 44, b = 52;                       // dark backdrop
      if (body.data[bsrc + 3] > 20) {                    // body in faint grey
        const bl = Math.round(0.3 * body.data[bsrc] + 0.59 * body.data[bsrc + 1] + 0.11 * body.data[bsrc + 2]);
        r = gg = b = Math.round(70 + bl * 0.4);
      }
      const f = frames[fi]; const fs = (y * FW + x) * 4;
      if (f[fs + 3] > 20) {                              // shirt in blue over body
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
  console.log('preview ->', PV, '(all', N, 'frames)');
}
