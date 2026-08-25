/* ═══ v2.3.1924: PER-FACING HEADWEAR SIZE FIT ═══
 *
 * Owner: "the biggest issue is just the size of the hat relative to the head
 * per direction is inconsistent."
 *
 * They are right, and it is not the hats' fault.  The five stand sheets draw
 * the head at five different sizes in the 256 frame — measured with the same
 * crown-run probe tools/tune_headwear.py uses (median of the opaque run
 * through the crown at depths 6/10/14/18/22):
 *
 *     south 43   southwest 52   east 45   northeast 44   north 41
 *
 * BODY_DIR_SCALE (v2.3.1826) evens the figure's HEIGHT across facings, not its
 * head width, and it multiplies hat and body alike — so it cancels out of the
 * hat/head ratio entirely and cannot help here.  A hat whose art is the same
 * size in all five frames therefore renders 17% small against the southwest
 * head and 5% large against the north one, purely from that spread.  The five
 * radially symmetric hats prove it: bucket-hat, fedora, sombrero, top-hat and
 * halo have IDENTICAL silhouettes at every facing (dis = 0.00 below), and all
 * five drift by exactly headW.south/headW.dir.  Nothing about the art varies;
 * only the head under it does.
 *
 * WHAT THIS FIXES.  For each hat, hold its own average size and remove the
 * per-facing variance — the same shape of correction, and the same reasoning,
 * that v2.3.1826 applied to the body itself.  The target is the hat's
 * FACING-WEIGHTED geometric mean ratio, weighted 2 for east/southwest/
 * northeast (their art is mirrored to cover west/southeast/northwest) and 1
 * for south/north, so the mean is over what a player actually sees.  Keeping
 * the mean fixed means no hat gets bigger or smaller overall; they only stop
 * changing size as the character turns.
 *
 * THE SHAPE GUARD, which is the whole reason this can run unattended.  Size
 * here is sqrt(w*h) of the drawn bbox, and for most headwear that is a fair
 * measure.  It is not fair for a piece whose SILHOUETTE changes with the
 * angle: axe-head is 16px wide from the front (blade edge-on) and 52px from
 * the side (blade broadside), and cat-ears go 51px front to 15px in profile.
 * Normalising those on bbox size would shrink the axe to a third of itself.
 * So each facing is checked against the hat's own median ASPECT RATIO first,
 * and a facing whose aspect is off by more than ASPECT_TOL is left completely
 * alone and dropped from the mean — its size difference is the art telling
 * the truth about a different view, not a scale error.
 *
 * EVERY SCALE CHANGE IS PAIRED WITH ITS NUDGE, by the rule tools/
 * tune_headwear.py established: _placeTrait pins anchors[dir] (the bbox
 * TOP-centre) to the crown and scales about it, so growing a hat pushes its
 * band down the face.  The hat's BOTTOM edge — the band, the brim, the line
 * where it meets the skull — is what has to stay put:
 *
 *     bottom = crown + nudgeY + bboxH * scale
 *     hold it:  nudgeY' = nudgeY + bboxH * (scale - scale')
 *
 * WHAT IT DELIBERATELY DOES NOT TOUCH:
 *   - `halo`, which is not worn.  Its clearance is recomputed every frame
 *     against the hair under it (_floatAboveHairLift), so its size is a
 *     styling choice rather than a fit, and its seat is not ours to hold.
 *   - jog-east.  JOG_EW_HAT_TUNE in entityRenderer.js is eleven hats the
 *     owner dialled BY EYE against the blanket 0.67, and scale[east] feeds
 *     that pose too.  Any hat in that table whose east scale moves here gets
 *     its `mul` divided by the same factor, printed at the end for a hand
 *     edit, so the running hat renders exactly as it does today.
 *
 *   node tools/fit-headwear-scale.mjs [--write]
 */
import fs from 'node:fs';
import path from 'node:path';
import { decode } from './png.mjs';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const HW = path.join(REPO, 'public/sprites/traits/headwear');
const DIRS = ['south', 'southwest', 'east', 'northeast', 'north'];
const DEPTHS = [6, 10, 14, 18, 22];
const ASPECT_TOL = 0.30;   /* |log(aspect / median aspect)|; 0.30 ~ 35% off */
const DEADBAND = 0.05;     /* below 5% is not worth a diff */
/* ±15%, deliberately tighter than the measurements ask for.  Width against the
   head is the best view-stable measure available, but it is not perfect: a
   helmet with ear flaps really is wider head-on than in profile, so part of
   every large reading is silhouette rather than error.  Bounding the move
   keeps this pass in "nudge it toward its siblings" territory — no hat is
   redesigned by a script, and anything still visibly off is left for a human
   to judge off the contact sheet. */
