/* ═══ v2.3.4930: THE BODY'S RECOLOUR, IN A MODULE OF ITS OWN ═══
 *
 * Moved here VERBATIM from playerSkins.js (which re-exports what it exported),
 * so the bake can run on a worker (bodyBakeWorker.js) as well as on the page:
 * this module imports nothing that needs a page (no Pixi, no stores), only the
 * pure pixel rules beside it.  A crowd tour (held-sweep.md "The crowd tour",
 * a-ink) measured another player's tattoo or trouser print baked HERE, on the
 * page, 114 to 720 ms a sheet; the same code now runs on another core
 * (bodyBake.js).  Its canvases are `document.createElement('canvas')`: on the
 * worker that is a CPU OffscreenCanvas (workerCanvas.js).  The QA probes
 * (window.__btGridProbe and the rest) are read only where there is a window:
 * a page that sets one bakes on the page (bodyBake.js bodyWorkerWanted). */
import { artHasInk } from './traits/playerArt.js';
import { stampRegion, stampPattern, litFabricMask, regionFromFeet, splitSkinRegions, splitSkinBySeeds, PANTS_LIT_MIN, SHOES_LIT_MIN, PANTS_MAX_UP, SHOES_MAX_UP, PANTS_BOX, TATTOO_BOX, FACE_BOX, ARM_BOX } from './playerDecal.js';
import { parsePattern } from './traits/patternCatalog.js';
import { garmentBands, inGarmentBand, judgeGarments, GC_PANTS, GC_BOOT, GC_SKIN, GC_DARK } from './garmentConfine.js';
import { toolWoodMask, solidTool } from './toolWood.js';
import { upscaleToFrameHeight } from './spriteScale.js';
import { recolorToolKeyCanvas, toolKeyMask, TOOL_SPECS } from './toolRecolor.js';

export const FRAME_W = 256;
export const FRAME_H = 256;
const SKIN_REF = 149;   // lit luminance of each region (measured from the sheets)
const PANTS_REF = 112;
const SHOES_REF = 75;
/* v2.3.4930: playerSkins.js names the sheet it is baking for the QA probes
   below (it set the variable directly when this code lived there) */
export function setBakeTag(t) { _bakeTag = t; }

function _retint(d, i, target, ref) {
  const k = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / ref;
  d[i]     = Math.min(255, Math.round(target[0] * k));
  d[i + 1] = Math.min(255, Math.round(target[1] * k));
  d[i + 2] = Math.min(255, Math.round(target[2] * k));
}

/* Pixel tests shared by the recolor loop and the torso-band pass.  Run on the
   DEFAULT-colored source (always tan skin / green pants), so they're stable
   regardless of the chosen skin or shirt color. */
function _isSkin(r, g, b, a) { return a > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25; }

/* ═══ v2.3.2860: THE WHITE OF THE EYE IS NOT SKIN ═══
   Owner, on another player's south bow shot: "messed up the eyes".  The eye's
   white is edged with a pale cream where the art blends it into the face --
   (247,210,186) on that sheet -- and _isSkin accepts it (r-g 37, r-b 61).  The
   retint keeps a pixel's brightness and gives it the target's colour at full
   strength, so a near-white cream came out a saturated (255,197,110): an
   orange bar down every eye.  Your own bow shot has done it since v2.3.1788
   gave the stand-ins the default skin target; #734 gave it to everyone's
   view of you.
   Measured on every body sheet: skin, highlights included, keeps its green
   under 0.77 of its red; the eye creams sit at 0.81-0.89, and the pixels at
   0.8 and over are the eyes (and the odd knuckle glint).  So a pixel that
   green is left as drawn -- white of the eye, not skin. */
function _isEyeCream(r, g) { return g >= 0.8 * r; }

/* v2.3.2682: the same recolour on pixels that are not a body sheet -- the
   monkey's fur layer (speciesArt.js), shipped as bare skin so it can follow the
   player's skin exactly as the body does.  Same test, same maths, same ref: a
   patch recoloured here lands on the colour the head around it lands on.
   `target` null (the 'default' skin, or skin recolour switched off) leaves the
   pixels as drawn, which is also what the body does. */
export function retintSkinPixels(d, target) {
  if (!target) return;
  for (let i = 0; i < d.length; i += 4) {
    if (_isSkin(d[i], d[i + 1], d[i + 2], d[i + 3])) _retint(d, i, target, SKIN_REF);
  }
}

/* v2.3.1928: paint the iris.  The rectangles come from EYE_MASK, which
   tools/eyes/extract-eye-mask.mjs derived offline and a human reviewed — the
   runtime never searches for an eye, because "a short white run with a dark run
   beside it" also describes a highlight on a steel pauldron.  Coordinates are
   256-space and frame-local, which is why this runs AFTER upscaleToFrameHeight
   and not before.  The iris is REPLACED, not ratio-retinted: it is near-black,
   so `target * luminance / ref` would put it straight back to near-black. */
function _paintEyes(d, w, h, rects, frameW) {
  if (!rects) return;
  for (let f = 0; f * frameW < w; f++) {
    const per = rects[f];
    if (!per) continue;
    for (const [rx, ry, rw, rh] of per) {
      for (let y = ry; y < ry + rh && y < h; y++) {
        for (let x = rx; x < rx + rw; x++) {
          const px = f * frameW + x;
          if (px >= w) break;
          const i = (y * w + px) * 4;
          if (d[i + 3] < 40) continue;
          d[i] = _eyeT[0]; d[i + 1] = _eyeT[1]; d[i + 2] = _eyeT[2];
        }
      }
    }
  }
}
let _eyeT = null;

/* ═══ v2.3.2643: ERASE THE EYE, AND FILL IT WITH THIS PLAYER'S OWN SKIN ═══
 *
 * Owner, on the eye styles: "I still see some remnants around the eyes where
 * you stickered over the old ones, can that be cleaned up with whatever skin
 * color it is (the ones that gets changed with custom skin color choice)?"
 *
 * An eye style is a sprite drawn OVER the eyes painted into the body sheets,
 * and no drawn shape covers another drawn shape exactly.  What shows round the
 * edges is the base eye's hard black top edge and a sliver of white sclera,
 * which reads as a second eye behind the first.  So when a style is worn the
 * real eye is painted out first.
 *
 * THE FILL IS SAMPLED, NOT CHOSEN.  It is the per-channel MEDIAN of a ring of
 * cheek and brow pixels round the box, read from THIS canvas AFTER the retint
 * above has run -- so it is whatever the player's skin has become, including a
 * tone added years from now, with no table to keep in step.  If too little of
 * the ring is opaque the eye is LEFT ALONE, because a wrong fill is worse than
 * a remnant.
 *
 * TWO PIXELS OUT, NOT ONE, and this is the whole difference between a clean
 * face and a visible rectangle.  The box is tight on the eye, so the pixels
 * immediately beside it are the eye's own ANTI-ALIASING -- black blended into
 * skin.  Measured on stand-south: the one-pixel ring reads rgb(183,120,66) and
 * rgb(200,136,83) with no colour appearing more than twice, while the ring two
 * and three pixels out is flat rgb(198-199,128-131,71-73).  The first cut
 * sampled at one pixel and filled the socket with rgb(173,114,70) against a
 * face of rgb(199,129,72) -- which is exactly the faint darker rectangle the
 * erase existed to remove, in a different colour.
 *
 * MEDIAN, not mode and not mean.  The sheets are dithered by a pixel or two, so
 * no single triple dominates (the best count in a three-pixel ring is 8 of ~50)
 * and a mode picks noise; a mean would be dragged dark by the head outline the
 * ring catches on the side views, where the eye sits near the edge of the face.
 * A median is unmoved by a minority of dark pixels and averages the dither out.
 *
 * The boxes come from src/rendering/eyeBlankMask.json, derived offline and
 * reviewed as a contact sheet (tools/eyes/extract-eye-blank.mjs).  Same rule as
 * eyeMask.json beside it: the frame loop never searches for an eye.  That file
 * holds the WHOLE eye where eyeMask holds only the iris -- an erase and a
 * recolour want opposite answers about the white and the brow.
 *
 * ALPHA IS NOT TOUCHED.  The eye's outer pixels are anti-aliased into the
 * cheek; hardening them to opaque would draw a crisp rectangle of skin on a
 * face that has none anywhere else. */
function _blankEyes(d, w, h, boxes, frameW) {
  if (!boxes) return;
  for (let f = 0; f * frameW < w; f++) {
    const per = boxes[f];
    if (!per) continue;
    const fx0 = f * frameW, fx1 = Math.min(w, (f + 1) * frameW);
    for (const [bx, by, bw, bh] of per) {
      const x0 = fx0 + bx, x1 = Math.min(fx1, fx0 + bx + bw);
      const y0 = by, y1 = Math.min(h, by + bh);
      if (x1 <= x0 || y1 <= y0) continue;
      const R = [], G = [], B = [];
      const sample = (x, y) => {
        if (x < fx0 || x >= fx1 || y < 0 || y >= h) return;
        const i = (y * w + x) * 4;
        if (d[i + 3] < 200) return;          /* only fully opaque skin votes */
        R.push(d[i]); G.push(d[i + 1]); B.push(d[i + 2]);
      };
      for (let ring = 2; ring <= 3; ring++) {
        for (let x = x0 - ring; x < x1 + ring; x++) { sample(x, y0 - ring); sample(x, y1 + ring - 1); }
        for (let y = y0 - ring; y < y1 + ring; y++) { sample(x0 - ring, y); sample(x1 + ring - 1, y); }
      }
      if (R.length < 8) continue;            /* too little face round it to be sure */
      const mid = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
      const r = mid(R), g = mid(G), b = mid(B);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * w + x) * 4;
          if (d[i + 3] < 40) continue;       /* never paint into transparency */
          d[i] = r; d[i + 1] = g; d[i + 2] = b;
        }
      }
    }
  }
}
function _isPants(r, g, b, a) { return a > 180 && g >= r - 10 && g > b + 8 && r < 150; }
/* v2.3.3146: how far past the trousers' columns a boot may reach, a share of
   the frame (a toe) -- 16 px of 256, 8 of 128: recolorBodyToCanvas
   `bootsUnderLegs`.  The fishing line stands 47+ px of 128 clear of it. */
const BOOT_TOE_FRAC = 1 / 16;

/* Fraction of the crown->waist span at which the shirt collar sits.  Anchored
   to two STABLE per-frame references (crown = topmost skin; waist = topmost
   pants) rather than a noisy shoulder-width detection, so the collar doesn't
   jitter up/down between run frames -- it tracks the body's bob smoothly.
   0.48 places it at the base of the neck (neck skin stays visible, no face
   coverage, shoulders covered).  Tuned offline across stand + run, all dirs. */
const SHIRT_NECK_FRAC = 0.48;

/* Slightly-below-lit factor for the flat shirt fill (a hair of depth without
   any internal shading that would re-expose the body's contour lines). */
const SHIRT_FILL_K = 0.96;

/* Sleeve length as a fraction of the crown->waist span below the collar.  The
   shoulder cap covers all arm skin down to neck + SLEEVE_FRAC*(waist-neck);
   below that only the TORSO is followed, so forearms + HANDS stay skin (a
   t-shirt, not long sleeves that paint the hands). */
const SHIRT_SLEEVE_FRAC = 0.42;

/* v2.3.694: a skin run this narrow that pokes past the torso interval is an
   arm crossing in front of (or beside) the chest -- left as skin. */
const SHIRT_ARM_W = 7;
/* v2.3.694: the trunk widens at most this many px per row below the sleeves. */
const SHIRT_GROW = 2;
/* v2.3.694: trunk half-width window around the neck centre used to pinch the
   torso interval back after the wide shoulder band. */
const SHIRT_TRUNK_HALF = 10;

/* Per-frame SHIRT pixel mask.  For each 256px frame:
   - classify pixels (skin / pants / other) and find crown (topmost skin),
     waist (topmost pants in the lower body), collar (crown+NECK_FRAC*span,
     stable refs so it doesn't jitter), per-column hem (first pants per column,
     closes hip skin corners), sleeve cap (collar+SLEEVE_FRAC*span).
   v2.3.694: rewritten as NECK-SEEDED interval tracking.  The old version
   marked ALL skin in the cap band and seeded a downward flood at the chest
   centre; when the arms swung in front of the torso (south/SW jog, attack,
   hit, pickup) the seed landed on the ARM -- painting the arm to the wrist
   and leaving the chest bare with its muscle lines showing.  Now:
   - HEAD anchor: median centre of the widest skin run per row above the
     collar (robust to a fist raised overhead).
   - NECK seed: first row at/below the collar with skin (the collar row can
     land on the 1-2px chin-shadow line), taking the run UNDER the head --
     not the widest, an outstretched arm can be wider than the neck.
   - cap band [seed, sleeveCap): paint runs row-connected to the seed.
     Shoulders/upper arms widen freely (sleeves); LIMB runs -- narrow with
     >=2px gaps both sides, away from the neck centre -- stay skin (a fist
     raised to the face).
   - TRUNK re-anchor: the FULL widest non-limb run under the cap, so arms
     exiting the cap at its outer edges fall outside the interval even in a
     hard forward lean.
   - trunk rows grow <= SHIRT_GROW px/row; narrow runs poking past the
     interval (crossing arms) and interior limb runs (a hand in front of the
     chest) are skipped whole; up to 2 unpaintable rows are coasted over.
   - v2.3.697 SOLID FILL: rows paint every opaque pixel across the accepted
     span (not just classified-skin runs).  Highlight/shading/contour-line
     pixels inside the torso failed the skin test and punched holes through
     the fill -- "the shirt looks like torn rags".
   - pre-seed shoulder band covers shoulders above a bent-down chin.
   - BACKSTOP: any later row with torso skin inside the trunk window but no
     shirt gets a solid span fill -- a bare belly is structurally
     impossible, while crossing limbs still stay skin.
   Audited frame-by-frame against all 184 frames / 21 sheets via
   tools/preview_shirt_frames.py (--algo=v2 == this; keep them in sync).
   Returns shirtPx (1 = this skin pixel is shirt).  Keyed off each frame's
   body, so it follows the run lean/twist/bob. */
