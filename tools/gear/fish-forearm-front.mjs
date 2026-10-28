/* ═══ v2.3.3685: THE ANGLER'S FOREARM IN FRONT OF HIS T-SHIRT, NO PALE SLITS ═══
 *
 * The owner, 2026-10-27: "the hand for fishing should be in front of the t
 * shirt.  Right now it looks like it's going into his waistband", and earlier,
 * "a flickering grey or see-through hole near the waist and the reel hand".
 *
 * THE FOREARM.  The angler holds the rod in one hand and the reel in the other,
 * the reel hand's forearm crossing in front of his belly.  The T-shirt's fishing
 * strip (gear/shirt/tshirt/fish-south.png) is ONE picture, frame 12's, shifted
 * whole by a pixel or two per frame (tools/rebake_fish_gear.py: every frame is
 * frame 12's stamp moved by OFFSETS below, checked here).  Its lower right edge
 * was cut along frame 12's forearm, so on frame 12 the forearm crosses in front
 * of the shirt.  But the forearm moves as he reels: on 20 of the 32 frames
 * (3-10, 13-20, 27-30) it crosses higher, and the shirt was drawn over it.  The
 * hand came out from under the shirt's point, as if into his waistband.
 *
 * Per frame, the forearm is found on the body's own art:
 *   - its skin, the recolour's skin test, with the outline as a wall (the dark
 *     pixels grown by one, so a forearm drawn over the belly is its own piece);
 *   - the piece that touches the reel (the magenta key's lowest 13 rows, grown
 *     by 3);
 *   - from the reel hand, every pixel of it within REACH steps along the piece:
 *     the hand, the forearm and the elbow;
 *   - grown by 2 into the skin and the outline beside it, so the forearm is cut
 *     out with its own outline.
 * The shirt is cut there, except in its sleeve (the stamp's top right,
 * SLEEVE_X/SLEEVE_Y in frame 12's own coordinates, moved by the frame's
 * offset), which covers the top of his arm whichever way it moves.  Pieces of
 * shirt the cut leaves smaller than SPECK px go too; a larger piece below the
 * forearm is the shirt's hem behind his arm, and stays.
 *
 * THE SLITS.  The body sheet (player/fish-south.png) has 24 pale grey or cream
 * pixels sitting alone between two outline pixels (rows 40-119): leftovers of
 * the white the art was cut out of.  Recoloured with the figure they show as
 * a pale dot that comes and goes with the frames, at the waist and beside the
 * reel hand.  Each takes the two outline pixels' own colour, as opaque as
 * they are.  Skin, which is as bright, is told apart by its colour (a pale
 * pixel here has a saturation under SLIT_SAT; skin's is over 0.6).
 *
 * INVARIANTS (any failure aborts): the shirt is only ever taken away, never
 * drawn; every shirt frame is frame 12's stamp moved by its offset, less what
 * was cut; frame 12 itself is never cut.  The body changes only at the slits.
 * Idempotent: a second run finds nothing to do.
 *
 * PNG ONLY: each sheet's .webp twin is deleted (the loaders prefer it; CI mints
 * the new ones).  Bump GEAR_VERSION in src/rendering/gearSheets.js for the shirt
 * and VERSION in src/rendering/playerSprites.js for the body.
 *
 * Run: node tools/gear/fish-forearm-front.mjs [--write]
 *   A dry run prints "N px would be written" and changes nothing.
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode, encode } from './lib/png.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const WRITE = process.argv.includes('--write');
const FW = 128;
const N = 32;
const REF = 12;
/* each frame's shift of frame 12's stamp, [dx, dy] (tools/rebake_fish_gear.py) */
const OFFSETS = [
  [-1, -1], [-1, -1], [-1, -2], [0, -2], [0, -2], [0, -2], [1, -2], [1, -2],
  [1, -2], [1, -1], [1, -1], [0, 0], [0, 0], [-2, 0], [-2, 0], [-5, 1],
  [-5, 1], [-5, 1], [-4, 1], [-4, 1], [-4, 1], [-4, 1], [-4, 1], [-4, 1],
  [-3, 1], [0, 0], [1, -1], [1, -2], [1, -2], [2, -2], [2, -2], [2, -2],
];
const REACH = 40;        /* steps along the arm from the reel hand: hand, forearm, elbow */
const SLEEVE_X = 69;     /* frame 12's sleeve: x >= 69 and y <= 61 */
const SLEEVE_Y = 61;
const SPECK = 6;         /* shirt pieces the cut leaves under this size go */
const SLIT_SAT = 0.35;
const SLIT_LUM = 110;

