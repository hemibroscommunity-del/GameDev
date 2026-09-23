/* ═══ v2.3.2667: LOOK AT EVERY PROPOSED EAR BEFORE ANY EAR SHIPS ═══
 *
 * tools/ears/ear-anchors.mjs emits an attachment point per body frame in three
 * tiers ('eye' measured, 'interp' bounded by two measurements, 'walk' a
 * silhouette guess used only where no iris exists). This draws the ear those
 * numbers imply, on the actual frame, as a grid -- so the geometry is reviewed
 * by looking at it rather than by trusting a coverage percentage.
 *
 * That posture is borrowed, not invented: tools/eyes/extract-eye-mask.mjs
 * shipped a human-reviewed list for exactly this reason -- "the search happens
 * HERE, the result is reviewed as a contact sheet, and the runtime only ever
 * applies a list someone has looked at". An ear is worse than an iris to get
 * wrong, because a misplaced one floats OUTSIDE the silhouette where nothing
 * hides it.
 *
 * Each cell: the frame's head, the proposed ear filled on both sides, a tick on
 * the ear line, the frame index, and a border coloured by tier --
 *   GREEN  'eye'     measured off a reviewed iris
 *   YELLOW 'interp'  lerped between two green frames
 *   RED    'walk'    silhouette walker, no iris on this strip: CHECK THESE
 *
 * Ear geometry comes from the owner's 32x32 references, expressed against head
 * WIDTH rather than height, because width is what the anchor actually measures:
 *   protrusion  0.125 * headW   (2px on a 16px head, both references agree)
 *   monkey ear  0.31  * headW   (5 rows,  profile 1-2-2-2-1)
 *   alien ear   0.19  * headW   (3 rows,  profile 1-2-1)
 * The monkey is drawn by default: it is the larger of the two, so a placement
 * that holds for it holds for the alien.
 *
 * Composed with tools/png.mjs, never a 2D canvas: TRAPS §53 -- a canvas backing
 * store is premultiplied and cannot round-trip the partial-alpha rim pixels
 * this whole exercise is measured from.
 *
 *   node tools/ears/ear-contact-sheet.mjs [--out /tmp/ear-review] [--species monkey|alien]
 *   node tools/ears/ear-contact-sheet.mjs --only jog-east,stand-south [--cell 192] [--cols 7]
 */
import fs from 'node:fs';
import path from 'node:path';
import { decode, encode } from '../png.mjs';
import { earSideList } from '../../src/rendering/earSides.js';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const DIR = path.join(REPO, 'public/sprites/player');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('--out', '/tmp/ear-review');
const SPECIES = arg('--species', 'monkey');
const ONLY = arg('--only', null);
const ANCHORS = path.join(REPO, 'src/rendering/earAnchors.json');
if (!fs.existsSync(ANCHORS)) {
  console.error('no earAnchors.json — run: node tools/ears/ear-anchors.mjs');
  process.exit(1);
}
const A = JSON.parse(fs.readFileSync(ANCHORS, 'utf8'));

const EAR = {
  monkey: { hRatio: 0.31, profile: [0.5, 1, 1, 1, 0.5] },
  alien:  { hRatio: 0.19, profile: [0.5, 1, 0.5] },
}[SPECIES];
if (!EAR) { console.error('--species must be monkey or alien'); process.exit(1); }
const OUT_RATIO = 0.125;

const CELL = +arg('--cell', 96), COLS = +arg('--cols', 8), PAD = 3;
const TIER_RGB = { eye: [80, 200, 110], interp: [225, 195, 70], crown: [235, 140, 60], walk: [225, 90, 80] };
const BG = [16, 18, 24];

/* profile sampled for an ear `h` rows tall */
function protrude(i, h, out) {
  const t = h <= 1 ? 0 : (i / (h - 1)) * (EAR.profile.length - 1);
  const a = Math.floor(t), b = Math.min(EAR.profile.length - 1, a + 1);
  const v = EAR.profile[a] + (EAR.profile[b] - EAR.profile[a]) * (t - a);
  return Math.max(1, Math.round(out * v));
}

fs.mkdirSync(OUT, { recursive: true });
const wanted = ONLY ? new Set(ONLY.split(',')) : null;
let sheets = 0, cells = 0;
const summary = [];

