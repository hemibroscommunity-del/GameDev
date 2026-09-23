/* ═══ v2.3.2749: THE MAGENTA TOOLS GET THEIR MATERIALS ═══
 *
 * Owner: "recolor the tools in the animations (they're still magenta from the
 * creation phase) so maybe copper for the axe, pine wood for the pole, might
 * be more I'm forgetting."
 *
 * The magenta is not a mistake in the art, it is the pipeline's KEY: every
 * skill animation is generated holding a flat #FF00FF silhouette so the tool
 * region can be isolated and recoloured afterwards
 * (docs/skill-animation-pipeline.md, "Recolor mask").  The recolour step was
 * simply never run on three sheets, so the player has been holding a pink axe,
 * a pink rod and lighting a pink log.  This module is that step, done at load
 * time instead of offline:
 *
 *   chop-strip (+legless)   axe HEAD -> copper, HAFT -> pine
 *   fish-south              rod -> pine
 * (firemaking-strip's log is keyed too, but firemaking is being rebuilt as
 * code-drawn fire in another session -- owner, v2.3.2749 -- so it is left
 * alone here; TOOL_SPECS.log is ready if that work wants it.)
 *
 * WHY AT LOAD AND NOT IN THE FILES.  Code downstream still reads the key: the
 * fishing rod is FOUND by its magenta when an armoured angler's body is baked
 * (entityRenderer _maskedBodyFrame restores the rod the gear erase cut, and
 * _fishTopFrame lifts rod + gripping hand over the chest plate), and the body
 * recolour would read a pine rod as SKIN (same hue family) and repaint it the
 * player's skin colour.  So the art keeps its key, the rod's shape is recorded
 * from the key before anything else touches it (fishRodMask), and the colour
 * is swapped at the END of each pipeline.
 *
 * THE KEY TEST is hue-based, not the one-shade threshold the rod code used:
 * measured on the three sheets, the key spans V 0.21..1.0 (its own shading and
 * outline) at hue 324..346, saturation >= 0.67; nothing else in those sheets
 * sits in 315..350 (checked frame by frame: skin ~25, pants green, boots grey,
 * the fire and its glow orange/yellow, smoke grey).
 *
 * SHADING SURVIVES: each key pixel's brightness picks its place on the
 * material's own ramp, so the painted highlights and the dark edge stay where
 * the artist put them -- only the material changes.
 *
 * THE AXE'S TWO MATERIALS: the key is one flat colour for head and haft, so
 * the head is found by THICKNESS -- the pixels more than 4px from the key's
 * edge (the blade is ~20px across, the haft ~6px), grown back out to cover the
 * blade's rim.  Measured on the 12 played chop frames: every head keeps its
 * outline and every haft reads as one wooden stick.
 */

/* Ramps dark -> light.  Copper: deep red-brown to a pale metallic edge, so it
   does not read as the skin it is held in (a first, lighter copper did).
   Pine: the rod and the axe haft.  Bark: the log, a shade darker. */
const RAMPS = {
  copper: [[38, 14, 8], [92, 32, 16], [142, 54, 28], [190, 96, 56], [250, 206, 160]],
  pine:   [[44, 27, 14], [84, 53, 28], [128, 86, 48], [170, 124, 76], [206, 166, 112]],
  bark:   [[38, 24, 14], [72, 46, 26], [112, 74, 42], [152, 106, 64], [192, 150, 100]],
};
const V_LO = 0.18, V_HI = 0.95;

/** Is this pixel the magenta tool key? */
export function isToolKey(r, g, b, a) {
  if (a < 77) return false;
  const mx = r > g ? (r > b ? r : b) : (g > b ? g : b);
  const mn = r < g ? (r < b ? r : b) : (g < b ? g : b);
  if (mx < 46) return false;                 /* V > 0.18 */
  const d = mx - mn;
  if (d < mx * 0.4) return false;            /* S > 0.4 */
  let h;
  if (mx === r) h = 60 * (((g - b) / d) % 6);
  else if (mx === g) h = 60 * ((b - r) / d + 2);
  else h = 60 * ((r - g) / d + 4);
  if (h < 0) h += 360;
  return h >= 315 && h <= 350;
}

function rampAt(ramp, t) {
  const x = Math.max(0, Math.min(1, t)) * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(x));
  const f = x - i;
  const a = ramp[i], b = ramp[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

/* Two-pass chamfer distance (3-4 metric, /3 = px) from every `inside` pixel to
   the nearest outside one.  O(w*h), no allocation per pixel. */
function chamfer(inside, w, h) {
  const INF = 1 << 20;
  const d = new Int32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = inside[i] ? INF : 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!d[i]) continue;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 3); else v = Math.min(v, 3);
      if (y > 0) {
        v = Math.min(v, d[i - w] + 3);
        if (x > 0) v = Math.min(v, d[i - w - 1] + 4);
        if (x < w - 1) v = Math.min(v, d[i - w + 1] + 4);
      } else v = Math.min(v, 3);
      d[i] = v;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (!d[i]) continue;
      let v = d[i];
      if (x < w - 1) v = Math.min(v, d[i + 1] + 3); else v = Math.min(v, 3);
      if (y < h - 1) {
        v = Math.min(v, d[i + w] + 3);
        if (x < w - 1) v = Math.min(v, d[i + w + 1] + 4);
        if (x > 0) v = Math.min(v, d[i + w - 1] + 4);
      } else v = Math.min(v, 3);
      d[i] = v;
    }
  }
  return d;   /* in thirds of a pixel */
}