const bodyPath = `${REPO}/public/sprites/player/fish-south.png`;
const teePath = `${REPO}/public/sprites/gear/shirt/tshirt/fish-south.png`;
const B = decode(readFileSync(bodyPath));
const T = decode(readFileSync(teePath));
if (B.width !== FW * N || B.height !== FW || T.width !== B.width || T.height !== B.height) {
  throw new Error('fish-south: expected two sheets of 32 frames of 128 x 128');
}
const W = B.width, H = B.height;
const at = (f, x, y) => ((y * W) + f * FW + x) * 4;
const lum = (d, i) => d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
/* the recolour's skin test (playerSkins.js _isSkin) */
const isSkin = (d, i) => d[i + 3] > 40 && d[i] > d[i + 1] && d[i + 1] >= d[i + 2]
  && (d[i] - d[i + 2]) > 30 && d[i] > 90 && (d[i] - d[i + 1]) > 25;
const isInk = (d, i) => d[i + 3] > 40 && lum(d, i) < 70;
/* the rod and reel's magenta key (tools/rebake_fish_gear.py rod_mask) */
const isKey = (d, i) => d[i + 3] > 40 && d[i] > 150 && d[i + 2] > 80 && d[i + 1] < 100
  && (d[i] - d[i + 1]) > 80 && (d[i + 2] - d[i + 1]) > 20;

/* a mask is a Uint8Array of FW * FW, indexed y * FW + x */
const mask = () => new Uint8Array(FW * FW);
function dilate(m, times = 1) {
  let cur = m;
  for (let t = 0; t < times; t++) {
    const out = mask();
    for (let y = 0; y < FW; y++) for (let x = 0; x < FW; x++) {
      if (!cur[y * FW + x]) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy >= 0 && yy < FW && xx >= 0 && xx < FW) out[yy * FW + xx] = 1;
      }
    }
    cur = out;
  }
  return cur;
}
const STEPS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
/* 4-connected pieces: returns { lab: Int32Array, sizes: [] } (labels from 1) */
function pieces(m) {
  const lab = new Int32Array(FW * FW);
  const sizes = [0];
  for (let s = 0; s < FW * FW; s++) {
    if (!m[s] || lab[s]) continue;
    const id = sizes.length;
    let n = 0;
    const q = [s];
    lab[s] = id;
    while (q.length) {
      const p = q.pop(); n++;
      const y = (p / FW) | 0, x = p % FW;
      for (const [dy, dx] of STEPS4) {
        const yy = y + dy, xx = x + dx;
        if (yy < 0 || yy >= FW || xx < 0 || xx >= FW) continue;
        const k = yy * FW + xx;
        if (m[k] && !lab[k]) { lab[k] = id; q.push(k); }
      }
    }
    sizes.push(n);
  }
  return { lab, sizes };
}

/* the forearm as drawn on frame f of the body, with its outline */
function forearmOf(f) {
  const skin = mask(), ink = mask(), key = mask();
  let keyBottom = -1;
  for (let y = 0; y < FW; y++) for (let x = 0; x < FW; x++) {
    const i = at(f, x, y), k = y * FW + x;
    if (isSkin(B.data, i)) skin[k] = 1;
    if (isInk(B.data, i)) ink[k] = 1;
    if (isKey(B.data, i)) { key[k] = 1; if (y > keyBottom) keyBottom = y; }
  }
  if (keyBottom < 0) return mask();
  const reel = mask();
  for (let k = 0; k < FW * FW; k++) if (key[k] && ((k / FW) | 0) >= keyBottom - 12) reel[k] = 1;
  const wall = dilate(ink);
  const open = mask();
  for (let k = 0; k < FW * FW; k++) open[k] = skin[k] && !wall[k] ? 1 : 0;
  const { lab, sizes } = pieces(open);
  const near = dilate(reel, 3);
  const ids = new Set();
  for (let k = 0; k < FW * FW; k++) if (near[k] && lab[k] && sizes[lab[k]] > 100) ids.add(lab[k]);
  /* steps along the arm from the reel hand */
  const dist = new Int32Array(FW * FW).fill(-1);
  const q = [];
  for (let k = 0; k < FW * FW; k++) if (near[k] && ids.has(lab[k])) { dist[k] = 0; q.push(k); }
  for (let h = 0; h < q.length; h++) {
    const p = q[h];
    const y = (p / FW) | 0, x = p % FW;
    for (const [dy, dx] of STEPS4) {
      const yy = y + dy, xx = x + dx;
      if (yy < 0 || yy >= FW || xx < 0 || xx >= FW) continue;
      const k = yy * FW + xx;
      if (dist[k] < 0 && ids.has(lab[k])) { dist[k] = dist[p] + 1; q.push(k); }
    }
  }
  const arm = mask();
  for (let k = 0; k < FW * FW; k++) if (dist[k] >= 0 && dist[k] < REACH) arm[k] = 1;
  const grown = dilate(arm, 2);
  const out = mask();
  for (let k = 0; k < FW * FW; k++) out[k] = arm[k] || (grown[k] && (skin[k] || ink[k])) ? 1 : 0;
  return out;
}

