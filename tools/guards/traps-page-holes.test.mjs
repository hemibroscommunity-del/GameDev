/* ═══ v2.3.5943: TRAPS INTO GUARDS, THE PAGE: A MONSTER'S ART HAS NO HOLE (card V4 PR 4) ═══
 *
 * Grand plan step 8.2, card V4's fourth batch (the form: tools/guards/README.md,
 * "A trap held"); the sister of traps-page-rules.test.mjs, apart for its time
 * (a flood over every monster sheet is about a second and a half).
 *
 * TRAPS §246 (the rule): in every monster sheet under public/sprites/monsters/, a pixel that is not fully opaque reaches the sheet's edge through others like it (8-connected): one that cannot is a hole in the art, a background keyed out by its colour; today's sheets with holes are listed with their counts, which only fall. Break: public/sprites/monsters/slime-idle-v5.png: the shine's pixels made alpha 200 again -> FAIL (tried 2026-11-17).
 *
 * HOW IT READS.  Each PNG's alpha only (8-bit RGBA, grey-alpha or palette
 * with tRNS; RGB has none), decoded here with node's zlib, and flooded from
 * the sheet's four edges through every pixel under 255.  A sheet's frames
 * touch their neighbours' empty margins, so flooding the whole sheet is the
 * same as flooding each frame from its own edge (slime-boss.test §9 floods
 * three slime sheets frame by frame; this reads them all).  The count of
 * holes is a sheet's own: an enclosed gap between two limbs counts too, so
 * the list holds today's counts and a sheet may not GROW one (a new sheet
 * starts at none).  `partial` (alpha 1-254) is the trap's mark: a soft key
 * leaves a rim part see-through.
 *
 * THE LIST (the plan's rule 3): a sheet not listed with holes fails, a
 * listed count only falls, a listed sheet now whole fails until it comes
 * off.  Each listed sheet is under Found in docs/plan/status/V4.md (whether
 * its holes are art or a key is the owner's eye: the mend is
 * tools/mend_slime_shine.py's way, never a re-key by colour).
 *
 * BREAK PROOF (rule 8), tried by hand in a scratch worktree, then undone:
 *   slime-idle-v5.png: 40 pixels of the body's inside (frame 0, round its
 *   centre) set to alpha 200                                  -> FAIL §246 (slime-idle-v5.png: 40 holes)
 *   the folder renamed (public/sprites/monster/)             -> FAIL §246 (the sheets are read)
 *
 * Run from the repository's root: node tools/guards/traps-page-holes.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import zlib from 'node:zlib';
import { ROOT } from './lib/fourLines.mjs';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};

/* v2.3.5943: by sheet (its path under the folder): [holes, of them part
   see-through] on 2026-11-17 */
const HOLES_KNOWN = {
  'fire-goblin/attack-n.png': [14, 14],
  'fire-goblin/attack-nw.png': [58, 58],
  'fire-goblin/attack-s.png': [4, 4],
  'fire-goblin/attack-sw.png': [120, 120],
  'fire-goblin/attack-w.png': [90, 90],
  'fire-goblin/death.png': [15, 15],
  'fire-goblin/fire-goblin-n.png': [8, 8],
  'fire-goblin/fire-goblin-nw.png': [452, 24],
  'fire-goblin/fire-goblin-s.png': [12, 9],
  'fire-goblin/fire-goblin-sw.png': [9303, 149],
  'fire-goblin/fire-goblin-w.png': [3489, 155],
  'fire-goblin/fireball.png': [29, 29],
  'fire-goblin/hit-n.png': [112, 112],
  'fire-goblin/hit-nw.png': [17, 17],
  'fire-goblin/hit-s.png': [59, 59],
  'fire-goblin/hit-sw.png': [152, 152],
  'fire-goblin/remnants.png': [26, 26],
  'fire-goblin/walk-e.png': [115, 115],
  'fire-goblin/walk-s.png': [47, 47],
  'fire-goblin/walk-sw.png': [10, 10],
  'mummy/transform.png': [8488, 0],
  'skeleton/death.png': [6128, 0],
  'slime-death-v10.png': [285, 0],
  'slime-projectile-v1.png': [324, 324],
  'snowman-hit.png': [245, 245],
  'snowman-remnants.png': [5, 0],
  'snowman/impact.png': [11, 11],
  'snowman/snowman-e.png': [14, 14],
  'snowman/snowman-n.png': [178, 178],
  'snowman/snowman-ne.png': [54, 54],
  'snowman/snowman-s.png': [2960, 2960],
  'snowman/snowman-sw.png': [558, 558],
  'water-frog/attack-e.png': [238, 0],
  'water-frog/attack-ne.png': [79, 0],
  'water-frog/attack-sw.png': [15, 0],
  'water-frog/death.png': [12218, 0],
  'water-frog/hop-ne.png': [235, 0],
  'water-frog/hop-sw.png': [327, 0],
  'water-frog/idle-e.png': [102, 0],
  'water-frog/idle-ne.png': [18, 0],
  'water-frog/idle-s.png': [2, 0],
  'water-frog/idle-sw.png': [2, 0],
};

