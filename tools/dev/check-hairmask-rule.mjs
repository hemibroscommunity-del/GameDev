#!/usr/bin/env node
/* ═══ v2.3.1960: THE HAIR-CLIP MASKS STILL OBEY THE OWNER'S WIDTH RULE ═══
 *
 * The rule shipped in v2.3.1957 (tools/make_hairmask.py) with no test at all.
 * Owner, quoted in that commit:
 *
 *     "For the hair mask it's best to clip the width of the hair and any hair
 *     above it based on the width equal to and above the hat item.  Other
 *     headwear (like bandana, other open top headwear, etc) would be the
 *     exceptions to that rule."
 *
 * The mask is what the renderers KEEP hair inside (entityRenderer
 * _clipHairToHat; characterPortrait's destination-in pass), so every hat's
 * mask/<dir>.png is a look decision baked into a PNG.  Nothing on the PR path
 * looked at those PNGs, which means the two ways they go wrong were both
 * silent: the rule gets edited, or the ART gets recut and nobody re-runs the
 * generator.
 *
 * WHY THE RULE IS RESTATED HERE INSTEAD OF SHELLING OUT TO THE GENERATOR.
 * "Regenerate and compare" is the obvious check and it is half a check: it
 * passes for any rule at all, as long as whoever changed it remembered to
 * re-run it.  The revert this file exists to catch — part 1 going back to "in
 * a column the hat occupies, everything from the hat's topmost pixel
 * downward" — would be re-run and would pass.  So the rule is stated here, in
 * its own words, from the hat art; the generator is a second implementation of
 * the same sentence and the two are held against each other.  (make_hairmask.py
 * also needs python + numpy + Pillow, and precheck is node-and-git only.)
 *
 * The statement was calibrated against the generator, not guessed: on
 * v2.3.1957's art this file's masks are byte-identical to the 155 frames
 * `python3 tools/make_hairmask.py --all-with-masks --apply` writes, and the
 * bald_px port below reproduces its numbers exactly (naruto-headband 159,
 * bandana-2 297, bandana-blue 303, spartan-helmet 14 on southwest).
 *
 * WHAT THE REVERT ACTUALLY COSTS, measured while writing this, because it is
 * not what you would guess from the shape of the change.  The old part 1 fills
 * a hat-occupied column from its topmost pixel down; the new one fills the
 * accumulated run.  Every column the old rule fills has a hat pixel at or
 * above the row in question, so it lies inside that run — the old mask is a
 * SUBSET of the new one, always.  Reverting can therefore only take hair away,
 * never add it, and on today's art it is byte-identical for 23 of the 31 hats
 * (beanie, top-hat, red-cap, army-helmet, russian-hat among them).  The 8 it
 * does change are the ones with a hole in their outline — barbarian-helmet,
 * cowboy-hat, cowboy-hat-2, crown, devil-horns, evil-crown, mickey-ears,
 * shark-hat — and it changes them by emptying that hole.  So the assertion
 * that catches a revert is the unbroken-run one, and an "an afro balloons out
 * beside a beanie again" assertion would have been a test of nothing.
 *
 *   node tools/dev/check-hairmask-rule.mjs [--verbose]
 *
 * Exits non-zero on any FAIL.  Wired into tools/dev/precheck.mjs, gated on the
 * generator, the headwear folder and the body/crown table changing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode } from '../png.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const HW = path.join(REPO, 'public/sprites/traits/headwear');
const DIRS = ['south', 'southwest', 'east', 'northeast', 'north'];
const VERBOSE = process.argv.includes('--verbose');

/* Every constant below mirrors make_hairmask.py.  They are duplicated rather
   than parsed out of the python because a silent change to one of THEM is a
   change to the rule too, and should land here as a failure to look at. */
