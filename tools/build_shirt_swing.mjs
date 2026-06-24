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
/* Per-frame anchor: map each shirt's own MASS CENTROID (largest blob, stray
   specks dropped) onto the PER-FRAME body-torso centre (the chest plate, which
   tracks the lunge).  The artist drew the shirt at varying offsets within each
   cell, so a fixed cell-centre reference leaves it riding high/low on some
   frames; the centroid normalises that.  Bbox-centring was too noisy (the
   shirt's outline/specks blow up the bbox) -- the centroid of the cleaned main
   blob is stable.  SCALE + DX/DY are the only free knobs. */
/* Two-point vertical lock: per frame, map the shirt's torso band (neckline ->
   hem) onto the body's neck -> waist (the chest plate's top -> bottom, which
   tracks the lunge), so the neckline and hem hit by construction.  Horizontal
   is a fixed fitted width (X scale) centred on the torso.  Verified by printed
   residuals, then visually signed off on the deployed preview. */
const SCALE_X = 1.35;  // horizontal upscale (fitted width)
const DX = 0;          // horizontal nudge vs the torso centre (frame-x)
const NECK_DY = 0;     // nudge the neckline target up(-)/down(+) from the plate top
const WAIST_DY = 0;    // nudge the hem target up(-)/down(+) from the plate bottom
const BAND_FRAC = 0.30; // a shirt row counts as torso (not a thin sleeve) at >=30% of max row width
/* Per-frame manual nudge (owner review).  +dx = shirt right, +dy = shirt down,
   in frame pixels.  Indexed 0..13; edit the entries the owner calls out. */
const NUDGE = [
  { dx: 0, dy: 0 }, { dx: 0, dy: 0 }, { dx: 0, dy: 0 }, { dx: 0, dy: 0 },
  { dx: 0, dy: 0 }, { dx: 0, dy: 0 }, { dx: 0, dy: 0 }, { dx: 0, dy: 0 },
  { dx: 0, dy: 0 }, { dx: 0, dy: 0 }, { dx: 0, dy: 0 }, { dx: 0, dy: 0 },
  { dx: 0, dy: 0 }, { dx: 0, dy: 0 },
];
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
  return { cx: (minx + maxx) / 2, cy: (miny + maxy) / 2, top: miny, bot: maxy };
}
const plateCenters = []; for (let i = 0; i < N; i++) plateCenters.push(plateCenter(i));

/* Body WAIST per frame = top of the pants (legs) region.  The chest plate's
   bottom is its armoured skirt, ~20-40px BELOW the real waist, so anchoring the
   hem there hung the shirt onto the hips/legs.  The pants-top is the true waist
   and is stable (~186) across the swing.  Pants = olive (r≈g, g well above b). */
const bodyImg = decode(readFileSync(BODY));
function bodyWaist(fi) {
  const isPants = (R, G, B, A) => A > 80 && Math.abs(R - G) < 32 && G - B > 22 && R < 165 && B < 115;
  for (let y = 150; y < FH; y++) {
    let pc = 0;
    for (let x = 0; x < FW; x++) {
      const i = (y * bodyImg.width + (fi * FW + x)) * 4;
      if (isPants(bodyImg.data[i], bodyImg.data[i + 1], bodyImg.data[i + 2], bodyImg.data[i + 3])) pc++;
    }
    if (pc > 4) return y;
  }
  return plateCenters[fi].bot;   // fallback
}
const bodyWaists = []; for (let i = 0; i < N; i++) bodyWaists.push(bodyWaist(i));

/* CHIN x per frame = horizontal centre of the head (skin centroid in the fixed
   head band y[80,116]).  The head barely sways (155-160) while the torso swings,
   so the collar reads best centred under the chin rather than the swaying torso. */
