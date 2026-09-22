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
 * ── THE TIERS, AND WHY THEY ARE LABELLED ──
 *   'eye'    ear line from the reviewed iris CENTRE; sides from the plateau.
 *   'crown'   no iris on this frame, so the ear line is a calibrated drop below
 *            the crown. Two guards reject a "crown" that is a raised weapon.
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
 * ── REVIEW RESULTS ──
 * v2.3.2644, first pass:
 *   'eye'    seated correctly on stand-south / stand-southwest.
 *   'interp' CORRECT, and the finding that matters: across jog-east's 28 frames
 *            the interpolated ears are indistinguishable from the measured ones
 *            and stay locked to a head that bobs ~6px. So a few measured frames
 *            per strip is enough, and that is what removed the strobing.
 *   'walk'   WRONG -- ears on the SHOULDERS ("widest row" = the deltoid line).
 *            Removed, not shipped. That is what a red tier is for.
 *   profile  The ear RULE was wrong on every east frame, independently of
 *            placement: both-sides puts one ear on the nose. See earSides.js.
 *
 * v2.3.2645, second pass -- and the first pass had SHIPPED A BUG:
 *   The ear line was max(ry + rh/2) over the iris rects, i.e. the BOTTOM of the
 *   iris. 4px low, onto the jaw, and the outward scan from there reached the
 *   SHOULDER: stand-south measured a 51px head where the art says 43. The
 *   contact sheet did not catch it, because 4px on a 96px cell reads as "about
 *   right" -- hand-reading the art as ASCII did. Fixed to the iris centre, and
 *   the sides now come from the width plateau instead of an outward scan.
 *   Coverage 417 -> 660 of the 712 frames that should have ears (93%), because
 *   the plateau needs no iris and so reaches the back-facing sheets.
 *   Re-reviewed: stand-south and stand-north seated correctly, and the 'crown'
 *   tier holds across all 23 frames of jog-north.
 *
 * STILL BARE: bow (22 frames) -- the bow is held across the face, so neither
 * the crown nor a plateau around the iris finds the skull -- and
 * sword-south-body / -torso (28). Those 50 frames want hand-authored seeds,
 * which interpolation then spreads; see docs/specs/SPECIES-PLAN.md.
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

/* A head narrower or wider than this is not a head: a hand, a hilt, a bow held
   across the face, or a frame whose landmark landed off it. Refuse rather than
   place an ear on it.
   The ceiling is MEASURED, not generous: across every frame that verifies
   against a reviewed iris, heads run 41-54 in 256-space, with the dodge roll
   (drawn larger) reaching 73. 78 admits all of that and rejects bow-east's
   100px "head", which was the plateau swallowing the bow. A loose 110 let that
   through and the review sheet is where it showed. */
const MIN_HEAD = 20, MAX_HEAD = 78;

function frameOf(file) {
  const { width: w, height: h, data } = decode(fs.readFileSync(path.join(DIR, file)));
  return { w, h, data, frameW: h, n: Math.max(1, Math.round(w / h)), S: h / SPACE };
}

/* ── the head's SIDES: the width plateau below the crown ── */
/* v2.3.2645. A skull widens from the crown, HOLDS near-constant through the
   ear line, then the shoulders add a second, separate widening. The longest
   near-constant run below the crown is therefore the head, and its extremes
   are where the ears attach.
   Two bounds make it work, and both were found by getting it wrong:
     - Search only crown..crown+32 (256-space). Unbounded, the TORSO is a
       longer plateau than the skull and wins outright: stand-south returned
       rows 93..112 at 64px, the chest.
     - Compare each row to the run's FIRST width, not to a running median. A
       median drifts up as the head widens and closes the run early.
   Receipt: matches a hand read of the art (ASCII, 256-space) EXACTLY on
   stand-north (107..147) and within 1px on stand-south (106..149 vs 106..148).
   Crucially it needs NO iris, so it reaches the back-facing sheets that
   v2.3.2644 had to leave bare. */
const HEAD_SEARCH = 32, PLATEAU_TOL = 2;
function headPlateau(sh, f, irisY) {
  const { w, h, data, frameW, S } = sh;
  const x0 = f * frameW;
  const span = (y) => {
    let a = -1, b = -1;
    for (let x = 0; x < frameW; x++) if (data[((y * w) + x0 + x) * 4 + 3] > ALPHA) { if (a < 0) a = x; b = x; }
    return a < 0 ? null : [a, b];
  };
  let crown = -1;
  for (let y = 0; y < h && crown < 0; y++) if (span(y)) crown = y;
  if (crown < 0) return null;
  /* v2.3.2645: where to look. From the CROWN normally -- but when this frame
     has a reviewed iris, look around the IRIS instead. On the bow poses the
     topmost pixel is the bow held up across the head, so a crown-anchored
     window starts above the weapon and the crown guard then throws the frame
     away: bow-east/south/southwest lost all their verified coverage that way.
     An iris is on the face by definition, so a window around it is on the head
     whatever is raised nearby. */
  let from = crown, to = crown + Math.round(HEAD_SEARCH * S);
  if (irisY != null) {
    from = Math.max(0, Math.round((irisY - 24) * S));
    to = Math.round((irisY + 8) * S);
  }
  const prof = [];
  for (let y = Math.max(0, from); y < Math.min(h, to); y++) {
    const sp = span(y);
    if (!sp) break;
    prof.push({ y, l: sp[0], r: sp[1], wd: sp[1] - sp[0] + 1 });
  }
  if (prof.length < 4) return null;
  const tol = Math.max(1, Math.round(PLATEAU_TOL * S));
  let best = null;
  for (let a = 0; a < prof.length; a++) {
    let k = a;
    while (k + 1 < prof.length && Math.abs(prof[k + 1].wd - prof[a].wd) <= tol) k++;
    const len = k - a + 1;
    if (!best || len > best.len || (len === best.len && prof[a].wd > best.wd)) best = { a, k, len, wd: prof[a].wd };
    if (k > a) a = k - 1;
  }
  if (!best || best.len < Math.round(4 * S)) return null;
  let L = Infinity, R = -Infinity;
  for (let q = best.a; q <= best.k; q++) { if (prof[q].l < L) L = prof[q].l; if (prof[q].r > R) R = prof[q].r; }
  const hw = (R - L + 1) / S;
  if (hw < MIN_HEAD || hw > MAX_HEAD) return null;
  return { L: L / S, R: R / S, crown: crown / S, top: prof[best.a].y / S, hw };
}