function _torsoBands(d, w, h, frameW, frames) {
  const cls = new Uint8Array(w * h);
  const colWaist = new Int16Array(w);
  const shirtPx = new Uint8Array(w * h);
  for (let f = 0; f < frames; f++) {
    const x0 = f * frameW, x1 = Math.min(w, x0 + frameW);
    const pantsRow = new Int16Array(h);
    let crown = -1, bottom = -1;
    for (let y = 0; y < h; y++) {
      let pc = 0, anyOp = false, sc = 0;
      const base = y * w;
      for (let x = x0; x < x1; x++) {
        const i = (base + x) * 4;
        const a = d[i + 3]; if (a <= 40) continue;
        anyOp = true;
        const r = d[i], g = d[i + 1], b = d[i + 2];
        if (_isSkin(r, g, b, a)) { sc++; cls[base + x] = 1; }
        else if (_isPants(r, g, b, a)) { pc++; cls[base + x] = 3; }
        else cls[base + x] = 2;
      }
      pantsRow[y] = pc;
      if (sc > 0 && crown < 0) crown = y;
      if (anyOp) bottom = y;
    }
    if (crown < 0 || bottom <= crown) continue;
    const mid = (crown + bottom) >> 1;
    let waist = -1;
    for (let y = mid; y < bottom; y++) { if (pantsRow[y] >= 3) { waist = y; break; } }
    if (waist < 0) waist = Math.round(crown + 0.62 * (bottom - crown));
    const collar = Math.max(0, Math.round(crown + SHIRT_NECK_FRAC * (waist - crown)));
    const sleeveCap = Math.min(bottom, Math.round(collar + SHIRT_SLEEVE_FRAC * (waist - collar)));
    /* per-column hem */
    for (let x = x0; x < x1; x++) {
      let cw = waist;
      for (let y = mid; y < bottom; y++) { if (cls[y * w + x] === 3) { cw = y; break; } }
      colWaist[x] = cw;
    }
    /* shirt-eligible skin runs on row y -> flat [l0,r0, l1,r1, ...] */
    const runsOf = (y) => {
      const base = y * w, out = [];
      let x = x0;
      while (x < x1) {
        if (cls[base + x] === 1 && y < colWaist[x]) {
          let r = x;
          while (r + 1 < x1 && cls[base + r + 1] === 1 && y < colWaist[r + 1]) r++;
          out.push(x, r);
          x = r + 1;
        } else x++;
      }
      return out;
    };
    /* helpers shared by the passes below */
    const eligible = (x, y) => cls[y * w + x] === 1 && y < colWaist[x];
    /* >= 2px of non-skin at xx+step, xx+2*step (frame edge counts as gap) */
    const gapGe2 = (xx, step, y) => {
      let g = 0, x = xx + step;
      while (g < 2 && x >= x0 && x < x1) {
        if (eligible(x, y)) return false;
        g++; x += step;
      }
      return true;
    };
    /* limb run = narrow, >=2px gaps both sides, away from the centre cx --
       a hand/forearm in front of the body.  cx === null skips the centre
       protection. */
    const isLimb = (l, r, y, cx) => {
      if (r - l + 1 > SHIRT_ARM_W) return false;
      if (cx !== null && l - 2 <= cx && cx <= r + 2) return false;
      return gapGe2(l, -1, y) && gapGe2(r, 1, y);
    };
    /* head centre: per row above the collar take the widest run; the MEDIAN
       of their centres is the head x (robust against a fist raised above
       the head -- the head wins by row count). */
    const headCs = [];
    for (let y = 0; y < collar; y++) {
      const rs = runsOf(y);
      if (!rs.length) continue;
      let bi = 0;
      for (let i = 2; i < rs.length; i += 2)
        if (rs[i + 1] - rs[i] > rs[bi + 1] - rs[bi]) bi = i;
      headCs.push((rs[bi] + rs[bi + 1]) >> 1);
    }
    headCs.sort((a, b) => a - b);
    const hx = headCs.length ? headCs[headCs.length >> 1] : ((x0 + x1) >> 1);
    /* head bottom (chin): walk down from the crown following the run that
       overlaps the head centre; the head ends at the chin-shadow gap or
       where the width pinches to the neck.  In bent poses the face dips
       BELOW the collar line -- without this the chin was seeded as "neck"
       and the head got painted (hit-south 3-5, pickup). */
    let headBottom = crown, maxHeadW = 0;
    for (let y = crown; y < Math.min(collar + 9, bottom); y++) {
      const rs = runsOf(y);
      let hl = -1, hr = -1;
      for (let i = 0; i < rs.length; i += 2)
        if (rs[i] <= hx + 2 && rs[i + 1] >= hx - 2) { hl = rs[i]; hr = rs[i + 1]; break; }
      if (hl < 0) break;                               /* chin-shadow gap */
      const wid = hr - hl + 1;
      if (maxHeadW >= 10 && wid <= 0.45 * maxHeadW) break;   /* neck pinch */
      if (wid > maxHeadW) maxHeadW = wid;
      headBottom = y;
    }
    /* neck seed: first row below both the collar and the chin with skin
       (the collar row itself can land on the 1-2px chin-shadow line); the
       run UNDER THE HEAD wins -- not the widest, a horizontally
       outstretched arm can be wider than the neck (hit-south f3). */
    let seedRow = -1, fl = 0, fr = -1;
    const seedTop = Math.max(collar, headBottom + 1);
    for (let y = seedTop; y < Math.min(seedTop + 6, bottom); y++) {
      const rs = runsOf(y);
      if (!rs.length) continue;
      let bi = 0, bd = Infinity;
      for (let i = 0; i < rs.length; i += 2) {
        const dd = (rs[i] <= hx && hx <= rs[i + 1]) ? 0
          : Math.min(Math.abs(rs[i] - hx), Math.abs(rs[i + 1] - hx));
        if (dd < bd) { bd = dd; bi = i; }
      }
      seedRow = y; fl = rs[bi]; fr = rs[bi + 1];
      break;
    }
    if (seedRow < 0) continue;
    const ncx = (fl + fr) >> 1;
    {
      const base = seedRow * w;
      for (let xx = fl; xx <= fr; xx++) shirtPx[base + xx] = 1;
    }
    /* cap band: free growth (shoulders/sleeves), neck-connected runs only,
       hands raised to the face rejected.  v2.3.697: SOLID FILL -- every
       opaque pixel across the accepted span becomes shirt, shading/
       highlight/contour-line pixels included.  Filling only classified-skin
       runs left them as holes ("the shirt looks like torn rags"). */
    for (let y = seedRow + 1; y < sleeveCap; y++) {
      const rs = runsOf(y);
      const base = y * w;
      let nl = 1e9, nr = -1;
      for (let i = 0; i < rs.length; i += 2) {
        const l = rs[i], r = rs[i + 1];
        if (r < fl - 1 || l > fr + 1) continue;
        if (isLimb(l, r, y, ncx)) continue;
        if (l < nl) nl = l;
        if (r > nr) nr = r;
      }
      if (nr < 0) break;
      for (let xx = nl; xx <= nr; xx++)
        if (cls[base + xx] !== 0 && y < colWaist[xx]) shirtPx[base + xx] = 1;
      fl = nl; fr = nr;
    }
    /* trunk re-anchor below the sleeves on the CHEST (widest non-limb run
       under the cap) -- in a hard forward lean the trunk drifts away from
       the neck centre.  v2.3.697: anchor at the FULL chest run; the old
       tcx +/- SHIRT_TRUNK_HALF window was half the chest's width and took
       several +/-GROW rows to catch up, leaving skin wedges under the
       pecs. */
    const tStart = Math.max(sleeveCap, seedRow + 1);
    let ty = -1, tcx = ncx;
    for (let y = tStart; y < Math.min(tStart + 4, bottom); y++) {
      const rs = runsOf(y);
      let bi = -1;
      for (let i = 0; i < rs.length; i += 2) {
        const l = rs[i], r = rs[i + 1];
        if (r < fl - 1 || l > fr + 1) continue;
        if (isLimb(l, r, y, null)) continue;
        if (bi < 0 || (r - l) > (rs[bi + 1] - rs[bi])) bi = i;
      }
      if (bi >= 0) {
        ty = y;
        tcx = (rs[bi] + rs[bi + 1]) >> 1;
        fl = rs[bi]; fr = rs[bi + 1];
        const base = y * w;
        for (let xx = fl; xx <= fr; xx++) shirtPx[base + xx] = 1;
        break;
      }
    }
    if (ty < 0) {
      /* no usable trunk row under the cap (limbs crossing everywhere) --
         anchor the backstop window on the neck and let it fill. */
      ty = tStart - 1;
      fl = ncx - SHIRT_TRUNK_HALF; fr = ncx + SHIRT_TRUNK_HALF;
    }
    /* trunk: slow growth, crossing-arm/hand rejection, coast over up to 2
       unpaintable rows (belt/shadow lines); SOLID FILL across the accepted
       span (see cap band note) */
    let blanks = 0;
    for (let y = ty + 1; y < bottom; y++) {
      const fcx = (fl + fr) >> 1;
      const rs = runsOf(y);
      const base = y * w;
      let nl = 1e9, nr = -1, painted = false;
      for (let i = 0; i < rs.length; i += 2) {
        const l = rs[i], r = rs[i + 1];
        if (r < fl - 1 || l > fr + 1) continue;
        if ((r - l + 1) <= SHIRT_ARM_W && (l < fl - 1 || r > fr + 1)) continue;
        if (l >= fl + 2 && r <= fr - 2 && isLimb(l, r, y, fcx)) continue;
        const cl = Math.max(l, fl - SHIRT_GROW), cr = Math.min(r, fr + SHIRT_GROW);
        if (cl > cr) continue;
        /* span bounds: whole run unless far wider than the tracked interval
           (merged arm+torso) */
        const wide = (r - l + 1) > (fr - fl + 1) + 10;
        const pl = wide ? cl : l, pr = wide ? cr : r;
        if (pl < nl) nl = pl;
        if (pr > nr) nr = pr;
        painted = true;
      }
      if (painted) {
        for (let xx = nl; xx <= nr; xx++)
          if (cls[base + xx] !== 0 && y < colWaist[xx]) shirtPx[base + xx] = 1;
        fl = Math.max(nl, fl - SHIRT_GROW); fr = Math.min(nr, fr + SHIRT_GROW);
        blanks = 0;
      } else if (++blanks > 2) break;
    }
    /* pre-seed shoulder band: in bent poses the seed sits below the chin,
       leaving the shoulders ABOVE it bare (hit-south 3-5, deep pickup).
       Fill non-limb, non-head runs near the trunk window in [collar,
       seed). */
    for (let y = collar; y < seedRow; y++) {
      const rs = runsOf(y);
      const base = y * w;
      let hl = 1, hr = 0;
      for (let i = 0; i < rs.length; i += 2)
        if (rs[i] <= hx + 2 && rs[i + 1] >= hx - 2) { hl = rs[i]; hr = rs[i + 1]; break; }
      for (let i = 0; i < rs.length; i += 2) {
        const l = rs[i], r = rs[i + 1];
        if (hl <= hr && !(r < hl || l > hr)) continue;          /* the head */
        if (r < tcx - SHIRT_TRUNK_HALF - 4 || l > tcx + SHIRT_TRUNK_HALF + 4) continue;
        if (isLimb(l, r, y, null)) continue;
        for (let xx = l; xx <= r; xx++) shirtPx[base + xx] = 1;
      }
    }
    /* backstop: no bare belly.  Any row below the trunk anchor with torso
       skin inside the trunk window but no shirt (the tracker stumbled on a
       weird pose) gets a solid span fill of its non-limb runs, clipped to
       the window.  Rows where only a crossing limb occupies the window stay
       skin -- the belly is occluded there anyway. */
    const wl = Math.max(x0, tcx - SHIRT_TRUNK_HALF);
    const wr = Math.min(x1 - 1, tcx + SHIRT_TRUNK_HALF);
    for (let y = ty + 1; y < bottom; y++) {
      const base = y * w;
      let has = false;
      for (let xx = wl; xx <= wr; xx++) if (shirtPx[base + xx]) { has = true; break; }
      if (has) continue;
      const rs = runsOf(y);
      let bl = 1e9, br = -1;
      for (let i = 0; i < rs.length; i += 2) {
        const l = rs[i], r = rs[i + 1];
        if (r < wl || l > wr) continue;
        if (isLimb(l, r, y, null)) continue;
        const cl = Math.max(l, wl), cr = Math.min(r, wr);
        if (cl < bl) bl = cl;
        if (cr > br) br = cr;
      }
      for (let xx = bl; xx <= br; xx++)
        if (cls[base + xx] !== 0 && y < colWaist[xx]) shirtPx[base + xx] = 1;
    }
  }
  return shirtPx;
}

