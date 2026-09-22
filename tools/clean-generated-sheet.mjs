/* ═══ v2.3.2647: PUT A GENERATOR'S RETURN BACK ON THE GRID ═══
 *
 * An image model asked to DRAW ON a mannequin sheet does not edit pixels; it
 * re-renders the canvas. Measured across three returns of the monkey-ears
 * sheet, every one came back:
 *
 *     size            2172x724   (the mannequin is 2966x761, and the scale is
 *                                 not even uniform -- 0.73x wide, 0.95x tall)
 *     distinct colours   39,139   (the mannequin has a handful)
 *     exact #FF00FF          52   pixels, out of a full magenta background
 *
 * and the last one ignored four explicit hex values (41px, 5px, 0px, 0px of
 * the colours it was given). This is not a prompt problem -- more insistence
 * produces another re-render -- and it is the same thing recolorOptions.js
 * records: "the generated headwear batch came back from the generator as
 * REDRAWN sheets".
 *
 * The ART is fine. What is broken is the file, and that is deterministic work.
 * This takes the return plus the ORIGINAL mannequin and rebuilds the sheet at
 * the mannequin's exact size, on its exact grid, in a closed palette.
 *
 * ── HOW ──
 * Per FIGURE, not globally, because the return's aspect is distorted and a
 * single global resample would shear every head differently from its cell:
 *   1. Find the five figures in both images as connected non-background blobs,
 *      keeping the five largest (every label glyph is orders of magnitude
 *      smaller) and sorting by x.
 *   2. Downsample each returned figure to NATIVE resolution -- the mannequin
 *      figure's size divided by UPSCALE -- by majority vote over the source
 *      block, snapping each sample to the palette first so the vote is between
 *      real colours and not between thousands of anti-aliased near-misses.
 *   3. Nearest-upscale that back by UPSCALE, placed against the mannequin.
 * Going through native resolution is the point: it is what turns a soft
 * re-render into true pixel art on whole 5x5 blocks.
 *
 * ── WHY THE SCALE COMES FROM HEIGHT ──
 * The obvious mapping, source bbox -> mannequin bbox, is WRONG and measurably
 * so: the drawn EARS widen the source silhouette while the mannequin cell was
 * measured from an earless head, so squeezing one into the other squashes the
 * figure horizontally -- 2.3% on south, 6.7% on east. import_headwear.py then
 * derives `scale = game head width / drawn head width` off a head that is the
 * wrong shape, and the error propagates into every placement.
 * Ears do not change a figure's HEIGHT, so height is the honest reference: one
 * uniform scale for both axes, the crown rows aligned, and the horizontal
 * position taken from the TORSO (the bottom quarter, which no ear touches).
 * The ears are then free to overhang the original box, which is what a real
 * ear does.
 *
 * ── WHAT IS COPIED RATHER THAN REBUILT ──
 * The background, title and direction labels are taken from the MANNEQUIN,
 * untouched. So every pixel outside the five figures is byte-identical to the
 * sheet the art was drawn on -- which is exactly what import_headwear.py's
 * diff needs, and it means a re-rendered title can never be mistaken for art.
 *
 * Reads PNGs through tools/png.mjs, never a 2D canvas: TRAPS §53, a canvas
 * backing store is premultiplied and cannot round-trip these edges.
 *
 * ── --merge, for green-silhouette sheets (v2.3.2648) ──
 * A sheet for import_headwear_green.py paints the PERSON flat #00FF00 and leaves
 * the piece in colour. Generators do this imperfectly in one specific way: they
 * repaint the fur and forget the eyes, so the eye WHITES come back white inside
 * a green head. Left alone they are "neither magenta nor green" and the
 * importer takes them as part of the piece -- two white patches floating over
 * the game's own eyes. `--merge "#ffffff>#00ff00"` folds one palette colour
 * into another AT THE VOTE, so an eye white counts as a green vote rather than
 * being repainted afterwards, and the block it sits in resolves as person.
 *
 *   node tools/clean-generated-sheet.mjs --in gen.png --mannequin m.png --out clean.png
 *   ... [--palette "#1f0d1c,#573618,#492b18,#957459,#ffffff"] [--upscale 5] [--report]
 *   ... [--merge "#ffffff>#00ff00"]   (both colours must be in the palette)
 *   ... [--key "#00ff00"]             (a person key: see below)
 *
 * ── --key: A BLEND OF TWO KEYS IS NOT PIECE (v2.3.2648) ──
 * Where the green person meets the magenta backdrop, the re-render anti-aliases
 * the edge into blends around rgb(128,128,128) -- and the palette colour nearest
 * to that grey is not green or magenta but the muzzle TAN (#957459, 46 away,
 * against 221 to either key). Nearest-colour snapping therefore minted tan
 * wherever a block straddled the silhouette and the blends out-voted both
 * keys: 21 isolated tan pixels on the monkey sheet, which the importer then
 * carried into every facing as specks -- 6 of them on south alone, one of them
 * the piece's topmost pixel and therefore its bbox anchor.
 * The fix is to treat the whole LINE between the two keys as key. A sample
 * nearer to the backdrop<->key segment than to any other palette colour
 * resolves to whichever end it lies closer to, and can never become piece.
 * Real piece colours sit well off that line (the tan is 45 from it, black 208),
 * so nothing drawn is affected; only the edge between two keys is.
 */