for (const base of Object.keys(A).sort()) {
  if (wanted && !wanted.has(base)) continue;
  const file = path.join(DIR, `${base}.png`);
  if (!fs.existsSync(file)) continue;
  const { width: w, height: h, data } = decode(fs.readFileSync(file));
  /* v2.3.2669: the record carries its own frame size, so the cell sampler works
     in the sheet's native space instead of assuming 256-square. That assumption
     is what put the sword-east ear alone in empty black (TRAPS §99). */
  const rec = A[base];
  const tuples = rec.frames || rec;
  const fw = rec.fw || 256, fh = rec.fh || 256;
  const S = h / fh;
  const frameW = Math.round(fw * S);
  const rows = Math.ceil(tuples.length / COLS);
  const OW = COLS * (CELL + PAD) + PAD, OH = rows * (CELL + PAD) + PAD;
  const out = new Uint8Array(OW * OH * 4);
  for (let i = 0; i < OW * OH; i++) { out[i * 4] = BG[0]; out[i * 4 + 1] = BG[1]; out[i * 4 + 2] = BG[2]; out[i * 4 + 3] = 255; }
  const put = (x, y, rgb, a = 255) => {
    if (x < 0 || y < 0 || x >= OW || y >= OH) return;
    const i = (y * OW + x) * 4;
    out[i] = rgb[0]; out[i + 1] = rgb[1]; out[i + 2] = rgb[2]; out[i + 3] = a;
  };
  const tierCount = { eye: 0, interp: 0, crown: 0, walk: 0 };

  tuples.forEach((t, f) => {
    const cx = PAD + (f % COLS) * (CELL + PAD), cy = PAD + Math.floor(f / COLS) * (CELL + PAD);
    if (!t) {
      for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) if ((x + y) % 9 === 0) put(cx + x, cy + y, [60, 60, 70]);
      return;
    }
    const [L, R, ey, tier] = t;
    tierCount[tier] = (tierCount[tier] || 0) + 1;
    const headW = R - L + 1;
    /* window in 256-space, centred on the head, wide enough to show the ears */
    const win = Math.max(64, Math.round(headW * 1.9));
    const ox = (L + R) / 2 - win / 2, oy = ey - win / 2;
    const scale = CELL / win;
    /* the frame, nearest-sampled into the cell */
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const sx = Math.floor((ox + x / scale) * S) + f * frameW;
        const sy = Math.floor((oy + y / scale) * S);
        if (sy < 0 || sy >= h || sx < f * frameW || sx >= f * frameW + frameW) continue;
        const i = (sy * w + sx) * 4;
        if (data[i + 3] < 24) continue;
        put(cx + x, cy + y, [data[i], data[i + 1], data[i + 2]]);
      }
    }
    /* the proposed ear, both sides, in 256-space then into the cell */
    const eh = Math.max(2, Math.round(headW * EAR.hRatio));
    const eo = Math.max(1, Math.round(headW * OUT_RATIO));
    const rgb = TIER_RGB[tier] || [200, 200, 200];
    /* One 256-space pixel -> its EXACT destination rect, so blocks tile with no
       seam. Stepping by round(scale) instead leaves a lattice of background
       between them, which on a first run read as the ear floating off the head
       -- a review tool that renders its own artifacts is worse than none. */
    const cellRect = (px, py) => {
      const ax = Math.floor((px - ox) * scale), bx = Math.floor((px + 1 - ox) * scale);
      const ay = Math.floor((py - oy) * scale), by = Math.floor((py + 1 - oy) * scale);
      return [ax, ay, Math.max(ax + 1, bx), Math.max(ay + 1, by)];
    };
    const block = (px, py, col) => {
      const [ax, ay, bx, by] = cellRect(px, py);
      for (let y = ay; y < by; y++) for (let x = ax; x < bx; x++) put(cx + x, cy + y, col);
    };
    /* Only the sides this facing actually shows -- earSides.js, which exists
       because drawing both on a profile frame puts one ear on the nose. */
    const dir = (base.match(/-(east|north|northeast|south|southwest)(?:-|$)/) || [])[1] || 'south';
    const sides = earSideList(dir);
    for (let i = 0; i < eh; i++) {
      const p = protrude(i, eh, eo);
      const yy = ey - Math.floor(eh / 2) + i;
      /* d starts at 1: d=0 is the head's own outline column, which the ear
         must sit beside, not on top of. */
      for (let d = 1; d <= p; d++) {
        if (sides.includes('l')) block(L - d, yy, rgb);
        if (sides.includes('r')) block(R + d, yy, rgb);
      }
    }
    /* magenta at d=0 -- the column the anchor CLAIMS is the head edge. If the
       magenta is not on the outline, the anchor is wrong, not the ear. */
    block(L, ey, [255, 0, 200]);
    block(R, ey, [255, 0, 200]);
    /* ear-line tick on the head's own columns, so drift is visible */
    for (let x = 0; x < 3; x++) {
      const py = Math.round((ey - oy) * scale);
      put(cx + Math.round((L - ox) * scale) + x, cy + py, [255, 255, 255]);
      put(cx + Math.round((R - ox) * scale) - x, cy + py, [255, 255, 255]);
    }
    /* tier border */
    for (let x = 0; x < CELL; x++) { put(cx + x, cy, rgb); put(cx + x, cy + CELL - 1, rgb); }
    for (let y = 0; y < CELL; y++) { put(cx, cy + y, rgb); put(cx + CELL - 1, cy + y, rgb); }
    /* frame index, as a run of dots bottom-left (no font available) */
    for (let d = 0; d < Math.min(f, 24); d++) put(cx + 3 + d * 3, cy + CELL - 4, [255, 255, 255]);
    cells++;
  });
  fs.writeFileSync(path.join(OUT, `${base}.png`), encode({ width: OW, height: OH, data: out }));
  sheets++;
  summary.push([base, tuples.length, tierCount.eye || 0, tierCount.interp || 0, tierCount.walk || 0]);
}
console.log(`wrote ${sheets} contact sheet(s) to ${OUT}  (${cells} cells, species=${SPECIES})`);
const risky = summary.filter((s) => s[4] > 0);
if (risky.length) {
  console.log(`\nRED / 'walk' tier -- review these first (no iris on the strip):`);
  for (const s of risky) console.log(`  ${s[0].padEnd(24)} ${s[4]}/${s[1]} frames`);
}
