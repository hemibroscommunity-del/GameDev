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
/* v2.3.1963: the width is measured on the hat MINUS its outline and its loose
   pixels, then pulled in by INSET on each side.  Owner: "Make the hair mask
   liberal (over cut rather than undercut) since your width detector is
   grabbing some outlines and ghost pixels."  The per-row extent is the
   OUTERMOST opaque pixel, and the outermost pixel is the dark 1px outline — or
   a stray left by the green-key import that nothing on screen can see.  One
   such pixel widens the accumulated bound for that row and every row beneath
   it, and the bound never narrows again.  A 4-neighbour erode drops both.
   Both adjustments push the same way on purpose: an over-cut loses a pixel of
   hair at the hat's edge, where the hat is drawn over it anyway; an under-cut
   leaves hair standing proud of the hat, which is the reported failure.
   Mirrors _solid()/INSET in tools/make_hairmask.py — keep the two in step. */
const INSET = 1;
function solid(w, h, m) {
  const e = new Uint8Array(w * h);
  let any = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (m[i] && m[i - w] && m[i + w] && m[i - 1] && m[i + 1]) { e[i] = 1; any++; }
    }
  }
  /* A hat one pixel thick somewhere erodes to nothing; fall back to the raw
     shape rather than vanishing (the python does the same). */
  return any ? e : m;
}

/** `cols` with each contiguous run pulled in by INSET on both sides.
 *  Mirrors _inset_runs() in tools/make_hairmask.py — keep the two in step. */
function insetRuns(cols, w) {
  const out = new Uint8Array(w);
  let x = 0;
  while (x < w) {
    if (!cols[x]) { x++; continue; }
    let j = x; while (j < w && cols[j]) j++;
    for (let k = x + INSET; k < j - INSET; k++) out[k] = 1;
    x = j;
  }
  return out;
}

/* ═══ v2.3.1974: THE RULE, PER COLUMN ═══
   Owner: "Some hair still pokes out of the top of the cowboy hat and wizard
   hat."  The v2.3.1957 rule took ONE run per row, spanning the hat's whole
   horizontal reach, so any gap inside that span kept its hair — the crease
   between a cowboy crown's two peaks, and the wedge between a brim tip and the
   crown.  That spanning is deliberate for a hat with real HOLES (a crown's
   spikes, devil horns) and wrong for a closed one, and the two cannot be told
   apart by shape — see the long note in tools/make_hairmask.py for the three
   discriminators that were tried and measured down.  So `openTop` in the hat's
   meta records the intent, and everything else takes both conditions below. */
function ruleRows(w, h, m, top, bot, openTop, enclosed) {
  const sm = solid(w, h, m);
  const rows = [];
  if (openTop) {
    let l = w, r = -1;
    for (let y = top; y <= bot; y++) {
      let rl = -1, rr = -1;
      for (let x = 0; x < w; x++) if (sm[y * w + x]) { if (rl < 0) rl = x; rr = x; }
      if (rl >= 0) { l = Math.min(l, rl + INSET); r = Math.max(r, rr - INSET); }
      const keep = new Uint8Array(w);
      for (let x = l; x <= r; x++) if (x >= 0 && x < w) keep[x] = 1;
      rows[y] = keep;
    }
    return rows;
  }
  const seen = new Uint8Array(w);
  for (let y = top; y <= bot; y++) {
    let rl = -1, rr = -1;
    for (let x = 0; x < w; x++) if (sm[y * w + x]) { seen[x] = 1; if (rl < 0) rl = x; rr = x; }
    /* (a) the hat has reached this column at this row or above, AND
       (b) the column is inside the hat's own extent at this row. */
    const both = new Uint8Array(w);
    /* v2.3.1976: an ENCLOSED hat keeps only where the hat itself is on this
       row — the gap between a pair of horns is sky, but the scalp under it is
       under the cap, so no hair may show there. (Owner: "There should be no
       hair between the horns. I understand it to be a fully enclosed hat.") */
    if (enclosed) { for (let x = 0; x < w; x++) if (sm[y * w + x]) both[x] = 1; }
    else for (let x = rl; x <= rr && rl >= 0; x++) if (seen[x]) both[x] = 1;
    rows[y] = insetRuns(both, w);
  }
  return rows;
}