import fs from 'node:fs';
import { decode, encode } from './png.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const IN = arg('--in'), MAN = arg('--mannequin'), OUT = arg('--out');
if (!IN || !MAN || !OUT) { console.error('need --in, --mannequin and --out'); process.exit(1); }
const UPSCALE = +arg('--upscale', 5);
const BG = [255, 0, 255];
/* The closed palette. Anything not in here cannot survive, which is the whole
   point -- 39k colours in, six out. Magenta is added automatically. */
const PALETTE = arg('--palette', '#1f0d1c,#573618,#492b18,#957459,#ffffff')
  .split(',').map((s) => {
    const m = s.trim().replace('#', '');
    return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
  });
const FULL = [BG, ...PALETTE];

/* --key: the person's key colour. Must be in the palette; the backdrop is magenta. */
const KEY_ARG = arg('--key', null);
let KEY_IDX = -1;
if (KEY_ARG) {
  const kc = (() => { const m = KEY_ARG.trim().replace('#', '').toLowerCase();
    return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)]; })();
  KEY_IDX = FULL.findIndex((f) => f[0] === kc[0] && f[1] === kc[1] && f[2] === kc[2]);
  if (KEY_IDX <= 0) { console.error(`--key ${KEY_ARG}: must be in the palette (and not magenta)`); process.exit(1); }
}

/* --merge "FROM>TO[,FROM>TO...]": a palette colour that should vote as another. */
const hex = (s) => { const m = s.trim().replace('#', '').toLowerCase();
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)]; };
const idxOf = (c) => FULL.findIndex((f) => f[0] === c[0] && f[1] === c[1] && f[2] === c[2]);
const MERGE = FULL.map((_, i) => i);
for (const pair of (arg('--merge', '') || '').split(',').filter(Boolean)) {
  const [from, to] = pair.split('>').map(hex);
  const a = idxOf(from), b = idxOf(to);
  if (a < 0 || b < 0) {
    console.error(`--merge ${pair}: both colours must be in the palette (magenta is #ff00ff)`);
    process.exit(1);
  }
  MERGE[a] = b;
}

/* Background is the magenta field -- however smeared the re-render left it --
   AND the near-white letterboxing an image model pads its canvas with. The
   white bars are what made the first run of this tool sample a full-width band
   for SOUTH and SOUTHWEST: they are non-magenta, they span the whole sheet, and
   so they were the two largest "figures" by a mile. */
const isBg = (r, g, b) => (r > 170 && g < 110 && b > 170) || (r > 226 && g > 226 && b > 226);
/* Belt and braces: a real figure is a head-and-shoulders, never a band. */
const FIG_MAX_W = 0.40, FIG_MAX_H = 0.92;
const near = (r, g, b) => {
  let bi = 0, bd = Infinity;
  for (let i = 0; i < FULL.length; i++) {
    const d = (FULL[i][0] - r) ** 2 + (FULL[i][1] - g) ** 2 + (FULL[i][2] - b) ** 2;
    if (d < bd) { bd = d; bi = i; }
  }
  if (KEY_IDX > 0 && bi !== 0 && bi !== KEY_IDX) {
    /* distance to the backdrop<->key segment; nearer than the winner = key */
    const K = FULL[KEY_IDX], ux = K[0] - BG[0], uy = K[1] - BG[1], uz = K[2] - BG[2];
    const L2 = ux * ux + uy * uy + uz * uz;
    let t = ((r - BG[0]) * ux + (g - BG[1]) * uy + (b - BG[2]) * uz) / L2;
    t = Math.max(0, Math.min(1, t));
    const qx = BG[0] + t * ux, qy = BG[1] + t * uy, qz = BG[2] + t * uz;
    const ds = (r - qx) ** 2 + (g - qy) ** 2 + (b - qz) ** 2;
    if (ds < bd) return t < 0.5 ? 0 : KEY_IDX;
  }
  return bi;
};

