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
import { getFrame, SPRITE_VERSION } from './playerSprites.js';
import { upscaleToFrameHeight, downscaleByFactor, DISPLAY_DS } from './spriteScale.js'; /* v2.3.1108: normalize downscaled sheets to the 256px frame before recolour; v2.3.1120: downscale the final DISPLAY texture for VRAM */
import { loadWebpOrPng } from './webpImage.js'; /* v2.3.1122: prefer lossless WebP, fall back to PNG */

/* ── Catalogs ── `target` = the LIT color for that choice; null = native. */
export const SKIN_CATALOG = [
  { id: 'default', name: 'Default', swatch: '#cd864b', target: null },
  { id: 'pale',    name: 'Pale',    swatch: '#f0cdaa', target: [240, 205, 170] },
  { id: 'tan',     name: 'Tan',     swatch: '#c88c50', target: [200, 140, 80] },
  { id: 'olive',   name: 'Olive',   swatch: '#b18a5e', target: [178, 138, 94] },
  { id: 'brown',   name: 'Brown',   swatch: '#9b6941', target: [155, 105, 65] },
  { id: 'deep',    name: 'Deep',    swatch: '#6e4b32', target: [112, 76, 50] },
  { id: 'ebony',   name: 'Ebony',   swatch: '#50382a', target: [82, 56, 39] },
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

function _target(catalog, id) {
  const e = catalog.find(c => c.id === id);
  return (e && e.target) || null;
}
export function skinTarget(id) { return _target(SKIN_CATALOG, id); }
export function pantsTarget(id) { return _target(PANTS_CATALOG, id); }
export function shoesTarget(id) { return _target(SHOES_CATALOG, id); }

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

export function recolorBodyToCanvas(img, skinT, pantsT, shoesT, shirtT, targetH) {
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
      if (skinT) _retint(d, i, skinT, SKIN_REF);
    } else if (a > 180 && g >= r - 10 && g > b + 8 && r < 150) {
      /* pants (green) */ if (pantsT) _retint(d, i, pantsT, PANTS_REF);
    } else if (a > 180) {
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if ((mx - mn) < 28 && mx >= 45 && mx < 140) {
        /* boots (flat gray) */ if (shoesT) _retint(d, i, shoesT, SHOES_REF);
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return cv;
}

/* v2.3.1122: load through the WebP-preferring helper (PNG fallback).  Used by
   buildBodySheet + _buildPickupHeadSheet, both of which feed recolorBodyToCanvas
   -- the WebP is LOSSLESS so the recolour's exact-RGB classification is intact. */
function loadImg(url) { return loadWebpOrPng(url); }

function buildBodySheet(sheetKey, pose, dir, skinT, pantsT, shoesT, shirtT) {
  _bodySheets[sheetKey] = 'loading';
  /* Returns an always-resolving promise so a full preload can await it. */
  return loadImg(`/sprites/player/${pose}-${dir}.png?v=${SPRITE_VERSION}`).then(img => {
    /* body poses are 256px frames; restore if stored smaller on disk.  Recolour
       runs at full 256 (exact skin/pants/shoes pixel thresholds). */
    const full = recolorBodyToCanvas(img, skinT, pantsT, shoesT, shirtT, FRAME_H);
    /* v2.3.1120: count frames at full 256-space width, then downscale the DISPLAY
       texture to 256/DISPLAY_DS px (the figure shows ~100px on a phone).  Mipmaps
       off -- renders ~1:1 post-downscale, so the mip chain is wasted VRAM. */
    const frames = Math.max(1, Math.floor(full.width / FRAME_W));
    const cv = downscaleByFactor(full, DISPLAY_DS);
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
  }).catch(() => { _bodySheets[sheetKey] = []; /* missing -> caller falls back */ });
}

/** Recolored body frame for (skin, pants, shoes, pose, dir, frameIdx).  Falls
 *  back to the default sheets when nothing is recolored or while a sheet is
 *  still baking, so the player is never invisible.  Each (pose,dir) sheet is
 *  recolored lazily on first use.  Mirroring is handled by the caller. */
export function getBodyFrame(skinId, pantsId, shoesId, pose, dir, frameIdx, shirtT, shirtKey) {
  const skinT = skinTarget(skinId), pantsT = pantsTarget(pantsId), shoesT = shoesTarget(shoesId);
  if (!skinT && !pantsT && !shoesT && !shirtT) return getFrame(pose, dir, frameIdx);
  const sheetKey = (skinId || 'default') + '/' + (pantsId || 'default') + '/' + (shoesId || 'default')
    + '/' + (shirtT ? (shirtKey || 'shirt') : 'none') + '|' + pose + '/' + dir;
  const entry = _bodySheets[sheetKey];
  if (entry === undefined) { buildBodySheet(sheetKey, pose, dir, skinT, pantsT, shoesT, shirtT); return getFrame(pose, dir, frameIdx); }
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
  if (keys.length <= 6) return;
  for (const k of keys) {
    const e = _pickupHeadSheets[k];
    if (!Array.isArray(e) || !e.length) continue;   // skip 'loading'/empty
    delete _pickupHeadSheets[k];
    const src = e[0] && e[0].source;
    if (src) setTimeout(() => { try { src.destroy(); } catch (err) { /* ignore */ } }, 30000);
    break;
  }
}
function _buildPickupHeadSheet(key, pose, dir, skinT, pantsT, shoesT) {
  _pickupHeadSheets[key] = 'loading';
  return loadImg(`/sprites/player/${pose}-${dir}-head.png?v=${SPRITE_VERSION}`).then(img => {
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
  }).catch(() => { _pickupHeadSheets[key] = []; /* missing dir -> caller hides the overlay */ });
}
/** Recolored loot-pickup head-overlay frame for (skin, pants, shoes, pose, dir,
 *  frameIdx).  Returns null outside the pickup pose, while the sheet bakes, or
 *  when no head sheet exists for that dir (only -south ships) -- the caller then
 *  leaves the body's own head showing. */
export function getPickupHeadFrame(skinId, pantsId, shoesId, pose, dir, frameIdx) {
  if (pose !== 'pickup') return null;
  const skinT = skinTarget(skinId), pantsT = pantsTarget(pantsId), shoesT = shoesTarget(shoesId);
  const key = (skinId || 'default') + '/' + (pantsId || 'default') + '/' + (shoesId || 'default') + '|' + pose + '-' + dir;
  const entry = _pickupHeadSheets[key];
  if (entry === undefined) { _buildPickupHeadSheet(key, pose, dir, skinT, pantsT, shoesT); return null; }
  if (entry === 'loading' || !entry.length) return null;
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
  if (!skinT && !pantsT && !shoesT && !shirtT) return; /* default combo: nothing to bake */
  const shKey = shirtT ? (shirtKey || 'shirt') : 'none';
  for (const dir of SOURCE_DIRS) {
    const key = (skinId || 'default') + '/' + (pantsId || 'default') + '/' + (shoesId || 'default') + '/' + shKey + '|stand/' + dir;
    if (_bodySheets[key] === undefined) buildBodySheet(key, 'stand', dir, skinT, pantsT, shoesT, shirtT);
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
  if (!skinT && !pantsT && !shoesT) return Promise.resolve(); /* default combo */
  const tasks = [];
  const prewarm = (pose, dir) => {
    const key = (skinId || 'default') + '/' + (pantsId || 'default') + '/' + (shoesId || 'default') + '/none|' + pose + '/' + dir;
    if (_bodySheets[key] === undefined) tasks.push(buildBodySheet(key, pose, dir, skinT, pantsT, shoesT, null));
  };
  for (const pose of ['stand', 'jog']) {
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
  const headKey = (skinId || 'default') + '/' + (pantsId || 'default') + '/' + (shoesId || 'default') + '|pickup-south';
  if (_pickupHeadSheets[headKey] === undefined) tasks.push(_buildPickupHeadSheet(headKey, 'pickup', 'south', skinT, pantsT, shoesT));
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
  if (!skinT && !pantsT && !shoesT && !shirtT) return Promise.resolve();
  const shKey = shirtT ? (shirtKey || 'shirt') : 'none';
  const tasks = [];
  for (const pose of ['stand', 'jog']) {
    for (const dir of SOURCE_DIRS) {
      const key = (skinId || 'default') + '/' + (pantsId || 'default') + '/' + (shoesId || 'default') + '/' + shKey + '|' + pose + '/' + dir;
      if (_bodySheets[key] === undefined) tasks.push(buildBodySheet(key, pose, dir, skinT, pantsT, shoesT, shirtT));
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
_prewarmCurrent();