function chinX(fi) {
  const skin = (R, G, B, A) => A > 80 && R - G > 40 && G - B > 15 && R > 140;
  let sx = 0, n = 0;
  for (let y = 80; y < 116; y++) for (let x = 0; x < FW; x++) {
    const i = (y * bodyImg.width + (fi * FW + x)) * 4;
    if (skin(bodyImg.data[i], bodyImg.data[i + 1], bodyImg.data[i + 2], bodyImg.data[i + 3])) { sx += x; n++; }
  }
  return n ? sx / n : plateCenters[fi].cx;
}
const chinXs = []; for (let i = 0; i < N; i++) chinXs.push(chinX(i));

/* NECK y per frame = head crown + a fixed depth.  The crown (topmost central
   skin) is rock-stable (~82 every frame), so this is a STABLE neckline anchor.
   The chest-plate top — used before — swings up ~15px on the lunge frames even
   though the body's neck doesn't, which made the shirt "bounce" vertically. */
const NECK_FROM_CROWN = 38;
function bodyNeck(fi) {
  const skin = (R, G, B, A) => A > 80 && R - G > 40 && G - B > 15 && R > 140;
  for (let y = 60; y < 160; y++) {
    let c = 0;
    for (let x = 110; x < 210; x++) {
      const i = (y * bodyImg.width + (fi * FW + x)) * 4;
      if (skin(bodyImg.data[i], bodyImg.data[i + 1], bodyImg.data[i + 2], bodyImg.data[i + 3])) c++;
    }
    if (c > 6) return y + NECK_FROM_CROWN;   // crown found -> neck a fixed depth below
  }
  return plateCenters[fi].top;   // fallback
}
const bodyNecks = []; for (let i = 0; i < N; i++) bodyNecks.push(bodyNeck(i));

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
  /* Keep only the largest connected blob (drops the stray motion droplets/AA
     specks), and use its centroid as the per-frame source anchor. */
  const lab = new Int32Array(W * H).fill(-1);
  const stack = []; let best = -1, bestN = 0;
  const comps = [];
  for (let i = 0; i < W * H; i++) {
    if (!alp[i] || lab[i] >= 0) continue;
    const id = comps.length; let n = 0, sx = 0, sy = 0;
    lab[i] = id; stack.push(i);
    while (stack.length) {
      const p = stack.pop(); const px = p % W, py = (p / W) | 0;
      n++; sx += px; sy += py;
      const nb = [p - 1, p + 1, p - W, p + W];
      if (px === 0) nb[0] = -1; if (px === W - 1) nb[1] = -1;
      for (const q of nb) { if (q >= 0 && q < W * H && alp[q] && lab[q] < 0) { lab[q] = id; stack.push(q); } }
    }
    comps.push({ id, n, cx: sx / n, cy: sy / n });
    if (n > bestN) { bestN = n; best = id; }
  }
  for (let i = 0; i < W * H; i++) if (alp[i] && lab[i] !== best) alp[i] = 0;   // despeckle
  /* Robust torso band: per-row width of the main blob; the neckline/hem are the
     first/last rows wide enough to be torso (>= BAND_FRAC of the widest row), so
     a thin raised sleeve above the shoulders isn't mistaken for the collar. */
  const rowW = new Int32Array(H);
  let cxSum = 0, cN = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (alp[y * W + x]) { rowW[y]++; cxSum += x; cN++; }
  let maxW = 0; for (let y = 0; y < H; y++) if (rowW[y] > maxW) maxW = rowW[y];
  const thr = Math.max(3, Math.round(BAND_FRAC * maxW));
  let sTop = -1, sBot = -1;
  for (let y = 0; y < H; y++) if (rowW[y] >= thr) { if (sTop < 0) sTop = y; sBot = y; }
  if (sTop < 0) { sTop = miny; sBot = maxy; }
  const sxC = cN ? cxSum / cN : (minx + maxx) / 2;
  /* Collar centre = horizontal centroid of the top of the torso band (the
     neckline rows), so we can pin the shirt TOP under the chin instead of the
     sleeve-skewed full-shirt centroid. */
  const collarBot = sTop + Math.max(2, Math.round(0.25 * (sBot - sTop)));
  let colSum = 0, colN = 0;
  for (let y = sTop; y <= collarBot; y++) for (let x = 0; x < W; x++) if (alp[y * W + x]) { colSum += x; colN++; }
  const collarX = colN ? colSum / colN : sxC;
  for (let i = 0; i < W * H; i++) {
    if (!alp[i]) continue;
    const t = Math.min(1, val[i] / maxV);
    val[i] = Math.round(FILL_TARGET * Math.pow(t, OUTLINE_GAMMA));
  }
  return { W, H, val, alp, sxC, collarX, sTop, sBot };
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
function renderFrame(buf, fi, sx = SCALE_X) {
  /* Vertical band targets, both from STABLE body landmarks so the shirt doesn't
     bounce: neck = head crown + fixed depth; waist = body pants-top.  (The chest
     plate, used before, swings independently of the body and caused the bounce.) */
  const nud = NUDGE[fi] || { dx: 0, dy: 0 };
  const neckY = bodyNecks[fi] + NECK_DY + nud.dy, waistY = bodyWaists[fi] + WAIST_DY + nud.dy;
  /* horizontal: pin the shirt's COLLAR centre under the CHIN (stable head x),
     not the swaying torso/plate centre. */
  const tx = chinXs[fi] + DX + nud.dx;
  /* vertical: frame band [neckY,waistY] <- shirt torso band [sTop,sBot]. */
  const vSpan = (buf.sBot - buf.sTop) || 1;
  const out = Buffer.alloc(FW * FH * 4);
  for (let fy = 0; fy < FH; fy++) for (let fx = 0; fx < FW; fx++) {
    const lx = (fx - tx) / sx + buf.collarX;
    const ly = buf.sTop + (fy - neckY) * (vSpan / ((waistY - neckY) || 1));
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
console.log('wrote', OUT, SW + 'x' + FH, '(' + N + ' frames)  SCALE_X=' + SCALE_X);

if (process.argv.includes('--compare')) {
  /* one stance frame at several scales over the body, to pick SCALE visually. */
  const body = decode(readFileSync(BODY));
  const scales = [1.35, 1.5, 1.65, 1.82];
  const fi = 0;                                 // forward stance reads size clearly
  const BW = scales.length * FW;
  const board = Buffer.alloc(BW * FH * 4);
  const cells = scales.map((sc) => cellBuffer(fi) && renderFrame(cellBuffer(fi), fi, sc));
  scales.forEach((sc, k) => {
    const f = cells[k]; const dx = k * FW;
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      const bsrc = (y * body.width + (fi * FW + x)) * 4;
      let r = 40, gg = 44, b = 52;
      if (body.data[bsrc + 3] > 20) {
        const bl = Math.round(0.3 * body.data[bsrc] + 0.59 * body.data[bsrc + 1] + 0.11 * body.data[bsrc + 2]);
        r = gg = b = Math.round(70 + bl * 0.4);
      }
      const fs = (y * FW + x) * 4;
      if (f[fs + 3] > 20) {
        const t = f[fs] / 255, al = f[fs + 3] / 255;
        r = Math.round(r * (1 - al) + (60 * t + 20) * al);
        gg = Math.round(gg * (1 - al) + (110 * t + 20) * al);
        b = Math.round(b * (1 - al) + (220 * t + 35) * al);
      }
      const d = (y * BW + (dx + x)) * 4;
      board[d] = r; board[d + 1] = gg; board[d + 2] = b; board[d + 3] = 255;
    }
  });
  writeFileSync('tools/_shirt_swing_compare.png', encode({ width: BW, height: FH, data: board }));
  console.log('compare ->', 'tools/_shirt_swing_compare.png', 'scales', scales.join(','));
}

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