/* ── the ear LINE: the iris centre, or a calibrated drop from the crown ── */
/* v2.3.2645 BUG FIX, shipped wrong in v2.3.2644. This was max(ry + rh/2) over
   the iris rects, which is the BOTTOM of the iris and not its middle: the mask
   stores an iris as a stack of 1-row rects, so stand-south's rows 53..59 gave
   60 instead of 56. Four pixels low put the ear on the jaw, and the outward
   scan from there ran into the SHOULDER -- which is why that head measured
   51px wide when the art says 43. The contact sheet did NOT catch it, because
   4px on a 96px review cell reads as "about right"; hand-reading the sheet as
   ASCII did. Tightening the review is TRAPS §92's second lesson. */
function irisCentre(rects, f) {
  const per = rects && rects[f];
  if (!per || !per.length) return null;
  let a = Infinity, b = -Infinity;
  for (const [, ry, , rh] of per) { a = Math.min(a, ry); b = Math.max(b, ry + rh); }
  return (a + b) / 2;
}

/* Where the ear line sits, as a share of head width below the crown. Measured
   on every sheet that has BOTH a plateau and an iris: stand-south 0.534,
   stand-east 0.543, stand-southwest 0.500, jog-south 0.609, jog-east 0.477 --
   a tight band, and that tightness is what makes it usable where there is no
   iris at all. It doubles as the guard that catches a "crown" which is not a
   head: sword-south's topmost pixel is the SWORD TIP and it scores 3.77. */
const DROP = 0.53, DROP_MIN = 0.40, DROP_MAX = 0.72;
/* Second guard on the same failure, independent of the iris: a real crown sits
   just above the plateau. sword-south's plateau starts 0.58 head-widths below
   its "crown"; stand-south's starts 0.23 below. */
const CROWN_GAP_MAX = 0.45;

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

  for (let f = 0; f < sh.n; f++) {
    const ic = irisCentre(rects, f);
    const hp = headPlateau(sh, f, ic);
    if (!hp) continue;
    let y, tier;
    if (ic != null) {
      /* The iris IS the ear line. The plateau only has to supply the sides,
         and it was searched around this iris, so no crown guard applies. */
      y = ic; tier = 'eye';
    } else {
      /* No iris: the crown has to carry the ear line, so both guards apply --
         a crown far above the plateau is a raised weapon, pickaxe or rod. */
      if ((hp.top - hp.crown) / hp.hw > CROWN_GAP_MAX) continue;
      y = hp.crown + DROP * hp.hw; tier = 'crown';
    }
    tuples[f] = [Math.round(hp.L), Math.round(hp.R), Math.round(y)];
    tiers[f] = tier;
  }

  fill(tuples, tiers);
  const got = tuples.filter(Boolean).length;
  if (got) out[base] = tuples.map((t, q) => (t ? [...t, tiers[q]] : null));
  report.push([base, sh.n, got,
    tiers.filter((t) => t === 'eye').length,
    tiers.filter((t) => t === 'crown').length,
    tiers.filter((t) => t === 'interp').length]);
}

const sum = (i) => report.reduce((a, r) => a + r[i], 0);
if (process.argv.includes('--report')) {
  console.log('sheet                      frames  placed   eye crown  interp');
  for (const r of report) {
    const flag = r[2] < r[1] ? '  <-- GAPS' : '';
    console.log(`${r[0].padEnd(26)} ${String(r[1]).padStart(6)} ${String(r[2]).padStart(7)} ${String(r[3]).padStart(5)} ${String(r[4]).padStart(5)} ${String(r[5]).padStart(7)}${flag}`);
  }
  console.log(`\nplaced ${sum(2)}/${sum(1)} frames  (eye ${sum(3)}, crown ${sum(4)}, interp ${sum(5)})`);
  const gaps = report.filter((r) => r[2] < r[1]);
  console.log(`sheets still with gaps: ${gaps.length}${gaps.length ? ' -> ' + gaps.map((g) => g[0]).join(' ') : ''}`);
  process.exit(0);
}
const i = process.argv.indexOf('--out');
const OUT = i > 0 ? process.argv[i + 1] : path.join(REPO, 'src/rendering/earAnchors.json');
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`wrote ${path.relative(REPO, OUT)}`);
console.log(`  ${Object.keys(out).length} sheet(s), ${sum(2)}/${sum(1)} frames (eye ${sum(3)}, crown ${sum(4)}, interp ${sum(5)})`);