/* Connected non-background blobs; the five largest, left to right. */
function figures(img, want = 5) {
  const { width: w, height: h, data } = img;
  const seen = new Uint8Array(w * h);
  const out = [];
  const stack = new Int32Array(w * h);
  for (let s = 0; s < w * h; s++) {
    if (seen[s]) continue;
    const r = data[s * 4], g = data[s * 4 + 1], b = data[s * 4 + 2], a = data[s * 4 + 3];
    seen[s] = 1;
    if (a < 24 || isBg(r, g, b)) continue;
    let top = 0; stack[top++] = s;
    let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    while (top) {
      const p = stack[--top];
      const px = p % w, py = (p / w) | 0;
      n++;
      if (px < x0) x0 = px; if (px > x1) x1 = px;
      if (py < y0) y0 = py; if (py > y1) y1 = py;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (seen[q]) continue;
        seen[q] = 1;
        const qr = data[q * 4], qg = data[q * 4 + 1], qb = data[q * 4 + 2], qa = data[q * 4 + 3];
        if (qa < 24 || isBg(qr, qg, qb)) continue;
        stack[top++] = q;
      }
    }
    out.push({ n, x0, y0, x1, y1 });
  }
  const plausible = out.filter((f) =>
    (f.x1 - f.x0 + 1) <= w * FIG_MAX_W && (f.y1 - f.y0 + 1) <= h * FIG_MAX_H);
  plausible.sort((a, b) => b.n - a.n);
  const keep = plausible.slice(0, want);
  keep.sort((a, b) => a.x0 - b.x0);
  return keep;
}

const gen = decode(fs.readFileSync(IN));
const man = decode(fs.readFileSync(MAN));
const gf = figures(gen), mf = figures(man);
if (gf.length !== 5 || mf.length !== 5) {
  console.error(`found ${gf.length} figures in the return and ${mf.length} in the mannequin; expected 5 each`);
  process.exit(1);
}

/* Start from the mannequin: background, title and labels are inherited exactly,
   and only the five figure boxes get overwritten. */
const W = man.width, H = man.height;
const out = new Uint8Array(W * H * 4);
out.set(man.data);
/* Clear each mannequin figure box -- PADDED, because the cleaned figure carries
   ears the mannequin's head did not and will overhang the box it was measured
   from. Without the pad, the old tan head shows as a rim outside the new art. */
/* Padded SIDEWAYS ONLY. An ear sticks out at eye level, never below the jaw,
   and the figure's vertical extent is unchanged because the scale came from
   height -- so a vertical pad buys nothing and costs the direction LABEL
   underneath, which a first run duly erased on four cells out of five. */
const PAD = Math.round(12 * UPSCALE), PAD_Y = 0;
for (const f of mf) {
  for (let y = Math.max(0, f.y0 - PAD_Y); y <= Math.min(H - 1, f.y1 + PAD_Y); y++) {
    for (let x = Math.max(0, f.x0 - PAD); x <= Math.min(W - 1, f.x1 + PAD); x++) {
      const i = (y * W + x) * 4;
      out[i] = BG[0]; out[i + 1] = BG[1]; out[i + 2] = BG[2]; out[i + 3] = 255;
    }
  }
}

/* Horizontal centre of a figure's TORSO -- the bottom quarter of its box, which
   the ears never reach, so it registers the body rather than the silhouette. */
function torsoCentre(img, f) {
  const { width: w, data } = img;
  const from = f.y1 - Math.round((f.y1 - f.y0 + 1) * 0.25);
  let lo = Infinity, hi = -Infinity;
  for (let y = from; y <= f.y1; y++) for (let x = f.x0; x <= f.x1; x++) {
    const i = (y * w + x) * 4;
    if (data[i + 3] < 24 || isBg(data[i], data[i + 1], data[i + 2])) continue;
    if (x < lo) lo = x; if (x > hi) hi = x;
  }
  return isFinite(lo) ? (lo + hi) / 2 : (f.x0 + f.x1) / 2;
}