/* ═══ v2.3.3640: UNDER GREAVES, THE STAND-INS' LEGS ARE THE GREAVES ═══
   The owner, 2026-10-27: "check all the animations for ghost remnants of
   either a body beneath or areas for cleanup".  mp-ghostaudit photographed
   every frame of a bro in colours nothing else wears under iron armour, and
   every frame of the sword's swing showed the body's trousers and boots
   beside the greaves: the swing (and the bow's shot) is a stand-in made of
   separate pictures -- a bare body recoloured here, then the greaves' own
   swing strip drawn over it -- and the two pictures' legs are not drawn in
   the same place (a back boot behind the greaves' heel, the trousers between
   the thighs).  The walking figure solved this in v2.3.3010 (maskedBake.js
   _legsOnlyClamp: "greaves alone hide the plain legs"); the stand-ins never
   had it.
   `greaves` is the greaves strip's opaque pixels (alpha > 30) laid out as
   this sheet is -- the caller passes it only when its size is this canvas's.
   Per frame, from the greaves' top (the row above which 3% of their pixels
   lie, so a speck does not move it) down, a trouser or boot pixel of the
   ORIGINAL art that the greaves do not cover:
     - goes (see-through), when the space it is in opens to the frame's edge
       without crossing the greaves -- the back boot, a calf past the plate;
     - turns the full set's under-armour shadow (44,47,54, as the walking
       clamp and v2.3.1349) when the greaves close it in -- a gap between the
       plates, never a see-through hole in the figure;
   and then the dark outline those legs leave, two passes of it: an outline
   pixel beside a leg pixel that went, not beside bare skin (a hand passing
   the thigh keeps its own outline).  Skin is never touched: the arms.
   Returns { gone, dark }. */
const LEGS_UNDER_TOP_SHARE = 0.03;
const LEGS_UNDER_SHADE = [44, 47, 54];
function _clampLegsUnder(d, w, h, FW, greaves, legAll, skinAll) {
  const frames = Math.max(1, Math.floor(w / FW));
  let gone = 0, dark = 0;
  const went = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);   /* open to the frame's edge, off the greaves */
  const stack = new Int32Array(w * h);
  for (let f = 0; f < frames; f++) {
    const x0 = f * FW, x1 = Math.min(w, x0 + FW);
    let total = 0;
    for (let y = 0; y < h; y++) for (let x = x0; x < x1; x++) if (greaves[y * w + x]) total++;
    if (!total) continue;   /* no greaves drawn in this frame: nothing to clamp to */
    let top = 0;
    for (let y = 0, cum = 0; y < h; y++) {
      for (let x = x0; x < x1; x++) if (greaves[y * w + x]) cum++;
      if (cum >= LEGS_UNDER_TOP_SHARE * total) { top = y; break; }
    }
    /* the open space: a fill from every edge pixel of the frame that is not
       greaves, through pixels that are not greaves */
    let sp = 0;
    const seed = (x, y) => { const p = y * w + x; if (!greaves[p] && !out[p]) { out[p] = 1; stack[sp++] = p; } };
    for (let x = x0; x < x1; x++) { seed(x, 0); seed(x, h - 1); }
    for (let y = 0; y < h; y++) { seed(x0, y); seed(x1 - 1, y); }
    while (sp > 0) {
      const p = stack[--sp], x = p % w, y = (p - x) / w;
      if (x > x0) { const q = p - 1; if (!greaves[q] && !out[q]) { out[q] = 1; stack[sp++] = q; } }
      if (x < x1 - 1) { const q = p + 1; if (!greaves[q] && !out[q]) { out[q] = 1; stack[sp++] = q; } }
      if (y > 0) { const q = p - w; if (!greaves[q] && !out[q]) { out[q] = 1; stack[sp++] = q; } }
      if (y < h - 1) { const q = p + w; if (!greaves[q] && !out[q]) { out[q] = 1; stack[sp++] = q; } }
    }
    for (let y = top; y < h; y++) {
      for (let x = x0; x < x1; x++) {
        const p = y * w + x, o = p * 4;
        if (!legAll[p] || greaves[p] || d[o + 3] === 0) continue;
        if (out[p]) { d[o + 3] = 0; went[p] = 1; gone++; }
        else { d[o] = LEGS_UNDER_SHADE[0]; d[o + 1] = LEGS_UNDER_SHADE[1]; d[o + 2] = LEGS_UNDER_SHADE[2]; d[o + 3] = 255; dark++; }
      }
    }
    /* the outline the legs leave: two passes, each taking an outline pixel
       (not skin, not a leg, not greaves) beside one that went and beside no
       skin */
    for (let pass = 0; pass < 2; pass++) {
      const now = [];
      for (let y = Math.max(top, 1); y < h - 1; y++) {
        for (let x = x0 + 1; x < x1 - 1; x++) {
          const p = y * w + x;
          if (went[p] || greaves[p] || legAll[p] || skinAll[p] || d[p * 4 + 3] === 0) continue;
          if (!(went[p - 1] || went[p + 1] || went[p - w] || went[p + w])) continue;
          let nearSkin = false;
          for (let dy = -1; dy <= 1 && !nearSkin; dy++) for (let dx = -1; dx <= 1; dx++) if (skinAll[p + dy * w + dx]) { nearSkin = true; break; }
          if (!nearSkin) now.push(p);
        }
      }
      for (const p of now) { d[p * 4 + 3] = 0; went[p] = 1; gone++; }
    }
  }
  return { gone, dark };
}

/* `art` (v2.3.1940) is `{ pants, tattoo, mirror }` — the player's own drawings,
   or null/absent for everyone who has not drawn anything, which is the entire
   default path and costs nothing.  `mirror` pre-flips the drawing because three
   of the eight screen facings are drawn by flipping a base-dir sheet, so a
   drawing baked straight in would read backwards on those (owner, on the shirt:
   "Your smiley face rotated the opposite direction"). */
/* v2.3.3658: `?garmentspecks=0` is the game as it was: every trouser- and
   boot-coloured pixel painted the player's colours, wherever it lies on the
   figure (recolorBodyToCanvas, garmentConfine.js).  And, for QA, how many of
   each a bake left in the art's own colour, by sheet. */
export const GARMENT_SPECKS_OFF = (() => { try { return /[?&]garmentspecks=0(&|$)/.test(window.location.search || ''); } catch (e) { return false; } })();
/* v2.3.3658: a torso strip (a running swing's or shot's top half, drawn over
   the jog legs) is cut at the waist -- at the skin->pants line, BOW_ART_VERSION
   959/960 -- so its only real trousers are the sliver at that cut, within 2-3
   rows of its bottom (14-18 px a frame on bow-southwest and sword-north), and
   it has no boots: its band is that sliver, and it paints no boot at all.
   Every other trouser- or boot-coloured pixel in one is outline (measured:
   sword-east-torso's lie in lines along the back and the arm).  The sliver is
   painted because the legs are drawn UNDER the torso there (effectsRenderer
   _LEG_LIFT), so an unpainted one would show as an olive line at the waist. */
const TORSO_WAIST_UP = 0.05;
const _garmentLeft = Object.create(null);
if (typeof window !== 'undefined') {
  window.__btGarmentSpecks = () => ({ on: !GARMENT_SPECKS_OFF, left: { ..._garmentLeft } });
}
/* v2.3.3671: `?pickwood=0` is the game as it was: the mining sheets' pickaxe
   painted with the skin (its wood) and the boots (its steel) like everything
   else (recolorBodyToCanvas `toolWood`, toolWood.js).  And, for QA, how many
   of the pickaxe's pixels each mining bake kept, by sheet. */
const PICK_WOOD_OFF = (() => { try { return /[?&]pickwood=0(&|$)/.test(window.location.search || ''); } catch (e) { return false; } })();
const _pickWoodKept = Object.create(null);
/* v2.3.3881: `?toolsolid=0`: the pickaxe as the sheet draws it, thin and pale
   (toolWood.js solidTool); and, for QA, the pixels each mining bake painted */
const TOOL_SOLID_OFF = (() => { try { return /[?&]toolsolid=(0|off|false)(&|$)/.test(window.location.search || ''); } catch (e) { return false; } })();
const _toolSolid = Object.create(null);
if (typeof window !== 'undefined') {
  window.__btPickWood = () => ({ on: !PICK_WOOD_OFF, kept: { ..._pickWoodKept }, solid: TOOL_SOLID_OFF ? null : { ..._toolSolid } });
}
/* v2.3.1991: which sheet the bake below is for.  recolorBodyToCanvas takes an
   IMAGE, not a pose and a direction, so the probe inside it cannot name what it
   just measured -- and keying the probe by frame COUNT picked the 14-frame
   MINING strip as "the biggest", which is how a first attempt at this
   measurement ended up reporting on the wrong animation entirely.  buildBodySheet
   knows, so buildBodySheet says. */
let _bakeTag = '';
/* ═══ v2.3.2431: THE FRAME WIDTH IS AN ARGUMENT, NOT A CONSTANT ═══
   Every per-frame step below used the module constant FRAME_W = 256, which was
   true of every sheet that had ever reached this function WITH ART: the stand
   and jog sheets are 256 wide per frame.  v2.3.2428 started sending the player's
   drawings to the sword, bow and jog-LEG stand-in strips as well, and those are
   122, 128, 130, 154, 160, 214, 320, 340 and 402 px per frame -- so `frames`
   came out as floor(w / 256), a number with no relationship to the sheet, and
   every mask, band and stamp below was measured in 256px windows straddling
   whichever figures happened to fall in them.

   MEASURED, before the fix, with a per-frame ink probe:
     bow-north-body      3 frames, ink [407, 0, 0]
     bow-northwest-body  3 frames, ink [1095, 1, 0]
     bow-southwest-body  3 frames, ink [439, 0, 0]
     jog-east-legs      28 frames, ink [31, 0, 82, 0, 102, 0, ...]
   A raised shield draws BLOCK_POSE_FRAME = 1 (effectsRenderer), so on three of
   the five bow facings the block pose showed NO tattoo at all -- the exact thing
   v2.3.2428 was written to fix -- and the trouser print flickered on every other
   jog-leg frame.

   Defaulted to FRAME_W so every existing caller is byte-identical; only the
   stand-in loader passes anything else. */
/* v2.3.2470: `steadyArt` -- correct a drawing's per-frame fit against the rest
   of the strip (see stampRegion's `steadyBox`).  Passed ONLY by the walking-body
   bake.  The stand-in strips in effectsRenderer deliberately do not ask for it:
   a sword swing throws the torso around far more than a jog bob, so its frames
   are all honest outliers of each other and correcting them against a median
   costs ink rather than steadying it -- measured, on sword-south-torso. */
/* v2.3.3671: `toolWood` -- a mining sheet: its pickaxe keeps its own colours
   (toolWood.js says which pixels it is, read off the ORIGINAL art below). */
/* ═══ v2.3.4400: A BAKE'S CANVAS IS READ BACK, SO IT STAYS ON THE PAGE'S SIDE ═══
   A look's bake draws a whole body sheet onto a canvas (a jog: 6144 x 256)
   and at once reads every pixel back to recolour it.  On a real graphics
   chip a 2D canvas this size lives ON the chip: the read stops the page until
   the chip has handed the pixels back, the write sends them up again, and
   every look met on a computer (Windows and a Mac bake every look: the look
   palette is not built there, game/lookPaletteChoice.js) pays it on the
   page, mid-frame.  `willReadFrequently` is the browser's own switch for
   exactly this: the canvas is kept in the page's memory, and the read is a
   copy.  The pixels are the same (the picture is drawn 1:1 and recoloured in
   JavaScript; whatever scales it later is another canvas).  The QA box draws
   every canvas in software already, so it can measure no gain: the phone's
   and a computer's own meter does (`?perf=1`, "between frames: body ...").
   `?bakeread=0` is the old way for one tab, to compare. */
