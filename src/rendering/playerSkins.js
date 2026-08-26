/* Player BODY recolor + selection stores (skin tone, pants, shoes).
 *
 * The player sheets bundle three recolorable regions into one body sprite:
 *   - SKIN  : warm tan pixels (face, neck, arms, bare torso)
 *   - PANTS : green pixels
 *   - SHOES : flat gray boot pixels
 * The near-black outline and eyes are left alone.
 *
 * Each region is retinted by the SAME brightness-ratio method: a pixel keeps
 * its luminance ratio vs that region's lit reference, and the chosen color is
 * applied at that ratio, so lit areas land on the color and shadows stay
 * proportionally darker (same hue, relative shading).
 *
 * Recolor runs once per (skin, pants, shoes) combo on a canvas into a texture
 * manifest mirroring playerSprites' layout, cached by combo key.  Each player
 * (local + remote) has one combo, so the cache stays tiny.  getBodyFrame()
 * falls back to the default sheets while a combo bakes or when nothing is
 * recolored.
 */

import { Rectangle, Texture } from 'pixi.js';
import { getFrame, SPRITE_VERSION, stripDetachedComponents } from './playerSprites.js';
import { upscaleToFrameHeight, bakeDisplayCanvas, DISPLAY_DS } from './spriteScale.js'; /* v2.3.1108: normalize downscaled sheets to the 256px frame before recolour; v2.3.1120: downscale the final DISPLAY texture for VRAM; v2.3.1237: bakeDisplayCanvas smooths nearest-upscaled sheets at DISPLAY_DS=1 (jog-shimmer fix) */
import { loadWebpOrPng } from './webpImage.js'; /* v2.3.1122: prefer lossless WebP, fall back to PNG */
import { recolorEnabled } from './traits/recolorOptions.js';
import EYE_MASK from './eyeMask.json';                      /* v2.3.1928 */
import { getEyeColor, eyeColorTarget } from './traits/eyeColorCatalog.js';
/* v2.3.1940: drawn pants prints + skin tattoos.  Unlike the shirt (its own
   sprite, stamped in gearSheets) these live INSIDE the body sheet, because
   that is where the pants pixels and the bare skin actually are. */
import { getArt, artHasInk, artHash, onArtChange } from './traits/playerArt.js';
import { stampRegion, stampPattern, litFabricMask, regionFromFeet, splitSkinRegions, PANTS_LIT_MIN, SHOES_LIT_MIN, PANTS_MAX_UP, SHOES_MAX_UP, PANTS_BOX, TATTOO_BOX, FACE_BOX, ARM_BOX } from './playerDecal.js';
import { getPattern, parsePattern, patternKey, onPatternChange } from './traits/patternCatalog.js';   /* v2.3.1941 */

/* ── Catalogs ── `target` = the LIT color for that choice; null = native. */
/* v2.3.1513: seven more tones at the light end (owner: "more white tan and
   white tones").  The list was bottom-heavy -- one option above the default
   tan and five below it -- so every pale character came out the same shade.
   The additions fill the light half at even steps and give it some width as
   well as height: Alabaster and Porcelain are cool, Rosy is pink-cast, Ivory
   and Fair are warm, Sand and Honey close the gap down to Tan.

   Ordered by measured luminance rather than by eye, which moved two of them:
   Honey reads lighter than Tan (168 vs 151) because Tan is the more saturated
   orange, and Ivory lighter than Pale.  Sorting on the swatch hex would have
   put both in the wrong place.  Existing ids are
   untouched and keep their exact targets, because a saved appearance stores
   the id: renaming or re-tuning one would silently change a face someone
   already picked.

   Ceiling is deliberate.  _retint scales the chosen color by each pixel's own
   luminance over SKIN_REF, and the sheets' brightest skin pixel runs k=1.10,
   so any channel above 231 clips on the highlight rim.  Only Alabaster is
   knowingly over that line -- near-white skin having a blown-out highlight is
   what near-white skin looks like -- and the rest stay at or under it so their
   shading keeps its hue. */
export const SKIN_CATALOG = [
  { id: 'default',   name: 'Default',   swatch: '#cd864b', target: null },
  { id: 'alabaster', name: 'Alabaster', swatch: '#f9ece2', target: [249, 236, 226] },
  { id: 'porcelain', name: 'Porcelain', swatch: '#f5ddcd', target: [245, 221, 205] },
  { id: 'ivory',     name: 'Ivory',     swatch: '#f2dabc', target: [242, 218, 188] },
  { id: 'rosy',      name: 'Rosy',      swatch: '#f2c9b8', target: [242, 201, 184] },
  { id: 'pale',      name: 'Pale',      swatch: '#f0cdaa', target: [240, 205, 170] },
  { id: 'fair',      name: 'Fair',      swatch: '#e6c29b', target: [230, 194, 155] },
  { id: 'sand',      name: 'Sand',      swatch: '#d9b184', target: [217, 177, 132] },
  { id: 'honey',     name: 'Honey',     swatch: '#c9a271', target: [201, 162, 113] },
  { id: 'tan',       name: 'Tan',       swatch: '#c88c50', target: [200, 140, 80] },
  { id: 'olive',     name: 'Olive',     swatch: '#b18a5e', target: [178, 138, 94] },
  { id: 'brown',     name: 'Brown',     swatch: '#9b6941', target: [155, 105, 65] },
  { id: 'deep',      name: 'Deep',      swatch: '#6e4b32', target: [112, 76, 50] },
  { id: 'ebony',     name: 'Ebony',     swatch: '#50382a', target: [82, 56, 39] },
];

