/* ═══ v2.3.2644: EAR ATTACHMENT FOR EVERY BODY FRAME, IN THREE TIERS ═══
 *
 * Stage 2 of the species work (docs/specs/SPECIES-PLAN.md). v2.3.2643 proved
 * the attachment RULE -- scan outward from a human-reviewed iris to the
 * silhouette edge -- and then refused to ship ears on it, because that rule
 * only fires on 297 of 823 frames and the gaps fall INSIDE animation cycles
 * (jog-east: 12 of 28). Ears that strobe as the player runs are worse than no
 * ears. TRAPS §90 records that, and the four anchors that do not work at all.
 *
 * (This file supersedes tools/ears/derive-ear-anchors.mjs, the v2.3.2643 probe
 * that established the rule. The four anchors that do NOT work -- the unwired
 * TRAIT_CATEGORIES registry, body-anchors.json's shoulder-swallowing head box,
 * _headBoxInFrame's 1px heads, and the combination of the last two -- are
 * recorded with their measurements in TRAPS §90, so they are not re-walked.)
 *
 * This closes the gap the only way that does not involve a cleverer per-frame
 * predicate -- because the thing that defeats every predicate is a raised arm
 * TOUCHING the head, which is semantic, not geometric:
 *
 *   A HEAD DOES NOT TELEPORT BETWEEN TWO FRAMES OF ONE ANIMATION.
 *
 * So the sparse reliable landmarks become SEEDS, and the frames between them
 * are interpolated along the strip. A run cycle moves the head a couple of
 * pixels per frame; between two measured frames five apart, a straight line is
 * not a guess in the way a silhouette search is -- it is bounded on both sides
 * by a measurement.
 *
 * ── THE THREE TIERS, AND WHY THEY ARE LABELLED ──
 *   'eye'    scan out from a reviewed iris (v2.3.2643's rule). Trust it.
 *   'interp' lerped between two 'eye' frames on the same strip, or carried
 *            from the nearest one at a strip's ends.
 *   'walk'   REMOVED at v2.3.2644 after review. The silhouette walker was
 *            allowed on strips with no iris (north / northeast, where you are
 *            looking at the back of the head). The contact sheet showed it
 *            putting the ears ON THE SHOULDERS -- its "widest row" is the
 *            deltoid line, not the ear line -- so it is gone rather than
 *            shipped. That is what the red tier was for.
 *            north / northeast therefore have NO anchor yet and get no ear;
 *            see docs/specs/SPECIES-PLAN.md for the crown-based landmark that
 *            still owes a review pass.
 *
 * The tier ships in the data ON PURPOSE. It is what makes the contact sheet
 * reviewable (tools/ears/ear-contact-sheet.mjs colours each frame by tier), and
 * it is what lets the painter be careful later: a 'walk' frame is a candidate
 * for a second look, an 'eye' frame is not.
 *
 * NOTHING HERE PAINTS AN EAR. This emits geometry for review. The ears do not
 * go in until the contact sheet has been looked at -- the same posture
 * tools/eyes/extract-eye-mask.mjs took, and for the same reason: "the runtime
 * only ever applies a list someone has looked at".
 *
 * ── REVIEW RESULTS (v2.3.2644, contact sheet, monkey ear) ──
 * 'eye'    CORRECT. stand-south and stand-southwest seat the ear on the skull
 *          at the eye line, clear of the face.
 * 'interp' CORRECT, and this is the finding that matters: across jog-east's 28
 *          frames the interpolated ears are indistinguishable from the measured
 *          ones and stay locked to a head that bobs ~6px through the cycle. The
 *          premise holds, so one measured frame every few frames is enough.
 * 'walk'   WRONG -- ears on the SHOULDERS (its "widest row" is the deltoid
 *          line). Removed, not shipped. This is what a red tier is for.
 * profile  The ear rule itself was wrong, on every east frame: see
 *          src/rendering/earSides.js. Both-sides puts one ear on the nose.
 *
 *   node tools/ears/ear-anchors.mjs --report
 *   node tools/ears/ear-anchors.mjs [--out src/rendering/earAnchors.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { decode } from '../png.mjs';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const DIR = path.join(REPO, 'public/sprites/player');
const EYE = JSON.parse(fs.readFileSync(path.join(REPO, 'src/rendering/eyeMask.json'), 'utf8'));
const SPACE = 256, ALPHA = 32;

/* A head narrower or wider than this is not a head: a hand, a hilt, or a frame
   whose landmark landed off the face. Refuse rather than place an ear on it. */