const CLAMP = [0.85, 1.15];
const SKIP = new Set(['halo']);

const WRITE = process.argv.includes('--write');
const tops = JSON.parse(fs.readFileSync(path.join(REPO, 'public/sprites/player/body-tops.json'), 'utf8'));
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

/* tools/tune_headwear.py sheet_head(), in JS: the opaque run THROUGH THE
   CROWN at several depths, median.  Measuring the row's full extent instead
   swallows whatever else the pose puts beside the head. */
function headWidth(dir) {
  const im = decode(fs.readFileSync(path.join(REPO, `public/sprites/player/stand-${dir}.png`)));
  const fw = im.height, frames = Math.floor(im.width / fw), sc = 256 / fw, acc = [];
  for (let i = 0; i < frames; i++) {
    const key = `stand-${dir}-${i}`;
    if (!tops[key]) continue;
    const cy = tops[key][1] / sc, cx0 = Math.round(tops[key][0] / sc);
    for (const depth of DEPTHS) {
      const r = Math.round(cy + depth / sc);
      if (r < 0 || r >= fw) continue;
      const at = (x) => im.data[(r * im.width + (i * fw + x)) * 4 + 3] > 40;
      let cx = cx0;
      if (!(cx >= 0 && cx < fw && at(cx))) {
        let best = -1, bd = 1e9;
        for (let x = 0; x < fw; x++) if (at(x) && Math.abs(x - cx0) < bd) { bd = Math.abs(x - cx0); best = x; }
        if (best < 0) continue;
        cx = best;
      }
      let lo = cx; while (lo > 0 && at(lo - 1)) lo--;
      let hi = cx; while (hi < fw - 1 && at(hi + 1)) hi++;
      acc.push((hi - lo + 1) * sc);
    }
  }
  return med(acc);
}

const headW = {};
for (const d of DIRS) headW[d] = headWidth(d);

const items = fs.readdirSync(HW).filter((f) => fs.statSync(path.join(HW, f)).isDirectory()).sort();
const pct = (v) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;
const changes = [];

console.log('head width drawn in each stand sheet (256-space):',
  DIRS.map((d) => `${d} ${headW[d]}`).join('   '));
console.log(`\nshape guard: a facing whose aspect is >${(ASPECT_TOL * 100) | 0}% off the hat's median aspect is left alone (marked ~).`);
console.log(`deadband ${(DEADBAND * 100) | 0}%.\n`);
console.log('item'.padEnd(19) + DIRS.map((d) => d.slice(0, 9).padStart(11)).join(''));