const ALPHA_T = 16;      // a pixel counts as present above this alpha
const FRAME = 256;       // the space meta.json anchors are expressed in
const SKULL_ROWS = 26;   // rows below the body's crown that count as scalp
const BALD_T = 150;      // bare scalp above which a hat must NOT clip hair

let fails = 0, passes = 0;
const ok = (name, cond, detail) => {
  if (cond) { passes++; if (VERBOSE) console.log('PASS ' + name); return true; }
  fails++;
  console.log('FAIL ' + name + (detail !== undefined ? '\n       ' + JSON.stringify(detail) : ''));
  return false;
};

/* ── pixels ─────────────────────────────────────────────────────────────── */
const img = (p) => decode(fs.readFileSync(p));
/** 1-bit presence map of an image's alpha. */
const bits = (im) => {
  const m = new Uint8Array(im.width * im.height);
  for (let i = 0; i < m.length; i++) m[i] = im.data[i * 4 + 3] > ALPHA_T ? 1 : 0;
  return { w: im.width, h: im.height, m };
};
/** Nearest-neighbour resample — the generator's Image.NEAREST, so a mask
    authored at 128 lands on the 256 body exactly where python puts it. */
function nearest(src, W, H) {
  const out = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    const sy = Math.min(src.height - 1, Math.floor(y * src.height / H));
    for (let x = 0; x < W; x++) {
      const sx = Math.min(src.width - 1, Math.floor(x * src.width / W));
      const si = (sy * src.width + sx) * 4, di = (y * W + x) * 4;
      out[di] = src.data[si]; out[di + 1] = src.data[si + 1];
      out[di + 2] = src.data[si + 2]; out[di + 3] = src.data[si + 3];
    }
  }
  return { width: W, height: H, data: out };
}
const load256 = (p) => {
  const im = img(p);
  return im.width === FRAME ? im : nearest(im, FRAME, Math.round(im.height * FRAME / im.width));
};

/* ── the rule, in its own words ─────────────────────────────────────────── */
/**
 * The v2.3.1957 mask for one hat frame.
 *
 *   1. AT AND ABOVE THE HAT, the hair is no wider than the hat has been at
 *      that row or ANY ROW ABOVE IT.  The bound accumulates downward, which is
 *      what makes a dome (widest along its own bottom edge) untouched at that
 *      edge while an ear stops counting the moment it ends.
 *   2. BELOW the hat's lowest pixel, full width — so hair still frames the
 *      face and a Sombrero does not read as shaving you (v2.3.1529).
 *
 * The accumulated bound is a CONTIGUOUS run, and that is the whole of the
 * "exceptions" clause: an open-top hat's outermost pixels are its points, so
 * by the time the scan reaches the skull the bound is already as wide as the
 * spikes and the hair inside the crown survives.  No list of exceptions.
 */
function ruleMask(hatBits) {
  const { w, h, m } = hatBits;
  const out = new Uint8Array(w * h);
  let top = -1, bot = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) if (m[y * w + x]) { if (top < 0) top = y; bot = y; break; }
  }
  if (bot < 0) return { w, h, m: out, top, bot };
  for (let y = bot + 1; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = 1;   /* part 2 */
  let lo = w, hi = -1;
  for (let y = top; y <= bot; y++) {                                                  /* part 1 */
    for (let x = 0; x < w; x++) if (m[y * w + x]) { if (x < lo) lo = x; if (x > hi) hi = x; }
    if (hi >= 0) for (let x = lo; x <= hi; x++) out[y * w + x] = 1;
  }
  return { w, h, m: out, top, bot };
}

/* ── where the game puts a trait ────────────────────────────────────────── */
/* A port of make_hairmask.py's _place, which is itself the entityRenderer
   _placeTrait arithmetic.  Needed because "does this mask shave the head" can
   only be asked of the mask ON the body, not of the PNG on its own. */