const DIRS = ['south', 'southwest', 'east', 'northeast', 'north'];
const report = [];
for (let k = 0; k < 5; k++) {
  const s = gf[k], d = mf[k];
  const dh = d.y1 - d.y0 + 1;
  const sw = s.x1 - s.x0 + 1, sh = s.y1 - s.y0 + 1;
  /* ONE uniform scale, from height. See the header. */
  const nh = Math.max(1, Math.round(dh / UPSCALE));
  const nw = Math.max(1, Math.round(sw * (nh / sh)));
  const dw = nw * UPSCALE;
  /* Crown rows aligned; torso centres aligned. */
  const dy0 = d.y0;
  const dx0 = Math.round(torsoCentre(man, d) - (torsoCentre(gen, s) - s.x0) * (dw / sw));

  /* native-resolution buffer of palette INDICES */
  const nat = new Uint8Array(nw * nh);
  const tally = new Int32Array(FULL.length);
  for (let ny = 0; ny < nh; ny++) {
    for (let nx = 0; nx < nw; nx++) {
      tally.fill(0);
      const ax = s.x0 + Math.floor(nx * sw / nw), bx = s.x0 + Math.max(Math.floor((nx + 1) * sw / nw), Math.floor(nx * sw / nw) + 1);
      const ay = s.y0 + Math.floor(ny * sh / nh), by = s.y0 + Math.max(Math.floor((ny + 1) * sh / nh), Math.floor(ny * sh / nh) + 1);
      for (let y = ay; y < by && y < gen.height; y++) {
        for (let x = ax; x < bx && x < gen.width; x++) {
          const i = (y * gen.width + x) * 4;
          if (gen.data[i + 3] < 24) { tally[0]++; continue; }
          tally[MERGE[near(gen.data[i], gen.data[i + 1], gen.data[i + 2])]]++;
        }
      }
      let bi = 0;
      for (let i = 1; i < tally.length; i++) if (tally[i] > tally[bi]) bi = i;
      nat[ny * nw + nx] = bi;
    }
  }

  /* nearest-upscale into the mannequin's own figure box */
  let painted = 0;
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const ny = Math.min(nh - 1, Math.floor(y / UPSCALE));
      const nx = Math.min(nw - 1, Math.floor(x / UPSCALE));
      const idx = nat[ny * nw + nx];
      if (idx === 0) continue;                 /* leave background as background */
      const px = dx0 + x, py = dy0 + y;
      if (px < 0 || py < 0 || px >= W || py >= H) continue;
      const col = FULL[idx];
      const i = (py * W + px) * 4;
      out[i] = col[0]; out[i + 1] = col[1]; out[i + 2] = col[2]; out[i + 3] = 255;
      painted++;
    }
  }
  report.push([DIRS[k], `${sw}x${sh}`, `${nw}x${nh}`, `${dw}x${dh}`, painted]);
}

fs.writeFileSync(OUT, encode({ width: W, height: H, data: out }));

/* Receipt: the palette is closed INSIDE THE FIGURE BOXES. Measuring the whole
   sheet would count the mannequin's own title and labels, which are drawn with
   an anti-aliased font and are not art -- they are inherited untouched on
   purpose, and counting them would report hundreds of "colours" that this tool
   neither produced nor should remove. */
const seen = new Map();
for (const f of mf) {
  for (let y = Math.max(0, f.y0 - PAD_Y); y <= Math.min(H - 1, f.y1 + PAD_Y); y++) {
    for (let x = Math.max(0, f.x0 - PAD); x <= Math.min(W - 1, f.x1 + PAD); x++) {
      const i = (y * W + x) * 4;
      const k = out[i] + ',' + out[i + 1] + ',' + out[i + 2];
      seen.set(k, (seen.get(k) || 0) + 1);
    }
  }
}
const figPx = [...seen.values()].reduce((a, b) => a + b, 0);
console.log(`wrote ${OUT}  ${W}x${H}`);
console.log(`inside the five figure boxes: ${seen.size} distinct colour(s) — the palette is ${seen.size <= FULL.length ? 'CLOSED' : 'NOT closed'}`);
if (process.argv.includes('--report')) {
  console.log('\ndir          source    -> native  -> cell      figure px');
  for (const r of report) {
    console.log(`  ${r[0].padEnd(11)}${r[1].padEnd(10)}  ${r[2].padEnd(8)} ${r[3].padEnd(10)} ${r[4]}`);
  }
  console.log('\ncolours in the output:');
  for (const [k, n] of [...seen].sort((a, b) => b[1] - a[1])) {
    const [r, g, b] = k.split(',').map(Number);
    console.log(`  #${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}  ${(100 * n / figPx).toFixed(2)}% of figure area`);
  }
}