/** The key's footprint of an RGBA buffer, as a 0/1 byte mask. */
export function toolKeyMask(data, w, h) {
  const m = new Uint8Array(w * h);
  for (let i = 0, o = 0; i < m.length; i++, o += 4) {
    if (isToolKey(data[o], data[o + 1], data[o + 2], data[o + 3])) m[i] = 1;
  }
  return m;
}

/**
 * Recolour the tool key of an RGBA buffer in place.
 *   spec.material            one material for the whole tool ('pine', 'bark');
 *   spec.head / spec.haft    two, split by thickness at spec.headPx (the head
 *                            is what lies deeper than that inside the key).
 * `scale` shrinks/grows the thickness threshold for art stored at another
 * resolution than it was measured on.  Returns how many pixels it recoloured.
 */
export function recolorToolKey(data, w, h, spec, scale = 1) {
  const m = toolKeyMask(data, w, h);
  let head = null;
  if (spec.head) {
    const R = (spec.headPx || 4) * scale;
    const din = chamfer(m, w, h);
    /* the deep core, then grown back out to cover the blade's rim */
    const core = new Uint8Array(w * h);
    for (let i = 0; i < core.length; i++) core[i] = din[i] > R * 3 ? 1 : 0;
    const out = new Uint8Array(w * h);
    for (let i = 0; i < out.length; i++) out[i] = core[i] ? 0 : 1;
    const dgrow = chamfer(out, w, h);   /* distance to the nearest core pixel */
    head = new Uint8Array(w * h);
    const G = (R + 2) * 3;
    for (let i = 0; i < head.length; i++) head[i] = (m[i] && dgrow[i] <= G) ? 1 : 0;
  }
  let n = 0;
  for (let i = 0, o = 0; i < m.length; i++, o += 4) {
    if (!m[i]) continue;
    const r = data[o], g = data[o + 1], b = data[o + 2];
    const v = Math.max(r, g, b) / 255;
    let t = (v - V_LO) / (V_HI - V_LO);
    let ramp;
    if (head) {
      if (head[i]) { ramp = RAMPS[spec.head]; t = Math.pow(Math.max(0, Math.min(1, t)), 1.5); }
      else ramp = RAMPS[spec.haft];
    } else ramp = RAMPS[spec.material];
    if (!ramp) continue;
    const c = rampAt(ramp, t);
    data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2];
    n++;
  }
  return n;
}

/** Recolour the tool key of a canvas in place. */
export function recolorToolKeyCanvas(cv, spec, scale = 1) {
  if (!cv || !cv.width || !cv.height) return 0;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, cv.width, cv.height);
  const n = recolorToolKey(img.data, cv.width, cv.height, spec, scale);
  if (n) ctx.putImageData(img, 0, 0);
  return n;
}

/** Draw an image to a new canvas and recolour its tool key. */
export function toolRecoloredCanvas(img, spec, scale = 1) {
  const cv = document.createElement('canvas');
  cv.width = img.naturalWidth || img.width;
  cv.height = img.naturalHeight || img.height;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  recolorToolKeyCanvas(cv, spec, scale);
  return cv;
}

/* The specs, named once so every sheet that shows a given tool agrees. */
export const TOOL_SPECS = {
  axe: { head: 'copper', haft: 'pine', headPx: 4 },
  rod: { material: 'pine' },
  log: { material: 'bark' },
};

/* ═══ THE FISHING ROD'S SHAPE, RECORDED FROM THE KEY ═══
 * The rod is recoloured to pine, so the code that has to FIND it (the armour
 * bakes, see the header) can no longer look for magenta -- and cannot look for
 * pine either, which is skin's hue.  So its shape is taken from the key once,
 * as the fish sheet loads, per frame and resolution-independent: a caller asks
 * "is (u, v) of frame i the rod?" in 0..1 frame coordinates, whatever size the
 * copy of the sheet it holds is.  (The skin bakes upscale the sheet 2x; the
 * display copy is another size again.) */
let _rod = null;   /* { fw, fh, frames, mask: Uint8Array } */

export function recordFishRodMask(img, frames) {
  try {
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    if (!w || !h || !frames) return;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, w, h).data;
    _rod = { fw: w / frames, fh: h, frames, w, mask: toolKeyMask(d, w, h) };
  } catch (e) { /* no mask: the callers fall back to their key test */ }
}

/** Is frame `i`'s pixel at (u, v) (0..1 within the frame) the fishing rod?
 *  null when no mask has been recorded (the caller keeps its old test). */
export function fishRodAt(i, u, v) {
  if (!_rod) return null;
  const f = ((i % _rod.frames) + _rod.frames) % _rod.frames;
  const x = Math.min(_rod.w - 1, Math.floor(f * _rod.fw + Math.max(0, Math.min(0.9999, u)) * _rod.fw));
  const y = Math.min(_rod.fh - 1, Math.floor(Math.max(0, Math.min(0.9999, v)) * _rod.fh));
  return _rod.mask[y * _rod.w + x] === 1;
}
export function hasFishRodMask() { return !!_rod; }