/* ── the shirt ── */
const refAlpha = mask();
for (let y = 0; y < FW; y++) for (let x = 0; x < FW; x++) refAlpha[y * FW + x] = T.data[at(REF, x, y) + 3] > 0 ? 1 : 0;
let teeCut = 0;
const teeByFrame = [];
for (let f = 0; f < N; f++) {
  const [dx, dy] = OFFSETS[f];
  /* invariant: this frame is frame 12's stamp moved, less what was cut */
  for (let y = 0; y < FW; y++) for (let x = 0; x < FW; x++) {
    const sx = x - dx, sy = y - dy;
    const inRef = sx >= 0 && sx < FW && sy >= 0 && sy < FW && refAlpha[sy * FW + sx];
    const i = at(f, x, y);
    if (T.data[i + 3] > 0) {
      if (!inRef) throw new Error(`fish tee frame ${f}: a pixel at ${x},${y} is not frame 12's stamp moved by ${dx},${dy}`);
      const j = at(REF, sx, sy);
      for (let c = 0; c < 4; c++) if (T.data[i + c] !== T.data[j + c]) throw new Error(`fish tee frame ${f}: ${x},${y} differs from frame 12's stamp`);
    }
  }
  const arm = forearmOf(f);
  const cut = mask();
  for (let y = 0; y < FW; y++) for (let x = 0; x < FW; x++) {
    const k = y * FW + x;
    if (!arm[k] || T.data[at(f, x, y) + 3] === 0) continue;
    if ((x - dx) >= SLEEVE_X && (y - dy) <= SLEEVE_Y) continue;   /* the sleeve stays */
    cut[k] = 1;
  }
  /* specks the cut leaves */
  const left = mask();
  for (let y = 0; y < FW; y++) for (let x = 0; x < FW; x++) left[y * FW + x] = T.data[at(f, x, y) + 3] > 0 && !cut[y * FW + x] ? 1 : 0;
  const { lab, sizes } = pieces(left);
  const anyCut = cut.some((v) => v);
  if (anyCut) for (let k = 0; k < FW * FW; k++) if (lab[k] && sizes[lab[k]] < SPECK) cut[k] = 1;
  let n = 0;
  for (let y = 0; y < FW; y++) for (let x = 0; x < FW; x++) {
    if (!cut[y * FW + x]) continue;
    const i = at(f, x, y);
    T.data[i] = T.data[i + 1] = T.data[i + 2] = T.data[i + 3] = 0;
    n++;
  }
  if (f === REF && n) throw new Error('fish tee: frame 12 is the stamp every frame is checked against, and would be cut');
  teeByFrame.push(n);
  teeCut += n;
}

/* ── the body's pale slits ── */
const slits = [];
for (let f = 0; f < N; f++) {
  for (let y = 40; y < 120; y++) for (let x = 1; x < FW - 1; x++) {
    const i = at(f, x, y);
    if (B.data[i + 3] === 0) continue;
    const r = B.data[i], g = B.data[i + 1], b = B.data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (lum(B.data, i) <= SLIT_LUM || (mx - mn) / Math.max(mx, 1) >= SLIT_SAT) continue;
    let pair = null;
    const L = at(f, x - 1, y), R = at(f, x + 1, y), U = at(f, x, y - 1), Dn = at(f, x, y + 1);
    if (B.data[L + 3] > 200 && lum(B.data, L) < 60 && B.data[R + 3] > 200 && lum(B.data, R) < 60) pair = [L, R];
    else if (B.data[U + 3] > 200 && lum(B.data, U) < 60 && B.data[Dn + 3] > 200 && lum(B.data, Dn) < 60) pair = [U, Dn];
    if (pair) slits.push([f, x, y, i, pair]);
  }
}
for (const [, , , i, [p, q]] of slits) {
  for (let c = 0; c < 4; c++) B.data[i + c] = Math.round((B.data[p + c] + B.data[q + c]) / 2);
}

const total = teeCut + slits.length;
console.log(`${total} px would be written` + (WRITE ? ' (writing)' : ''));
console.log(`  shirt: ${teeCut} px cut where the forearm crosses, by frame: ${teeByFrame.join(' ')}`);
console.log(`  body: ${slits.length} pale slits closed` + (slits.length ? ': ' + slits.map(([f, x, y]) => `f${f} ${x},${y}`).join('; ') : ''));
if (WRITE && total) {
  if (teeCut) {
    writeFileSync(teePath, encode(T));
    const twin = teePath.replace(/\.png$/, '.webp');
    if (existsSync(twin)) unlinkSync(twin);
  }
  if (slits.length) {
    writeFileSync(bodyPath, encode(B));
    const twin = bodyPath.replace(/\.png$/, '.webp');
    if (existsSync(twin)) unlinkSync(twin);
  }
  console.log('written: bump GEAR_VERSION (gearSheets.js) and VERSION (playerSprites.js)');
}