const MIN_HEAD = 20, MAX_HEAD = 110;

function frameOf(file) {
  const { width: w, height: h, data } = decode(fs.readFileSync(path.join(DIR, file)));
  return { w, h, data, frameW: h, n: Math.max(1, Math.round(w / h)), S: h / SPACE };
}

/* ── tier 'eye' ── */
function eyeAnchor(sh, f, rects) {
  const per = rects[f];
  if (!per || !per.length) return null;
  const { w, h, data, frameW, S } = sh;
  let ey = 0, ex0 = Infinity, ex1 = -Infinity;
  for (const [rx, ry, rw, rh] of per) {
    ey = Math.max(ey, ry + rh / 2);
    ex0 = Math.min(ex0, rx); ex1 = Math.max(ex1, rx + rw);
  }
  const y = Math.round(ey * S);
  if (y < 0 || y >= h) return null;
  const x0 = f * frameW;
  const op = (x) => x >= 0 && x < frameW && data[((y * w) + x0 + x) * 4 + 3] > ALPHA;
  let L = Math.round(ex0 * S), R = Math.round(ex1 * S);
  if (!op(L) && !op(R)) return null;
  while (L > 0 && op(L - 1)) L--;
  while (R < frameW - 1 && op(R + 1)) R++;
  const hw = (R - L + 1) / S;
  if (hw < MIN_HEAD || hw > MAX_HEAD) return null;
  return [Math.round(L / S), Math.round(R / S), Math.round(y / S)];
}

/* ── tier 'interp' ── bounded on both sides by a measurement, or carried. */
function fill(tuples, tiers) {
  const n = tuples.length;
  const known = [];
  for (let i = 0; i < n; i++) if (tuples[i]) known.push(i);
  if (!known.length) return;
  for (let i = 0; i < n; i++) {
    if (tuples[i]) continue;
    let prev = -1, next = -1;
    for (const k of known) { if (k < i) prev = k; else { next = k; break; } }
    if (prev < 0 && next < 0) continue;
    if (prev < 0) { tuples[i] = tuples[next].slice(); tiers[i] = 'interp'; continue; }
    if (next < 0) { tuples[i] = tuples[prev].slice(); tiers[i] = 'interp'; continue; }
    const t = (i - prev) / (next - prev);
    tuples[i] = tuples[prev].map((v, j) => Math.round(v + (tuples[next][j] - v) * t));
    tiers[i] = 'interp';
  }
}

const out = {}, report = [];
for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.png')).sort()) {
  const base = file.replace(/\.png$/, '');
  const sh = frameOf(file);
  const rects = EYE[base];
  const tuples = new Array(sh.n).fill(null);
  const tiers = new Array(sh.n).fill(null);

  if (rects) {
    for (let f = 0; f < sh.n; f++) {
      const a = eyeAnchor(sh, f, rects);
      if (a) { tuples[f] = a; tiers[f] = 'eye'; }
    }
  }
  const nEye = tiers.filter((t) => t === 'eye').length;

  fill(tuples, tiers);
  const got = tuples.filter(Boolean).length;
  if (got) out[base] = tuples.map((t, i) => (t ? [...t, tiers[i]] : null));
  report.push([base, sh.n, got, nEye, 0, tiers.filter((t) => t === 'interp').length]);
}

const sum = (i) => report.reduce((a, r) => a + r[i], 0);
if (process.argv.includes('--report')) {
  console.log('sheet                      frames  placed   eye  interp');
  for (const r of report) {
    const flag = r[2] < r[1] ? '  <-- GAPS' : '';
    console.log(`${r[0].padEnd(26)} ${String(r[1]).padStart(6)} ${String(r[2]).padStart(7)} ${String(r[3]).padStart(5)} ${String(r[5]).padStart(7)}${flag}`);
  }
  console.log(`\nplaced ${sum(2)}/${sum(1)} frames  (eye ${sum(3)}, interp ${sum(5)})`);
  const gaps = report.filter((r) => r[2] < r[1]);
  console.log(`sheets still with gaps: ${gaps.length}${gaps.length ? ' -> ' + gaps.map((g) => g[0]).join(' ') : ''}`);
  process.exit(0);
}
const i = process.argv.indexOf('--out');
const OUT = i > 0 ? process.argv[i + 1] : path.join(REPO, 'src/rendering/earAnchors.json');
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`wrote ${path.relative(REPO, OUT)}`);
console.log(`  ${Object.keys(out).length} sheet(s), ${sum(2)}/${sum(1)} frames (eye ${sum(3)}, interp ${sum(5)})`);