const tops = JSON.parse(fs.readFileSync(path.join(REPO, 'public/sprites/player/body-tops.json'), 'utf8'));
function place(art, meta, d) {
  let a = meta.anchors[d].slice();
  let n = ((meta.crownNudge && meta.crownNudge[d]) || [0, 0]).slice();
  const sc = (meta.scale && meta.scale[d]) || 1;
  if (sc !== 1) {
    const s = Math.max(1, Math.round(FRAME * sc));
    art = nearest(art, s, s); a = [a[0] * sc, a[1] * sc]; n = [n[0] * sc, n[1] * sc];
  }
  const [bx, by] = tops[`stand-${d}-0`];
  const dx = Math.round(bx - (a[0] - n[0])), dy = Math.round(by - (a[1] - n[1]));
  const out = new Uint8Array(FRAME * FRAME);
  for (let y = 0; y < art.height; y++) {
    const ty = y + dy; if (ty < 0 || ty >= FRAME) continue;
    for (let x = 0; x < art.width; x++) {
      const tx = x + dx; if (tx < 0 || tx >= FRAME) continue;
      if (art.data[(y * art.width + x) * 4 + 3] > ALPHA_T) out[ty * FRAME + tx] = 1;
    }
  }
  return out;
}
/** RGBA image from a 1-bit map, so a computed mask can go through `place`. */
const toImg = (g) => {
  const d = Buffer.alloc(g.w * g.h * 4);
  for (let i = 0; i < g.w * g.h; i++) if (g.m[i]) { d[i * 4] = 255; d[i * 4 + 1] = 255; d[i * 4 + 2] = 255; d[i * 4 + 3] = 255; }
  return { width: g.w, height: g.h, data: d };
};

/**
 * Worst-case bare scalp this mask leaves, IN THE HAT'S OWN HORIZONTAL SPAN.
 *
 * The port of bald_px.  The scoping is the load-bearing part and it has been
 * got wrong twice: the guard exists because clipping hair to a BAND (the
 * Naruto Headband, the Red and Blue Bandanas) leaves a bare skin dome above
 * the band, and that dome sits inside the band's own columns — while the
 * width rule deliberately leaves skin BESIDE a cap, which is the hair being
 * pressed down rather than ballooning and must NOT be counted.  Count the
 * whole skull and real caps get refused; count nothing and bands get through
 * and shave the crown.
 */
function baldPx(hid, meta, masks) {
  let worst = 0, worstDir = '';
  for (const d of Object.keys(masks)) {
    if (!meta.anchors || !meta.anchors[d]) continue;
    const hat = place(load256(path.join(HW, hid, d + '.png')), meta, d);
    let mk = masks[d];
    /* the mask is authored at the ART's size (128 since v2.3.1526) and the
       meta is expressed in the 256 frame, so it comes up to 256 first or it
       lands at half size and every hat reads as bald */
    if (mk.width !== FRAME) mk = nearest(mk, FRAME, FRAME);
    const msk = place(mk, meta, d);
    const body = bits(load256(path.join(REPO, `public/sprites/player/stand-${d}.png`)));
    const by = tops[`stand-${d}-0`][1];
    let lo = FRAME, hi = -1;
    for (let i = 0; i < hat.length; i++) if (hat[i]) { const x = i % FRAME; if (x < lo) lo = x; if (x > hi) hi = x; }
    let n = 0;
    for (let y = by; y < Math.min(FRAME, by + SKULL_ROWS); y++) {
      for (let x = lo; x <= hi; x++) {
        const i = y * FRAME + x;
        if (body.m[i] && !msk[i] && !hat[i]) n++;
      }
    }
    if (n > worst) { worst = n; worstDir = d; }
  }
  return [worst, worstDir];
}

/* ══ 1. every committed mask IS the rule ═════════════════════════════════ */
/* The cheap, total one: 155 frames, no browser, no python.  It is the check
   that fires when the ART is recut and the masks are not rebuilt — the two
   live in the same folder and nothing else notices they have drifted apart.
   Every property below is implied by this one; they exist to say WHICH half
   of the rule broke, because "12 frames differ" is not an actionable failure
   message and this file's job is to be read by whoever broke it. */