/* a PNG's alpha, one byte a pixel */
function alphaOf(buf) {
  let p = 8, w = 0, h = 0, ct = 0, depth = 0, trns = null;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; ct = d[9]; }
    else if (type === 'tRNS') trns = d;
    else if (type === 'IDAT') idat.push(d);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (depth !== 8) throw new Error('depth ' + depth);
  const bpp = { 6: 4, 4: 2, 3: 1, 2: 3, 0: 1 }[ct];
  const A = new Uint8Array(w * h);
  if ((ct === 2 || ct === 0) && !trns) { A.fill(255); return { w, h, A }; }
  const st = w * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  let prev = new Uint8Array(st), cur = new Uint8Array(st);
  for (let y = 0; y < h; y++) {
    const o = y * (st + 1), f = raw[o];
    for (let i = 0; i < st; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = raw[o + 1 + i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[i] = v & 255;
    }
    const r = y * w;
    if (ct === 3) for (let x = 0; x < w; x++) { const k = cur[x]; A[r + x] = trns && k < trns.length ? trns[k] : 255; }
    else if (ct === 6 || ct === 4) for (let x = 0; x < w; x++) A[r + x] = cur[x * bpp + bpp - 1];
    else A.fill(255, r, r + w);   /* RGB or grey with a tRNS colour: the keyed colour is not read here */
    const t = prev; prev = cur; cur = t;
  }
  return { w, h, A };
}

/* the pixels under 255 the sheet's edge cannot reach through others like it */
function holesOf({ w, h, A }) {
  const out = new Uint8Array(w * h);
  const st = new Int32Array(w * h);
  let sp = 0;
  const push = (i) => { if (!out[i] && A[i] < 255) { out[i] = 1; st[sp++] = i; } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (sp) {
    const i = st[--sp];
    const x = i % w;
    const l = x > 0, r = x < w - 1;
    if (i >= w) { push(i - w); if (l) push(i - w - 1); if (r) push(i - w + 1); }
    if (i < w * (h - 1)) { push(i + w); if (l) push(i + w - 1); if (r) push(i + w + 1); }
    if (l) push(i - 1);
    if (r) push(i + 1);
  }
  let holes = 0, partial = 0;
  for (let i = 0; i < w * h; i++) if (!out[i] && A[i] < 255) { holes++; if (A[i] > 0) partial++; }
  return [holes, partial];
}

const DIR = join(ROOT, 'public/sprites/monsters');
const sheets = [];
if (existsSync(DIR)) {
  const walk = (d, rel) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(d, e.name), rel + e.name + '/');
      else if (e.name.endsWith('.png')) sheets.push(rel + e.name);
    }
  };
  walk(DIR, '');
}
sheets.sort();
check(`§246: the monster sheets are read (${sheets.length})`, sheets.length >= 60, sheets.length);
const found = Object.create(null);
let px = 0;
for (const s of sheets) {
  const img = alphaOf(readFileSync(join(DIR, s)));
  px += img.w * img.h;
  const [holes, partial] = holesOf(img);
  if (holes) found[s] = [holes, partial];
}
if (process.env.TRAPS_DUMP) console.log('DUMP §246', JSON.stringify(found));
const fresh = Object.keys(found).filter((s) => !Object.hasOwn(HOLES_KNOWN, s) || found[s][0] > HOLES_KNOWN[s][0] || found[s][1] > HOLES_KNOWN[s][1])
  .map((s) => `${s}: ${found[s][0]} holes (${found[s][1]} part see-through)` + (HOLES_KNOWN[s] ? ` > ${HOLES_KNOWN[s]}` : ''));
const whole = Object.keys(HOLES_KNOWN).filter((s) => !found[s]);
const lower = Object.keys(HOLES_KNOWN).filter((s) => found[s] && (found[s][0] < HOLES_KNOWN[s][0] || found[s][1] < HOLES_KNOWN[s][1]));
check(`§246: no sheet has a see-through pixel its edge cannot reach, but the listed ones, none grown (${Object.keys(found).length} listed of ${sheets.length}; ${(px / 1e6).toFixed(1)} M pixels)`, fresh.length === 0, fresh);
check('§246: every listed sheet still has its holes (a mended one comes off the list; a count that fell is lowered)', whole.length === 0 && lower.length === 0, { whole, lower });

process.exit(failed ? 1 : 0);