const _BAKE_READ = (() => { try { return !/(^|[?&])bakeread=0(&|$)/.test(window.location.search || ''); } catch (e) { return true; } })();
function bakeReadCtx(cv) {
  return _BAKE_READ ? cv.getContext('2d', { willReadFrequently: true }) : cv.getContext('2d');
}
export function recolorBodyToCanvas(img, skinT, pantsT, shoesT, shirtT, targetH, eyeT, eyeRects, art, frameW, steadyArt, eyeBlankRects, bootsUnderLegs, legsUnder, torsoStrip, toolWood) {
  const FW = (typeof frameW === 'number' && frameW > 0) ? Math.round(frameW) : FRAME_W;
  const _sheetName = (img && typeof img.src === 'string') ? img.src.replace(/[?#].*$/, '').replace(/^.*\//, '') : '';   /* v2.3.3658: QA */
  /* v2.3.1108: when the caller knows this sheet's logical frame height, restore
     a downscaled-on-disk sheet to it (nearest-neighbour, exact palette) so the
     skin/pants/shoes pixel thresholds + frame math are unchanged. The attack
     stand-in strips have their OWN heights (227-320px), so the height is passed
     per-caller, not assumed 256. No-op for full-res / native art. */
  if (targetH) img = upscaleToFrameHeight(img, targetH);
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const ctx = bakeReadCtx(cv);   /* v2.3.4400: read back at once (below): a canvas kept on the page's side */
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, cv.width, cv.height);
  const d = imgData.data;
  const w = cv.width, h = cv.height;
  const frames = Math.max(1, Math.floor(w / FW));
  /* ═══ v2.3.3671: THE PICKAXE KEEPS ITS WOOD ═══
     The mining sheets draw the pickaxe in its own wood and steel, not in the
     magenta key the axe and the rod are coloured from (toolRecolor.js), and its
     wood is the skin's hue family: the skin test below took the handle and the
     head's rim, and a green bro mined with a green pickaxe (mp-ghostaudit).
     Its pixels are found on the original art and passed over by every test
     below -- skin, shirt, trousers, boots, the drawings' masks -- so they keep
     the colours they are painted.  The mining sheets only: the walking sheets'
     own skin is pale enough to pass the wood's test (toolWood.js). */
  const tool = (toolWood && !PICK_WOOD_OFF) ? toolWoodMask(d, w, h, FW) : null;
  if (tool) {
    let n = 0;
    for (let p = 0; p < tool.length; p++) if (tool[p]) n++;
    _pickWoodKept[_sheetName || ('w' + w + 'h' + h)] = n;
  }
  const shirtPx = shirtT ? _torsoBands(d, w, h, FW, frames) : null;
  /* v2.3.1940: the two drawn regions.  Both masks are collected DURING the
     classification pass below, on the ORIGINAL pixels — after the retint a pale
     skin no longer passes _isSkin (alabaster is r-g=13, the test wants >25), so
     classifying afterwards would find no skin at all on exactly the players who
     picked a light tone.  Same reason _torsoBands runs up here. */
  /* v2.3.1965: THE DESIGNER WANTS EVERY REGION, INKED OR NOT.
     Each `want` below gates a mask, and the mask is what stampRegion measures
     the grid from — so keyed on ink alone, a character who has drawn nothing
     produced no masks, no grids and therefore no way for the body-ink surface
     to turn a finger into a cell.  The FIRST mark was unmakeable, on every
     region, forever; and the second one on a region was unmakeable too until
     you had inked that region some other way.
     `art.report` is set by the designer and by nothing else (the game passes
     no `report`), so the extra classification is paid on the one screen that
     needs it and nowhere else.  Blank art paints nothing either way: every
     cell of it gives artColorAt null and is skipped. */
  const wantReport = !!(art && art.report);
  const wantPantsArt = !!(art && artHasInk(art.pants)) || wantReport;
  const wantTattoo = !!(art && artHasInk(art.tattoo)) || wantReport;
  /* v2.3.1949: the face and the arms.  Both are derived from the SAME two masks
     the chest tattoo already needs (bare skin, and the torso band), so wanting
     one of them costs a second Uint8Array and no extra classification. */
  const wantFaceTat = !!(art && artHasInk(art.tattooFace)) || wantReport;
  const wantArmTat = !!(art && artHasInk(art.tattooArm)) || wantReport;
  /* v2.3.1941: a pattern wants the same trouser mask a print does. */
  const pantsPat = art ? parsePattern(art.pantsPattern, 'pants') : null;
  const pantsPx = (wantPantsArt || pantsPat) ? new Uint8Array(w * h) : null;
  /* v2.3.1944: shoes take a pattern too (owner: "Do the shoes too but in
     patterns that would look good at a small size").  Only a pattern -- a boot
     is about eight screen pixels, so there is nothing to draw ON. */
  const shoesPat = art ? parsePattern(art.shoesPattern, 'shoes') : null;
  const shoesPx = shoesPat ? new Uint8Array(w * h) : null;
  /* A copy of the source pixels, kept only when something will be painted on
     the trousers: the retint below overwrites `d` in place, and v2.3.1942's
     lit-fabric test has to be asked of the ORIGINAL art. */
  const base = (pantsPx || shoesPx) ? new Uint8ClampedArray(d) : null;
  /* ═══ v2.3.3146: THE BOOTS ARE UNDER THE LEGS (`bootsUnderLegs`) ═══
     The fishing sheet takes the recolour now (getFishFrame), and its LINE is
     the boots' flat grey -- (60-72) against the boots' (46-75): no colour test
     can part them, so a player in red boots would have cast a red line.
     Where they are parts them completely: the line hangs at the frame's left
     edge (x 2-6 of 128) and the boots stand under the trousers (x 53-80).  So
     with `bootsUnderLegs` a boot-grey pixel is a boot only BELOW THE TOP OF THE
     TROUSERS and within their columns (BOOT_TOE_FRAC of a frame either side,
     for a toe), per frame.  Measured over all 32 fish frames: every boot pixel
     kept, not one pixel of the line; the outline specks it keeps beside the
     legs are the ones every walking sheet's boot test has always retinted.
     The boot-grey candidates are found in the pass below and painted after it,
     once the trousers are known. */
  const bootCand = bootsUnderLegs ? new Uint8Array(w * h) : null;
  const legPx = bootsUnderLegs ? new Uint8Array(w * h) : null;
  /* v2.3.3640: under greaves (`legsUnder`, see _clampLegsUnder below): the
     trousers and boots of the ORIGINAL art, and its bare skin, kept so the
     legs the greaves do not cover can go and the hands they pass stay */
  const greaves = (legsUnder && legsUnder.length === w * h) ? legsUnder : null;
  const legAll = greaves ? new Uint8Array(w * h) : null;
  const skinAll = greaves ? new Uint8Array(w * h) : null;
  /* ═══ v2.3.3658: THE TROUSERS AND BOOTS ARE PAINTED WHERE THEY ARE ═══
     The owner, 2026-10-27: "check all the animations for ghost remnants".  The
     colour tests below find the trousers and the boots and, with them, every
     outline pixel that happens to be their olive or their grey, wherever it
     lies: round the head, along an eyelid, down an arm.  Painted the player's
     colours, those were the pink and blue specks mp-ghostaudit found in nearly
     every pose (TRAPS §256).  So a trouser or boot pixel is painted as it is
     found only in its BAND, the bottom of the figure the patterns are already
     confined to (playerDecal's PANTS_MAX_UP / SHOES_MAX_UP); one outside it
     waits, and garmentConfine.js judges it after the pass: the garment after
     all (a leg thrown up in the roll, a waistband in a torso strip), or a
     speck, which keeps the art's own colour.  Nothing to do when neither
     colour is wanted: the default trousers and boots are not recoloured. */
  /* a torso strip: the waist's sliver of trousers and no boots (TORSO_WAIST_UP) */
  const torso = !!torsoStrip && !GARMENT_SPECKS_OFF;
  if (torso) shoesT = null;
  const confine = !GARMENT_SPECKS_OFF && !!(pantsT || shoesT);
  const gBands = confine ? garmentBands(d, w, h, FW, torso ? 0 : SHOES_MAX_UP, torso ? TORSO_WAIST_UP : PANTS_MAX_UP) : null;
  /* a byte a pixel: what the ORIGINAL art is there (GC_PANTS, GC_BOOT,
     GC_SKIN, GC_DARK), for the judge -- the retint below changes the colours */
  const gCls = confine ? new Uint8Array(w * h) : null;
  const farP = confine ? [] : null, farB = confine ? [] : null;
  /* A tattoo goes on the CHEST, so it is bare skin intersected with the torso
     band — the same tracker the baked shirt used, reused rather than re-guessed.
     (It also means the tattoo hides under a shirt or a breastplate, which is
     what a chest tattoo does.) */
  const anyTat = wantTattoo || wantFaceTat || wantArmTat;
  const torsoPx = anyTat ? (shirtPx || _torsoBands(d, w, h, FW, frames)) : null;
  const tattooPx = wantTattoo ? new Uint8Array(w * h) : null;
  /* Every bare-skin pixel, kept only when a face or arm tattoo is wanted:
     splitSkinRegions slices it against the torso band once the pass is done. */
  const skinPx = (wantFaceTat || wantArmTat) ? new Uint8Array(w * h) : null;
  /* Flat shirt fill colour (no per-pixel shading -> no resurfacing of the
     body's contour lines).  Computed once. */
  let sf0 = 0, sf1 = 0, sf2 = 0;
  if (shirtT) {
    sf0 = Math.min(255, Math.round(shirtT[0] * SHIRT_FILL_K));
    sf1 = Math.min(255, Math.round(shirtT[1] * SHIRT_FILL_K));
    sf2 = Math.min(255, Math.round(shirtT[2] * SHIRT_FILL_K));
  }
  for (let i = 0; i < d.length; i += 4) {
    if (tool && tool[i >> 2]) continue;   /* v2.3.3671: the pickaxe, as painted */
    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
    if (gCls && a > 180 && r < 45 && g < 45 && b < 45) gCls[i >> 2] = GC_DARK;   /* v2.3.3658 */
    if (shirtPx && shirtPx[i >> 2]) {
      /* shirt skin -> flat fill (kills muscle shading); dark outline/seam
         pixels are never in shirtPx, so they stay and give the shirt its
         outline + arm definition. */
      d[i] = sf0; d[i + 1] = sf1; d[i + 2] = sf2;
    } else if (_isSkin(r, g, b, a) && !_isEyeCream(r, g)) {   /* v2.3.2860: not the white of the eye */
      if (tattooPx && torsoPx[i >> 2]) tattooPx[i >> 2] = 1;
      if (skinPx) skinPx[i >> 2] = 1;              /* v2.3.1949 */
      if (skinAll) skinAll[i >> 2] = 1;            /* v2.3.3640 */
      if (gCls) gCls[i >> 2] |= GC_SKIN;           /* v2.3.3658 */
      if (skinT) _retint(d, i, skinT, SKIN_REF);
    } else if (a > 180 && g >= r - 10 && g > b + 8 && r < 150) {
      /* pants (green) */ if (pantsPx) pantsPx[i >> 2] = 1;
      if (legPx) legPx[i >> 2] = 1;   /* v2.3.3146 */
      if (legAll) legAll[i >> 2] = 1;   /* v2.3.3640 */
      if (gCls) {   /* v2.3.3658: in its band, painted; else judged below */
        gCls[i >> 2] |= GC_PANTS;
        if (!inGarmentBand(gBands.pants, gBands.frames, i >> 2, w, FW)) farP.push(i >> 2);
        else if (pantsT) _retint(d, i, pantsT, PANTS_REF);
      } else if (pantsT) _retint(d, i, pantsT, PANTS_REF);
    } else if (a > 180) {
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if ((mx - mn) < 28 && mx >= 45 && mx < 140) {
        if (legAll) legAll[i >> 2] = 1;   /* v2.3.3640: a boot */
        /* v2.3.3658: in its band, painted; else judged below */
        let bootHere = true;
        if (gCls) {
          gCls[i >> 2] |= GC_BOOT;
          if (!inGarmentBand(gBands.shoes, gBands.frames, i >> 2, w, FW)) { farB.push(i >> 2); bootHere = false; }
        }
        /* boots (flat gray) -- v2.3.3146: or, under `bootsUnderLegs`, a
           candidate for one, painted below once the legs are known */
        if (bootCand) bootCand[i >> 2] = 1;
        else {
          if (shoesPx) shoesPx[i >> 2] = 1;
          if (shoesT && bootHere) _retint(d, i, shoesT, SHOES_REF);
        }
      }
    }
  }
  /* v2.3.3658: the trouser and boot pixels outside their bands, judged (see
     above).  The fishing bake paints its boots below, from the legs: a boot
     pixel outside its band that the judge did not keep is left out there too. */
  let bootFar = null;
  if (confine) {
    const kept = judgeGarments(w, h, FW, gCls, gBands, farP, farB);
    if (pantsT) for (const p of kept.pants) _retint(d, p << 2, pantsT, PANTS_REF);
    if (bootCand) {
      bootFar = new Uint8Array(w * h);
      for (const p of farB) bootFar[p] = 1;
      for (const p of kept.boots) bootFar[p] = 0;
    } else if (shoesT) for (const p of kept.boots) _retint(d, p << 2, shoesT, SHOES_REF);
    /* ...and the patterns' masks follow the judge: a speck it left as drawn
       takes no trouser or boot pattern either, and a torso strip no boot
       pattern at all (found in review: its waist and back outline could be
       stamped with one) */
    if (pantsPx && farP.length) { const k = new Set(kept.pants); for (const p of farP) if (!k.has(p)) pantsPx[p] = 0; }
    if (shoesPx && torso) shoesPx.fill(0);
    else if (shoesPx && farB.length) { const k = new Set(kept.boots); for (const p of farB) if (!k.has(p)) shoesPx[p] = 0; }
    _garmentLeft[_sheetName || ('w' + w + 'h' + h)] = { pants: farP.length - kept.pants.length, boots: farB.length - kept.boots.length };
  }
  if (bootCand) {
    const legMin = Math.max(3, Math.round(h / 40));   /* a column or row of trouser, not a speck: 6 px at 256 */
    const toe = Math.round(FW * BOOT_TOE_FRAC);
    for (let f = 0; f < frames; f++) {
      const fx0 = f * FW, fx1 = Math.min(w, fx0 + FW);
      let lx0 = Infinity, lx1 = -Infinity, ly0 = Infinity;
      for (let x = fx0; x < fx1; x++) {
        let n = 0;
        for (let y = 0; y < h; y++) if (legPx[y * w + x]) n++;
        if (n >= legMin) { if (x < lx0) lx0 = x; if (x > lx1) lx1 = x; }
      }
      for (let y = 0; y < h && ly0 === Infinity; y++) {
        let n = 0;
        for (let x = fx0; x < fx1; x++) if (legPx[y * w + x]) n++;
        if (n >= legMin) ly0 = y;
      }
      if (!isFinite(lx0) || !isFinite(ly0)) continue;   /* no trousers in this frame: no boots either */
      const bx0 = Math.max(fx0, lx0 - toe), bx1 = Math.min(fx1 - 1, lx1 + toe);
      for (let y = ly0; y < h; y++) {
        for (let x = bx0; x <= bx1; x++) {
          const p = y * w + x;
          if (!bootCand[p] || (bootFar && bootFar[p])) continue;
          if (shoesPx) shoesPx[p] = 1;
          if (shoesT) _retint(d, p * 4, shoesT, SHOES_REF);
        }
      }
    }
  }
  /* v2.3.1940: the drawings, after every retint (so the retint cannot repaint
     them) and before the eyes (which own their own pixels either way). */
  /* v2.3.1942 (owner: "keep it contained within the black outlines ...
     otherwise it makes the clothes appear floating or like one dimensional").
     The trousers' black outline is already outside `pantsPx` -- the green test
     rejects it -- but the region's own dark RIM is the shading that rounds the
     legs, and painting over it is what read as flat.  Measured on the ORIGINAL
     pixels (`base`), because by now `d` carries the player's chosen trouser
     colour and a dark one would fail a darkness test everywhere.
     One mask for both the pattern and the print: the print is measured from it
     too, so the drawing sits inside the shading rather than across it. */
  /* v2.3.1944, corrected v2.3.1945: confine each region to where the garment
     actually IS before painting it.  Both colour tests accept a scatter of
     specks far from the garment and a tile paints every masked pixel, so
     without this a patterned trouser leg puts a coloured dot on the
     character's head.  Positional, not density- or size-based -- see
     regionFromFeet for the 156-frame measurement and for why the row-band rule
     it replaces failed on the animation sheets. */
  const pantsPaint = pantsPx
    ? litFabricMask(base, regionFromFeet(d, pantsPx, w, h, FW, PANTS_MAX_UP), w * h, PANTS_LIT_MIN) : null;
  /* Pattern first, print over it: a print is ON the fabric, and the fabric is
     what the pattern is. */
  if (pantsPat) stampPattern(d, w, h, FW, pantsPaint, pantsPat, !!art.mirror);
  /* v2.3.1962: when the caller asks (`art.report`), every grid these stamps fit
     is collected and handed back on the canvas.  The designer needs the same
     numbers the stamp used in order to run a touch backwards into a cell — see
     gridFit/cellAt in playerDecal.  The game never asks, so it never pays. */
  /* v2.3.1991: the probe forces the report on for the east run strip, so the
     grid stampRegion actually fitted per frame can be read from outside.  The
     region mask was already verified correct and the tattoo still did not
     appear, which leaves the FIT as the thing to look at. */
  /* v2.3.1992: the probe now reports on EVERY sheet it bakes, not only the east
     run strip, and each report carries its row/column histograms.  The rule that
     decides the extent has to hold for a broad front-on torso and a narrow
     profile head at once, so "is it fixed?" is a question about all five facings
     in both poses — the single-sheet probe is what let a rule that suits one
     shape look correct. */
  const _probe = typeof window !== 'undefined' && !!window.__btGridProbe;
  const _rep = (art && art.report) || _probe
    ? { pants: [], tattoo: [], face: [], arms: [] } : null;
  const _stampOpt = (arr) => (_rep ? { report: arr, profile: _probe } : undefined);
  if (wantPantsArt) stampRegion(d, w, h, FW, pantsPaint, art.pants, !!art.mirror, PANTS_BOX,
    _stampOpt(_rep && _rep.pants));
  if (shoesPat) {
    stampPattern(d, w, h, FW,
      litFabricMask(base, regionFromFeet(d, shoesPx, w, h, FW, SHOES_MAX_UP), w * h, SHOES_LIT_MIN),
      shoesPat, !!art.mirror);
  }
  /* v2.3.1950: `underSkin` on all three -- ink sits UNDER skin, so it takes the
     body's shading and lets some skin through.  A shirt print does not: it is
     ink ON fabric, and stays opaque. */
  /* v2.3.2470: `steadyBox` -- the TORSO only.  One box for the whole strip, so
     the swinging arms can neither collapse the chest's fit nor stretch it out
     over an arm; see the block at the top of stampRegion for the measurements.
     Deliberately NOT given to the trousers or the arms: a trouser print sits on
     legs that genuinely move apart, and the arms already pass `eachPiece`
     because their region is SUPPOSED to be two separate things. */
  if (tattooPx) stampRegion(d, w, h, FW, tattooPx, art.tattoo, !!art.mirror, TATTOO_BOX,
    { underSkin: true, steadyBox: !!steadyArt, report: _rep && _rep.tattoo, profile: _probe });
  /* v2.3.1949: face and arms.  `eachPiece` for the arms only -- a figure has
     two of them and the largest-piece rule would ink whichever happens to be
     nearer the camera. */
  if (skinPx) {
    const reg = splitSkinRegions(skinPx, torsoPx, w, h, FW);
    /* ═══ v2.3.1991: PER-FRAME REGION SIZES, FOR THE PROBE ═══
       Owner: "the face tattoo only showing on idle and disappears during jog
       but then pops up on one frame."  A tattoo is painted into whatever
       `reg.face` says the face is, so a frame where that region collapses
       paints nothing -- and the difference between poses is invisible from
       outside the bake.  This publishes the per-frame count so a scenario can
       measure it instead of a human counting frames in a screenshot.
       Diagnostic only: it allocates one small array per bake and is read by
       tools/qa/mp/mp-facetat.mjs. */
    if (typeof window !== 'undefined' && window.__btGridProbe) {
      try {
        const _fr = Math.max(1, Math.floor(w / FW));
        const _face = new Array(_fr).fill(0), _arms = new Array(_fr).fill(0), _skin = new Array(_fr).fill(0);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = y * w + x, f = Math.min(_fr - 1, Math.floor(x / FW));
            if (reg.face[i]) _face[f]++;
            if (reg.arms[i]) _arms[f]++;
            if (skinPx[i]) _skin[f]++;
          }
        }
        /* Keyed by frame COUNT, and accumulated rather than overwritten: one
           bake runs per (pose, dir) and the last one to finish is whichever
           sheet the renderer happened to want most recently.  Overwriting
           reported `frames: 1` -- the portrait -- and said nothing at all
           about the 28-frame jog sheet, which is the one the question is
           about. */
        window.__btSkinRegions = window.__btSkinRegions || {};
        window.__btSkinRegions[_bakeTag || ('f' + _fr)] = { frames: _fr, face: _face, arms: _arms, skin: _skin };
        /* The finished sheet itself, so a probe can look at what was actually
           painted rather than at what the region said was paintable.  Only the
           multi-frame strips: the portrait bakes constantly and would thrash
           this.  Capped so a run strip does not sit in memory forever. */
        if (_bakeTag === 'jog-east' && _rep) { try { window.__btFaceGrids = _rep.face; } catch (e) { /* ignore */ } }
        if (_bakeTag === 'jog-east') {
          try {
            /* The region PAINTED RED over the sheet.  "The region exists and is
               a healthy size" turned out to be true while the tattoo was still
               invisible, so the count is not the answer -- WHERE it is, is. */
            const _c2 = document.createElement('canvas');
            _c2.width = cv.width; _c2.height = cv.height;
            const _g2 = bakeReadCtx(_c2);   /* v2.3.4400 */
            _g2.drawImage(cv, 0, 0);
            const _id = _g2.getImageData(0, 0, _c2.width, _c2.height);
            const _dd = _id.data;
            for (let i = 0; i < reg.face.length; i++) {
              if (!reg.face[i]) continue;
              _dd[i * 4] = 255; _dd[i * 4 + 1] = 0; _dd[i * 4 + 2] = 0; _dd[i * 4 + 3] = 255;
            }
            _g2.putImageData(_id, 0, 0);
            window.__btLastBake = { tag: _bakeTag, frames: _fr, png: cv.toDataURL('image/png'), region: _c2.toDataURL('image/png') };
          } catch (e) { /* tainted or huge: skip */ }
        }
      } catch (e) { /* a probe must never break a bake */ }
    }
    if (wantFaceTat) stampRegion(d, w, h, FW, reg.face, art.tattooFace, !!art.mirror, FACE_BOX,
      { underSkin: true, report: _rep && _rep.face, profile: _probe });
    if (wantArmTat) stampRegion(d, w, h, FW, reg.arms, art.tattooArm, !!art.mirror, ARM_BOX,
      { eachPiece: true, underSkin: true, report: _rep && _rep.arms, profile: _probe });
  }
  /* v2.3.1928: the iris last, so it overwrites rather than being classified.
     Its pixels are near-black and would otherwise fall through every branch
     above untouched, which is exactly why the eye needed its own mask. */
  if (eyeT && eyeRects && !eyeBlankRects) { _eyeT = eyeT; _paintEyes(d, cv.width, cv.height, eyeRects, FW); }
  /* v2.3.2643: ...or erase it instead.  The two are exclusive by the `&&` above
     rather than by draw order: recolouring an iris and then painting over it
     is work nobody sees.
     v2.3.2645: and the eye-colour pick is NOT lost when that happens, which is
     what this comment used to say.  It moves: the same swatch retints the worn
     style's own art in the trait layer above this bake (eyeStyleColorCatalog.js).
     So the exclusion here says only that the body sheet stops carrying the
     colour -- not that the player stopped choosing one. */
  if (eyeBlankRects) _blankEyes(d, cv.width, cv.height, eyeBlankRects, FW);
  /* v2.3.3640: last, so a trouser print on a hidden leg goes with the leg */
  if (greaves) {
    const n = _clampLegsUnder(d, w, h, FW, greaves, legAll, skinAll);
    try { cv.__btLegsClamp = n; } catch (e) { /* a frozen canvas: no probe, no harm */ }
  }
  /* ═══ v2.3.3881: THE PICKAXE, SOLID ═══
     The owner, playtesting: "the pickaxe for the first quest is still
     invisible or at least very lightly drawn. Can you use code to fill it
     with a handle and just an iron color for the metal part?"  Last, over the
     pixels the recolour passed over: a wood handle and an iron head, opaque,
     outlined into the empty pixels round it (toolWood.js solidTool).  Here,
     in the one bake both ways of drawing a look share (buildBodySheet, and
     lookSets/body.js with the look palette), once a look behind the loading
     screen; never a frame. */
  if (tool && !TOOL_SOLID_OFF) _toolSolid[_sheetName || ('w' + w + 'h' + h)] = solidTool(d, w, h, FW, tool);
  ctx.putImageData(imgData, 0, 0);
  /* v2.3.1962: hand the grids back on the canvas rather than through a second
     return value — `canvas.__btDir` (v2.3.1815) set the precedent, and every
     caller of this function ignores extra properties.  Only present when the
     caller asked. */
  if (_rep) { try { cv.__btGrids = _rep; } catch (e) { /* frozen: no probe, no harm */ } }
  /* v2.3.1992: and, for the probe only, the same grids keyed by SHEET, so a
     scenario can ask of stand-south and jog-northeast exactly what v2.3.1991
     could only ask of jog-east.  A rule for fitting a box has to hold for a
     broad front-on torso and a narrow profile head at the same time; one sheet
     cannot show that. */
  if (_rep && _probe) {
    try { window.__btGridsByTag = window.__btGridsByTag || {}; window.__btGridsByTag[_bakeTag] = _rep; } catch (e) { /* ignore */ }
  }
  return cv;
}