const hats = fs.readdirSync(HW).sort().filter((h) => fs.existsSync(path.join(HW, h, 'hairmask')));
ok('there are hats with hairmasks to check at all (guard: an empty sweep passes everything)',
  hats.length >= 30, { hats: hats.length });

let frames = 0;
const drifted = [];
const spanBroken = [], holeBroken = [], aboveBroken = [], belowBroken = [];
for (const hid of hats) {
  const meta = JSON.parse(fs.readFileSync(path.join(HW, hid, 'meta.json'), 'utf8'));
  for (const d of DIRS) {
    const artP = path.join(HW, hid, d + '.png'), mskP = path.join(HW, hid, 'hairmask', d + '.png');
    if (!fs.existsSync(artP) || !fs.existsSync(mskP)) continue;
    frames++;
    const hat = bits(img(artP));
    const want = ruleMask(hat);
    const got = bits(img(mskP));
    if (got.w !== want.w || got.h !== want.h) { drifted.push(`${hid}/${d}: mask ${got.w}x${got.h} vs art ${want.w}x${want.h}`); continue; }
    let n = 0;
    for (let i = 0; i < want.m.length; i++) if (want.m[i] !== got.m[i]) n++;
    if (n) drifted.push(`${hid}/${d}: ${n}px`);

    /* ══ 2-5. the rule as PROPERTIES of the committed mask ═══════════════ */
    const { w, h, m } = got;
    const { top, bot } = want;
    let lo = w, hi = -1;
    for (let y = 0; y < h; y++) {
      /* the accumulated bound the rule talks about: the widest the hat has
         been at this row or any row above it */
      for (let x = 0; x < w; x++) if (hat.m[y * w + x]) { if (x < lo) lo = x; if (x > hi) hi = x; }
      let rl = -1, rr = -1, on = 0, holes = 0, seenGap = false;
      for (let x = 0; x < w; x++) {
        if (m[y * w + x]) { if (rl < 0) rl = x; rr = x; on++; if (seenGap) { holes++; seenGap = false; } }
        else if (rl >= 0) seenGap = true;
      }
      if (y < top) {
        /* ABOVE THE HAT: nothing.  Hair above the hat's outline is cut — that
           is the half of the rule that stops long hair bursting out of the top
           of a helmet, and it is what a "mask = everything" edit would lose. */
        if (on) aboveBroken.push(`${hid}/${d} row ${y}: ${on}px above the hat's topmost row ${top}`);
      } else if (y <= bot) {
        /* AT AND ABOVE THE HAT: exactly the accumulated span, in ONE run.
           - the edges failing means the width bound moved: too tight shaves
             the head (the failure bald_px exists for, and which has shipped),
             too loose lets an afro balloon out beside the cap.
           - a HOLE means the mask went back to keeping only the columns the
             hat itself occupies, which is the pre-v2.3.1957 rule.  That is
             the revert this file is here to catch: it takes the hair out of
             the gaps of an open-top hat — between a crown's spikes, between
             the devil horns — which the owner's "exceptions" clause says
             must survive. */
        if (hi >= 0 && (rl !== lo || rr !== hi)) spanBroken.push(`${hid}/${d} row ${y}: mask ${rl}..${rr}, hat-so-far ${lo}..${hi}`);
        if (hi < 0 && on) spanBroken.push(`${hid}/${d} row ${y}: ${on}px of mask before the hat starts`);
        if (holes) holeBroken.push(`${hid}/${d} row ${y}: ${holes} hole(s) in the mask run ${rl}..${rr}`);
      } else if (on !== w) {
        /* BELOW THE HAT: full width, so hair still frames the face.  The disk
           state one commit before v2.3.1957 violated exactly this — every mask
           was a corridor the width of the hat running to the bottom of the
           frame, so a top hat cut the hair off the sides of the head below its
           own brim. */
        belowBroken.push(`${hid}/${d} row ${y}: ${on}/${w}px opaque below the hat's lowest row ${bot}`);
      }
    }
  }
}
ok(`all ${frames} committed mask frames are exactly what the rule makes of the hat art on disk`,
  drifted.length === 0,
  { frames, drifted: drifted.slice(0, 8), hint: 'the art and its mask have drifted apart — python3 tools/make_hairmask.py --all-with-masks --apply' });