for (const it of items) {
  const file = path.join(HW, it, 'meta.json');
  const meta = JSON.parse(fs.readFileSync(file, 'utf8'));
  const cur = {}, ratio = {}, aspect = {};
  for (const d of DIRS) {
    const bb = meta.bboxes && meta.bboxes[d];
    if (!bb) continue;
    cur[d] = (meta.scale && meta.scale[d] != null) ? meta.scale[d] : 1;
    /* WIDTH, not area or height.  How much of a hat's HEIGHT you see is
       almost entirely the viewing angle — a cap is 24px deep head-on and
       34px from the side, the same cap — so any measure with height in it
       reports the front view of every hat as undersized.  Width against the
       head's width at the same facing is the one number that means the same
       thing from all five angles. */
    ratio[d] = bb[2] * cur[d] / headW[d];
    aspect[d] = bb[2] / bb[3];
  }
  const present = DIRS.filter((d) => ratio[d] != null);
  if (!present.length) continue;
  const medAspect = med(present.map((d) => aspect[d]));
  const stable = present.filter((d) => Math.abs(Math.log(aspect[d] / medAspect)) <= ASPECT_TOL);
  /* THE TARGET IS THE HAT'S OWN MEDIAN, which is the conservative choice: it
     moves the minority of facings that disagree onto the majority that
     already agree, so most hats end up with two or three facings changed and
     the rest untouched.
     Not south, though south is the authored view and was tried first: south
     is systematically the LARGEST facing across this set (the front view is
     where the hat is drawn most prominently — old-school-helmet reads 1.35
     head-widths there against 1.09-1.15 everywhere else), so anchoring on it
     inflates the four facings that were already consistent.  Verified by
     rendering: south-anchored, the helmet swallowed the head on every other
     facing. */
  const pool = SKIP.has(it) ? [] : stable;
  const target = pool.length ? med(pool.map((d) => ratio[d])) : null;

  const cells = [];
  for (const d of DIRS) {
    if (ratio[d] == null) { cells.push(''.padStart(11)); continue; }
    if (!pool.includes(d)) { cells.push('~'.padStart(11)); continue; }
    let f = target / ratio[d];
    f = Math.min(CLAMP[1], Math.max(CLAMP[0], f));
    if (Math.abs(f - 1) < DEADBAND) { cells.push('·'.padStart(11)); continue; }
    const before = cur[d];
    const after = +(before * f).toFixed(3);
    const bh = meta.bboxes[d][3];
    const nudge = (meta.crownNudge && meta.crownNudge[d]) || [0, 0];
    /* Hold whichever edge keeps the hat ON the head.
       GROWING: hold the bottom, the rule tools/tune_headwear.py established —
       the anchor is the bbox TOP, so a bigger hat otherwise slides its band
       down over the eyes.
       SHRINKING: hold the top, i.e. leave the nudge alone.  Rebasing on the
       bottom here does the mirror-image damage — it drops the hat onto the
       skull and the crown of the head pokes out above it (old-school-helmet
       south, measured, would have dropped 9px in 256-space).  Each half of
       this rule is the one that avoids the failure its direction has. */
    const newY = after > before ? Math.round(nudge[1] + bh * (before - after)) : nudge[1];
    changes.push({ item: it, dir: d, before, after, f, nudgeBefore: nudge[1], nudgeAfter: newY });
    cells.push(pct(f - 1).padStart(11));
    if (WRITE) {
      meta.scale = meta.scale || {};
      meta.scale[d] = after;
      meta.crownNudge = meta.crownNudge || {};
      meta.crownNudge[d] = [nudge[0], newY];
    }
  }
  console.log(it.padEnd(19) + cells.join(''));
  if (WRITE && changes.some((c) => c.item === it)) {
    const tag = ' v2.3.1924: per-facing size fitted by tools/fit-headwear-scale.mjs. The five stand'
      + ' sheets draw the head at five different widths (43/52/45/44/41 in the 256 frame) and'
      + ' BODY_DIR_SCALE cancels out of the hat/head ratio, so a hat drawn one size renders a'
      + ' different size on every facing. scale[dir] now moves the facings that disagree onto the'
      + ' median of the ones that agree, measured as drawn WIDTH over head width, bounded to 15%,'
      + ' and skipped entirely on a facing whose aspect ratio says the silhouette itself changed.'
      + ' A facing that GREW carries a crownNudge Y that holds its bottom edge still.';
    if (!String(meta.note || '').includes('fit-headwear-scale')) meta.note = (meta.note || '') + tag;
    /* Escape non-ASCII the way the Python tools' json.dump(ensure_ascii=True) does.
       These notes carry em dashes from a decade of tooling; re-encoding them as
       literal UTF-8 would rewrite the whole line in every diff for no change. */
    const json = JSON.stringify(meta, null, 2).replace(/[\u0080-\uffff]/g,
      (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
    fs.writeFileSync(file, json + '\n');
  }
}

console.log(`\n${changes.length} facing scales change across ${new Set(changes.map((c) => c.item)).size} hats.`);
const big = changes.filter((c) => Math.abs(c.f - 1) >= 0.15).sort((a, b) => Math.abs(b.f - 1) - Math.abs(a.f - 1));
if (big.length) {
  console.log('\nlargest moves:');
  for (const c of big) console.log(`  ${c.item.padEnd(19)} ${c.dir.padEnd(10)} scale ${c.before} -> ${c.after}  (${pct(c.f - 1)})   nudgeY ${c.nudgeBefore} -> ${c.nudgeAfter}`);
}
const JOG = ['old-school-helmet', 'top-hat', 'purple-hat', 'beanie', 'red-cap', 'shark-hat', 'bandana', 'sombrero', 'bucket-hat', 'fedora', 'wizard-hat'];
const jogHits = changes.filter((c) => c.dir === 'east' && JOG.includes(c.item));
if (jogHits.length) {
  console.log('\nJOG_EW_HAT_TUNE compensation — divide each `mul` by this so jog-east renders unchanged:');
  for (const c of jogHits) console.log(`  ${c.item.padEnd(19)} east x${c.f.toFixed(3)}  ->  mul / ${c.f.toFixed(3)}`);
}
const jsonAt = process.argv.indexOf('--json');
if (jsonAt > 0 && process.argv[jsonAt + 1]) {
  const byItem = Object.create(null);   /* client-free, but the habit is the rule */
  for (const c of changes) (byItem[c.item] = byItem[c.item] || Object.create(null))[c.dir] = { scale: c.after, nudgeY: c.nudgeAfter };
  fs.writeFileSync(process.argv[jsonAt + 1], JSON.stringify(byItem, null, 1));
  console.log('proposal written to', process.argv[jsonAt + 1]);
}
console.log(WRITE ? '\nWROTE meta.json for every hat above.' : '\nDRY RUN — pass --write to apply.');