/* ═══ v2.3.1710: SKIN-ONLY RECOLOUR FOR THE PRE-DRAWN SKILL STAND-INS ═══
 *
 * Owner, on the cooking animation: "has the wrong skin color."  The cook is not
 * the trait-composed body -- it is a whole pre-drawn figure (cook-strip.webp)
 * that REPLACES the avatar at the campfire, and it was loaded raw, so it always
 * showed the artist's skin no matter what the player picked at the login menu.
 *
 * WHY NOT JUST CALL recolorBodyToCanvas.  That is what the sword/bow stand-ins
 * do (_loadRecoloredBody, v2.3.975) and it is wrong for THIS sheet, because the
 * cook holds a PROP.  Measured on cook-strip.webp with the shipped classifiers:
 *   - the pan's rim/handle is flat mid-gray, which the boot test accepts, so a
 *     player in red boots would have cooked with a red frying pan;
 *   - the raw fish in the pan is the same warm orange as the painted skin, so
 *     _isSkin accepts it and an ebony player's dinner turned dark brown.
 * Hence SKIN ONLY (pants/shoes are left as painted -- nobody asked for those,
 * and the pan is the thing they would break), plus a connected-component floor
 * that drops small skin-coloured islands.  The body's skin is ONE blob of
 * 9462-10773 px per frame; the next largest island is the fish at 224-523, so
 * STANDIN_MIN_BLOB sits an order of magnitude clear of both.
 *
 * Returns a canvas; the caller slices it into frames and rebakes on skin change.
 *
 * ═══ v2.3.1713: THE SAME FIX FOR THE FIRE-LIGHTER NEEDED A NARROWER TEST ═══
 *
 * Owner: "when lighting a fire the skin color ... goes back to defaults."  Same
 * root cause as the cook (firemaking-strip.webp went through a plain
 * Assets.load), but this recipe as written CANNOT be reused on it, which was
 * measured rather than assumed by running exactly this function over that strip
 * and rendering the 29 frames:
 *   - `_isSkin` accepts the campfire.  Its glow halo (b/r 0.57-0.84) and the
 *     orange band of the flame both pass, so 14 of 29 frames retinted the FIRE:
 *     an ebony player lit a dark-brown bonfire.
 *   - the halo touches the body, so the blob floor cannot separate them — they
 *     label as ONE component of up to 6963 px.
 *   - and the floor is wrong in the other direction too: this figure's skin is
 *     broken up by the outlines of its folded arms, so its largest component is
 *     1169-2296 px, which means STANDIN_MIN_BLOB = 1500 DROPPED the body
 *     outright on frames 9-15 — the body would have flickered between the
 *     player's skin and the artist's at 18 fps.
 * Hence `opts`: a channel-ratio window that separates painted skin from painted
 * fire, and a floor the caller can lower to match its own art.  Measured on the
 * fire strip, body skin sits at g/r 0.49-0.74 / b/r 0.13-0.46 while the flame's
 * red edge is g/r 0.21-0.45 and the halo is b/r 0.57+, so the window below
 * cleanly splits them.  DEFAULTS ARE THE COOK'S EXACT BEHAVIOUR — no window, no
 * alpha floor, blob floor 1500 — so v2.3.1710 is bit-for-bit unchanged. */