export const PANTS_CATALOG = [
  { id: 'default', name: 'Default', swatch: '#6a7a45', target: null },
  { id: 'black',   name: 'Black',   swatch: '#2c2c30', target: [46, 46, 52] },
  { id: 'gray',    name: 'Gray',    swatch: '#8a8a92', target: [140, 140, 148] },
  { id: 'white',   name: 'White',   swatch: '#e6e6ec', target: [224, 224, 230] },
  { id: 'brown',   name: 'Brown',   swatch: '#7a5230', target: [120, 80, 50] },
  { id: 'red',     name: 'Red',     swatch: '#b5402a', target: [185, 58, 46] },
  { id: 'orange',  name: 'Orange',  swatch: '#d97a1f', target: [212, 120, 42] },
  { id: 'yellow',  name: 'Yellow',  swatch: '#d9b53a', target: [216, 190, 72] },
  { id: 'green',   name: 'Green',   swatch: '#3a9a52', target: [70, 160, 84] },
  { id: 'teal',    name: 'Teal',    swatch: '#2aa9a0', target: [52, 172, 162] },
  { id: 'blue',    name: 'Blue',    swatch: '#3a5bd0', target: [72, 100, 200] },
  { id: 'navy',    name: 'Navy',    swatch: '#2a3470', target: [46, 56, 120] },
  { id: 'purple',  name: 'Purple',  swatch: '#7c4bd0', target: [126, 78, 200] },
  { id: 'pink',    name: 'Pink',    swatch: '#d05a9a', target: [214, 112, 168] },
];

export const SHOES_CATALOG = [
  { id: 'default', name: 'Default', swatch: '#5a5a5a', target: null },
  { id: 'black',   name: 'Black',   swatch: '#2a2a2e', target: [42, 42, 46] },
  { id: 'brown',   name: 'Brown',   swatch: '#7a5230', target: [116, 76, 48] },
  { id: 'tan',     name: 'Tan',     swatch: '#bfa06a', target: [190, 160, 110] },
  { id: 'white',   name: 'White',   swatch: '#e6e6ec', target: [222, 222, 228] },
  { id: 'gray',    name: 'Gray',    swatch: '#9a9a9e', target: [150, 150, 156] },
  { id: 'red',     name: 'Red',     swatch: '#b5402a', target: [182, 56, 44] },
  { id: 'blue',    name: 'Blue',    swatch: '#3a5bd0', target: [72, 98, 192] },
];

/* v2.3.1710 (owner: the cooking character "has the wrong skin color").  The
   catalog's 'default' entry carries `target: null`, which means "leave the art
   alone" — correct for the PLAYER sheets, because their skin IS this colour.
   The pre-drawn skill stand-ins are a different painting: measured, the cook's
   skin is a saturated #e88838 while the player body sheets are #cd864b.  So
   "default" has to be an explicit RGB for them, or the cook stays orange next to
   a tan avatar for every player who never touched the skin picker.  Receipt that
   this IS the art's own tan: luminance(205,134,75) = 148.6, i.e. SKIN_REF, so
   retinting a real player sheet to it is a no-op to within a rounding step. */
export const DEFAULT_SKIN_TARGET = [205, 134, 75];

function _target(catalog, id) {
  const e = catalog.find(c => c.id === id);
  return (e && e.target) || null;
}
/* v2.3.1494: every recolor funnels through these three, so gating here
   switches an option off everywhere at once -- local player, remote players,
   creator portrait -- and, crucially, for a selection ALREADY SAVED in
   localStorage.  Hiding a picker alone would leave old picks applying. */
export function skinTarget(id) { return recolorEnabled('skin') ? _target(SKIN_CATALOG, id) : null; }
export function pantsTarget(id) { return recolorEnabled('pants') ? _target(PANTS_CATALOG, id) : null; }
export function shoesTarget(id) { return recolorEnabled('shoes') ? _target(SHOES_CATALOG, id) : null; }