ok('nothing is masked in above the hat — hair above the hat outline is cut',
  aboveBroken.length === 0, aboveBroken.slice(0, 6));
ok('at and above the hat the mask is exactly as wide as the hat has been at that row or above it',
  spanBroken.length === 0, spanBroken.slice(0, 6));
ok('that width is one unbroken run — the gaps of an open-top hat keep their hair (the owner\'s "exceptions")',
  holeBroken.length === 0, holeBroken.slice(0, 6));
ok('below the hat\'s lowest pixel the mask is full width — hair still frames the face',
  belowBroken.length === 0, belowBroken.slice(0, 6));

/* ══ 6. the shipping hats do not shave the head ══════════════════════════ */
/* The width rule can only be checked for "not too loose" by the properties
   above; "not too tight" needs the body.  A version that shaved the crown has
   shipped before, which is why bald_px exists — this measures the SAME thing
   against what is actually committed, so a future retune of the rule that
   sneaks past the generator's own guard still lands here. */
const worstCaps = [];
for (const hid of hats) {
  const meta = JSON.parse(fs.readFileSync(path.join(HW, hid, 'meta.json'), 'utf8'));
  const masks = {};
  for (const d of DIRS) {
    const p = path.join(HW, hid, 'hairmask', d + '.png');
    if (fs.existsSync(p)) masks[d] = img(p);
  }
  const [n, d] = baldPx(hid, meta, masks);
  worstCaps.push([hid, n, d]);
}
worstCaps.sort((a, b) => b[1] - a[1]);
ok(`no shipping hat leaves more than ${BALD_T}px of bare scalp under its own span (worst: ${worstCaps[0][0]} ${worstCaps[0][1]}px on ${worstCaps[0][2] || 'n/a'})`,
  worstCaps[0][1] < BALD_T, worstCaps.slice(0, 5));

/* ══ 7. the guard still refuses the shapes it was written against ════════ */
/* bald_px only decides whether `clipsHair` may be switched ON, so nothing in
   the committed pixels can tell you it still works.  These three are bands
   across the forehead: clipping to them left a bare skin dome above the band
   (owner report), they carry no hairmask folder for that reason, and the one
   invocation that would give them one — `--ids naruto-headband --apply` — is
   in the generator's own docstring.  Re-aiming the guard again must not let
   them through. */
for (const hid of ['naruto-headband', 'bandana-2', 'bandana-blue']) {
  const meta = JSON.parse(fs.readFileSync(path.join(HW, hid, 'meta.json'), 'utf8'));
  const masks = {};
  for (const d of DIRS) {
    const p = path.join(HW, hid, d + '.png');
    if (fs.existsSync(p)) masks[d] = toImg(ruleMask(bits(img(p))));
  }
  const [n, d] = baldPx(hid, meta, masks);
  ok(`${hid} is still REFUSED a hair clip — it is a band, and clipping to it bares the crown (${n}px on ${d || 'n/a'}, limit ${BALD_T})`,
    n >= BALD_T, { bald: n, dir: d, limit: BALD_T });
}

console.log(fails
  ? `\nhairmask-rule: ${fails} FAILED, ${passes} passed`
  : `\nhairmask-rule: ALL PASS (${passes} checks over ${frames} mask frames, ${hats.length} hats)`);
process.exit(fails ? 1 : 0);