const STANDIN_MIN_BLOB = 1500;   /* px; body >= 9462, fish <= 523 (measured) */
export function recolorStandInSkin(img, skinT, targetH, opts) {
  return _standInBake(img, skinT, targetH, opts, false).cv;
}
/* ═══ v2.3.2856: THE SAME BAKE, WITH THE DRAWINGS ON A LAYER OF THEIR OWN ═══
   Returns { cv, ink }: `cv` is the figure exactly as recolorStandInSkin would
   bake it WITHOUT drawings, and `ink` is a canvas of the same size holding only
   the pixels the drawings changed (null when none landed).  For a stand-in
   whose skin bake is shared with other players -- the cook's is (see the SPEC
   table in effectsRenderer) -- the drawings cannot go into it: everybody else
   at a campfire would wear them.  Drawn over the shared figure, the layer gives
   the pixels a full bake would (bar the blend on a half-transparent edge
   pixel), for a fraction of its memory. */
export function recolorStandInSkinSplit(img, skinT, targetH, opts) {
  return _standInBake(img, skinT, targetH, opts, true);
}
function _standInBake(img, skinT, targetH, opts, apart) {
  const o = opts || {};
  const minBlob = o.minBlob != null ? o.minBlob : STANDIN_MIN_BLOB;
  /* v2.3.2856: an island smaller than the floor is still the figure's when it
     STARTS left of this column of its frame (frame-local x) -- the cook's
     fingers, which the floor dropped along with the fish (standInInk.js,
     COOK_KEEP_X).  Needs the frame width: `frameW`, else the regions table's. */
  const keepX = o.keepX || 0;
  const keepFW = o.frameW || (o.regions && o.regions.fw) || 0;
  /* v2.3.2858: ...or when it lies WHOLLY inside its frame's keep box,
     [left, right, top, bottom] frame-local -- the fire-lighter's fist, cut into
     islands beside a flame that burns on both sides of it, where a column
     cannot tell hand from spark (standInInk.js, FIRE_KEEP_BOXES). */
  const keepBoxes = o.keepBoxes && keepFW ? o.keepBoxes : null;
  const maxBR = o.maxBR != null ? o.maxBR : Infinity;      /* blue/red ceiling — rejects the fire's pale glow */
  const minGR = o.minGR != null ? o.minGR : 0;             /* green/red floor — rejects the flame's red edge */
  const maxGR = o.maxGR != null ? o.maxGR : Infinity;
  if (targetH) img = upscaleToFrameHeight(img, targetH);
  const cv = document.createElement('canvas');
  cv.width = img.naturalWidth || img.width;
  cv.height = img.naturalHeight || img.height;
  const ctx = bakeReadCtx(cv);   /* v2.3.4400: read back below (a stand-in's recolour) */
  ctx.drawImage(img, 0, 0);
  /* v2.3.2855: `opts.art` + `opts.regions` -- the player's drawings, on a
     stand-in whose face/torso/arms were fitted by hand (standInInk.js).  Only
     the three SKIN canvases: these figures keep their painted trousers (the
     recolour here is skin-only for the reasons above), so a trouser print would
     have no garment of the player's to sit on.  (v2.3.4037: they wear yours
     now, and the trouser print with them -- `garb`, below, not `art`.) */
  const ink = (o.art && o.regions && (artHasInk(o.art.tattooFace) || artHasInk(o.art.tattoo)
    || artHasInk(o.art.tattooArm))) ? o.art : null;
  /* v2.3.3146: and your trousers and boots (_standInClothes) */
  const pantsT = o.pantsT || null, shoesT = o.shoesT || null;
  const clothesFW = o.frameW || (o.regions && o.regions.fw) || 0;
  /* v2.3.4037: and your trouser and shoe patterns and your trouser print
     (`garb`, standInGarb.js: the owner, "Shoes and patterns aren't showing
     while hoeing"), their cells scaled to the figure by `patK` */
  const garb = o.garb || null;
  const pantsPat = garb ? parsePattern(garb.pantsPattern, 'pants') : null;
  const shoesPat = garb ? parsePattern(garb.shoesPattern, 'shoes') : null;
  const pantsArt = garb && artHasInk(garb.pantsArt) ? garb.pantsArt : null;
  const dressed = !!(pantsPat || shoesPat || pantsArt);
  /* v2.3.3684: `legless` (the fire-lighter under greaves, _standInLegless)
     takes his legs out whatever the colours, so it always bakes */
  if (!skinT && !ink && !pantsT && !shoesT && !o.legless && !dressed) return { cv, ink: null };
  const w = cv.width, h = cv.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  /* v2.3.3146: found on the art as painted, before the skin is retinted */
  const clothes = (pantsT || shoesT || o.legless || dressed) && clothesFW ? _standInClothes(d, w, h, clothesFW, !!o.pantsWide) : null;
  /* pass 1: classify, with the SAME test the body pipeline uses (plus the
     caller's optional ratio window) */
  const skin = new Uint8Array(w * h);
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (!_isSkin(r, g, b, d[i + 3])) continue;
    if (b / r > maxBR || g / r < minGR || g / r > maxGR) continue;
    skin[p] = 1;
  }
  /* pass 2: label 4-connected skin blobs and record each one's size.  An
     EXPLICIT stack, not recursion -- a body blob spans ~10k px per frame,
     deep enough to blow the call stack. */
  const label = new Int32Array(w * h);   /* 0 = unlabelled */
  const stack = new Int32Array(w * h);
  const size = [0];                      /* size[id]; id 0 unused */
  const leftX = keepX && keepFW ? [0] : null;   /* v2.3.2856: leftX[id], frame-local */
  const inBox = keepBoxes ? [false] : null;       /* v2.3.2858: inBox[id] */
  for (let start = 0; start < w * h; start++) {
    if (!skin[start] || label[start]) continue;
    const id = size.length;
    let sp = 0, n = 0, lx = Infinity;
    let bl = Infinity, br = -1, bt = Infinity, bb = -1;   /* v2.3.2858: the island's box, frame-local */
    stack[sp++] = start; label[start] = id;
    while (sp > 0) {
      const q = stack[--sp];
      n++;
      const qx = q % w;
      if (leftX && qx % keepFW < lx) lx = qx % keepFW;
      if (inBox) {
        const fx = qx % keepFW, qy = (q - qx) / w;
        if (fx < bl) bl = fx;
        if (fx > br) br = fx;
        if (qy < bt) bt = qy;
        if (qy > bb) bb = qy;
      }
      if (qx > 0 && skin[q - 1] && !label[q - 1]) { label[q - 1] = id; stack[sp++] = q - 1; }
      if (qx < w - 1 && skin[q + 1] && !label[q + 1]) { label[q + 1] = id; stack[sp++] = q + 1; }
      if (q >= w && skin[q - w] && !label[q - w]) { label[q - w] = id; stack[sp++] = q - w; }
      if (q + w < w * h && skin[q + w] && !label[q + w]) { label[q + w] = id; stack[sp++] = q + w; }
    }
    size.push(n);
    if (leftX) leftX.push(lx);
    if (inBox) {
      const box = keepBoxes[Math.floor((start % w) / keepFW)];
      inBox.push(!!box && bl >= box[0] && br <= box[1] && bt >= box[2] && bb <= box[3]);
    }
  }
  /* v2.3.3684: which pieces of skin are the figure's (pass 3's own rule), for
     the glow's trousers and the legless bake below */
  const keptId = (clothes && (o.glowLegs || o.legless)) ? new Uint8Array(size.length) : null;
  if (keptId) {
    for (let id = 1; id < size.length; id++) {
      if (size[id] >= minBlob || (leftX && leftX[id] < keepX) || (inBox && inBox[id])) keptId[id] = 1;
    }
    if (o.glowLegs) _standInGlowLegs(d, w, h, clothesFW, clothes.legs, label, keptId);
  }
  /* v2.3.4037: where the patterns and the print go, measured now, while `d` is
     still the art as painted (the walking bake measures on its `base` copy):
     the lit fabric only, so the trousers' shaded rim keeps rounding the legs
     under a pattern (litFabricMask, the owner's "keep it contained within the
     black outlines").  The masks are _standInClothes' big pieces, so there
     are no far specks for regionFromFeet to drop. */
  const pantsPaint = clothes && (pantsPat || pantsArt) ? litFabricMask(d, clothes.legs, w * h, PANTS_LIT_MIN) : null;
  const shoesPaint = clothes && shoesPat ? litFabricMask(d, clothes.boots, w * h, SHOES_LIT_MIN) : null;
  /* pass 3: retint the CHARACTER's skin; leave the small islands (props) */
  const body = ink ? new Uint8Array(w * h) : null;   /* v2.3.2855: the same pixels, for the stamp */
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    const id = label[p];
    if (!id) continue;
    if (size[id] < minBlob && !(leftX && leftX[id] < keepX) && !(inBox && inBox[id])) continue;   /* v2.3.2856: keepX; v2.3.2858: keepBoxes */
    if (skinT) _retint(d, i, skinT, SKIN_REF);
    if (body) body[p] = 1;
  }
  /* v2.3.3146: the trousers and the boots, before the drawings are stamped --
     so the split bake's ink layer (below) still holds only the drawings */
  if (clothes) {
    for (let p = 0, i = 0; p < w * h; p++, i += 4) {
      if (pantsT && clothes.legs[p]) _retint(d, i, pantsT, PANTS_REF);
      else if (shoesT && clothes.boots[p]) _retint(d, i, shoesT, SHOES_REF);
    }
    /* QA (mp-gatherlook), armed by the harness only: what the trousers and
       boots came out as, per figure (`opts.probe`) */
    try {
      if (o.probe && typeof window !== 'undefined' && window.__btProbe) {
        const mean = (m) => {
          let n = 0, r = 0, g = 0, b = 0;
          for (let p = 0, i = 0; p < w * h; p++, i += 4) if (m[p]) { n++; r += d[i]; g += d[i + 1]; b += d[i + 2]; }
          return n ? { n, rgb: [Math.round(r / n), Math.round(g / n), Math.round(b / n)] } : { n: 0 };
        };
        (window.__btStandInClothes || (window.__btStandInClothes = {}))[o.probe] = { legs: mean(clothes.legs), boots: mean(clothes.boots) };
      }
    } catch (e) { /* a probe never breaks a bake */ }
  }
  /* v2.3.4037: the patterns and the print, as the walking bake has them --
     pattern first, the print over it, then the shoes -- after the retint (a
     pattern is colour ON the fabric) and before the drawings, so the split
     bake's ink layer still holds only the drawings: these are the figure's,
     and its key carries them (effectsRenderer _standInColourKey). */
  if (pantsPaint || shoesPaint) _stampStandInGarb(d, w, h, clothesFW, pantsPaint, shoesPaint,
    pantsPat, shoesPat, pantsArt, !!(o.art && o.art.mirror), o.patK, o.probe);
  /* v2.3.2855: the drawings, AFTER the retint (so the ink is shaded by the skin
     it lands on, exactly as the body's stamp is) and confined to the pixels the
     retint just called the character's skin. */
  if (ink && !apart) _stampStandInInk(d, w, h, body, ink, o.regions);
  /* v2.3.3684: under greaves, his own legs go (_standInLegless) */
  if (clothes && o.legless) {
    const n = _standInLegless(d, w, h, clothes.legs, clothes.boots, label, keptId);
    try { cv.__btLegless = n; } catch (e) { /* a frozen canvas: no probe, no harm */ }
  }
  ctx.putImageData(imgData, 0, 0);
  if (!ink || !apart) return { cv, ink: null };
  /* v2.3.2856: apart -- stamp a copy of the finished figure, then keep only the
     pixels the stamp changed.  Everything else is cleared to transparent, so
     the layer crops down to the drawings themselves (_sliceStandIn). */
  const ic = document.createElement('canvas');
  ic.width = w; ic.height = h;
  const ictx = ic.getContext('2d');
  const inkData = ictx.createImageData(w, h);
  const e = inkData.data;
  e.set(d);
  _stampStandInInk(e, w, h, body, ink, o.regions);
  let changed = 0;
  for (let i = 0; i < e.length; i += 4) {
    if (e[i] === d[i] && e[i + 1] === d[i + 1] && e[i + 2] === d[i + 2] && e[i + 3] === d[i + 3]) {
      e[i] = 0; e[i + 1] = 0; e[i + 2] = 0; e[i + 3] = 0;
    } else changed++;
  }
  if (!changed) { ic.width = 0; ic.height = 0; return { cv, ink: null }; }
  ictx.putImageData(inkData, 0, 0);
  return { cv, ink: ic };
}