/* ── Selection stores (localStorage) ── */
function makeStore(key, defId) {
  let active = defId;
  try { const s = typeof localStorage !== 'undefined' && localStorage.getItem(key); if (s) active = s; } catch (e) { /* ignore */ }
  const listeners = new Set();
  return {
    get: () => active,
    set: (id) => {
      if (id === active) return;
      active = id;
      try { localStorage.setItem(key, id); } catch (e) { /* ignore */ }
      listeners.forEach(fn => { try { fn(id); } catch (e) { /* ignore */ } });
    },
    on: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
const _skinStore = makeStore('bt-skin', 'default');
const _pantsStore = makeStore('bt-pants', 'default');
const _shoesStore = makeStore('bt-shoes', 'default');

export const getSkin = _skinStore.get,  setSkin = _skinStore.set,  onSkinChange = _skinStore.on;
export const getPants = _pantsStore.get, setPants = _pantsStore.set, onPantsChange = _pantsStore.on;
export const getShoes = _shoesStore.get, setShoes = _shoesStore.set, onShoesChange = _shoesStore.on;

/* ── Recolor pipeline ── */
const FRAME_W = 256;
const FRAME_H = 256;
const SKIN_REF = 149;   // lit luminance of each region (measured from the sheets)
const PANTS_REF = 112;
const SHOES_REF = 75;
const SOURCE_DIRS = ['east', 'north', 'northeast', 'south', 'southwest'];
/* The three base dirs the renderer also shows FLIPPED (east->west,
   northeast->northwest, southwest->southeast).  Only matters to drawings, which
   have a handedness the shipped art does not. */
const MIRRORED_SOURCE_DIRS = ['east', 'northeast', 'southwest'];
const POSES = ['stand', 'jog', 'hit', 'pickup', 'attack'];

/* v2.3.407: recolor LAZILY, one sheet at a time, keyed
   `${skin}/${pants}/${shoes}|${pose}/${dir}` -> [Texture] | 'loading'.  The
   old version baked all ~21 sheets up front the first time a custom-appearance
   player rendered -- a big synchronous canvas pass (each jog sheet is
   13056x256) that froze the main thread at spawn and left the 2D procedural
   fallback on screen.  Now only the (pose,dir) actually drawn gets recolored,
   on demand, so cost is spread and the freeze is gone. */
const _bodySheets = {};

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
function _isPants(r, g, b, a) { return a > 180 && g >= r - 10 && g > b + 8 && r < 150; }

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

/* `art` (v2.3.1940) is `{ pants, tattoo, mirror }` — the player's own drawings,
   or null/absent for everyone who has not drawn anything, which is the entire
   default path and costs nothing.  `mirror` pre-flips the drawing because three
   of the eight screen facings are drawn by flipping a base-dir sheet, so a
   drawing baked straight in would read backwards on those (owner, on the shirt:
   "Your smiley face rotated the opposite direction"). */
export function recolorBodyToCanvas(img, skinT, pantsT, shoesT, shirtT, targetH, eyeT, eyeRects, art) {
  /* v2.3.1108: when the caller knows this sheet's logical frame height, restore
     a downscaled-on-disk sheet to it (nearest-neighbour, exact palette) so the
     skin/pants/shoes pixel thresholds + frame math are unchanged. The attack
     stand-in strips have their OWN heights (227-320px), so the height is passed
     per-caller, not assumed 256. No-op for full-res / native art. */
  if (targetH) img = upscaleToFrameHeight(img, targetH);
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, cv.width, cv.height);
  const d = imgData.data;
  const w = cv.width, h = cv.height;
  const frames = Math.max(1, Math.floor(w / FRAME_W));
  const shirtPx = shirtT ? _torsoBands(d, w, h, FRAME_W, frames) : null;
  /* v2.3.1940: the two drawn regions.  Both masks are collected DURING the
     classification pass below, on the ORIGINAL pixels — after the retint a pale
     skin no longer passes _isSkin (alabaster is r-g=13, the test wants >25), so
     classifying afterwards would find no skin at all on exactly the players who
     picked a light tone.  Same reason _torsoBands runs up here. */
  const wantPantsArt = !!(art && artHasInk(art.pants));
  const wantTattoo = !!(art && artHasInk(art.tattoo));
  /* v2.3.1949: the face and the arms.  Both are derived from the SAME two masks
     the chest tattoo already needs (bare skin, and the torso band), so wanting
     one of them costs a second Uint8Array and no extra classification. */
  const wantFaceTat = !!(art && artHasInk(art.tattooFace));
  const wantArmTat = !!(art && artHasInk(art.tattooArm));
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
  /* A tattoo goes on the CHEST, so it is bare skin intersected with the torso
     band — the same tracker the baked shirt used, reused rather than re-guessed.
     (It also means the tattoo hides under a shirt or a breastplate, which is
     what a chest tattoo does.) */
  const anyTat = wantTattoo || wantFaceTat || wantArmTat;
  const torsoPx = anyTat ? (shirtPx || _torsoBands(d, w, h, FRAME_W, frames)) : null;
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
    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
    if (shirtPx && shirtPx[i >> 2]) {
      /* shirt skin -> flat fill (kills muscle shading); dark outline/seam
         pixels are never in shirtPx, so they stay and give the shirt its
         outline + arm definition. */
      d[i] = sf0; d[i + 1] = sf1; d[i + 2] = sf2;
    } else if (_isSkin(r, g, b, a)) {
      if (tattooPx && torsoPx[i >> 2]) tattooPx[i >> 2] = 1;
      if (skinPx) skinPx[i >> 2] = 1;              /* v2.3.1949 */
      if (skinT) _retint(d, i, skinT, SKIN_REF);
    } else if (a > 180 && g >= r - 10 && g > b + 8 && r < 150) {
      /* pants (green) */ if (pantsPx) pantsPx[i >> 2] = 1;
      if (pantsT) _retint(d, i, pantsT, PANTS_REF);
    } else if (a > 180) {
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if ((mx - mn) < 28 && mx >= 45 && mx < 140) {
        /* boots (flat gray) */ if (shoesPx) shoesPx[i >> 2] = 1;
        if (shoesT) _retint(d, i, shoesT, SHOES_REF);
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
    ? litFabricMask(base, regionFromFeet(d, pantsPx, w, h, FRAME_W, PANTS_MAX_UP), w * h, PANTS_LIT_MIN) : null;
  /* Pattern first, print over it: a print is ON the fabric, and the fabric is
     what the pattern is. */
  if (pantsPat) stampPattern(d, w, h, FRAME_W, pantsPaint, pantsPat, !!art.mirror);
  if (wantPantsArt) stampRegion(d, w, h, FRAME_W, pantsPaint, art.pants, !!art.mirror, PANTS_BOX);
  if (shoesPat) {
    stampPattern(d, w, h, FRAME_W,
      litFabricMask(base, regionFromFeet(d, shoesPx, w, h, FRAME_W, SHOES_MAX_UP), w * h, SHOES_LIT_MIN),
      shoesPat, !!art.mirror);
  }
  /* v2.3.1950: `underSkin` on all three -- ink sits UNDER skin, so it takes the
     body's shading and lets some skin through.  A shirt print does not: it is
     ink ON fabric, and stays opaque. */
  if (tattooPx) stampRegion(d, w, h, FRAME_W, tattooPx, art.tattoo, !!art.mirror, TATTOO_BOX, { underSkin: true });
  /* v2.3.1949: face and arms.  `eachPiece` for the arms only -- a figure has
     two of them and the largest-piece rule would ink whichever happens to be
     nearer the camera. */
  if (skinPx) {
    const reg = splitSkinRegions(skinPx, torsoPx, w, h, FRAME_W);
    if (wantFaceTat) stampRegion(d, w, h, FRAME_W, reg.face, art.tattooFace, !!art.mirror, FACE_BOX, { underSkin: true });
    if (wantArmTat) stampRegion(d, w, h, FRAME_W, reg.arms, art.tattooArm, !!art.mirror, ARM_BOX, { eachPiece: true, underSkin: true });
  }
  /* v2.3.1928: the iris last, so it overwrites rather than being classified.
     Its pixels are near-black and would otherwise fall through every branch
     above untouched, which is exactly why the eye needed its own mask. */
  if (eyeT && eyeRects) { _eyeT = eyeT; _paintEyes(d, cv.width, cv.height, eyeRects, FRAME_W); }
  ctx.putImageData(imgData, 0, 0);
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
  const o = opts || {};
  const minBlob = o.minBlob != null ? o.minBlob : STANDIN_MIN_BLOB;
  const maxBR = o.maxBR != null ? o.maxBR : Infinity;      /* blue/red ceiling — rejects the fire's pale glow */
  const minGR = o.minGR != null ? o.minGR : 0;             /* green/red floor — rejects the flame's red edge */
  const maxGR = o.maxGR != null ? o.maxGR : Infinity;
  if (targetH) img = upscaleToFrameHeight(img, targetH);
  const cv = document.createElement('canvas');
  cv.width = img.naturalWidth || img.width;
  cv.height = img.naturalHeight || img.height;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  if (!skinT) return cv;
  const w = cv.width, h = cv.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
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
  for (let start = 0; start < w * h; start++) {
    if (!skin[start] || label[start]) continue;
    const id = size.length;
    let sp = 0, n = 0;
    stack[sp++] = start; label[start] = id;
    while (sp > 0) {
      const q = stack[--sp];
      n++;
      const qx = q % w;
      if (qx > 0 && skin[q - 1] && !label[q - 1]) { label[q - 1] = id; stack[sp++] = q - 1; }
      if (qx < w - 1 && skin[q + 1] && !label[q + 1]) { label[q + 1] = id; stack[sp++] = q + 1; }
      if (q >= w && skin[q - w] && !label[q - w]) { label[q - w] = id; stack[sp++] = q - w; }
      if (q + w < w * h && skin[q + w] && !label[q + w]) { label[q + w] = id; stack[sp++] = q + w; }
    }
    size.push(n);
  }
  /* pass 3: retint the CHARACTER's skin; leave the small islands (props) */
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    if (label[p] && size[label[p]] >= minBlob) _retint(d, i, skinT, SKIN_REF);
  }
  ctx.putImageData(imgData, 0, 0);
  return cv;
}

/* v2.3.1122: load through the WebP-preferring helper (PNG fallback).  Used by
   buildBodySheet + _buildPickupHeadSheet, both of which feed recolorBodyToCanvas
   -- the WebP is LOSSLESS so the recolour's exact-RGB classification is intact. */
function loadImg(url) { return loadWebpOrPng(url); }

/* v2.3.1305: bounded retry on body-sheet load failure (mirrors
   gearSheets.buildSheet).  The recolored body carries the SHIRT bake
   (v2.3.497) plus skin/pants/shoes — a flaked request used to cache []
   permanently, so that facing silently fell back to the base sheet for
   the whole session (shirt gone / wrong colors on one angle only: part
   of the owner's "clothes missing depending on the angle" report).
   'loading' persists across the backoff so the base-sheet fallback
   keeps the player visible; &r=N bypasses a poisoned cache entry. */
const _BODY_RETRY_MS = [2000, 6000];
function buildBodySheet(sheetKey, pose, dir, skinT, pantsT, shoesT, shirtT, eyeT, art, attempt = 0) {
  _bodySheets[sheetKey] = 'loading';
  /* Returns an always-resolving promise so a full preload can await it. */
  const bust = attempt > 0 ? `&r=${attempt}` : '';
  return loadImg(`/sprites/player/${pose}-${dir}.png?v=${SPRITE_VERSION}${bust}`).then(img => {
    /* body poses are 256px frames; restore if stored smaller on disk.  Recolour
       runs at full 256 (exact skin/pants/shoes pixel thresholds). */
    const full = recolorBodyToCanvas(img, skinT, pantsT, shoesT, shirtT, FRAME_H,
      eyeT, EYE_MASK[`${pose}-${dir}`], art);
    /* v2.3.1120: count frames at full 256-space width, then downscale the DISPLAY
       texture to 256/DISPLAY_DS px (the figure shows ~100px on a phone).  Mipmaps
       off -- renders ~1:1 post-downscale, so the mip chain is wasted VRAM. */
    const frames = Math.max(1, Math.floor(full.width / FRAME_W));
    /* v2.3.1237: owner feedback — jog-shimmer at DISPLAY_DS=1: the recolour above
       ran on the exact-palette nearest upscale (required), so its output keeps
       the hard 2x stair-step edges when the sheet ships 128px on disk;
       bakeDisplayCanvas restores the anti-aliasing the DS=2 'high' downscale
       (v2.3.1121) used to give the FINAL display texture.  At DS>1 it defers to
       downscaleByFactor unchanged; native 256px sheets pass through sharp. */
    let cv = bakeDisplayCanvas(full, img.naturalHeight || img.height || 0);
    /* v2.3.1239: same jog-NE marker-scrub cleanup the base loader applies
       (playerSprites.stripDetachedComponents) -- the recolor only retints
       existing pixels, so the detached specks off the head crown survive into
       this custom-skin bake too; strip them here so a recolored player jogging
       NE/NW has no trailing outline either.  Topology-only (keep the largest
       opaque blob per frame) -> the recolored body + outline are untouched. */
    if (pose === 'jog' && dir === 'northeast') cv = stripDetachedComponents(cv, frames);
    const src = Texture.from(cv).source;
    src.scaleMode = 'linear';
    /* v2.3.1121: mipmaps ON -- the downscaled body still renders ~1.2x minified;
       without a mip chain the thin shoe outline crawled while JOGGING.  Cheap on
       the 4x-smaller texture. */
    src.autoGenerateMipmaps = true;
    const fw = Math.max(1, Math.round(FRAME_W / DISPLAY_DS));
    const fh = Math.max(1, Math.round(FRAME_H / DISPLAY_DS));
    const out = [];
    for (let i = 0; i < frames; i++) {
      out.push(new Texture({ source: src, frame: new Rectangle(i * fw, 0, fw, fh) }));
    }
    _bodySheets[sheetKey] = out;
  }).catch(() => {
    if (attempt < _BODY_RETRY_MS.length) {
      setTimeout(() => buildBodySheet(sheetKey, pose, dir, skinT, pantsT, shoesT, shirtT, eyeT, art, attempt + 1), _BODY_RETRY_MS[attempt]);
      return; /* stays 'loading' during the backoff */
    }
    _bodySheets[sheetKey] = []; /* missing -> caller falls back */
    try { if (window.__spriteLog) console.warn('[sprite] body sheet failed', sheetKey); } catch (e) { /* ignore */ }
  });
}

/** Recolored body frame for (skin, pants, shoes, pose, dir, frameIdx).  Falls
 *  back to the default sheets when nothing is recolored or while a sheet is
 *  still baking, so the player is never invisible.  Each (pose,dir) sheet is
 *  recolored lazily on first use.  Mirroring is handled by the caller. */
/* v2.3.1928: ONE place that spells the sheet key.  It grew an eye-colour
   segment and there are five prewarm sites besides getBodyFrame; a key built by
   hand in six places is a bug waiting for the sixth to be missed, and a
   prewarmed sheet under a key nobody asks for is silently wasted work. */
export function bodySheetKey(skinId, pantsId, shoesId, shirtT, shirtKey, eyeKey, pose, dir, art) {
  return (skinId || 'default') + '/' + (pantsId || 'default') + '/' + (shoesId || 'default')
    + '/' + (shirtT ? (shirtKey || 'shirt') : 'none') + '/' + (eyeKey || 'none')
    + bodyArtSeg(art)
    + '|' + pose + '/' + dir;
}
/* v2.3.1940: the drawings' contribution to the key, and DELIBERATELY EMPTY when
   nothing is drawn.  Every player who has not opened the designer keeps the
   exact key they had before this version, so their sheets are shared and
   prewarmed as they always were — only someone who actually drew something pays
   for the extra bakes (including the mirrored ones, which is why `mirror` is in
   here: a pre-flipped bake must not be handed to an unflipped facing). */
export function bodyArtSeg(art) {
  if (!art) return '';
  const p = artHasInk(art.pants) ? artHash(art.pants) : '';
  const t = artHasInk(art.tattoo) ? artHash(art.tattoo) : '';
  /* v2.3.1949: two more skin canvases join the key.  Anyone who has not drawn
     one keeps the exact key they had, so existing sheets stay shared. */
  const ft = artHasInk(art.tattooFace) ? artHash(art.tattooFace) : '';
  const at = artHasInk(art.tattooArm) ? artHash(art.tattooArm) : '';
  /* v2.3.1941: the trouser pattern joins the same segment.  It is already a
     short string ("stripe-v:3"), so it goes in whole rather than hashed. */
  const q = parsePattern(art.pantsPattern, 'pants') ? patternKey(art.pantsPattern, 'pants') : '';
  const f = parsePattern(art.shoesPattern, 'shoes') ? patternKey(art.shoesPattern, 'shoes') : '';   /* v2.3.1944 */
  if (!p && !t && !q && !f && !ft && !at) return '';
  /* '#' is the marker: no catalog id contains one, so _dropArtSheets can find
     every drawn bake by substring without matching e.g. '/default/'. */
  return '/#art' + p + '.' + t + '.' + q + '.' + f + '.' + ft + '.' + at + (art.mirror ? 'm' : 'n');
}
/** The local player's own drawings, in the shape the bake wants.  `mirror` is
 *  per-facing, so callers that know the facing pass it in. */
export function localBodyArt(mirror) {
  const p = getArt('pants'), t = getArt('tattoo');
  const ft = getArt('tattooFace'), at = getArt('tattooArm');   /* v2.3.1949 */
  const q = getPattern('pants'), f = getPattern('shoes');   /* v2.3.1944 */
  if (!artHasInk(p) && !artHasInk(t) && !artHasInk(ft) && !artHasInk(at)
    && !parsePattern(q, 'pants') && !parsePattern(f, 'shoes')) return null;
  return { pants: p, tattoo: t, tattooFace: ft, tattooArm: at,
    pantsPattern: q, shoesPattern: f, mirror: !!mirror };
}
/** The eye target for a sheet, or null when that sheet has no eyes in it.
 *  `eyeId` is always passed in -- see getBodyFrame. */
function eyeFor(pose, dir, eyeId) {
  if (!eyeId || !EYE_MASK[`${pose}-${dir}`]) return null;
  const t = eyeColorTarget(eyeId);
  return t ? { id: eyeId, t } : null;
}

/* v2.3.1930: `eyeId` IS AN ARGUMENT, and v2.3.1928 was wrong to make it a
   store read.  That version reasoned that every caller would otherwise have to
   learn about eye colour and they all draw the same character -- which was true
   only while the colour could not travel between players.  The moment it does,
   "the same character" is false: this function draws REMOTE players too, from
   their own skin/pants/shoes, and a store read would have painted every one of
   them with THIS device's eyes.
   Undefined means no eye recolour, deliberately, rather than defaulting to the
   local player: a call site that has not been updated then loses the effect,
   which is invisible, instead of putting your eyes on a stranger's face, which
   is a bug someone would have to reproduce to understand. */
export function getBodyFrame(skinId, pantsId, shoesId, pose, dir, frameIdx, shirtT, shirtKey, eyeId, art) {
  const skinT = skinTarget(skinId), pantsT = pantsTarget(pantsId), shoesT = shoesTarget(shoesId);
  const eye = eyeFor(pose, dir, eyeId);
  /* v2.3.1940: `art` is the ninth thing that can make this player's body differ
     from the shipped sheet, and like the rest of them it is PASSED IN, not read
     from a store — this function draws remote players too (v2.3.1930). */
  const _art = bodyArtSeg(art) ? art : null;
  if (!skinT && !pantsT && !shoesT && !shirtT && !eye && !_art) return getFrame(pose, dir, frameIdx);
  const sheetKey = bodySheetKey(skinId, pantsId, shoesId, shirtT, shirtKey, eye && eye.id, pose, dir, _art);
  const entry = _bodySheets[sheetKey];
  if (entry === undefined) { buildBodySheet(sheetKey, pose, dir, skinT, pantsT, shoesT, shirtT, eye && eye.t, _art); return getFrame(pose, dir, frameIdx); }
  if (entry === 'loading' || !entry.length) return getFrame(pose, dir, frameIdx);
  return entry[((frameIdx % entry.length) + entry.length) % entry.length];
}

/* v2.3.1116: loot-pickup HEAD overlay, RECOLORED.  pickup-<dir>-head.png holds
   the head pixels per frame (transparent elsewhere); entityRenderer draws it
   ABOVE the gear so an armoured player's deep-crouch head isn't clipped to a
   sliver.  It used to be loaded RAW and drawn untinted, so the head/face always
   showed the DEFAULT tan skin while the recolored body below wore the chosen
   skin -- the head "reverted" to default on every pickup, for armoured AND
   bare players.  Recolor it through the SAME pipeline as the body so the head
   matches exactly.  The sheet ships full-res 256px, so recolorBodyToCanvas's
   upscale is a no-op; only skin (and any pants/shoes) pixels exist in the head
   region, so the body's skin retint lands and nothing else shifts.  Cached per
   (skin/pants/shoes) combo + (pose,dir) so local and remote players -- who may
   wear different skins -- don't collide.  The default combo recolors to an
   unchanged copy (every _retint is gated on a non-null target), matching the
   old raw behaviour. */
const _pickupHeadSheets = {};   // 'skin/pants/shoes|pose-dir' -> [Texture] | 'loading' | []
/* v2.3.1117: head overlay is downscaled HEAD_DS x before it becomes a texture.
   It only ever renders at the small pickup-pose scale, so a full 7424x256 source
   (~7.6MB GPU + mipmaps) was wildly oversized -- a big contributor to iPhone
   Safari losing the WebGL context after several armoured pickups.  At /2 it is
   ~1.9MB, and the caller (entityRenderer._placePickupHead) reads the frame size
   back off the texture and scales up to match the 256px body, so alignment is
   automatic and HEAD_DS can change here without touching the renderer.  Recolor
   still runs at full 256px (recolorBodyToCanvas upscales for stable pixel
   thresholds); only the FINAL display texture is shrunk. */
const HEAD_DS = 2;
function _pickupHeadCap() {
  /* Bound the cache: a player who changes skin/pants/shoes mid-session would
     otherwise accumulate one head sheet per combo forever.  Evict the oldest
     (insertion order) baked entry; destroy its source on a 30s delay so an
     in-use texture is never killed mid-frame (same guard as _maskedBodyCache). */
  const keys = Object.keys(_pickupHeadSheets);
  if (keys.length <= 32) return; /* v2.3.1382: 12 -> 20 — jog heads are 5/combo, and
     town scenes with a few armored remotes crossed 12 quickly.
     v2.3.1479: 20 -> 32 — the local combo alone now holds 11 (4 jog + 5 hit +
     pickup + mine), so 20 left too little headroom before remotes started
     evicting.  The local-combo guard below already protects the player's own
     sheets; this keeps a few remotes from thrashing each other. */
  /* v2.3.1382 (owner: "head fully missing on north jog"): NEVER evict the
     LOCAL player's current combo — those are the oldest entries (preloaded
     at the loading screen), so the old oldest-first rule destroyed exactly
     the sheets on screen; the head then vanished until a rebuild+re-evict
     thrash cycle. */
  const _localPrefix = (_skinStore.get() || 'default') + '/' + (_pantsStore.get() || 'default') + '/' + (_shoesStore.get() || 'default') + '|';
  for (const k of keys) {
    if (k.startsWith(_localPrefix)) continue;
    const e = _pickupHeadSheets[k];
    if (!Array.isArray(e) || !e.length) continue;   // skip 'loading'/empty
    delete _pickupHeadSheets[k];
    const src = e[0] && e[0].source;
    if (src) setTimeout(() => { try { src.destroy(); } catch (err) { /* ignore */ } }, 30000);
    break;
  }
}
function _buildPickupHeadSheet(key, pose, dir, skinT, pantsT, shoesT, attempt = 0) {
  _pickupHeadSheets[key] = 'loading';
  /* v2.3.1381: bounded retry (v2.3.1305 pattern) — a flaked head-sheet
     fetch used to cache [] permanently, leaving the fullset knight
     headless for that dir all session.  Missing dirs still settle to []
     after the retries (pickup ships south-only by design). */
  const _bust = attempt > 0 ? `&r=${attempt}` : '';
  return loadImg(`/sprites/player/${pose}-${dir}-head.png?v=${SPRITE_VERSION}${_bust}`).then(img => {
    const full = recolorBodyToCanvas(img, skinT, pantsT, shoesT, null, FRAME_H);
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(full.width / HEAD_DS));
    cv.height = Math.max(1, Math.round(full.height / HEAD_DS));
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = true;   // bilinear downscale -> clean small head
    ctx.drawImage(full, 0, 0, cv.width, cv.height);
    const src = Texture.from(cv).source;
    src.scaleMode = 'linear';
    src.autoGenerateMipmaps = false;    // single render scale -> mipmaps are wasted VRAM
    const fw = Math.max(1, Math.round(FRAME_W / HEAD_DS)), fh = Math.max(1, Math.round(FRAME_H / HEAD_DS));
    const frames = Math.max(1, Math.floor(cv.width / fw));
    const out = [];
    for (let i = 0; i < frames; i++) {
      out.push(new Texture({ source: src, frame: new Rectangle(i * fw, 0, fw, fh) }));
    }
    _pickupHeadSheets[key] = out;
    _pickupHeadCap();
  }).catch(() => {
    if (attempt < 2) {
      /* v2.3.1398: the retry CHAINS into the returned promise, so the
         loading-screen gate (preloadJogHeadOverlays) waits through the
         backoff instead of passing while a flaked sheet is still
         re-fetching (owner: assets missing right after a deploy). */
      return new Promise((res) => setTimeout(res, [2000, 6000][attempt]))
        .then(() => _buildPickupHeadSheet(key, pose, dir, skinT, pantsT, shoesT, attempt + 1));
    }
    _pickupHeadSheets[key] = []; /* missing dir -> caller hides the overlay */
  });
}
/** Recolored loot-pickup head-overlay frame for (skin, pants, shoes, pose, dir,
 *  frameIdx).  Returns null outside the pickup pose, while the sheet bakes, or
 *  when no head sheet exists for that dir (only -south ships) -- the caller then
 *  leaves the body's own head showing. */
export function getPickupHeadFrame(skinId, pantsId, shoesId, pose, dir, frameIdx, phase) {
  /* v2.3.1368: + jog — the fullset armored figure (helmet erased from the
     sheet) gets the player's real head drawn above it, exactly like the
     pickup pose.  Only the fullset base dirs ship jog-<dir>-head.png;
     other dirs 404 -> [] -> null and nothing changes for them. */
  /* v2.3.1479: + hit / mine.  Both poses now ship armour, and gear draws
     ABOVE the body — measured on the v2.3.1477 sheets, the plate covered
     3-59 head px per hit frame and the masked bake ERASED 13-67 more on the
     frames whose recoil throws the head below its horizontal neck-restore
     band (owner: "the head ... disappears behind the armor due to AI drift").
     Drawing the head from its own sheet above the gear is the same cure the
     pickup crouch got in v2.3.1055. */
  if (pose !== 'pickup' && pose !== 'jog' && pose !== 'hit' && pose !== 'mine') return null;
  const skinT = skinTarget(skinId), pantsT = pantsTarget(pantsId), shoesT = shoesTarget(shoesId);
  const key = (skinId || 'default') + '/' + (pantsId || 'default') + '/' + (shoesId || 'default') + '|' + pose + '-' + dir;
  const entry = _pickupHeadSheets[key];
  if (entry === undefined) { _buildPickupHeadSheet(key, pose, dir, skinT, pantsT, shoesT); return null; }
  if (entry === 'loading' || !entry.length) return null;
  /* v2.3.1389: jog callers pass the cycle `phase` (0..1) — the SAME clock
     getGearFramePhased plays the fullset armor with, so a head sheet whose
     native frame count differs from the body's (east: 25 vs 28) stays
     frame-locked to the armor instead of bobbing on the body's cadence
     (owner: "the head doesn't bob with the armor").  Same-count dirs
     resolve identically either way. */
  if (phase != null && pose === 'jog') {
    const p = ((phase % 1) + 1) % 1;
    return entry[Math.min(entry.length - 1, Math.floor(p * entry.length))];
  }
  return entry[((frameIdx % entry.length) + entry.length) % entry.length];
}

/* Pre-warm the local player's recolored body sheets so the correct skin is
   baked BEFORE the player first renders -- otherwise getBodyFrame falls back
   to the default (un-recolored) frame for the first frame(s) while the async
   recolor runs, which shows as a brief default-skin flicker on spawn.  Bakes
   the 'stand' pose (the spawn pose) for all base dirs of the current combo.
   Fires on module load (a returning player's stored combo) and whenever the
   login picker changes skin/pants/shoes -- both give plenty of lead time
   before the player presses Play and spawns. */
export function prewarmBody(skinId, pantsId, shoesId, shirtT, shirtKey) {
  const skinT = skinTarget(skinId), pantsT = pantsTarget(pantsId), shoesT = shoesTarget(shoesId);
  const anyEye = !!eyeColorTarget(getEyeColor());
  const art = localBodyArt(false);   /* v2.3.1940 */
  if (!skinT && !pantsT && !shoesT && !shirtT && !anyEye && !art) return; /* default combo: nothing to bake */
  for (const dir of SOURCE_DIRS) {
    const eye = eyeFor('stand', dir, getEyeColor());   /* local player */
    const key = bodySheetKey(skinId, pantsId, shoesId, shirtT, shirtKey, eye && eye.id, 'stand', dir, art);
    if (_bodySheets[key] === undefined) buildBodySheet(key, 'stand', dir, skinT, pantsT, shoesT, shirtT, eye && eye.t, art);
  }
}
/** Preload the recolored body for the current combo across all base dirs for
 *  stand + jog, so an UNARMOURED player (or any moment the body shows) never
 *  flashes the default-skin frame when first turning/jogging in a direction.
 *  Resolves immediately for the default combo (base sheets are used as-is).
 *  v2.3.1118: stand + jog (all dirs) + the south-only pickup body & head overlay.
 *  Mine stays lazy -- see the notes inside for why pickup/head are cheap to
 *  prewarm now but mine and the full-res head were not. */
export function preloadBodyAll() {
  /* v2.3.756: baked shirt retired -- the body always bakes SHIRTLESS (the
     layered shirt is a separate tinted gear sprite).  The shirt machinery
     below (_torsoBands etc.) is dormant: no caller passes shirtT anymore. */
  const skinId = _skinStore.get(), pantsId = _pantsStore.get(), shoesId = _shoesStore.get();
  const skinT = skinTarget(skinId), pantsT = pantsTarget(pantsId), shoesT = shoesTarget(shoesId);
  const anyEye = !!eyeColorTarget(getEyeColor());
  const art = localBodyArt(false), artM = localBodyArt(true);   /* v2.3.1940 */
  if (!skinT && !pantsT && !shoesT && !anyEye && !art) return Promise.resolve(); /* default combo */
  const tasks = [];
  const bake = (pose, dir, a) => {
    const eye = eyeFor(pose, dir, getEyeColor());   /* local player */
    const key = bodySheetKey(skinId, pantsId, shoesId, null, null, eye && eye.id, pose, dir, a);
    if (_bodySheets[key] === undefined) tasks.push(buildBodySheet(key, pose, dir, skinT, pantsT, shoesT, null, eye && eye.t, a));
  };
  /* v2.3.1940: a drawn player needs the MIRRORED bake of the three flippable
     facings too (west/northwest/southeast are drawn by flipping east/northeast/
     southwest), or the first time they turn that way the drawing would pop in a
     frame late — animation-preload law, CLAUDE.md.  Undrawn players get exactly
     one bake per facing as before, because artM is null for them. */
  const prewarm = (pose, dir) => {
    bake(pose, dir, art);
    if (artM && MIRRORED_SOURCE_DIRS.indexOf(dir) !== -1) bake(pose, dir, artM);
  };
  /* v2.3.1477: + 'hit'.  The recoil sheets used to bake on the FIRST HIT
     TAKEN -- a 1536x256 recolour on the spot, right as a monster connects.
     It went unnoticed while the pose had no armour (there was nothing to see
     but a flicker); now that hit-<dir> gear ships, the same frame also wants
     a masked-body bake, so it is preloaded behind the intro like the rest. */
  for (const pose of ['stand', 'jog', 'hit']) {
    for (const dir of SOURCE_DIRS) prewarm(pose, dir);
  }
  /* v2.3.1118: prewarm the pickup BODY + (downscaled) HEAD behind the intro, so
     the first armoured loot pickup doesn't hitch while they bake mid-play (the
     v2.3.1117 lazy bake traded the spawn cost for an in-play frame-rate dip on
     the first few pickups).  This is safe now: it does NOT raise the post-pickup
     memory PEAK -- those sheets bake on first use anyway, so prewarming only
     moves the one-time bake earlier, it doesn't add anything resident that lazy
     baking wouldn't.  The actual VRAM fix that stopped the iOS context loss was
     shrinking the head (v2.3.1117) and dropping the mine sheet -- and MINE stays
     lazy here (irrelevant to looting, pure VRAM waste otherwise). */
  prewarm('pickup', 'south');
  /* v2.3.1478: MINE is no longer lazy either.  The note above was written when
     the pickaxe swing had no armour to draw -- now that mine-south ships gear
     sheets, its first use pays a body recolour AND 14 masked bakes at the
     moment the player starts a gather.  The sheet is 1792x128 on disk, so at
     DISPLAY_DS=2 this is a few hundred KB. */
  prewarm('mine', 'south');
  const headKey = (skinId || 'default') + '/' + (pantsId || 'default') + '/' + (shoesId || 'default') + '|pickup-south';
  if (_pickupHeadSheets[headKey] === undefined) tasks.push(_buildPickupHeadSheet(headKey, 'pickup', 'south', skinT, pantsT, shoesT));
  return Promise.all(tasks);
}

/** v2.3.1376: preload the JOG head-overlay sheets (jog-<dir>-head.png) for
 *  the current combo — the fullset knight figures draw the player's real
 *  head from these, and a lazy first build hitched the first armored jog in
 *  each direction (animation-preload law, CLAUDE.md v2.3.1358).  Unlike
 *  preloadBodyAll this runs for the DEFAULT combo too: the head sheets must
 *  fetch + bake regardless of recoloring. */
export function preloadJogHeadOverlays() {
  const skinId = _skinStore.get(), pantsId = _pantsStore.get(), shoesId = _shoesStore.get();
  const skinT = skinTarget(skinId), pantsT = pantsTarget(pantsId), shoesT = shoesTarget(shoesId);
  const tasks = [];
  const want = [['jog', 'south'], ['jog', 'southwest'], ['jog', 'north'], ['jog', 'east']];
  /* v2.3.1479: the hit-react (all five base dirs) and mining (south only)
     overlays ride the same gate — a lazy first build would drop the head for
     the first hit taken, which is exactly when it is being looked at. */
  for (const dir of ['south', 'southwest', 'east', 'northeast', 'north']) want.push(['hit', dir]);
  want.push(['mine', 'south']);
  for (const [pose, dir] of want) {
    const key = (skinId || 'default') + '/' + (pantsId || 'default') + '/' + (shoesId || 'default') + '|' + pose + '-' + dir;
    if (_pickupHeadSheets[key] === undefined) tasks.push(_buildPickupHeadSheet(key, pose, dir, skinT, pantsT, shoesT));
  }
  return Promise.all(tasks);
}

/** Preload the current combo's sheets for a SPECIFIC shirt variant (both
 *  poses, all dirs).  v2.3.698: armor on/off flips the shirt bake, and the
 *  first toggle paid a full 13056x256 sheet recolor on the spot -- the
 *  'slowdown when taking armor on and off'.  The alt-worn-set prewarmer
 *  builds both variants up front.  Returns a Promise that resolves when the
 *  sheets are baked (or immediately if nothing needs baking). */
export function preloadBodyVariant(shirtT, shirtKey) {
  const skinId = _skinStore.get(), pantsId = _pantsStore.get(), shoesId = _shoesStore.get();
  const skinT = skinTarget(skinId), pantsT = pantsTarget(pantsId), shoesT = shoesTarget(shoesId);
  const art = localBodyArt(false), artM = localBodyArt(true);   /* v2.3.1940 */
  if (!skinT && !pantsT && !shoesT && !shirtT && !art) return Promise.resolve();
  const tasks = [];
  for (const pose of ['stand', 'jog', 'hit']) {   /* v2.3.1477: hit ships gear now */
    for (const dir of SOURCE_DIRS) {
      const eye = eyeFor(pose, dir, getEyeColor());   /* local player */
      for (const a of (artM && MIRRORED_SOURCE_DIRS.indexOf(dir) !== -1) ? [art, artM] : [art]) {
        const key = bodySheetKey(skinId, pantsId, shoesId, shirtT, shirtKey, eye && eye.id, pose, dir, a);
        if (_bodySheets[key] === undefined) tasks.push(buildBodySheet(key, pose, dir, skinT, pantsT, shoesT, shirtT, eye && eye.t, a));
      }
    }
  }
  return Promise.all(tasks).catch(() => {});
}

/* Resolve the current shirt via dynamic import (static import would form a
   cycle: playerSkins -> shirtColorCatalog -> characterPortrait -> playerSkins),
   then prewarm the spawn pose with the full combo so there's no skin-torso
   flash before the shirt bakes. */
function _prewarmCurrent() {
  /* v2.3.756: baked shirt retired -- always prewarm the shirtless body
     (this also removed the dynamic-import cycle workaround). */
  try { prewarmBody(_skinStore.get(), _pantsStore.get(), _shoesStore.get(), null, 'none'); } catch (e) { /* ignore */ }
}
_skinStore.on(_prewarmCurrent);
_pantsStore.on(_prewarmCurrent);
_shoesStore.on(_prewarmCurrent);

/* ═══ v2.3.1940: A DRAWING CHANGES THE SHEET KEY, SO IT MUST ALSO FREE THE OLD
   ONE ═══
   Skin/pants/shoes have a fixed handful of ids, so their sheets accumulate to a
   small, bounded set.  A drawing does not: every stroke is a different 256-char
   string and therefore a different key, so re-prewarming on each one would bake
   five sheets per stroke and never release any of them.  Drop the previous
   drawing's bakes first (they can no longer be asked for -- nothing else spells
   that key), and debounce, so a fast scribble bakes once at the end of it
   rather than once per pixel. */
function _dropArtSheets() {
  for (const key of Object.keys(_bodySheets)) {
    if (key.indexOf('/#art') === -1) continue;   /* bodyArtSeg's marker */
    const entry = _bodySheets[key];
    if (Array.isArray(entry) && entry[0] && entry[0].source) {
      try { entry[0].source.destroy(); } catch (e) { /* already gone */ }
    }
    delete _bodySheets[key];
  }
}
let _artPrewarmT = null;
function _onArtChanged() {
  if (_artPrewarmT) clearTimeout(_artPrewarmT);
  _artPrewarmT = setTimeout(() => { _artPrewarmT = null; _dropArtSheets(); _prewarmCurrent(); }, 500);
}
onArtChange(_onArtChanged);
onPatternChange(_onArtChanged);   /* v2.3.1941: a trouser pattern is part of the same bake */

_prewarmCurrent();