function ruleMask(hatBits, openTop, enclosed) {
  const { w, h, m } = hatBits;
  const out = new Uint8Array(w * h);
  /* ═══ v2.3.1977: THE HAT'S OUTLINE, NOT ITS LAST STRAY PIXEL ═══
     Owner: "The hair mask is inconsistent depending on the direction ... it's
     also removing too much hair where it meets the hat border so there's a
     strip of skin showing."  Both were one measurement bug: the hat's bottom
     came from the RAW alpha, which trails off into isolated specks below the
     real edge — 1 row past solid on devil-horns/south but 4 on southwest and 5
     on east.  Part 2 started below the specks, so the rows between were left to
     part 1 and clipped to the two or three columns a speck occupies: a strip of
     bare skin, a different height on every facing.  Measured on the eroded hat
     instead, which a lone speck does not survive. */
  const sm0 = solid(w, h, m);
  let top = -1, bot = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) if (sm0[y * w + x]) { if (top < 0) top = y; bot = y; break; }
  }
  if (bot < 0) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) if (m[y * w + x]) { if (top < 0) top = y; bot = y; break; }
    }
  }
  if (bot < 0) return { w, h, m: out, top, bot, rows: [], part2: new Uint8Array(w * h) };

  /* ═══ PART 2: EVERYTHING BELOW THE OUTLINE, FULL WIDTH (v2.3.1977) ═══
     Owner: "Make it so that all hair shows beneath the bottom outline of the
     headwear."  No exceptions, including the enclosed hats — v2.3.1976 bounded
     part 2 to an enclosed hat's span to answer "hair from Afro is on the
     sides", but that side hair is BESIDE THE CAP at the cap's own rows, which
     is part 1's business and which the enclosed branch already cuts.  Bounding
     part 2 as well went on to cut hair below the cap, where nothing is in front
     of it — the bare skin above.  Two rules doing one job; the second only did
     harm. */
  const part2 = new Uint8Array(w * h);
  for (let y = bot + 1; y < h; y++) for (let x = 0; x < w; x++) part2[y * w + x] = 1;
  for (let i = 0; i < w * h; i++) if (part2[i]) out[i] = 1;

  const rows = ruleRows(w, h, m, top, bot, openTop, enclosed);                        /* part 1 */
  for (let y = top; y <= bot; y++) {
    const keep = rows[y];
    if (keep) for (let x = 0; x < w; x++) if (keep[x]) out[y * w + x] = 1;
  }
  return { w, h, m: out, top, bot, rows, part2 };
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
function baldPx(hid, meta, masks, mode = 'dome') {
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
    let lo = FRAME, hi = -1, hatTop = FRAME;
    for (let i = 0; i < hat.length; i++) {
      if (!hat[i]) continue;
      const x = i % FRAME, y = (i / FRAME) | 0;
      if (x < lo) lo = x; if (x > hi) hi = x; if (y < hatTop) hatTop = y;
    }
    /* ═══ v2.3.1974: ABOVE THE HAT, not merely inside its span ═══
       The scoping has now been got wrong three times, so here is the shape the
       guard is actually for, stated once: a BAND across the forehead leaves a
       bare dome ABOVE ITSELF.  That is the failure — the Naruto Headband and
       the two bandanas, measured at 380-603px when they shipped clipping.
       Restricting to the hat's horizontal span (v2.3.1957) was an improvement
       on counting the whole skull, but it still counts the wrong pixels: a
       wide brim spans the entire head, so every FACE and TEMPLE pixel under it
       fell inside the span and got counted as "bare scalp".  Under the
       per-column rule that pushed five perfectly good hats over the limit
       (cowboy-hat-2 580px, barbarian-helmet 507, chinese-hat 495) while all
       five RENDER correctly with no bald patch anywhere — checked by drawing
       them on the head and looking.
       Skin at or below the hat's own top row is skin the hat is sitting on or
       in front of; it is not a dome. Count only what is ABOVE the hat. */
    let n = 0;
    /* 'span' mirrors tools/make_hairmask.py's bald_px EXACTLY — it is the gate
       that decides whether clipsHair may be switched on, and the assertion
       about bands has to ask the same question the generator asks, or it is
       testing something the generator does not do.
       'dome' is the property claim about the art actually shipped: no hat
       leaves a bare dome ABOVE ITSELF.  See the note above for why the span
       form cannot answer that one (a wide brim spans the whole face). */
    const yEnd = mode === 'span'
      ? Math.min(FRAME, by + SKULL_ROWS)
      : Math.min(FRAME, by + SKULL_ROWS, hatTop);
    for (let y = by; y < yEnd; y++) {
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
    const openTop = !!meta.openTop;
    const enclosed = !!meta.enclosed;
    const want = ruleMask(hat, openTop, enclosed);
    const got = bits(img(mskP));
    if (got.w !== want.w || got.h !== want.h) { drifted.push(`${hid}/${d}: mask ${got.w}x${got.h} vs art ${want.w}x${want.h}`); continue; }
    let n = 0;
    for (let i = 0; i < want.m.length; i++) if (want.m[i] !== got.m[i]) n++;
    if (n) drifted.push(`${hid}/${d}: ${n}px`);

    /* ══ 2-5. the rule as PROPERTIES of the committed mask ═══════════════ */
    const { w, h, m } = got;
    const { top, bot } = want;
    /* how wide part 2 is allowed to be — the whole frame, or the hat's own
       span for an enclosed hat (v2.3.1976) */
    let p2Width = w;
    if (enclosed && bot >= 0) {
      let plo = w, phi = -1;
      for (let y = top; y <= bot; y++) {
        for (let x = 0; x < w; x++) if (hat.m[y * w + x]) { if (x < plo) plo = x; if (x > phi) phi = x; }
      }
      p2Width = phi >= plo ? (phi - plo + 1) : w;
    }
    /* v2.3.1974: the rule's own per-row column set (see ruleRows). */
    for (let y = 0; y < h; y++) {
      /* v2.3.1976: part 2 now opens PER COLUMN, so a row at or above the
         hat's lowest pixel can legitimately carry open columns that part 1
         did not put there. Compare against both. */
      const p1 = (y >= top && y <= bot) ? want.rows[y] : null;
      let keep = p1;
      if (p1) {
        keep = new Uint8Array(w);
        for (let x = 0; x < w; x++) keep[x] = (p1[x] || want.part2[y * w + x]) ? 1 : 0;
      }
      let lo = w, hi = -1;
      if (keep) for (let x = 0; x < w; x++) if (keep[x]) { if (x < lo) lo = x; hi = x; }
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
        /* v2.3.1974: compared COLUMN BY COLUMN against the rule, not as a
           span.  A closed hat's row is legitimately several runs now (a brim
           either side of a crown), so "first opaque .. last opaque" says
           almost nothing; the columns themselves are the claim. */
        if (keep) {
          let bad = 0;
          for (let x = 0; x < w; x++) if (!!keep[x] !== !!m[y * w + x]) bad++;
          if (bad) spanBroken.push(`${hid}/${d} row ${y}: ${bad} column(s) differ from the rule`);
        } else if (on) {
          spanBroken.push(`${hid}/${d} row ${y}: ${on}px of mask where the rule keeps nothing`);
        }
        /* An OPEN-TOP hat's PART 1 must still be ONE unbroken run — that is
           what puts hair between a crown's spikes, and losing it is the revert
           this file exists to catch. Measured on part 1 alone (v2.3.1976):
           per-column part 2 opens a spike's own column early, which shows as a
           hole in the finished row and is correct. A closed hat's row may have
           gaps by design. */
        if (openTop && p1) {
          let prl = -1, prr = -1, ph = 0, pgap = false;
          for (let x = 0; x < w; x++) {
            if (p1[x]) { if (prl < 0) prl = x; prr = x; if (pgap) { ph++; pgap = false; } }
            else if (prl >= 0) pgap = true;
          }
          if (ph) holeBroken.push(`${hid}/${d} row ${y}: ${ph} hole(s) in part 1's run ${prl}..${prr}`);
        }
      } else if (on !== w) {
        /* BELOW THE HAT: full width, so hair still frames the face.  The disk
           state one commit before v2.3.1957 violated exactly this — every mask
           was a corridor the width of the hat running to the bottom of the
           frame, so a top hat cut the hair off the sides of the head below its
           own brim.
           v2.3.1977: no exceptions, not even the enclosed hats. Owner: "Make
           it so that all hair shows beneath the bottom outline of the
           headwear."  The v2.3.1976 span bound for enclosed hats is gone — it
           was aimed at side hair that part 1 already handles, and all it added
           was a strip of bare skin under the cap. */
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

/* ══ 5b. no strip of bare skin under the hat, and the SAME on every facing ══ */
/* v2.3.1977, and this is the owner's report turned into an assertion rather
   than a fix he has to re-check by eye: "The hair mask is inconsistent
   depending on the direction (southwest vs south etc).  It's also removing too
   much hair where it meets the hat border so there's a strip of skin showing."
   Both were one bug — the hat's bottom was taken from raw alpha that trails off
   into specks, so the mask stayed clipped for a few rows under the real outline
   and for a DIFFERENT few on each facing.  The number below is those rows.  It
   must be 0, and it must be 0 everywhere, which is what makes the facings
   agree. */
{
  const strips = [];
  for (const hid of hats) {
    for (const d of DIRS) {
      const artP = path.join(HW, hid, d + '.png'), mskP = path.join(HW, hid, 'hairmask', d + '.png');
      if (!fs.existsSync(artP) || !fs.existsSync(mskP)) continue;
      const hat = bits(img(artP));
      const got = bits(img(mskP));
      const { w, h } = got;
      const sm = solid(w, h, hat.m);
      let bot = -1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (sm[y * w + x]) { bot = y; break; }
      for (let y = h - 1; y >= 0 && bot < 0; y--) for (let x = 0; x < w; x++) if (hat.m[y * w + x]) { bot = y; break; }
      let b2 = -1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (sm[y * w + x]) { b2 = y; break; }
      /* last solid row */
      let last = -1;
      for (let y = 0; y < h; y++) { let any = 0; for (let x = 0; x < w; x++) if (sm[y * w + x]) { any = 1; break; } if (any) last = y; }
      if (last < 0) continue;
      let full = -1;
      for (let y = last + 1; y < h && full < 0; y++) {
        let n = 0;
        for (let x = 0; x < w; x++) if (got.m[y * w + x]) n++;
        if (n === w) full = y;
      }
      const strip = full < 0 ? 99 : full - (last + 1);
      if (strip !== 0) strips.push(`${hid}/${d}: ${strip} row(s) of clipped skin under the outline`);
    }
  }
  ok('no hat leaves a strip of clipped skin under its own bottom outline, on any facing',
    strips.length === 0, strips.slice(0, 8));
}

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
ok(`no shipping hat leaves a bare dome ABOVE itself (worst: ${worstCaps[0][0]} ${worstCaps[0][1]}px on ${worstCaps[0][2] || 'n/a'}, limit ${BALD_T})`,
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
  const [n, d] = baldPx(hid, meta, masks, 'span');
  ok(`${hid} is still REFUSED a hair clip — it is a band, and clipping to it bares the crown (${n}px on ${d || 'n/a'}, limit ${BALD_T})`,
    n >= BALD_T, { bald: n, dir: d, limit: BALD_T });
}

console.log(fails
  ? `\nhairmask-rule: ${fails} FAILED, ${passes} passed`
  : `\nhairmask-rule: ALL PASS (${passes} checks over ${frames} mask frames, ${hats.length} hats)`);
process.exit(fails ? 1 : 0);