/* ═══ v2.3.3684: THE FIRE-LIGHTER'S LEGS: THE FIRE'S GLOW, AND NONE UNDER GREAVES ═══
   The owner, 2026-10-27: "also remove pants (olive green) those should not be
   showing frame 6 is particularly bad - armor legs need to shift leftward".
   Two faults of the fire-lighter's strip, each an option of the bake above
   (_bakeFireSplit passes them; no other figure does):
   - `glowLegs`: frames 6 and 7 are painted lit by the fire (its flame is the
     game's own since v2.3.3666, the glow on him stayed), and the trousers on
     the lit side are orange-olive.  Neither test takes them -- not the
     trousers' (too warm, even `pantsWide`'s), not the skin's (a piece too
     small to be his) -- so they kept the art's colours in any trousers: the
     olive patch at his hip on frame 6 (1,133 art px) and down his left leg on
     frame 7 (2,644).  Every warm pixel the skin rule leaves (a piece of skin
     colour that is not the figure's) lying within GLOW_LEG_REACH of the
     trousers is trousers.
   - `legless`: the greaves are a picture of their own, drawn over the body at
     FIRE_GEAR_REG's places, and his body kneels its own way, so the trousers
     and boots showed beside them on every kneeling frame (frame 2's thigh
     between the plate and the greaves, 1,214 art px; the hip on frame 6; the
     back boot on frames 4 and 5).  Under greaves the body is baked without
     them, as the cook and the lumberjack have legless strips drawn: the
     greaves are his legs.  The trousers and boots go; then their outline, up
     to LEGLESS_RINGS rings of the dark or soft pixels round what went (never
     his skin's own edge, nor the log's: its key padded by LEGLESS_LOG_PAD);
     then any speck of LEGLESS_ISLAND px or less those leave behind.
   Measured on the eight frames (tools: a copy of these rules over the strip):
   nothing of the trousers or boots is left, his hands on the log and the log
   whole.  Returns how many pixels went. */
const GLOW_LEG_REACH = 3;
const LEGLESS_RINGS = 8, LEGLESS_DARK = 90, LEGLESS_SOFT = 200, LEGLESS_LOG_PAD = 6;
const LEGLESS_ISLAND = 40, LEGLESS_ISLAND_REACH = 4;
/* a 0/1 mask grown by `r` px every way (a square), in two passes */
function _maskGrow(src, w, h, r) {
  const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let c = 0;
    for (let x = 0; x < Math.min(w, r); x++) c += src[row + x];
    for (let x = 0; x < w; x++) {
      if (x + r < w) c += src[row + x + r];
      if (x - r - 1 >= 0) c -= src[row + x - r - 1];
      tmp[row + x] = c > 0 ? 1 : 0;
    }
  }
  for (let x = 0; x < w; x++) {
    let c = 0;
    for (let y = 0; y < Math.min(h, r); y++) c += tmp[y * w + x];
    for (let y = 0; y < h; y++) {
      if (y + r < h) c += tmp[(y + r) * w + x];
      if (y - r - 1 >= 0) c -= tmp[(y - r - 1) * w + x];
      out[y * w + x] = c > 0 ? 1 : 0;
    }
  }
  return out;
}
function _standInGlowLegs(d, w, h, fw, legs, label, keptId) {
  const n = w * h;
  const orphan = new Uint8Array(n);
  let any = 0;
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    if (legs[p] || !_isSkin(d[i], d[i + 1], d[i + 2], d[i + 3])) continue;
    const id = label[p];
    if (id && keptId[id]) continue;
    orphan[p] = 1; any++;
  }
  if (!any) return 0;
  const near = _maskGrow(legs, w, h, GLOW_LEG_REACH);
  const seen = new Uint8Array(n), stack = new Int32Array(n);
  let added = 0;
  for (let p0 = 0; p0 < n; p0++) {
    if (!orphan[p0] || seen[p0]) continue;
    const x0 = Math.floor((p0 % w) / fw) * fw, x1 = Math.min(w, x0 + fw);
    let sp = 0, k = 0, hit = false;
    stack[sp++] = p0; seen[p0] = 1;
    while (k < sp) {
      const q = stack[k++];
      if (near[q]) hit = true;
      const qx = q % w, qy = (q - qx) / w;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = qx + dx, ny = qy + dy;
          if ((!dx && !dy) || nx < x0 || nx >= x1 || ny < 0 || ny >= h) continue;
          const nq = ny * w + nx;
          if (orphan[nq] && !seen[nq]) { seen[nq] = 1; stack[sp++] = nq; }
        }
      }
    }
    if (hit) { for (let j = 0; j < sp; j++) legs[stack[j]] = 1; added += sp; }
  }
  return added;
}
function _standInLegless(d, w, h, legs, boots, label, keptId) {
  const n = w * h;
  const went = new Uint8Array(n);
  let gone = 0, top = h, bot = -1;
  for (let p = 0; p < n; p++) {
    if (!(legs[p] || boots[p]) || !d[p * 4 + 3]) continue;
    d[p * 4 + 3] = 0; went[p] = 1; gone++;
    const y = (p / w) | 0;
    if (y < top) top = y;
    if (y > bot) bot = y;
  }
  if (!gone) return 0;
  const kept = new Uint8Array(n), key = new Uint8Array(n);
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const id = label[p];
    if (id && keptId[id]) kept[p] = 1;
    if (d[i + 3] > 100 && d[i] > 150 && d[i + 1] < 90 && d[i + 2] > 40 && d[i] - d[i + 1] > 120) key[p] = 1;   /* the log's magenta key */
  }
  const nearSkin = _maskGrow(kept, w, h, 1), log = _maskGrow(key, w, h, LEGLESS_LOG_PAD);
  /* the outline: a ring at a time, a dark or soft pixel beside one that went */
  const y0 = Math.max(1, top - LEGLESS_RINGS), y1 = Math.min(h - 2, bot + LEGLESS_RINGS);
  for (let ring = 0; ring < LEGLESS_RINGS; ring++) {
    const now = [];
    for (let y = y0; y <= y1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x, i = p * 4;
        if (went[p] || !d[i + 3] || kept[p] || nearSkin[p] || log[p]) continue;
        if (!(went[p - 1] || went[p + 1] || went[p - w] || went[p + w])) continue;
        if (d[i + 3] < LEGLESS_SOFT || 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] < LEGLESS_DARK) now.push(p);
      }
    }
    if (!now.length) break;
    for (const p of now) { d[p * 4 + 3] = 0; went[p] = 1; gone++; }
  }
  /* the specks they leave: a piece of LEGLESS_ISLAND px or less near what
     went, with none of his skin in it */
  const reach = _maskGrow(went, w, h, LEGLESS_ISLAND_REACH);
  const seen = new Uint8Array(n), stack = new Int32Array(n);
  for (let p0 = 0; p0 < n; p0++) {
    if (!reach[p0] || seen[p0] || went[p0] || !d[p0 * 4 + 3]) continue;
    let sp = 0, k = 0, skin = false;
    stack[sp++] = p0; seen[p0] = 1;
    while (k < sp) {
      const q = stack[k++];
      if (kept[q]) skin = true;
      const qx = q % w, qy = (q - qx) / w;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = qx + dx, ny = qy + dy;
          if ((!dx && !dy) || nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const nq = ny * w + nx;
          if (!seen[nq] && !went[nq] && d[nq * 4 + 3]) { seen[nq] = 1; stack[sp++] = nq; }
        }
      }
    }
    if (skin || sp > LEGLESS_ISLAND) continue;
    for (let j = 0; j < sp; j++) { d[stack[j] * 4 + 3] = 0; went[stack[j]] = 1; gone++; }
  }
  return gone;
}

/* ═══ v2.3.4037: THE TROUSER AND SHOE PATTERNS AND THE TROUSER PRINT ON A STAND-IN ═══
   The walking bake's three stamps (recolorBodyToCanvas, above), on the masks
   _standInBake measured: the trouser pattern and the print on the legs, the
   shoe pattern on the boots.  `k` scales the patterns' cells to the figure
   (standInGarb.js STANDIN_GARB_K); the print is fitted to each frame's legs
   (stampRegion), so it needs no scale.  With the QA probe armed (mp-farmanim,
   mp-gatherlook), how many pixels of each pattern's own colour the legs and
   the boots gained -- read off the baked pixels, after every stamp. */
function _stampStandInGarb(d, w, h, fw, legs, boots, pantsPat, shoesPat, pantsArt, mirror, k, probe) {
  const _probe = !!probe && typeof window !== 'undefined' && !!window.__btProbe;
  const count = (mask, pat) => {
    if (!mask || !pat) return 0;
    const R = parseInt(pat.color.slice(1, 3), 16), G = parseInt(pat.color.slice(3, 5), 16), B = parseInt(pat.color.slice(5, 7), 16);
    let n = 0;
    for (let p = 0, i = 0; p < w * h; p++, i += 4) if (mask[p] && d[i] === R && d[i + 1] === G && d[i + 2] === B) n++;
    return n;
  };
  const was = _probe ? { legs: count(legs, pantsPat), boots: count(boots, shoesPat) } : null;
  if (legs && pantsPat) stampPattern(d, w, h, fw, legs, pantsPat, mirror, undefined, k);
  /* the print's pixels: the legs' colours before it, to count what it changed */
  let before = null;
  if (_probe && legs && pantsArt) {
    before = new Uint32Array(w * h);
    for (let p = 0, i = 0; p < w * h; p++, i += 4) if (legs[p]) before[p] = ((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]) + 1;
  }
  if (legs && pantsArt) stampRegion(d, w, h, fw, legs, pantsArt, mirror, PANTS_BOX);
  if (boots && shoesPat) stampPattern(d, w, h, fw, boots, shoesPat, mirror, undefined, k);
  if (!_probe) return;
  try {
    let printed = 0;
    if (before) for (let p = 0, i = 0; p < w * h; p++, i += 4) if (before[p] && before[p] !== ((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]) + 1) printed++;
    const rec = (window.__btStandInClothes || (window.__btStandInClothes = {}))[probe] || (window.__btStandInClothes[probe] = {});
    rec.garb = {
      legs: pantsPat ? { color: pantsPat.color, px: count(legs, pantsPat) - was.legs } : null,
      boots: shoesPat ? { color: shoesPat.color, px: count(boots, shoesPat) - was.boots } : null,
      print: pantsArt ? { px: printed } : null, k: k || 1,
    };
  } catch (e) { /* a probe never breaks a bake */ }
}

