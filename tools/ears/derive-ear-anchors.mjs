/* ═══ v2.3.2643: WHERE AN EAR ATTACHES, IN EVERY BODY FRAME, OFFLINE ═══
 *
 * Owner, on the alien and monkey references: "It needs the monkey and alien
 * features though for coloring, ears and eyes."
 *
 * Ears are ANATOMY, not an accessory, and that decides the design. A hat is a
 * sticker drawn over the head and can be a trait sprite; an ear is part of the
 * body, must carry the body's own skin tone, and must never drift a pixel from
 * the skull. So ears follow the EYES, not the hats: derive the geometry once
 * offline, ship it as data, and let the recolour pass paint them into the body
 * sheet it is already baking. eyeMask.json's header makes the same argument for
 * the iris -- "the eyes are not a layer" -- and an ear is the same kind of thing.
 *
 * ── THREE ANCHORS THAT DO NOT WORK, AND WHY ──
 * Recorded because each looks obviously right and cost a measurement to reject:
 *
 * 1. `TRAIT_CATEGORIES` (traitCategories.js) advertises exactly this: an
 *    `attachAt: 'head.eyes'` registry with a widthRatio. It has NO CONSUMERS --
 *    grep the repo. It is a designed-but-unwired file, and hair/hats/eyewear
 *    are actually placed by entityRenderer.js + characterPortrait.js off
 *    body-tops.json. Building on it would have placed nothing.
 *
 * 2. `body-anchors.json`'s head box. It is wrong on the moving poses: stand-south
 *    reports a 64px head and jog-south a 95px one, and hit-south 108 -- the
 *    neck detector merged into the shoulders. Ears pinned to those edges sit
 *    ~15px off the head, in mid-air.
 *
 * 3. `_headBoxInFrame` (playerDecal.js, v2.3.2516), the face-tattoo walker. It
 *    breaks out immediately whenever the crown's first skin run is narrow --
 *    measured, it returns a 1px head for stand-east and stand-north and a 6px
 *    one for hit-south. That is ACCEPTABLE THERE and not a bug to fix: its own
 *    header says a failed walk just leaves the face region as it was, because
 *    it can only ever add. An ear is not additive that way -- a failed walk is
 *    a missing or floating ear -- so it cannot be the anchor.
 *
 * ── THE ANCHOR THAT DOES ──
 * eyeMask.json: per-frame iris rectangles for 32 sheets / 417 frames, derived
 * offline by tools/eyes/extract-eye-mask.mjs and REVIEWED BY A HUMAN. Ears sit
 * on the eye line, so from the eye row we scan OUTWARD through the opaque
 * silhouette to its edge, and that edge is where the ear attaches. Only local
 * information around a reviewed landmark, so no global head box can go wrong.
 *
 * Its receipt is cross-pose agreement: stand-south measures a 51px head and
 * jog-south 54px in the same 256-space -- the same head at the same size, from
 * two sheets drawn at different disk resolutions. The rejected anchors do not
 * agree with themselves that closely.
 *
 * ── WHAT IS NOT COVERED, AND WHY THAT IS THE HONEST STATE ──
 * eyeMask holds east / south / southwest only: from BEHIND there are no eyes to
 * mask, so north and northeast have no landmark here and get no tuple. Frames
 * mid-dodge (the curled ball, dodge-east f1+) likewise. Those frames render
 * with no ears rather than with guessed ones. Turning your back should not make
 * ears vanish, so this is a gap to close with a reviewed back-of-head landmark,
 * NOT with a runtime guess -- see docs/specs/SPECIES-PLAN.md.
 *
 *   node tools/ears/derive-ear-anchors.mjs [--out src/rendering/earAnchors.json]
 *   node tools/ears/derive-ear-anchors.mjs --report     (per-sheet, no write)
 */
import fs from 'node:fs';
import path from 'node:path';
import { decode } from '../png.mjs';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const DIR = path.join(REPO, 'public/sprites/player');
const EYE = JSON.parse(fs.readFileSync(path.join(REPO, 'src/rendering/eyeMask.json'), 'utf8'));
const SPACE = 256;      /* eyeMask's space, and the space the bake works in */
const ALPHA = 32;

/* One frame: the eye row and the silhouette edges either side of it.
   Returns 256-space [L, R, y] or null. */
function anchor(data, w, h, frameW, f, rects) {
  const per = rects[f];
  if (!per || !per.length) return null;
  const S = h / SPACE;                 /* disk px per 256-space px */
  let ey = 0, ex0 = Infinity, ex1 = -Infinity;
  for (const [rx, ry, rw, rh] of per) {
    ey = Math.max(ey, ry + rh / 2);    /* lowest iris row: the eye LINE */
    ex0 = Math.min(ex0, rx);
    ex1 = Math.max(ex1, rx + rw);
  }
  const y = Math.round(ey * S);
  if (y < 0 || y >= h) return null;
  const x0 = f * frameW;
  const opaque = (x) => x >= 0 && x < frameW && data[((y * w) + x0 + x) * 4 + 3] > ALPHA;

  let L = Math.round(ex0 * S), R = Math.round(ex1 * S);
  if (!opaque(L) && !opaque(R)) return null;
  while (L > 0 && opaque(L - 1)) L--;
  while (R < frameW - 1 && opaque(R + 1)) R++;

  const headW = (R - L + 1) / S;       /* back to 256-space */
  /* A head narrower than this is not a head -- it is a hand, a hilt, or a
     frame whose iris rect landed off the face. Refuse rather than pin an ear
     to it: the whole point of an offline pass is that the runtime never
     applies a placement nobody looked at. */
  if (headW < 20 || headW > 110) return null;
  return [Math.round(L / S), Math.round(R / S), Math.round(y / S)];
}

const out = {};
const report = [];
for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.png')).sort()) {
  const base = file.replace(/\.png$/, '');
  const rects = EYE[base];
  if (!rects) continue;                                  /* no reviewed eyes */
  const { width: w, height: h, data } = decode(fs.readFileSync(path.join(DIR, file)));
  const frameW = h;                                      /* square frames */
  const n = Math.max(1, Math.round(w / frameW));
  const tuples = [];
  for (let f = 0; f < n; f++) tuples.push(anchor(data, w, h, frameW, f, rects));
  const got = tuples.filter(Boolean);
  if (got.length) out[base] = tuples;
  const ws = got.map((t) => t[1] - t[0] + 1);
  report.push([base, n, got.length, ws.length ? Math.min(...ws) : 0, ws.length ? Math.max(...ws) : 0]);
}

if (process.argv.includes('--report')) {
  console.log('sheet                      frames  anchored  headW range (256-space)');
  for (const [b, n, k, lo, hi] of report) {
    console.log(`${b.padEnd(26)} ${String(n).padStart(6)} ${String(k).padStart(9)}  ${lo}..${hi}`);
  }
  const tot = report.reduce((a, r) => a + r[1], 0), ok = report.reduce((a, r) => a + r[2], 0);
  console.log(`\n${ok}/${tot} frames anchored across ${report.length} sheet(s) with reviewed eyes`);
  process.exit(0);
}

const outArg = process.argv.indexOf('--out');
const OUT = outArg > 0 ? process.argv[outArg + 1] : path.join(REPO, 'src/rendering/earAnchors.json');
fs.writeFileSync(OUT, JSON.stringify(out));
const tot = report.reduce((a, r) => a + r[1], 0), ok = report.reduce((a, r) => a + r[2], 0);
console.log(`wrote ${path.relative(REPO, OUT)}`);
console.log(`  ${Object.keys(out).length} sheet(s), ${ok}/${tot} frames anchored`);