/* ═══ v2.3.3146: A STAND-IN WEARS YOUR TROUSERS AND BOOTS ═══
   The owner: "The character's appearance changes during resource gathering
   activities.  It needs to stay consistent."  The lumberjack, the cook and the
   fire-lighter were baked with your skin and drawings and nothing else (the
   header above: "pants/shoes are left as painted -- nobody asked for those, and
   the pan is the thing they would break"), so a bro in blue trousers and red
   boots chopped, cooked and lit fires in the artist's olive and grey.  Now
   somebody has asked, and the pan is kept out of it by WHERE things are, not
   by their colour (which is the pan's trouble: its rim is boot-grey and bits of
   its contents pass the trouser test):
     - the TROUSERS are the trouser-test pixels in the frame's big pieces (4-
       connected, each at least STANDIN_LEG_SHARE of the biggest): a few px of
       the pan's contents are islands, the trousers are one or two big pieces.
       `wide` (the fire-lighter) widens the test for trousers in the fire's
       glow, which turns them too warm for the body's test (frames 4-7 left
       half a leg olive) -- never for a pixel the skin test takes;
     - the BOOTS are the boot-grey pieces (8-connected) lying, most of them,
       BELOW THE TROUSERS' HEM: each pixel judged against the lowest trouser
       pixel within STANDIN_TOE_SHARE of a frame either side of its column
       (a toe reaches past the leg on the lumberjack's stride), less
       STANDIN_HEM_SHARE of the frame's height for a boot's top -- the pan, held
       at the waist, and its rim are above it, so its piece goes whole.
   Measured on every played frame of the three strips (and fish-south, whose
   line this rule also leaves alone): trousers and boots whole, no pixel of the
   pan, the axe (its magenta key), the logs or the flame.  On the legless
   strips (greaves) the greaves cover the legs; what is left is retinted
   harmlessly or not found.  Per frame, as frames are separate figures.
   Returns { legs, boots }, masks over the strip. */
const STANDIN_LEG_SHARE = 0.25, STANDIN_TOE_SHARE = 1 / 8, STANDIN_HEM_SHARE = 1 / 16;
function _standInClothes(d, w, h, fw, wide) {
  const legs = new Uint8Array(w * h), boots = new Uint8Array(w * h);
  const cand = new Uint8Array(w * h);   /* 1 trouser candidate, 2 boot candidate */
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
    if (a <= 180 || _isSkin(r, g, b, a)) continue;
    if (_isPants(r, g, b, a) || (wide && g > b + 20 && g >= r - 45 && r < 215 && g < 200)) { cand[p] = 1; continue; }
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if ((mx - mn) < 28 && mx >= 45 && mx < 140) cand[p] = 2;
  }
  const lab = new Int32Array(w * h);
  const stack = new Int32Array(w * h);
  const toe = Math.max(2, Math.round(fw * STANDIN_TOE_SHARE)), tol = Math.round(h * STANDIN_HEM_SHARE);
  const frames = Math.max(1, Math.floor(w / fw));
  let next = 0;
  /* flood one piece of `kind` from `start`, within the frame [x0, x1); 8-way
     when `diag`.  Returns its pixels on the stack, [0, n). */
  const flood = (start, kind, x0, x1, diag, id) => {
    let sp = 0, n = 0;
    stack[sp++] = start; lab[start] = id;
    while (sp > n) {
      const q = stack[n++];
      const qx = q % w, qy = (q - qx) / w;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          if (!diag && dx && dy) continue;
          const nx = qx + dx, ny = qy + dy;
          if (nx < x0 || nx >= x1 || ny < 0 || ny >= h) continue;
          const nq = ny * w + nx;
          if (cand[nq] !== kind || lab[nq]) continue;
          lab[nq] = id;
          stack[sp++] = nq;
        }
      }
    }
    return n;
  };
  const hem = new Int32Array(fw), win = new Int32Array(fw);
  for (let f = 0; f < frames; f++) {
    const x0 = f * fw, x1 = Math.min(w, x0 + fw);
    /* the trousers: the big pieces */
    const pieces = [];
    for (let y = 0; y < h; y++) {
      for (let x = x0; x < x1; x++) {
        const p = y * w + x;
        if (cand[p] !== 1 || lab[p]) continue;
        const id = ++next;
        const n = flood(p, 1, x0, x1, false, id);
        pieces.push({ id, n, px: stack.slice(0, n) });
      }
    }
    let big = 0;
    for (const pc of pieces) if (pc.n > big) big = pc.n;
    hem.fill(-1);
    for (const pc of pieces) {
      if (pc.n < big * STANDIN_LEG_SHARE) continue;
      for (const q of pc.px) {
        legs[q] = 1;
        const cx = (q % w) - x0, cy = (q - (q % w)) / w;
        if (cy > hem[cx]) hem[cx] = cy;
      }
    }
    /* the deepest hem within a toe of each column */
    for (let c = 0; c < x1 - x0; c++) {
      let m = -1;
      for (let k = Math.max(0, c - toe); k <= Math.min(x1 - x0 - 1, c + toe); k++) if (hem[k] > m) m = hem[k];
      win[c] = m;
    }
    /* the boots: grey pieces lying, most of them, below the hem */
    for (let y = 0; y < h; y++) {
      for (let x = x0; x < x1; x++) {
        const p = y * w + x;
        if (cand[p] !== 2 || lab[p]) continue;
        const n = flood(p, 2, x0, x1, true, ++next);
        let ok = 0;
        for (let k = 0; k < n; k++) {
          const q = stack[k], cx = (q % w) - x0, cy = (q - (q % w)) / w;
          if (win[cx] >= 0 && cy >= win[cx] - tol) ok++;
        }
        if (ok * 2 >= n) for (let k = 0; k < n; k++) boots[stack[k]] = 1;
      }
    }
  }
  return { legs, boots };
}

/* v2.3.2855: face, torso and arm drawings on a stand-in, from its hand-fitted
   regions -- see standInInk.js for the table and splitSkinBySeeds for the split.
   `art.mirror` is honoured as the body honours it: the drawing is read flipped,
   for a figure the renderer will flip back. */
function _stampStandInInk(d, w, h, body, art, R) {
  /* A table fitted to another size of art would put the ink somewhere else on
     the figure; no ink is the better failure (see standInInk.js). */
  if (!R || R.fh !== h || !R.fw || w % R.fw !== 0) return;
  const reg = splitSkinBySeeds(body, w, h, R.fw, R.seeds);
  /* v2.3.3439: `armCuts[f]`, [x, top, bottom] columns of frame f taken out of
     the arms before each arm is measured: on the farmer's strike both hands
     hold the hoe, so his two arms were one piece of skin and one arm drawing
     was fitted over both and the gap between them (src/data/farmAnims.js,
     made by tools/make_farm_anims.py _arm_cuts).  A pixel's width of the hands
     goes without ink. */
  if (R.armCuts) {
    for (let f = 0; f < R.armCuts.length; f++) {
      for (const c of (R.armCuts[f] || [])) {
        const x = f * R.fw + c[0];
        if (c[0] < 0 || c[0] >= R.fw || x >= w) continue;
        for (let y = Math.max(0, c[1]); y <= Math.min(h - 1, c[2]); y++) reg.arms[y * w + x] = 0;
      }
    }
  }
  const m = !!art.mirror;
  if (artHasInk(art.tattooFace)) {
    stampRegion(d, w, h, R.fw, reg.face, art.tattooFace, m, FACE_BOX, { underSkin: true, boxes: R.face });
  }
  if (artHasInk(art.tattoo)) {
    stampRegion(d, w, h, R.fw, reg.torso, art.tattoo, m, TATTOO_BOX, { underSkin: true, boxes: R.torso });
  }
  if (artHasInk(art.tattooArm)) {
    stampRegion(d, w, h, R.fw, reg.arms, art.tattooArm, m, ARM_BOX, { eachPiece: true, underSkin: true, pieceKeep: R.pieceKeep });   /* v2.3.2856: pieceKeep */
  }
}


/* ═══ v2.3.4930: ONE BODY SHEET'S BAKE, WHEREVER IT RUNS ═══
   playerSkins.js buildBodySheet's own steps, moved here verbatim: the
   recolour (with its notes) and the fishing rod's pine.  The page runs them
   (buildBodySheet) and so does the body bake's worker (bodyBakeWorker.js),
   so the two cannot drift.  `j`: { pose, dir, skinT, pantsT, shoesT, shirtT,
   eyeT, eyeRects (eyeMask.json's for the sheet), art (already for the
   facing), eyeBlank (the boxes, or null) }. */
export function bakeBodyFull(img, j) {
  const { pose, dir, skinT, pantsT, shoesT, shirtT, eyeT, eyeRects, art, eyeBlank } = j;
  const full = recolorBodyToCanvas(img, skinT, pantsT, shoesT, shirtT, FRAME_H,
    /* ═══ v2.3.2470: STEADY THE DRAWING, BUT ONLY ACROSS A JOG ═══
       The correction is right exactly where the torso HOLDS ITS SHAPE and only
       the arms move across it, which is the run cycle -- and that is all three
       of the owner's reports (south flicker, east and northeast spill).
       Every other multi-frame pose genuinely reshapes the chest: a dodge rolls
       it away, a hit doubles it over, a pickup and a mine bend it right down.
       Their frames are honest outliers of each other, so correcting them
       against a median costs ink instead of steadying it -- measured twice,
       each time by a suite that already owned the claim: mp-standinart's
       thinnest gain fell 72 -> 0 on the sword swing, and mp-facetat's chest
       coverage fell 0.88/0.958 -> 0.248/0 on dodge-east.
       So the line is the pose, and it is drawn here rather than inside
       stampRegion because this is the only place that knows which pose is
       being baked. */
    eyeT, eyeRects, art, undefined, pose === 'jog',
    eyeBlank || null,   /* v2.3.2643 */
    pose === 'fish',   /* v2.3.3146: the line is boot-grey (recolorBodyToCanvas) */
    null, false,
    pose === 'mine');   /* v2.3.3671: the pickaxe keeps its wood */
  /* v2.3.2761: the fishing rod's pine, AFTER the skin pass -- pine is the
     skin's hue family, so recolouring before it would hand the rod to the
     skin retint.  See toolRecolor.js.
     v2.3.2854: ...and only where the FILE has the key.  Fishing bakes carry
     the drawings now (getFishFrame), and the key test is a hue window a pink
     tattoo sits inside (#d76ba8 is hue 326): recoloured by that test alone,
     a player's pink ink turned to pine wood for as long as he fished --
     caught by mp-cosmpose's pink "fish" check the moment the two met. */
  if (pose === 'fish') recolorToolKeyCanvas(full, TOOL_SPECS.rod, 1, fileKeyMask(img, full.width, full.height));
  return full;
}
/* v2.3.2854: the tool key as the SHEET FILE has it, at the bake's own size --
   read before anything is painted, so a drawing in the key's hue cannot pass
   for the tool (see the fish recolour in buildBodySheet). */
export function fileKeyMask(img, w, h) {
  const src = upscaleToFrameHeight(img, FRAME_H);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0);
  return toolKeyMask(g.getImageData(0, 0, w, h).data, w, h);
}

/* ═══ v2.3.4930: ONE HEAD SHEET'S BAKE, WHEREVER IT RUNS ═══
   playerSkins.js _buildPickupHeadSheet's steps, moved here verbatim with
   their notes: the recolour (no garments: the caller passes the trousers and
   boots only with `?garmentspecks=0`), the face drawing, and the halving to
   the overlay's size.  The page runs them and so does the body bake's worker.
   `j`: { pose, skinT, pantsT, shoesT, eyeBlank (the boxes, or null), art,
   ds (playerSkins HEAD_DS) }.  Returns the halved canvas. */
export function bakeHeadFull(img, j) {
  const { pose, skinT, pantsT, shoesT, eyeBlank, art, ds } = j;
  const full = recolorBodyToCanvas(img, skinT, pantsT, shoesT, null, FRAME_H,
    undefined, undefined, undefined, undefined, undefined, eyeBlank || null,
    undefined, undefined, undefined, pose === 'mine');   /* v2.3.3671: the pickaxe keeps its wood */
  if (art && artHasInk(art.tattooFace)) stampHeadInk(full, img, art);   /* v2.3.2862 */
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(full.width / ds));
  cv.height = Math.max(1, Math.round(full.height / ds));
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = true;   // bilinear downscale -> clean small head
  ctx.drawImage(full, 0, 0, cv.width, cv.height);
  return cv;
}
/* The face drawing on one head sheet, confined to the head's own skin as the
   ORIGINAL art has it -- read before the retint, as recolorBodyToCanvas reads
   its masks -- and fitted to that head frame by frame, as the body fits it.
   splitSkinRegions cannot be used here: it places the face relative to the
   TORSO band ("no torso in this frame: place nothing"), and these sheets have
   no torso.  Every skin pixel on them is the head, down to wherever the
   painter cut the neck -- which is the region the body's face fit covers too
   (skin above the torso band's first row), so the drawing sits the same. */
export function stampHeadInk(full, img, a) {
  const w = full.width, h = full.height;
  const src = upscaleToFrameHeight(img, FRAME_H);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0);
  const od = g.getImageData(0, 0, w, h).data;
  const skin = new Uint8Array(w * h);
  for (let p = 0, i = 0; p < w * h; p++, i += 4) if (_isSkin(od[i], od[i + 1], od[i + 2], od[i + 3])) skin[p] = 1;
  const fctx = full.getContext('2d');
  const id = fctx.getImageData(0, 0, w, h);
  stampRegion(id.data, w, h, FRAME_W, skin, a.tattooFace, !!a.mirror, FACE_BOX, { underSkin: true });
  fctx.putImageData(id, 0, 0);
}
